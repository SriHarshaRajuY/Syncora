USE railway;

INSERT INTO users (id, name, email, timezone)
VALUES (1, 'Aarav Sharma', 'aarav@example.com', 'Asia/Kolkata')
ON DUPLICATE KEY UPDATE name = VALUES(name), timezone = VALUES(timezone);

INSERT INTO availability_schedules (id, user_id, name, timezone, is_default)
VALUES
  (1, 1, 'Weekday Focus', 'Asia/Kolkata', TRUE),
  (2, 1, 'Global Evenings', 'Asia/Kolkata', FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name), timezone = VALUES(timezone), is_default = VALUES(is_default);

DELETE FROM availability_rules WHERE schedule_id IN (1, 2);
INSERT INTO availability_rules (schedule_id, day_of_week, start_time, end_time)
VALUES
  (1, 1, '09:00:00', '17:00:00'),
  (1, 2, '09:00:00', '17:00:00'),
  (1, 3, '09:00:00', '17:00:00'),
  (1, 4, '09:00:00', '17:00:00'),
  (1, 5, '09:00:00', '17:00:00'),
  (2, 1, '18:00:00', '21:00:00'),
  (2, 2, '18:00:00', '21:00:00'),
  (2, 3, '18:00:00', '21:00:00'),
  (2, 4, '18:00:00', '21:00:00'),
  (2, 5, '18:00:00', '21:00:00');

INSERT INTO availability_overrides (schedule_id, override_date, is_available, start_time, end_time, reason)
VALUES
  (1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), TRUE, '11:00:00', '15:00:00', 'Workshop day'),
  (1, DATE_ADD(CURDATE(), INTERVAL 5 DAY), FALSE, NULL, NULL, 'Personal day')
ON DUPLICATE KEY UPDATE
  is_available = VALUES(is_available),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  reason = VALUES(reason);

INSERT INTO event_types (
  id, user_id, schedule_id, name, slug, duration_minutes, color, description, location,
  buffer_before_minutes, buffer_after_minutes, invitee_questions, is_active
)
VALUES
  (
    1, 1, 1, 'Intro Call', 'intro-call', 30, '#0f766e',
    'A crisp first conversation for introductions, goals, and next steps.',
    'Google Meet', 10, 10,
    JSON_ARRAY(
      JSON_OBJECT('label', 'What would you like to discuss?', 'type', 'text', 'required', TRUE),
      JSON_OBJECT('label', 'Company / University', 'type', 'text', 'required', FALSE)
    ),
    TRUE
  ),
  (
    2, 1, 2, 'Deep Dive Session', 'deep-dive-session', 60, '#2563eb',
    'Longer strategy or portfolio review with more preparation time.',
    'Zoom', 15, 15,
    JSON_ARRAY(
      JSON_OBJECT('label', 'Please share your agenda', 'type', 'textarea', 'required', TRUE)
    ),
    TRUE
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  schedule_id = VALUES(schedule_id),
  duration_minutes = VALUES(duration_minutes),
  color = VALUES(color),
  description = VALUES(description),
  location = VALUES(location),
  buffer_before_minutes = VALUES(buffer_before_minutes),
  buffer_after_minutes = VALUES(buffer_after_minutes),
  invitee_questions = VALUES(invitee_questions),
  is_active = VALUES(is_active);

DELETE FROM meetings WHERE id IN (1, 2);
INSERT INTO meetings (
  id, event_type_id, invitee_name, invitee_email, invitee_answers, start_at, end_at, timezone, status,
  cancellation_reason, cancelled_at, reschedule_token
)
VALUES
  (
    1, 1, 'Neha Verma', 'neha@example.com',
    JSON_OBJECT('What would you like to discuss?', 'Product roadmap', 'Company / University', 'Scaler'),
    TIMESTAMP(CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d'), ' 10:00:00')),
    TIMESTAMP(CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d'), ' 10:30:00')),
    'Asia/Kolkata', 'scheduled', NULL, NULL, 'seed-upcoming-token'
  ),
  (
    2, 2, 'Rohan Iyer', 'rohan@example.com',
    JSON_OBJECT('Please share your agenda', 'Portfolio review'),
    TIMESTAMP(CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '%Y-%m-%d'), ' 18:30:00')),
    TIMESTAMP(CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '%Y-%m-%d'), ' 19:30:00')),
    'Asia/Kolkata', 'scheduled', NULL, NULL, 'seed-past-token'
  )
ON DUPLICATE KEY UPDATE
  invitee_name = VALUES(invitee_name),
  invitee_email = VALUES(invitee_email),
  invitee_answers = VALUES(invitee_answers),
  start_at = VALUES(start_at),
  end_at = VALUES(end_at),
  timezone = VALUES(timezone),
  status = VALUES(status),
  reschedule_token = VALUES(reschedule_token);

