import { getDatabase } from '../database/connection';
import { pointsService } from './pointsService';
import type { AuthUser, PaginatedResult, PostItem } from '../types/models';
import { HttpError } from '../utils/httpError';

interface ThreadCheckRow {
  id: number;
  forum_id: number;
  user_id: number;
  is_locked: number;
}

interface PostRow {
  id: number;
  thread_id: number;
  user_id: number;
  content: string;
  floor: number;
  parent_id: number | null;
  is_thread_author: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  username: string;
  avatar: string | null;
  level: number;
  post_count: number;
}

export interface CreatePostInput {
  threadId: number;
  content: string;
  parentId?: number;
}

function mapPost(row: PostRow): PostItem {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    content: row.content,
    floor: Number(row.floor),
    parentId: row.parent_id,
    isThreadAuthor: Boolean(row.is_thread_author),
    likeCount: Number(row.like_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.user_id,
      username: row.username,
      avatar: row.avatar,
      level: Number(row.level),
      postCount: Number(row.post_count),
    },
  };
}

class PostService {
  private getThreadOrFail(threadId: number): ThreadCheckRow {
    const db = getDatabase();
    const thread = db
      .prepare('SELECT id, forum_id, user_id, is_locked FROM threads WHERE id = ? AND is_visible = 1')
      .get(threadId) as ThreadCheckRow | undefined;

    if (!thread) {
      throw new HttpError(404, '主题不存在');
    }

    return thread;
  }

  private getPostById(postId: number): PostItem {
    const db = getDatabase();
    const row = db
      .prepare(
        `SELECT p.id, p.thread_id, p.user_id, p.content, p.floor, p.parent_id,
                p.is_thread_author, p.like_count, p.created_at, p.updated_at,
                u.username, u.avatar, u.level, u.post_count
         FROM posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.id = ? AND p.is_visible = 1`
      )
      .get(postId) as PostRow | undefined;

    if (!row) {
      throw new HttpError(404, '帖子不存在');
    }

    return mapPost(row);
  }

  getThreadPosts(
    threadId: number,
    page: number,
    pageSize: number
  ): PaginatedResult<PostItem> {
    const db = getDatabase();
    this.getThreadOrFail(threadId);

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const countResult = db
      .prepare('SELECT COUNT(*) AS total FROM posts WHERE thread_id = ? AND is_visible = 1')
      .get(threadId) as { total: number };
    const total = Number(countResult.total);

    const rows = db
      .prepare(
        `SELECT p.id, p.thread_id, p.user_id, p.content, p.floor, p.parent_id,
                p.is_thread_author, p.like_count, p.created_at, p.updated_at,
                u.username, u.avatar, u.level, u.post_count
         FROM posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.thread_id = ? AND p.is_visible = 1
         ORDER BY p.floor ASC
         LIMIT ? OFFSET ?`
      )
      .all(threadId, safePageSize, offset) as PostRow[];

    return {
      items: rows.map(mapPost),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  createPost(input: CreatePostInput, currentUser: AuthUser): PostItem {
    const db = getDatabase();
    const threadId = input.threadId;
    const content = input.content.trim();
    const parentId = input.parentId;

    const createTx = db.transaction(() => {
      const thread = this.getThreadOrFail(threadId);
      if (Boolean(thread.is_locked)) {
        throw new HttpError(400, '主题已锁定，无法回复');
      }

      if (typeof parentId === 'number') {
        const parentPost = db
          .prepare('SELECT id FROM posts WHERE id = ? AND thread_id = ? AND is_visible = 1')
          .get(parentId, threadId) as { id: number } | undefined;
        if (!parentPost) {
          throw new HttpError(404, '引用的帖子不存在');
        }
      }

      const floorResult = db
        .prepare('SELECT COALESCE(MAX(floor), 0) AS max_floor FROM posts WHERE thread_id = ?')
        .get(threadId) as { max_floor: number };
      const nextFloor = Number(floorResult.max_floor) + 1;

      const insertResult = db
        .prepare(
          `INSERT INTO posts (thread_id, user_id, content, floor, parent_id, is_thread_author)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          threadId,
          currentUser.id,
          content,
          nextFloor,
          parentId ?? null,
          thread.user_id === currentUser.id ? 1 : 0
        );

      const postId = Number(insertResult.lastInsertRowid);

      db.prepare(
        `UPDATE threads
         SET reply_count = reply_count + 1,
             last_post_id = ?,
             last_post_user_id = ?,
             last_post_time = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(postId, currentUser.id, threadId);

      db.prepare(
        `UPDATE forums
         SET post_count = post_count + 1,
             last_post_time = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(thread.forum_id);

      db.prepare('UPDATE users SET post_count = post_count + 1 WHERE id = ?').run(
        currentUser.id
      );

      pointsService.awardForPostCreated(currentUser.id, postId, db);

      return postId;
    });

    const postId = createTx();
    return this.getPostById(postId);
  }

  likePost(postId: number): { postId: number; likeCount: number } {
    const db = getDatabase();
    const updateResult = db
      .prepare(
        `UPDATE posts
         SET like_count = like_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND is_visible = 1`
      )
      .run(postId);

    if (updateResult.changes === 0) {
      throw new HttpError(404, '帖子不存在');
    }

    const row = db
      .prepare('SELECT like_count FROM posts WHERE id = ?')
      .get(postId) as { like_count: number };

    return {
      postId,
      likeCount: Number(row.like_count),
    };
  }
}

export const postService = new PostService();
