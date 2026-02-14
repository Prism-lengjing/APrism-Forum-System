-- Phase 2: notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id INTEGER PRIMARY KEY,
  enable_thread_reply BOOLEAN DEFAULT 1,
  enable_post_reply BOOLEAN DEFAULT 1,
  enable_mention BOOLEAN DEFAULT 1,
  enable_post_liked BOOLEAN DEFAULT 1,
  enable_follow BOOLEAN DEFAULT 1,
  enable_system BOOLEAN DEFAULT 1,
  dnd_enabled BOOLEAN DEFAULT 0,
  dnd_start_hour INTEGER DEFAULT 23,
  dnd_end_hour INTEGER DEFAULT 8,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (dnd_start_hour >= 0 AND dnd_start_hour <= 23),
  CHECK (dnd_end_hour >= 0 AND dnd_end_hour <= 23)
);
