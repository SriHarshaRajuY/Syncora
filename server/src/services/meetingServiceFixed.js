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
import { getEventTypeById, getEventTypeBySlug } from './eventTypeService.js';
import { assertDateBookableWithAdvancedSettings, resolveScheduleForEvent } from './availabilityService.js';
import { sendBookingEmails, sendCancellationEmail } from './mailService.js';

const mapMeeting = (row) => {
  const item = mapRow(row);

  return {
    ...item,
    startAt: item.startAt ? parseDbDateTime(item.startAt).toISOString() : null,
    endAt: item.endAt ? parseDbDateTime(item.endAt).toISOString() : null,
    cancelledAt: item.cancelledAt ? parseDbDateTime(item.cancelledAt).toISOString() : null,
    inviteeAnswers: safeJsonParse(item.inviteeAnswers, {}),
    meetingStatus: item.status
  };
};

const baseMeetingSelect = `
  SELECT
    m.*,
    et.name AS event_name,
    et.slug AS event_slug,
    et.location AS event_location,
    et.duration_minutes
  FROM meetings m
  INNER JOIN event_types et ON et.id = m.event_type_id
`;

const buildMeetingResponse = (row) => ({
  ...mapMeeting(row),
  eventName: row.event_name,
  eventSlug: row.event_slug,
  eventLocation: row.event_location,
  eventTypeId: row.event_type_id,
  durationMinutes: row.duration_minutes
});

const buildManageUrl = (meeting) => `${env.appBaseUrl}/book/${meeting.eventSlug}/confirmed/${meeting.id}`;

const getMeetingById = async (id) => {
  const [rows] = await pool.query(
    `
      ${baseMeetingSelect}
      WHERE m.id = ?
      LIMIT 1
    `,
    [id]
  );

  if (!rows[0]) {
    throw new AppError('Meeting not found', 404);
  }

  return buildMeetingResponse(rows[0]);
};

const assertNoOverlap = async ({ connection, dayWindow, proposedStart, proposedEnd, ignoreMeetingId }) => {
  const params = [formatDateTime(dayWindow.end), formatDateTime(dayWindow.start)];
  const ignoreSql = ignoreMeetingId ? 'AND id <> ?' : '';

  if (ignoreMeetingId) {
    params.push(Number(ignoreMeetingId));
  }

  const [rows] = await connection.query(
    `
      SELECT *
      FROM meetings
      WHERE status = 'scheduled'
        AND start_at < ?
        AND end_at > ?
        ${ignoreSql}
      FOR UPDATE
    `,
    params
  );

  const hasConflict = rows.some((row) => {
    const start = parseDbDateTime(row.start_at);
    const end = parseDbDateTime(row.end_at);
    return proposedStart.isBefore(end) && start.isBefore(proposedEnd);
  });

  if (hasConflict) {
    throw new AppError('This time slot is already booked. Please choose another.', 409);
  }
};

const saveMeeting = async ({ eventType, schedule, payload, existingMeetingId }) => {
  const startAt = dayjs(payload.start).utc();
  const endAt = startAt.add(eventType.durationMinutes, 'minute');
  const date = formatDate(startAt, schedule.timezone);
  const dayWindow = getDayWindowInTimezone(date, schedule.timezone);
  const connection = await pool.getConnection();
  let meetingId = existingMeetingId;

  try {
    await connection.beginTransaction();

    await assertDateBookableWithAdvancedSettings({
      date,
      schedule,
      ignoreMeetingId: existingMeetingId,
      connection
    });

    await assertNoOverlap({
      connection,
      dayWindow,
      proposedStart: startAt,
      proposedEnd: endAt,
      ignoreMeetingId: existingMeetingId
    });

    if (existingMeetingId) {
      await connection.query(
        `
          UPDATE meetings
          SET invitee_name = ?, invitee_email = ?, invitee_answers = ?, start_at = ?, end_at = ?, timezone = ?, status = 'scheduled'
          WHERE id = ?
        `,
        [
          payload.name,
          payload.email,
          JSON.stringify(payload.answers || {}),
          formatDateTime(startAt),
          formatDateTime(endAt),
          payload.timezone,
          existingMeetingId
        ]
      );
    } else {
      const [result] = await connection.query(
        `
          INSERT INTO meetings
          (event_type_id, invitee_name, invitee_email, invitee_answers, start_at, end_at, timezone, reschedule_token)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          eventType.id,
          payload.name,
          payload.email,
          JSON.stringify(payload.answers || {}),
          formatDateTime(startAt),
          formatDateTime(endAt),
          payload.timezone,
          generateRescheduleToken()
        ]
      );
      meetingId = result.insertId;
    }

    await connection.commit();
    return meetingId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listMeetings = async (scope = 'upcoming') => {
  const comparator = scope === 'past' ? '<' : '>=';
  const sortDirection = scope === 'past' ? 'DESC' : 'ASC';

  const [rows] = await pool.query(
    `
      ${baseMeetingSelect}
      WHERE et.user_id = ?
        AND m.start_at ${comparator} UTC_TIMESTAMP()
      ORDER BY m.start_at ${sortDirection}
    `,
    [DEFAULT_USER_ID]
  );

  return rows.map(buildMeetingResponse);
};

export const getMeetingPublicById = async (id) => getMeetingById(id);

export const getMeetingByToken = async (token) => {
  const [rows] = await pool.query(
    `
      ${baseMeetingSelect}
      WHERE m.reschedule_token = ?
      LIMIT 1
    `,
    [token]
  );

  if (!rows[0]) {
    throw new AppError('Invalid booking link', 404);
  }

  return buildMeetingResponse(rows[0]);
};

export const cancelMeeting = async (id, reason = 'Cancelled by host') => {
  const meeting = await getMeetingById(id);

  await pool.query(
    `
      UPDATE meetings
      SET status = 'cancelled',
          cancellation_reason = ?,
          cancelled_at = UTC_TIMESTAMP()
      WHERE id = ?
    `,
    [reason, id]
  );

  const emailStatus = await sendCancellationEmail({
    inviteeEmail: meeting.inviteeEmail,
    inviteeName: meeting.inviteeName,
    eventName: meeting.eventName,
    cancelledAt: dayjs().format('ddd, MMM D YYYY hh:mm A')
  });

  return {
    ...(await getMeetingById(id)),
    emailStatus
  };
};

export const cancelMeetingByToken = async (token) => {
  const meeting = await getMeetingByToken(token);
  return cancelMeeting(meeting.id, 'Cancelled by invitee');
};

export const createBooking = async ({ slug, payload }) => {
  const eventType = await getEventTypeBySlug(slug);
  const schedule = await resolveScheduleForEvent(eventType);

  const meetingId = await saveMeeting({ eventType, schedule, payload });
  const meeting = await getMeetingById(meetingId);

  const emailStatus = await sendBookingEmails({
    inviteeEmail: meeting.inviteeEmail,
    inviteeName: meeting.inviteeName,
    eventName: meeting.eventName,
    startAt: dayjs(meeting.startAt).format('ddd, MMM D YYYY hh:mm A'),
    endAt: dayjs(meeting.endAt).format('ddd, MMM D YYYY hh:mm A'),
    manageUrl: buildManageUrl(meeting)
  });

  return {
    ...meeting,
    emailStatus
  };
};

export const rescheduleMeetingByToken = async (token, payload) => {
  const meeting = await getMeetingByToken(token);
  const eventType = await getEventTypeById(meeting.eventTypeId);
  const schedule = await resolveScheduleForEvent(eventType);

  const meetingId = await saveMeeting({
    eventType,
    schedule,
    payload,
    existingMeetingId: meeting.id
  });

  const updatedMeeting = await getMeetingById(meetingId);
  const emailStatus = await sendBookingEmails({
    inviteeEmail: updatedMeeting.inviteeEmail,
    inviteeName: updatedMeeting.inviteeName,
    eventName: `${updatedMeeting.eventName} rescheduled`,
    startAt: dayjs(updatedMeeting.startAt).format('ddd, MMM D YYYY hh:mm A'),
    endAt: dayjs(updatedMeeting.endAt).format('ddd, MMM D YYYY hh:mm A'),
    manageUrl: buildManageUrl(updatedMeeting)
  });

  return {
    ...updatedMeeting,
    emailStatus
  };
};
