import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

import { DEFAULT_USER_ID } from '../config/env.js';
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
import { resolveScheduleForEvent } from './availabilityService.js';
import { sendBookingEmails, sendCancellationEmail } from './mailService.js';


// -------------------- HELPERS --------------------

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


// -------------------- LIST --------------------

export const listMeetings = async (scope = 'upcoming') => {
  const comparator = scope === 'past' ? '<' : '>=';
  const sortDirection = scope === 'past' ? 'DESC' : 'ASC';

  const [rows] = await pool.query(
    `
    SELECT m.*, et.name AS event_name, et.slug AS event_slug, et.location AS event_location
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
    eventLocation: row.event_location
  }));
};


// -------------------- GET --------------------

const getMeetingById = async (id) => {
  const [rows] = await pool.query(
    `
    SELECT m.*, et.name AS event_name, et.slug AS event_slug, et.location AS event_location
    FROM meetings m
    INNER JOIN event_types et ON et.id = m.event_type_id
    WHERE m.id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!rows[0]) throw new AppError('Meeting not found', 404);

  return {
    ...mapMeeting(rows[0]),
    eventName: rows[0].event_name,
    eventSlug: rows[0].event_slug,
    eventLocation: rows[0].event_location
  };
};

export const getMeetingPublicById = async (id) => {
  return getMeetingById(id);
};

export const getMeetingByToken = async (token) => {
  const [rows] = await pool.query(
    `
    SELECT m.*, et.name AS event_name, et.slug AS event_slug
    FROM meetings m
    INNER JOIN event_types et ON et.id = m.event_type_id
    WHERE m.reschedule_token = ?
    `,
    [token]
  );

  if (!rows[0]) throw new AppError('Invalid booking link', 404);

  return {
    ...mapMeeting(rows[0]),
    eventName: rows[0].event_name,
    eventSlug: rows[0].event_slug
  };
};


// -------------------- CANCEL --------------------

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

  await sendCancellationEmail({
    inviteeEmail: meeting.inviteeEmail,
    inviteeName: meeting.inviteeName,
    eventName: meeting.eventName
  });

  return getMeetingById(id);
};

export const cancelMeetingByToken = async (token) => {
  const meeting = await getMeetingByToken(token);
  return cancelMeeting(meeting.id, 'Cancelled by invitee');
};


// -------------------- DOUBLE BOOKING CHECK --------------------

const assertNoOverlap = async ({ connection, dayWindow, proposedStart, proposedEnd }) => {
  const [rows] = await connection.query(
    `
    SELECT * FROM meetings
    WHERE start_at < ? AND end_at > ?
    FOR UPDATE
    `,
    [formatDateTime(dayWindow.end), formatDateTime(dayWindow.start)]
  );

  const conflict = rows.some((row) => {
    const start = parseDbDateTime(row.start_at);
    const end = parseDbDateTime(row.end_at);

    return proposedStart.isBefore(end) && start.isBefore(proposedEnd);
  });

  if (conflict) {
    throw new AppError('This time slot is already booked. Please choose another.', 409);
  }
};


// -------------------- CREATE BOOKING --------------------

export const createBooking = async ({ slug, payload }) => {
  const eventType = await getEventTypeBySlug(slug);
  const schedule = await resolveScheduleForEvent(eventType);

  const startAt = dayjs(payload.start).utc();
  const endAt = startAt.add(eventType.durationMinutes, 'minute');

  const date = formatDate(startAt, schedule.timezone);
  const dayWindow = getDayWindowInTimezone(date, schedule.timezone);

  const connection = await pool.getConnection();

  let result;

  try {
    await connection.beginTransaction();

    // 🔒 prevent double booking
    await assertNoOverlap({
      connection,
      dayWindow,
      proposedStart: startAt,
      proposedEnd: endAt
    });

    [result] = await connection.query(
      `
      INSERT INTO meetings
      (event_type_id, invitee_name, invitee_email, start_at, end_at, timezone, reschedule_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        eventType.id,
        payload.name,
        payload.email,
        formatDateTime(startAt),
        formatDateTime(endAt),
        payload.timezone,
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

  const meeting = await getMeetingById(result.insertId);

  // 📧 send email
  await sendBookingEmails({
    inviteeEmail: meeting.inviteeEmail,
    inviteeName: meeting.inviteeName,
    eventName: meeting.eventName
  });

  return meeting;
};


// -------------------- RESCHEDULE --------------------

export const rescheduleMeetingByToken = async (token, payload) => {
  const meeting = await getMeetingByToken(token);

  const startAt = dayjs(payload.start).utc();
  const endAt = startAt.add(30, 'minute'); // you can improve using eventType duration

  await pool.query(
    `
    UPDATE meetings
    SET start_at = ?, end_at = ?
    WHERE id = ?
    `,
    [formatDateTime(startAt), formatDateTime(endAt), meeting.id]
  );

  return getMeetingById(meeting.id);
};