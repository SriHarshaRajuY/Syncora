import dayjs from 'dayjs';
import { DEFAULT_USER_ID } from '../config/env.js';
import { pool } from '../db/pool.js';
import { AppError } from '../utils/errors.js';
import {
  addMinutes,
  formatDate,
  formatDateTime,
  overlaps,
  startOfMonth,
  endOfMonth,
  makeDateTimeInTimezone,
  parseDbDateTime,
  getDayWindowInTimezone
} from '../utils/datetime.js';
import { mapRow } from '../utils/formatters.js';
import { getEventTypeBySlug } from './eventTypeService.js';

const SLOT_INCREMENT = 30;

const sortRules = (rules) => [...rules].sort((a, b) => a.startTime.localeCompare(b.startTime));

const mapSchedule = (schedule, rules = [], overrides = []) => ({
  ...mapRow(schedule),
  isDefault: Boolean(schedule.is_default),
  rules: sortRules(rules.map(mapRow)),
  overrides: overrides.map((item) => ({
    ...mapRow(item),
    overrideDate: String(item.override_date)
  }))
});

export const listSchedules = async () => {
  const [schedules] = await pool.query(
    `
      SELECT *
      FROM availability_schedules
      WHERE user_id = ?
      ORDER BY is_default DESC, updated_at DESC
    `,
    [DEFAULT_USER_ID]
  );

  const scheduleIds = schedules.map((item) => item.id);
  const [rules] = scheduleIds.length
    ? await pool.query('SELECT * FROM availability_rules WHERE schedule_id IN (?) ORDER BY day_of_week, start_time', [scheduleIds])
    : [[]];
  const [overrides] = scheduleIds.length
    ? await pool.query('SELECT * FROM availability_overrides WHERE schedule_id IN (?) ORDER BY override_date DESC', [scheduleIds])
    : [[]];

  return schedules.map((schedule) =>
    mapSchedule(
      schedule,
      rules.filter((rule) => rule.schedule_id === schedule.id),
      overrides.filter((overrideItem) => overrideItem.schedule_id === schedule.id)
    )
  );
};

export const getSchedule = async (scheduleId) => {
  const schedules = await listSchedules();
  const selected = schedules.find((item) => item.id === Number(scheduleId));

  if (!selected) {
    throw new AppError('Availability schedule not found.', 404);
  }

  return selected;
};

const getDefaultSchedule = async () => {
  const schedules = await listSchedules();
  const selected = schedules.find((item) => item.isDefault) || schedules[0];
  if (!selected) {
    throw new AppError('Create an availability schedule before sharing bookings.');
  }
  return selected;
};

export const createSchedule = async (payload) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (payload.isDefault) {
      await connection.query('UPDATE availability_schedules SET is_default = FALSE WHERE user_id = ?', [DEFAULT_USER_ID]);
    }

    const [result] = await connection.query(
      'INSERT INTO availability_schedules (user_id, name, timezone, is_default) VALUES (?, ?, ?, ?)',
      [DEFAULT_USER_ID, payload.name, payload.timezone, payload.isDefault ?? false]
    );

    for (const rule of payload.rules || []) {
      await connection.query(
        'INSERT INTO availability_rules (schedule_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
        [result.insertId, rule.dayOfWeek, rule.startTime, rule.endTime]
      );
    }

    for (const overrideItem of payload.overrides || []) {
      await connection.query(
        `
          INSERT INTO availability_overrides (schedule_id, override_date, is_available, start_time, end_time, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          result.insertId,
          overrideItem.overrideDate,
          overrideItem.isAvailable,
          overrideItem.startTime || null,
          overrideItem.endTime || null,
          overrideItem.reason || null
        ]
      );
    }

    await connection.commit();
    return getSchedule(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateSchedule = async (scheduleId, payload) => {
  await getSchedule(scheduleId);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (payload.isDefault) {
      await connection.query('UPDATE availability_schedules SET is_default = FALSE WHERE user_id = ?', [DEFAULT_USER_ID]);
    }

    await connection.query(
      'UPDATE availability_schedules SET name = ?, timezone = ?, is_default = ? WHERE id = ? AND user_id = ?',
      [payload.name, payload.timezone, payload.isDefault ?? false, scheduleId, DEFAULT_USER_ID]
    );

    await connection.query('DELETE FROM availability_rules WHERE schedule_id = ?', [scheduleId]);
    await connection.query('DELETE FROM availability_overrides WHERE schedule_id = ?', [scheduleId]);

    for (const rule of payload.rules || []) {
      await connection.query(
        'INSERT INTO availability_rules (schedule_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
        [scheduleId, rule.dayOfWeek, rule.startTime, rule.endTime]
      );
    }

    for (const overrideItem of payload.overrides || []) {
      await connection.query(
        `
          INSERT INTO availability_overrides (schedule_id, override_date, is_available, start_time, end_time, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          scheduleId,
          overrideItem.overrideDate,
          overrideItem.isAvailable,
          overrideItem.startTime || null,
          overrideItem.endTime || null,
          overrideItem.reason || null
        ]
      );
    }

    await connection.commit();
    return getSchedule(scheduleId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteSchedule = async (scheduleId) => {
  const schedule = await getSchedule(scheduleId);
  if (schedule.isDefault) {
    throw new AppError('Set another default schedule before deleting this one.');
  }

  await pool.query('UPDATE event_types SET schedule_id = NULL WHERE schedule_id = ?', [scheduleId]);
  await pool.query('DELETE FROM availability_schedules WHERE id = ? AND user_id = ?', [scheduleId, DEFAULT_USER_ID]);
};

export const resolveScheduleForEvent = async (eventType) => {
  if (eventType.scheduleId) {
    return getSchedule(eventType.scheduleId);
  }

  return getDefaultSchedule();
};

const getDailyWindows = (schedule, date) => {
  const overrideItem = schedule.overrides.find((item) => item.overrideDate === date);
  if (overrideItem) {
    if (!overrideItem.isAvailable) {
      return [];
    }

    return overrideItem.startTime && overrideItem.endTime
      ? [{ startTime: overrideItem.startTime, endTime: overrideItem.endTime }]
      : [];
  }

  const dayOfWeek = dayjs.tz(`${date}T00:00:00`, schedule.timezone).day();
  return schedule.rules.filter((rule) => rule.dayOfWeek === dayOfWeek);
};

const listBusyMeetings = async (schedule, date) => {
  const dayWindow = getDayWindowInTimezone(date, schedule.timezone);
  const [rows] = await pool.query(
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
    `,
    [DEFAULT_USER_ID, formatDateTime(dayWindow.end), formatDateTime(dayWindow.start)]
  );

  return rows.map((row) => ({
    id: row.id,
    startAt: parseDbDateTime(row.start_at),
    endAt: parseDbDateTime(row.end_at),
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes
  }));
};

const buildSlots = async ({ eventType, schedule, date, ignoreMeetingId }) => {
  const windows = getDailyWindows(schedule, date);
  if (!windows.length) {
    return [];
  }

  const busyMeetings = await listBusyMeetings(schedule, date);
  const now = dayjs();
  const slots = [];

  for (const windowItem of windows) {
    let cursor = makeDateTimeInTimezone(date, windowItem.startTime, schedule.timezone);
    const windowEnd = makeDateTimeInTimezone(date, windowItem.endTime, schedule.timezone);

    while (!cursor.add(eventType.durationMinutes, 'minute').isAfter(windowEnd)) {
      const slotStart = cursor;
      const slotEnd = addMinutes(slotStart, eventType.durationMinutes);
      const slotStartWithBuffer = slotStart.subtract(eventType.bufferBeforeMinutes, 'minute');
      const slotEndWithBuffer = slotEnd.add(eventType.bufferAfterMinutes, 'minute');

      const blocked = busyMeetings.some((meeting) => {
        if (ignoreMeetingId && meeting.id === Number(ignoreMeetingId)) {
          return false;
        }

        const busyStart = meeting.startAt.subtract(meeting.bufferBeforeMinutes, 'minute');
        const busyEnd = meeting.endAt.add(meeting.bufferAfterMinutes, 'minute');
        return overlaps(slotStartWithBuffer, slotEndWithBuffer, busyStart, busyEnd);
      });

      if (!blocked && slotStart.isAfter(now)) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          label: slotStart.format('hh:mm A')
        });
      }

      cursor = cursor.add(SLOT_INCREMENT, 'minute');
    }
  }

  return slots;
};

export const getAvailabilitySummary = async (slug, month, ignoreMeetingId) => {
  const eventType = await getEventTypeBySlug(slug);
  const schedule = await resolveScheduleForEvent(eventType);

  const start = startOfMonth(month, schedule.timezone);
  const finish = endOfMonth(month, schedule.timezone);
  const dates = [];

  for (let cursor = start; cursor.isBefore(finish) || cursor.isSame(finish, 'day'); cursor = cursor.add(1, 'day')) {
    const date = formatDate(cursor, schedule.timezone);
    const slots = await buildSlots({ eventType, schedule, date, ignoreMeetingId });
    if (slots.length) {
      dates.push(date);
    }
  }

  return {
    eventType,
    schedule,
    month,
    dates
  };
};

export const getSlotsForDate = async (slug, date, ignoreMeetingId) => {
  const eventType = await getEventTypeBySlug(slug);
  const schedule = await resolveScheduleForEvent(eventType);
  const slots = await buildSlots({ eventType, schedule, date, ignoreMeetingId });

  return {
    eventType,
    schedule,
    date,
    slots
  };
};
