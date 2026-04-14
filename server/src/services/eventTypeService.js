import { DEFAULT_USER_ID } from '../config/env.js';
import { pool } from '../db/pool.js';
import { AppError } from '../utils/errors.js';
import { mapRow, safeJsonParse } from '../utils/formatters.js';

const mapEventType = (row) => {
  const item = mapRow(row);
  return {
    ...item,
    inviteeQuestions: safeJsonParse(item.inviteeQuestions, []),
    isActive: Boolean(item.isActive)
  };
};

export const listEventTypes = async () => {
  const [rows] = await pool.query(
    `
      SELECT et.*, s.name AS schedule_name
      FROM event_types et
      LEFT JOIN availability_schedules s ON s.id = et.schedule_id
      WHERE et.user_id = ?
      ORDER BY et.created_at DESC
    `,
    [DEFAULT_USER_ID]
  );

  return rows.map((row) => ({
    ...mapEventType(row),
    scheduleName: row.schedule_name
  }));
};

export const listPublicEventTypes = async () => {
  const [rows] = await pool.query(
    `
      SELECT et.*, s.name AS schedule_name, s.timezone AS schedule_timezone
      FROM event_types et
      LEFT JOIN availability_schedules s ON s.id = et.schedule_id
      WHERE et.user_id = ? AND et.is_active = TRUE
      ORDER BY et.created_at DESC
    `,
    [DEFAULT_USER_ID]
  );

  return rows.map((row) => ({
    ...mapEventType(row),
    scheduleName: row.schedule_name,
    scheduleTimezone: row.schedule_timezone
  }));
};

export const getEventTypeBySlug = async (slug) => {
  const [rows] = await pool.query(
    `
      SELECT et.*, s.name AS schedule_name, s.timezone AS schedule_timezone
      FROM event_types et
      LEFT JOIN availability_schedules s ON s.id = et.schedule_id
      WHERE et.slug = ? AND et.user_id = ? AND et.is_active = TRUE
      LIMIT 1
    `,
    [slug, DEFAULT_USER_ID]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError('Event type not found.', 404);
  }

  return {
    ...mapEventType(row),
    scheduleName: row.schedule_name,
    scheduleTimezone: row.schedule_timezone
  };
};

export const getEventTypeById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM event_types WHERE id = ? AND user_id = ? LIMIT 1', [
    id,
    DEFAULT_USER_ID
  ]);

  const row = rows[0];
  if (!row) {
    throw new AppError('Event type not found.', 404);
  }

  return mapEventType(row);
};

const assertSlugAvailable = async (slug, excludeId) => {
  const [rows] = await pool.query('SELECT id FROM event_types WHERE slug = ? AND id <> ? LIMIT 1', [slug, excludeId || 0]);
  if (rows.length) {
    throw new AppError('Slug is already in use. Please choose another one.');
  }
};

export const createEventType = async (payload) => {
  await assertSlugAvailable(payload.slug);

  const [result] = await pool.query(
    `
      INSERT INTO event_types (
        user_id, schedule_id, name, slug, duration_minutes, color, description, location,
        buffer_before_minutes, buffer_after_minutes, invitee_questions, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      DEFAULT_USER_ID,
      payload.scheduleId || null,
      payload.name,
      payload.slug,
      payload.durationMinutes,
      payload.color,
      payload.description || null,
      payload.location || 'Google Meet',
      payload.bufferBeforeMinutes || 0,
      payload.bufferAfterMinutes || 0,
      JSON.stringify(payload.inviteeQuestions || []),
      payload.isActive ?? true
    ]
  );

  return getEventTypeById(result.insertId);
};

export const updateEventType = async (id, payload) => {
  await getEventTypeById(id);
  await assertSlugAvailable(payload.slug, id);

  await pool.query(
    `
      UPDATE event_types
      SET schedule_id = ?, name = ?, slug = ?, duration_minutes = ?, color = ?, description = ?, location = ?,
          buffer_before_minutes = ?, buffer_after_minutes = ?, invitee_questions = ?, is_active = ?
      WHERE id = ? AND user_id = ?
    `,
    [
      payload.scheduleId || null,
      payload.name,
      payload.slug,
      payload.durationMinutes,
      payload.color,
      payload.description || null,
      payload.location || 'Google Meet',
      payload.bufferBeforeMinutes || 0,
      payload.bufferAfterMinutes || 0,
      JSON.stringify(payload.inviteeQuestions || []),
      payload.isActive ?? true,
      id,
      DEFAULT_USER_ID
    ]
  );

  return getEventTypeById(id);
};

export const deleteEventType = async (id) => {
  await getEventTypeById(id);
  await pool.query('DELETE FROM event_types WHERE id = ? AND user_id = ?', [id, DEFAULT_USER_ID]);
};
