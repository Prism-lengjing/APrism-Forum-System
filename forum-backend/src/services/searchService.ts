import { getDatabase } from '../database/connection';
import type { PaginatedResult, ThreadSummary } from '../types/models';

interface ThreadSearchRow {
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
  user_id: number;
  username: string;
  avatar: string | null;
}

interface UserSearchRow {
  id: number;
  username: string;
  avatar: string | null;
  bio: string | null;
  level: number;
  experience: number;
  thread_count: number;
  post_count: number;
  created_at: string;
}

export interface SearchUserItem {
  id: number;
  username: string;
  avatar: string | null;
  bio: string | null;
  level: number;
  experience: number;
  threadCount: number;
  postCount: number;
  createdAt: string;
}

function toExcerpt(content: string, max = 160): string {
  if (content.length <= max) {
    return content;
  }
  return `${content.slice(0, max)}...`;
}

function mapThreadRow(row: ThreadSearchRow): ThreadSummary {
  return {
    id: Number(row.id),
    forumId: Number(row.forum_id),
    title: row.title,
    excerpt: toExcerpt(row.content),
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
    author: {
      id: Number(row.user_id),
      username: row.username,
      avatar: row.avatar,
    },
  };
}

function mapUserRow(row: UserSearchRow): SearchUserItem {
  return {
    id: Number(row.id),
    username: row.username,
    avatar: row.avatar,
    bio: row.bio,
    level: Number(row.level),
    experience: Number(row.experience),
    threadCount: Number(row.thread_count),
    postCount: Number(row.post_count),
    createdAt: row.created_at,
  };
}

class SearchService {
  searchThreads(
    keyword: string,
    page: number,
    pageSize: number,
    forumId?: number
  ): PaginatedResult<ThreadSummary> {
    const db = getDatabase();
    const term = keyword.trim();
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    if (term.length === 0) {
      return {
        items: [],
        page: safePage,
        pageSize: safePageSize,
        total: 0,
        totalPages: 1,
      };
    }

    const pattern = `%${term}%`;
    const hasForumFilter = typeof forumId === 'number' && forumId > 0;

    const whereBase = hasForumFilter
      ? `WHERE t.is_visible = 1
         AND t.forum_id = ?
         AND (t.title LIKE ? COLLATE NOCASE OR t.content LIKE ? COLLATE NOCASE)`
      : `WHERE t.is_visible = 1
         AND (t.title LIKE ? COLLATE NOCASE OR t.content LIKE ? COLLATE NOCASE)`;

    const countParams = hasForumFilter ? [forumId as number, pattern, pattern] : [pattern, pattern];
    const countRow = db
      .prepare(`SELECT COUNT(*) AS total FROM threads t ${whereBase}`)
      .get(...countParams) as { total: number };

    const listParams = hasForumFilter
      ? [forumId as number, pattern, pattern, safePageSize, offset]
      : [pattern, pattern, safePageSize, offset];
    const rows = db
      .prepare(
        `SELECT t.id, t.forum_id, t.title, t.content, t.type, t.is_pinned, t.is_locked, t.is_essence,
                t.view_count, t.reply_count, t.like_count, t.last_post_time, t.created_at, t.updated_at,
                u.id AS user_id, u.username, u.avatar
         FROM threads t
         JOIN users u ON u.id = t.user_id
         ${whereBase}
         ORDER BY t.is_pinned DESC, t.last_post_time DESC, t.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...listParams) as ThreadSearchRow[];

    const total = Number(countRow.total);
    return {
      items: rows.map(mapThreadRow),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  searchUsers(
    keyword: string,
    page: number,
    pageSize: number
  ): PaginatedResult<SearchUserItem> {
    const db = getDatabase();
    const term = keyword.trim();
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    if (term.length === 0) {
      return {
        items: [],
        page: safePage,
        pageSize: safePageSize,
        total: 0,
        totalPages: 1,
      };
    }

    const pattern = `%${term}%`;
    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM users
         WHERE username LIKE ? COLLATE NOCASE
            OR COALESCE(bio, '') LIKE ? COLLATE NOCASE`
      )
      .get(pattern, pattern) as { total: number };

    const rows = db
      .prepare(
        `SELECT id, username, avatar, bio, level, experience, thread_count, post_count, created_at
         FROM users
         WHERE username LIKE ? COLLATE NOCASE
            OR COALESCE(bio, '') LIKE ? COLLATE NOCASE
         ORDER BY level DESC, experience DESC, id DESC
         LIMIT ? OFFSET ?`
      )
      .all(pattern, pattern, safePageSize, offset) as UserSearchRow[];

    const total = Number(countRow.total);
    return {
      items: rows.map(mapUserRow),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }
}

export const searchService = new SearchService();
