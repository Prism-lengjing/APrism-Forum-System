-- Phase 2: search indexes (SQLite LIKE-based search)

CREATE INDEX IF NOT EXISTS idx_threads_title
ON threads(title);

CREATE INDEX IF NOT EXISTS idx_threads_content
ON threads(content);

CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_bio
ON users(bio);
