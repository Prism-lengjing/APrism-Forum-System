-- Phase 2: 积分日志表
CREATE TABLE IF NOT EXISTS point_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT,
  related_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_point_logs_user_created
ON point_logs(user_id, created_at DESC);

-- Phase 2: 每日签到表
CREATE TABLE IF NOT EXISTS daily_signins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sign_date DATE NOT NULL,
  streak INTEGER DEFAULT 1,
  points_awarded INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, sign_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_signins_user_date
ON daily_signins(user_id, sign_date DESC);
