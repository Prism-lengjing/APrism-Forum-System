import { getDatabase } from '../database/connection';
import { pointsService } from './pointsService';
import type { AuthUser, ThreadDetail } from '../types/models';
import { HttpError } from '../utils/httpError';

interface ThreadDetailRow {
  id: number;
  forum_id: number;
  title: string;
  content: string;
  type: string;
  is_pinned: number;
  is_locked: number;
  is_essence: number;
  view_count: number;
  reply_count: number;
  like_count: number;
  last_post_time: string | null;
  created_at: string;
  updated_at: string;
  forum_name: string;
  forum_slug: string;
  user_id: number;
  username: string;
  avatar: string | null;
}

interface ThreadOwnerRow {
  id: number;
  forum_id: number;
  user_id: number;
  is_visible: number;
}

export interface CreateThreadInput {
  forumId: number;
  title: string;
  content: string;
  type?: string;
}

export interface UpdateThreadInput {
  title?: string;
  content?: string;
  type?: string;
}

function mapThreadDetail(row: ThreadDetailRow): ThreadDetail {
  return {
    id: row.id,
    forumId: row.forum_id,
    title: row.title,
    content: row.content,
    excerpt: row.content.slice(0, 160),
    type: row.type,
    isPinned: Boolean(row.is_pinned),
    isLocked: Boolean(row.is_locked),
    isEssence: Boolean(row.is_essence),
    viewCount: Number(row.view_count),
    replyCount: Number(row.reply_count),
    likeCount: Number(row.like_count),
    lastPostTime: row.last_post_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    forum: {
      id: row.forum_id,
      name: row.forum_name,
      slug: row.forum_slug,
    },
    author: {
      id: row.user_id,
      username: row.username,
      avatar: row.avatar,
    },
  };
}

class ThreadService {
  private fetchThreadById(threadId: number): ThreadDetail | null {
    const db = getDatabase();
    const row = db
      .prepare(
        `SELECT t.id, t.forum_id, t.title, t.content, t.type, t.is_pinned, t.is_locked, t.is_essence,
                t.view_count, t.reply_count, t.like_count, t.last_post_time, t.created_at, t.updated_at,
                f.name AS forum_name, f.slug AS forum_slug,
                u.id AS user_id, u.username, u.avatar
         FROM threads t
         JOIN forums f ON f.id = t.forum_id
         JOIN users u ON u.id = t.user_id
         WHERE t.id = ? AND t.is_visible = 1`
      )
      .get(threadId) as ThreadDetailRow | undefined;

    if (!row) {
      return null;
    }

    return mapThreadDetail(row);
  }

  getThreadById(threadId: number): ThreadDetail {
    const db = getDatabase();
    const updateResult = db
      .prepare('UPDATE threads SET view_count = view_count + 1 WHERE id = ? AND is_visible = 1')
      .run(threadId);

    if (updateResult.changes === 0) {
      throw new HttpError(404, '主题不存在');
    }

    const thread = this.fetchThreadById(threadId);
    if (!thread) {
      throw new HttpError(404, '主题不存在');
    }

    return thread;
  }

  createThread(input: CreateThreadInput, currentUser: AuthUser): ThreadDetail {
    const db = getDatabase();
    const type = input.type?.trim() || 'normal';
    const title = input.title.trim();
    const content = input.content.trim();

    const forum = db
      .prepare('SELECT id FROM forums WHERE id = ? AND is_visible = 1')
      .get(input.forumId) as { id: number } | undefined;
    if (!forum) {
      throw new HttpError(404, '板块不存在');
    }

    const createTx = db.transaction(() => {
      const insertResult = db
        .prepare(
          `INSERT INTO threads (forum_id, user_id, title, content, type, last_post_time)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .run(input.forumId, currentUser.id, title, content, type);

      const threadId = Number(insertResult.lastInsertRowid);

      db.prepare(
        `UPDATE forums
         SET thread_count = thread_count + 1,
             last_thread_id = ?,
             last_post_time = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(threadId, input.forumId);

      db.prepare('UPDATE users SET thread_count = thread_count + 1 WHERE id = ?').run(
        currentUser.id
      );

      pointsService.awardForThreadCreated(currentUser.id, threadId, db);

      return threadId;
    });

    const threadId = createTx();
    const created = this.fetchThreadById(threadId);
    if (!created) {
      throw new HttpError(500, '主题创建失败');
    }

    return created;
  }

  updateThread(
    threadId: number,
    input: UpdateThreadInput,
    currentUser: AuthUser
  ): ThreadDetail {
    const db = getDatabase();
    const owner = db
      .prepare('SELECT id, forum_id, user_id, is_visible FROM threads WHERE id = ?')
      .get(threadId) as ThreadOwnerRow | undefined;

    if (!owner || !Boolean(owner.is_visible)) {
      throw new HttpError(404, '主题不存在');
    }

    const isOwner = owner.user_id === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new HttpError(403, '无权修改该主题');
    }

    const current = this.fetchThreadById(threadId);
    if (!current) {
      throw new HttpError(404, '主题不存在');
    }

    const nextTitle = input.title?.trim() || current.title;
    const nextContent = input.content?.trim() || current.content;
    const nextType = input.type?.trim() || current.type;

    db.prepare(
      `UPDATE threads
       SET title = ?, content = ?, type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(nextTitle, nextContent, nextType, threadId);

    const updated = this.fetchThreadById(threadId);
    if (!updated) {
      throw new HttpError(500, '主题更新失败');
    }

    return updated;
  }

  deleteThread(threadId: number, currentUser: AuthUser): void {
    const db = getDatabase();
    const owner = db
      .prepare('SELECT id, forum_id, user_id, is_visible FROM threads WHERE id = ?')
      .get(threadId) as ThreadOwnerRow | undefined;

    if (!owner || !Boolean(owner.is_visible)) {
      throw new HttpError(404, '主题不存在');
    }

    const isOwner = owner.user_id === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new HttpError(403, '无权删除该主题');
    }

    const deleteTx = db.transaction(() => {
      db.prepare(
        `UPDATE threads
         SET is_visible = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(threadId);

      db.prepare(
        `UPDATE forums
         SET thread_count = CASE
           WHEN thread_count > 0 THEN thread_count - 1
           ELSE 0
         END
         WHERE id = ?`
      ).run(owner.forum_id);

      db.prepare(
        `UPDATE users
         SET thread_count = CASE
           WHEN thread_count > 0 THEN thread_count - 1
           ELSE 0
         END
         WHERE id = ?`
      ).run(owner.user_id);
    });

    deleteTx();
  }
}

export const threadService = new ThreadService();
