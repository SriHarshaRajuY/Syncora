import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

import { DEFAULT_USER_ID, env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { AppError } from '../utils/errors.js';
import {
  formatDate,
  formatDateTime,
  generateRescheduleToken,
  getDayWindowInTimezone,
  parseDbDateTime
} from '../utils/datetime.js';
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
      SELECT m.*, et.name AS event_name, et.slug AS event_slug,
             et.location AS event_location, et.color AS event_color,
             et.duration_minutes, et.buffer_before_minutes, et.buffer_after_minutes
      FROM meetings m
      INNER JOIN event_types et ON et.id = m.event_type_id
      WHERE m.id = ?
      LIMIT 1
    `,
    [id]
  );

  const meeting = rows[0];
  if (!meeting) throw new AppError('Meeting not found.', 404);

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

const validateInviteeAnswers = (questions, answers = {}) => {
  for (const question of questions || []) {
    if (question.required && !answers[question.label]?.trim()) {
      throw new AppError(`Answer required for "${question.label}".`);
    }
  }
};

/**
 * 🔒 LOCK + FETCH meetings for overlap check
 */
const getLockedMeetings = async (connection, dayWindow, excludeMeetingId) => {
  const [rows] = await connection.query(
    `
      SELECT m.id, m.start_at, m.end_at,
             et.buffer_before_minutes, et.buffer_after_minutes
      FROM meetings m
      INNER JOIN event_types et ON et.id = m.event_type_id
      WHERE et.user_id = ?
        AND m.status = 'scheduled'
        AND m.start_at < ?
        AND m.end_at > ?
        AND m.id <> ?
      FOR UPDATE
    `,
    [
      DEFAULT_USER_ID,
      formatDateTime(dayWindow.end),
      formatDateTime(dayWindow.start),
      excludeMeetingId || 0
    ]
  );

  return rows.map((row) => ({
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
  const meetings = await getLockedMeetings(connection, dayWindow, excludeMeetingId);

  const proposedStartWithBuffer = proposedStart.subtract(eventType.bufferBeforeMinutes, 'minute');
  const proposedEndWithBuffer = proposedEnd.add(eventType.bufferAfterMinutes, 'minute');

  const conflict = meetings.some((meeting) => {
    const busyStart = meeting.startAt.subtract(meeting.bufferBeforeMinutes, 'minute');
    const busyEnd = meeting.endAt.add(meeting.bufferAfterMinutes, 'minute');

    return proposedStartWithBuffer.isBefore(busyEnd) &&
           busyStart.isBefore(proposedEndWithBuffer);
  });

  if (conflict) {
    throw new AppError('This time slot is already booked.', 409);
  }
};

export const createBooking = async ({ slug, payload }) => {
  const eventType = await getEventTypeBySlug(slug);
  const schedule = await resolveScheduleForEvent(eventType);

  validateInviteeAnswers(eventType.inviteeQuestions, payload.answers);

  const startAt = dayjs(payload.start).utc();
  const endAt = startAt.add(eventType.durationMinutes, 'minute');

  const date = formatDate(startAt, schedule.timezone);
  const dayWindow = getDayWindowInTimezone(date, schedule.timezone);

  const connection = await pool.getConnection();

  let result;
  try {
    await connection.beginTransaction();

    // 🔥 IMPORTANT: Slot validation INSIDE transaction
    const availability = await getSlotsForDate(eventType.slug, date);
    const stillFree = availability.slots.some(
      (slot) => slot.start === startAt.toISOString()
    );

    if (!stillFree) {
      throw new AppError('That time slot is no longer available.', 409);
    }

    // 🔒 HARD LOCK CHECK
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
          event_type_id,
          invitee_name,
          invitee_email,
          invitee_answers,
          start_at,
          end_at,
          timezone,
          reschedule_token
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
        payload.timezone || schedule.timezone || env.defaultTimezone,
        generateRescheduleToken()
      ]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  const createdMeeting = await getMeetingById(result.insertId);

  const emailResult = await sendBookingEmails({
    inviteeEmail: createdMeeting.inviteeEmail,
    inviteeName: createdMeeting.inviteeName,
    eventName: createdMeeting.eventName,
    startAt: dayjs(createdMeeting.startAt).format('ddd, MMM D YYYY hh:mm A'),
    endAt: dayjs(createdMeeting.endAt).format('ddd, MMM D YYYY hh:mm A'),
    manageUrl: `${env.appBaseUrl}/book/${eventType.slug}?reschedule=${createdMeeting.rescheduleToken}`
  });

  return {
    ...createdMeeting,
    emailStatus: emailResult
  };
};