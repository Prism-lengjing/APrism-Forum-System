import type Database from 'better-sqlite3';
import { getDatabase } from '../database/connection';
import type { PaginatedResult } from '../types/models';
import { HttpError } from '../utils/httpError';

interface ForumExistsRow {
  id: number;
}

interface UserExistsRow {
  id: number;
}

interface ModeratorRow {
  user_id: number;
  username: string;
  avatar: string | null;
  granted_by: number;
  granted_by_username: string;
  created_at: string;
}

export interface ForumModerator {
  userId: number;
  username: string;
  avatar: string | null;
  grantedBy: number;
  grantedByUsername: string;
  createdAt: string;
}

interface LogActionInput {
  forumId: number;
  threadId?: number;
  moderatorUserId: number;
  action: string;
  detail?: string;
}

interface ModeratorActionLogRow {
  id: number;
  forum_id: number;
  thread_id: number | null;
  moderator_user_id: number;
  action: string;
  detail: string | null;
  created_at: string;
  moderator_username: string;
  moderator_avatar: string | null;
}

export interface ModeratorActionLogItem {
  id: number;
  forumId: number;
  threadId: number | null;
  moderatorUserId: number;
  action: string;
  detail: string | null;
  createdAt: string;
  moderator: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

function mapModerator(row: ModeratorRow): ForumModerator {
  return {
    userId: Number(row.user_id),
    username: row.username,
    avatar: row.avatar,
    grantedBy: Number(row.granted_by),
    grantedByUsername: row.granted_by_username,
    createdAt: row.created_at,
  };
}

function mapActionLog(row: ModeratorActionLogRow): ModeratorActionLogItem {
  return {
    id: Number(row.id),
    forumId: Number(row.forum_id),
    threadId: row.thread_id === null ? null : Number(row.thread_id),
    moderatorUserId: Number(row.moderator_user_id),
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
    moderator: {
      id: Number(row.moderator_user_id),
      username: row.moderator_username,
      avatar: row.moderator_avatar,
    },
  };
}

class ModerationService {
  private ensureForumExists(
    forumId: number,
    db: Database.Database = getDatabase()
  ): void {
    const row = db
      .prepare('SELECT id FROM forums WHERE id = ? AND is_visible = 1')
      .get(forumId) as ForumExistsRow | undefined;
    if (!row) {
      throw new HttpError(404, 'Forum not found');
    }
  }

  private ensureUserExists(
    userId: number,
    db: Database.Database = getDatabase()
  ): void {
    const row = db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(userId) as UserExistsRow | undefined;
    if (!row) {
      throw new HttpError(404, 'User not found');
    }
  }

  listForumModerators(
    forumId: number,
    db: Database.Database = getDatabase()
  ): ForumModerator[] {
    this.ensureForumExists(forumId, db);

    const rows = db
      .prepare(
        `SELECT fm.user_id, u.username, u.avatar,
                fm.granted_by, gu.username AS granted_by_username,
                fm.created_at
         FROM forum_moderators fm
         JOIN users u ON u.id = fm.user_id
         JOIN users gu ON gu.id = fm.granted_by
         WHERE fm.forum_id = ?
         ORDER BY fm.created_at ASC, fm.user_id ASC`
      )
      .all(forumId) as ModeratorRow[];

    return rows.map(mapModerator);
  }

  listActionLogs(
    forumId: number,
    page: number,
    pageSize: number,
    db: Database.Database = getDatabase()
  ): PaginatedResult<ModeratorActionLogItem> {
    this.ensureForumExists(forumId, db);

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM moderator_action_logs
         WHERE forum_id = ?`
      )
      .get(forumId) as { total: number };

    const rows = db
      .prepare(
        `SELECT l.id, l.forum_id, l.thread_id, l.moderator_user_id,
                l.action, l.detail, l.created_at,
                u.username AS moderator_username,
                u.avatar AS moderator_avatar
         FROM moderator_action_logs l
         JOIN users u ON u.id = l.moderator_user_id
         WHERE l.forum_id = ?
         ORDER BY l.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(forumId, safePageSize, offset) as ModeratorActionLogRow[];

    const total = Number(countRow.total);
    return {
      items: rows.map(mapActionLog),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  assignModerator(
    forumId: number,
    userId: number,
    grantedBy: number,
    db: Database.Database = getDatabase()
  ): ForumModerator {
    this.ensureForumExists(forumId, db);
    this.ensureUserExists(userId, db);
    this.ensureUserExists(grantedBy, db);

    if (userId === grantedBy) {
      throw new HttpError(400, 'Cannot assign yourself as moderator');
    }

    const existing = db
      .prepare('SELECT 1 AS hit FROM forum_moderators WHERE forum_id = ? AND user_id = ?')
      .get(forumId, userId) as { hit: number } | undefined;
    if (existing) {
      throw new HttpError(409, 'Moderator already assigned');
    }

    db.prepare(
      `INSERT INTO forum_moderators (forum_id, user_id, granted_by)
       VALUES (?, ?, ?)`
    ).run(forumId, userId, grantedBy);

    const result = this.listForumModerators(forumId, db).find(
      (item) => item.userId === userId
    );
    if (!result) {
      throw new HttpError(500, 'Moderator assignment failed');
    }
    return result;
  }

  removeModerator(
    forumId: number,
    userId: number,
    db: Database.Database = getDatabase()
  ): { removed: boolean } {
    this.ensureForumExists(forumId, db);

    const removed = db
      .prepare('DELETE FROM forum_moderators WHERE forum_id = ? AND user_id = ?')
      .run(forumId, userId);

    if (removed.changes === 0) {
      throw new HttpError(404, 'Moderator assignment not found');
    }

    return { removed: true };
  }

  isModerator(
    forumId: number,
    userId: number,
    db: Database.Database = getDatabase()
  ): boolean {
    const row = db
      .prepare(
        'SELECT 1 AS hit FROM forum_moderators WHERE forum_id = ? AND user_id = ?'
      )
      .get(forumId, userId) as { hit: number } | undefined;
    return Boolean(row);
  }

  logAction(
    input: LogActionInput,
    db: Database.Database = getDatabase()
  ): void {
    db.prepare(
      `INSERT INTO moderator_action_logs
        (forum_id, thread_id, moderator_user_id, action, detail)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      input.forumId,
      typeof input.threadId === 'number' ? input.threadId : null,
      input.moderatorUserId,
      input.action,
      input.detail ?? null
    );
  }
}

export const moderationService = new ModerationService();
