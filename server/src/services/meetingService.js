import dayjs from 'dayjs';
import { DEFAULT_USER_ID, env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { AppError } from '../utils/errors.js';
import { formatDate, formatDateTime, generateRescheduleToken, getDayWindowInTimezone, parseDbDateTime } from '../utils/datetime.js';
import { mapRow, safeJsonParse } from '../utils/formatters.js';
import { getEventTypeBySlug } from './eventTypeService.js';
import { getSlotsForDate, resolveScheduleForEvent } from './availabilityService.js';
import { sendBookingEmails, sendCancellationEmail } from './mailService.js';

const mapMeeting = (row) => {
  const item = mapRow(row);
  return {
    ...item,
    startAt: item.startAt ? parseDbDateTime(item.startAt).toISOString() : item.startAt,
    endAt: item.endAt ? parseDbDateTime(item.endAt).toISOString() : item.endAt,
    cancelledAt: item.cancelledAt ? parseDbDateTime(item.cancelledAt).toISOString() : item.cancelledAt,
    inviteeAnswers: safeJsonParse(item.inviteeAnswers, {}),
    meetingStatus: item.status
  };
};

const getMeetingById = async (id) => {
  const [rows] = await pool.query(
    `
      SELECT
        m.*,
        et.name AS event_name,
        et.slug AS event_slug,
        et.location AS event_location,
        et.color AS event_color,
        et.duration_minutes,
        et.buffer_before_minutes,
        et.buffer_after_minutes
      FROM meetings m
      INNER JOIN event_types et ON et.id = m.event_type_id
      WHERE m.id = ?
      LIMIT 1
    `,
    [id]
  );

  const meeting = rows[0];
  if (!meeting) {
    throw new AppError('Meeting not found.', 404);
  }

  return {
    ...mapMeeting(meeting),
    eventName: meeting.event_name,
    eventSlug: meeting.event_slug,
    eventLocation: meeting.event_location,
    eventColor: meeting.event_color,
    durationMinutes: meeting.duration_minutes,
    bufferBeforeMinutes: meeting.buffer_before_minutes,
    bufferAfterMinutes: meeting.buffer_after_minutes
  };
};

export const listMeetings = async (scope = 'upcoming') => {
  const comparator = scope === 'past' ? '<' : '>=';
  const sortDirection = scope === 'past' ? 'DESC' : 'ASC';
  const [rows] = await pool.query(
    `
      SELECT
        m.*,
        et.name AS event_name,
        et.slug AS event_slug,
        et.color AS event_color,
        et.location AS event_location
      FROM meetings m
      INNER JOIN event_types et ON et.id = m.event_type_id
      WHERE et.user_id = ?
        AND m.start_at ${comparator} UTC_TIMESTAMP()
      ORDER BY m.start_at ${sortDirection}
    `,
    [DEFAULT_USER_ID]
  );

  return rows.map((row) => ({
    ...mapMeeting(row),
    eventName: row.event_name,
    eventSlug: row.event_slug,
    eventColor: row.event_color,
    eventLocation: row.event_location
  }));
};

const validateInviteeAnswers = (questions, answers = {}) => {
  for (const question of questions || []) {
    if (question.required && !answers[question.label]?.trim()) {
      throw new AppError(`Answer required for "${question.label}".`);
    }
  }
};

const ensureSlotStillFree = async ({ eventType, date, start, ignoreMeetingId }) => {
  const availability = await getSlotsForDate(eventType.slug, date);
  const stillFree = availability.slots.some((slot) => slot.start === start);

  if (!stillFree) {
    throw new AppError('That time slot is no longer available. Please choose another one.', 409);
  }
};

const listScheduledMeetingsForDate = async (connection, dayWindow, excludeMeetingId) => {
  const [rows] = await connection.query(
    `
      SELECT
        m.id,
        m.start_at,
        m.end_at,
        et.buffer_before_minutes,
        et.buffer_after_minutes
      FROM meetings m
      INNER JOIN event_types et ON et.id = m.event_type_id
      WHERE et.user_id = ?
        AND m.status = 'scheduled'
        AND m.start_at < ?
        AND m.end_at > ?
        AND m.id <> ?
      FOR UPDATE
    `,
    [DEFAULT_USER_ID, formatDateTime(dayWindow.end), formatDateTime(dayWindow.start), excludeMeetingId || 0]
  );

  return rows.map((row) => ({
    id: row.id,
    startAt: parseDbDateTime(row.start_at),
    endAt: parseDbDateTime(row.end_at),
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes
  }));
};

const assertNoOverlap = async ({
  connection,
  dayWindow,
  proposedStart,
  proposedEnd,
  eventType,
  excludeMeetingId
}) => {
  const meetings = await listScheduledMeetingsForDate(connection, dayWindow, excludeMeetingId);

  const proposedBusyStart = proposedStart.subtract(eventType.bufferBeforeMinutes, 'minute');
  const proposedBusyEnd = proposedEnd.add(eventType.bufferAfterMinutes, 'minute');

  const hasConflict = meetings.some((meeting) => {
    const busyStart = meeting.startAt.subtract(meeting.bufferBeforeMinutes, 'minute');
    const busyEnd = meeting.endAt.add(meeting.bufferAfterMinutes, 'minute');
    return proposedBusyStart.isBefore(busyEnd) && busyStart.isBefore(proposedBusyEnd);
  });

  if (hasConflict) {
    throw new AppError('That time slot is no longer available. Please choose another one.', 409);
  }
};

export const createBooking = async ({ slug, payload }) => {
  const eventType = await getEventTypeBySlug(slug);
  const schedule = await resolveScheduleForEvent(eventType);
  validateInviteeAnswers(eventType.inviteeQuestions, payload.answers);

  const startAt = dayjs(payload.start);
  const endAt = startAt.add(eventType.durationMinutes, 'minute');
  const date = formatDate(startAt, schedule.timezone);
  const dayWindow = getDayWindowInTimezone(date, schedule.timezone);

  await ensureSlotStillFree({
    eventType,
    date,
    start: startAt.toISOString()
  });

  const connection = await pool.getConnection();
  let result;
  try {
    await connection.beginTransaction();
    await assertNoOverlap({
      connection,
      dayWindow,
      proposedStart: startAt,
      proposedEnd: endAt,
      eventType
    });

    [result] = await connection.query(
      `
        INSERT INTO meetings (
          event_type_id, invitee_name, invitee_email, invitee_answers, start_at, end_at, timezone, reschedule_token
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        eventType.id,
        payload.name,
        payload.email,
        JSON.stringify(payload.answers || {}),
        formatDateTime(startAt),
        formatDateTime(endAt),
        payload.timezone || eventType.scheduleTimezone || env.defaultTimezone,
        generateRescheduleToken()
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const createdMeeting = await getMeetingById(result.insertId);

  const emailResult = await sendBookingEmails({
  inviteeEmail: createdMeeting.inviteeEmail,
  inviteeName: createdMeeting.inviteeName,
  eventName: createdMeeting.eventName,
  startAt: dayjs(createdMeeting.startAt).tz(createdMeeting.timezone || schedule.timezone).format('ddd, MMM D YYYY hh:mm A'),
  endAt: dayjs(createdMeeting.endAt).tz(createdMeeting.timezone || schedule.timezone).format('ddd, MMM D YYYY hh:mm A'),
  manageUrl: `${env.appBaseUrl}/book/${eventType.slug}?reschedule=${createdMeeting.rescheduleToken}`
});

return {
  ...createdMeeting,
  emailStatus: emailResult
};
};

export const cancelMeeting = async (meetingId, reason = 'Cancelled by host') => {
  const meeting = await getMeetingById(meetingId);

  await pool.query(
    `
      UPDATE meetings
      SET status = 'cancelled', cancellation_reason = ?, cancelled_at = UTC_TIMESTAMP()
      WHERE id = ?
    `,
    [reason, meetingId]
  );

  const emailResult = await sendCancellationEmail({
  inviteeEmail: meeting.inviteeEmail,
  inviteeName: meeting.inviteeName,
  eventName: meeting.eventName,
  cancelledAt: dayjs().format('ddd, MMM D YYYY hh:mm A')
});

const updated = await getMeetingById(meetingId);

return {
  ...updated,
  emailStatus: emailResult
};
};

export const cancelMeetingByToken = async (token, reason = 'Cancelled by invitee') => {
  const meeting = await getMeetingByToken(token);
  if (meeting.status === 'cancelled') {
    return meeting;
  }

  await pool.query(
    `
      UPDATE meetings
      SET status = 'cancelled', cancellation_reason = ?, cancelled_at = UTC_TIMESTAMP()
      WHERE id = ?
    `,
    [reason, meeting.id]
  );

  await sendCancellationEmail({
    inviteeEmail: meeting.inviteeEmail,
    inviteeName: meeting.inviteeName,
    eventName: meeting.eventName,
    cancelledAt: dayjs().format('ddd, MMM D YYYY hh:mm A')
  });

  return getMeetingById(meeting.id);
};

export const getMeetingByToken = async (token) => {
  const [rows] = await pool.query(
    `
      SELECT
        m.*,
        et.name AS event_name,
        et.slug AS event_slug,
        et.duration_minutes
      FROM meetings m
      INNER JOIN event_types et ON et.id = m.event_type_id
      WHERE m.reschedule_token = ?
      LIMIT 1
    `,
    [token]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError('Booking link is invalid.', 404);
  }

  return {
    ...mapMeeting(row),
    eventName: row.event_name,
    eventSlug: row.event_slug,
    durationMinutes: row.duration_minutes
  };
};

export const getMeetingPublicById = async (id) => {
  const meeting = await getMeetingById(id);
  return meeting;
};

export const rescheduleMeetingByToken = async (token, payload) => {
  const meeting = await getMeetingByToken(token);
  if (meeting.status === 'cancelled') {
    throw new AppError('Cancelled meetings cannot be rescheduled.');
  }

  const eventType = await getEventTypeBySlug(meeting.eventSlug);
  const schedule = await resolveScheduleForEvent(eventType);
  validateInviteeAnswers(eventType.inviteeQuestions, payload.answers || meeting.inviteeAnswers);

  const startAt = dayjs(payload.start);
  const endAt = startAt.add(eventType.durationMinutes, 'minute');
  const date = formatDate(startAt, schedule.timezone);
  const dayWindow = getDayWindowInTimezone(date, schedule.timezone);
  const availability = await getSlotsForDate(eventType.slug, date, meeting.id);
  const stillFree = availability.slots.some((slot) => slot.start === startAt.toISOString());

  if (!stillFree) {
    throw new AppError('That new time slot is no longer available.', 409);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await assertNoOverlap({
      connection,
      dayWindow,
      proposedStart: startAt,
      proposedEnd: endAt,
      eventType,
      excludeMeetingId: meeting.id
    });

    await connection.query(
      `
        UPDATE meetings
        SET start_at = ?, end_at = ?, invitee_name = ?, invitee_email = ?, invitee_answers = ?, timezone = ?
        WHERE id = ?
      `,
      [
        formatDateTime(startAt),
        formatDateTime(endAt),
        payload.name || meeting.inviteeName,
        payload.email || meeting.inviteeEmail,
        JSON.stringify(payload.answers || meeting.inviteeAnswers || {}),
        payload.timezone || meeting.timezone,
        meeting.id
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getMeetingById(meeting.id);
};
