-- Phase 2: 勋章表
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT DEFAULT NULL,
  icon VARCHAR(255) DEFAULT NULL,
  type VARCHAR(20) DEFAULT 'achievement',
  condition_type VARCHAR(50) DEFAULT NULL,
  condition_value INTEGER DEFAULT NULL,
  color VARCHAR(7) DEFAULT '#FFD700',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_badges_slug ON badges(slug);
CREATE INDEX IF NOT EXISTS idx_badges_sort ON badges(sort_order, id);

-- Phase 2: 用户勋章表
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, awarded_at DESC);

-- 默认勋章
INSERT OR IGNORE INTO badges
  (name, slug, description, icon, type, condition_type, condition_value, color, sort_order)
VALUES
  ('初次发帖', 'first-thread', '发布第一个主题', '🧵', 'achievement', 'thread_count', 1, '#3B82F6', 10),
  ('初次回复', 'first-post', '发布第一条回复', '💬', 'achievement', 'post_count', 1, '#10B981', 20),
  ('成长达人', 'level-5', '达到 Lv.5', '⭐', 'achievement', 'level', 5, '#F59E0B', 30),
  ('签到一周', 'signin-streak-7', '连续签到 7 天', '🔥', 'achievement', 'signin_streak', 7, '#EF4444', 40);
