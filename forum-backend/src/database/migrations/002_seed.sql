-- 插入论坛分类
INSERT OR IGNORE INTO forum_categories (id, name, icon, sort_order) VALUES
(1, '技术交流', '💻', 1),
(2, '生活闲聊', '🎉', 2),
(3, '公告专区', '📢', 0);

-- 插入板块
INSERT OR IGNORE INTO forums (id, category_id, name, slug, description, icon, sort_order) VALUES
(1, 1, 'JavaScript', 'javascript', 'JavaScript 技术讨论、前端框架、Node.js等', '🟨', 1),
(2, 1, 'Python', 'python', 'Python 开发、数据科学、机器学习等', '🐍', 2),
(3, 1, '数据库', 'database', 'MySQL、PostgreSQL、MongoDB等数据库技术', '🗄️', 3),
(4, 2, '水吧', 'chat', '轻松聊天，分享生活', '💬', 1),
(5, 2, '新人报道', 'newcomer', '新人自我介绍', '👋', 2),
(6, 3, '站务公告', 'announcements', '论坛公告、规则说明', '📋', 1);

-- 插入测试用户（密码都是：password123）
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, level, experience) VALUES
(1, 'admin', 'admin@forum.com', '$2b$10$AHOGDl9pJTx0OIIOMMRU7OVIxM1NrcxKMceX3FraPTJ6U93UwGp.e', 'admin', 10, 5000),
(2, 'testuser', 'test@forum.com', '$2b$10$AHOGDl9pJTx0OIIOMMRU7OVIxM1NrcxKMceX3FraPTJ6U93UwGp.e', 'user', 1, 0);

-- 插入测试主题
INSERT OR IGNORE INTO threads (id, forum_id, user_id, title, content, view_count, reply_count, last_post_time) VALUES
(1, 1, 1, '欢迎来到JavaScript板块', '这里是JavaScript技术交流的地方，欢迎大家分享经验！', 100, 5, CURRENT_TIMESTAMP),
(2, 4, 2, '新人报道帖', '大家好，我是新来的，请多关照！', 50, 3, CURRENT_TIMESTAMP);
