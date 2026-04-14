CREATE DATABASE IF NOT EXISTS scaler_scheduler;
USE scaler_scheduler;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS availability_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_schedule_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  day_of_week TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT fk_rule_schedule FOREIGN KEY (schedule_id) REFERENCES availability_schedules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS availability_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  start_time TIME NULL,
  end_time TIME NULL,
  reason VARCHAR(255) NULL,
  CONSTRAINT uq_schedule_override UNIQUE (schedule_id, override_date),
  CONSTRAINT fk_override_schedule FOREIGN KEY (schedule_id) REFERENCES availability_schedules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  schedule_id INT NULL,
  name VARCHAR(140) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  duration_minutes INT NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#0f766e',
  description TEXT NULL,
  location VARCHAR(180) NOT NULL DEFAULT 'Google Meet',
  buffer_before_minutes INT NOT NULL DEFAULT 0,
  buffer_after_minutes INT NOT NULL DEFAULT 0,
  invitee_questions JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_schedule FOREIGN KEY (schedule_id) REFERENCES availability_schedules(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type_id INT NOT NULL,
  invitee_name VARCHAR(140) NOT NULL,
  invitee_email VARCHAR(180) NOT NULL,
  invitee_answers JSON NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  status ENUM('scheduled', 'cancelled') NOT NULL DEFAULT 'scheduled',
  cancellation_reason VARCHAR(255) NULL,
  cancelled_at DATETIME NULL,
  reschedule_token VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_meeting_event FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
);

CREATE INDEX idx_rules_schedule_day ON availability_rules(schedule_id, day_of_week);
CREATE INDEX idx_meetings_lookup ON meetings(event_type_id, start_at, status);

