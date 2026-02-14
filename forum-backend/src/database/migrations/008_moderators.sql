-- Phase 2: forum moderators + moderation action logs

CREATE TABLE IF NOT EXISTS forum_moderators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  forum_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  granted_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (forum_id, user_id),
  FOREIGN KEY (forum_id) REFERENCES forums(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_forum_moderators_forum
ON forum_moderators(forum_id);

CREATE INDEX IF NOT EXISTS idx_forum_moderators_user
ON forum_moderators(user_id);

CREATE TABLE IF NOT EXISTS moderator_action_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  forum_id INTEGER NOT NULL,
  thread_id INTEGER,
  moderator_user_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (forum_id) REFERENCES forums(id),
  FOREIGN KEY (thread_id) REFERENCES threads(id),
  FOREIGN KEY (moderator_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_moderator_action_logs_forum
ON moderator_action_logs(forum_id);

CREATE INDEX IF NOT EXISTS idx_moderator_action_logs_thread
ON moderator_action_logs(thread_id);

CREATE INDEX IF NOT EXISTS idx_moderator_action_logs_actor
ON moderator_action_logs(moderator_user_id);
