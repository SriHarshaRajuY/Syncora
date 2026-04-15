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

const DEFAULT_ADVANCED_SETTINGS = {
  maxMeetingsPerDay: 4,
  maxMeetingsPerWeek: 12,
  holidayCountry: 'India',
  autoBlockHolidays: false
};

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

const mapAdvancedSettings = (row) => {
  if (!row) {
    return { ...DEFAULT_ADVANCED_SETTINGS };
  }

  const item = mapRow(row);
  return {
    maxMeetingsPerDay: item.maxMeetingsPerDay ? Number(item.maxMeetingsPerDay) : null,
    maxMeetingsPerWeek: item.maxMeetingsPerWeek ? Number(item.maxMeetingsPerWeek) : null,
    holidayCountry: item.holidayCountry || DEFAULT_ADVANCED_SETTINGS.holidayCountry,
    autoBlockHolidays: Boolean(item.autoBlockHolidays)
  };
};

const normalizeLimit = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getNthWeekdayOfMonth = (year, month, weekday, occurrence) => {
  let cursor = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);

  while (cursor.day() !== weekday) {
    cursor = cursor.add(1, 'day');
  }

  return cursor.add(occurrence - 1, 'week').format('YYYY-MM-DD');
};

const getHolidayCatalog = (country, year) => {
  const catalogs = {
    India: [
      { date: `${year}-01-01`, label: "New Year's Day" },
      { date: `${year}-01-26`, label: 'Republic Day' },
      { date: `${year}-08-15`, label: 'Independence Day' },
      { date: `${year}-10-02`, label: 'Gandhi Jayanti' },
      { date: `${year}-12-25`, label: 'Christmas Day' }
    ],
    'United States': [
      { date: `${year}-01-01`, label: "New Year's Day" },
      { date: `${year}-07-04`, label: 'Independence Day' },
      { date: `${year}-11-11`, label: 'Veterans Day' },
      { date: getNthWeekdayOfMonth(year, 11, 4, 4), label: 'Thanksgiving' },
      { date: `${year}-12-25`, label: 'Christmas Day' }
    ]
  };

  return catalogs[country] || [];
};

const getHolidayLabel = (date, country) => {
  const year = Number(date.slice(0, 4));
  const holiday = getHolidayCatalog(country, year).find((item) => item.date === date);
  return holiday?.label || null;
};

const countMeetingsInRange = async ({ start, end, ignoreMeetingId, connection }) => {
  const runner = connection || pool;
  const params = [DEFAULT_USER_ID, formatDateTime(start), formatDateTime(end)];
  const exclusionSql = ignoreMeetingId ? 'AND m.id <> ?' : '';

  if (ignoreMeetingId) {
    params.push(Number(ignoreMeetingId));
  }

  const [rows] = await runner.query(
    `
      SELECT COUNT(*) AS total
      FROM meetings m
      INNER JOIN event_types et ON et.id = m.event_type_id
      WHERE et.user_id = ?
        AND m.status = 'scheduled'
        AND m.start_at >= ?
        AND m.start_at < ?
        ${exclusionSql}
    `,
    params
  );

  return Number(rows[0]?.total || 0);
};

const getWeekWindowInTimezone = (date, timezoneName) => {
  const start = dayjs.tz(`${date}T00:00:00`, timezoneName).startOf('week');
  return {
    start,
    end: start.add(1, 'week')
  };
};

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

export const getAdvancedSettings = async () => {
  const [rows] = await pool.query('SELECT * FROM availability_settings WHERE user_id = ? LIMIT 1', [DEFAULT_USER_ID]);
  return mapAdvancedSettings(rows[0]);
};

export const updateAdvancedSettings = async (payload) => {
  const normalized = {
    maxMeetingsPerDay: normalizeLimit(payload.maxMeetingsPerDay),
    maxMeetingsPerWeek: normalizeLimit(payload.maxMeetingsPerWeek),
    holidayCountry: payload.holidayCountry || DEFAULT_ADVANCED_SETTINGS.holidayCountry,
    autoBlockHolidays: Boolean(payload.autoBlockHolidays)
  };

  await pool.query(
    `
      INSERT INTO availability_settings (user_id, max_meetings_per_day, max_meetings_per_week, holiday_country, auto_block_holidays)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        max_meetings_per_day = VALUES(max_meetings_per_day),
        max_meetings_per_week = VALUES(max_meetings_per_week),
        holiday_country = VALUES(holiday_country),
        auto_block_holidays = VALUES(auto_block_holidays)
    `,
    [
      DEFAULT_USER_ID,
      normalized.maxMeetingsPerDay,
      normalized.maxMeetingsPerWeek,
      normalized.holidayCountry,
      normalized.autoBlockHolidays
    ]
  );

  return getAdvancedSettings();
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

export const getAdvancedAvailabilityState = async ({ date, schedule, ignoreMeetingId, connection }) => {
  const settings = await getAdvancedSettings();
  const state = {
    settings,
    holidayLabel: null,
    dailyLimitReached: false,
    weeklyLimitReached: false
  };

  if (settings.autoBlockHolidays) {
    state.holidayLabel = getHolidayLabel(date, settings.holidayCountry);
  }

  if (settings.maxMeetingsPerDay) {
    const dayWindow = getDayWindowInTimezone(date, schedule.timezone);
    const dailyCount = await countMeetingsInRange({
      start: dayWindow.start,
      end: dayWindow.end,
      ignoreMeetingId,
      connection
    });
    state.dailyLimitReached = dailyCount >= settings.maxMeetingsPerDay;
  }

  if (settings.maxMeetingsPerWeek) {
    const weekWindow = getWeekWindowInTimezone(date, schedule.timezone);
    const weeklyCount = await countMeetingsInRange({
      start: weekWindow.start,
      end: weekWindow.end,
      ignoreMeetingId,
      connection
    });
    state.weeklyLimitReached = weeklyCount >= settings.maxMeetingsPerWeek;
  }

  return state;
};

export const assertDateBookableWithAdvancedSettings = async (options) => {
  const state = await getAdvancedAvailabilityState(options);

  if (state.holidayLabel) {
    throw new AppError(`${state.holidayLabel} is blocked in advanced availability settings.`, 409);
  }

  if (state.dailyLimitReached) {
    throw new AppError('The daily meeting limit has been reached for this date.', 409);
  }

  if (state.weeklyLimitReached) {
    throw new AppError('The weekly meeting limit has been reached for this week.', 409);
  }

  return state;
};

const buildSlots = async ({ eventType, schedule, date, ignoreMeetingId }) => {
  const windows = getDailyWindows(schedule, date);
  if (!windows.length) {
    return [];
  }

  const advancedState = await getAdvancedAvailabilityState({ date, schedule, ignoreMeetingId });
  if (advancedState.holidayLabel || advancedState.dailyLimitReached || advancedState.weeklyLimitReached) {
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
