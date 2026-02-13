import { getDatabase } from '../database/connection';
import type {
  ForumCategory,
  ForumItem,
  PaginatedResult,
  ThreadSummary,
} from '../types/models';
import { HttpError } from '../utils/httpError';

interface CategoryRow {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
  forum_count: number;
}

interface ForumRow {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  thread_count: number;
  post_count: number;
  last_thread_id: number | null;
  last_post_time: string | null;
  sort_order: number;
}

interface ThreadRow {
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

function mapCategory(row: CategoryRow): ForumCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sortOrder: Number(row.sort_order),
    forumCount: Number(row.forum_count),
  };
}

function mapForum(row: ForumRow): ForumItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    threadCount: Number(row.thread_count),
    postCount: Number(row.post_count),
    lastThreadId: row.last_thread_id,
    lastPostTime: row.last_post_time,
    sortOrder: Number(row.sort_order),
  };
}

function mapThreadSummary(row: ThreadRow): ThreadSummary {
  return {
    id: row.id,
    forumId: row.forum_id,
    title: row.title,
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
    author: {
      id: row.user_id,
      username: row.username,
      avatar: row.avatar,
    },
  };
}

class ForumService {
  getCategories(): ForumCategory[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT c.id, c.name, c.icon, c.sort_order,
                COUNT(f.id) AS forum_count
         FROM forum_categories c
         LEFT JOIN forums f ON f.category_id = c.id AND f.is_visible = 1
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.id ASC`
      )
      .all() as CategoryRow[];

    return rows.map(mapCategory);
  }

  getForums(): ForumItem[] {
    const db = getDatabase();
    const rows = db
      .prepare(
        `SELECT f.id, f.category_id, c.name AS category_name, f.name, f.slug,
                f.description, f.icon, f.thread_count, f.post_count,
                f.last_thread_id, f.last_post_time, f.sort_order
         FROM forums f
         JOIN forum_categories c ON c.id = f.category_id
         WHERE f.is_visible = 1
         ORDER BY c.sort_order ASC, f.sort_order ASC, f.id ASC`
      )
      .all() as ForumRow[];

    return rows.map(mapForum);
  }

  getForumById(forumId: number): ForumItem {
    const db = getDatabase();
    const row = db
      .prepare(
        `SELECT f.id, f.category_id, c.name AS category_name, f.name, f.slug,
                f.description, f.icon, f.thread_count, f.post_count,
                f.last_thread_id, f.last_post_time, f.sort_order
         FROM forums f
         JOIN forum_categories c ON c.id = f.category_id
         WHERE f.id = ? AND f.is_visible = 1`
      )
      .get(forumId) as ForumRow | undefined;

    if (!row) {
      throw new HttpError(404, '板块不存在');
    }

    return mapForum(row);
  }

  getForumThreads(
    forumId: number,
    page: number,
    pageSize: number
  ): PaginatedResult<ThreadSummary> {
    const db = getDatabase();
    this.getForumById(forumId);

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const countResult = db
      .prepare('SELECT COUNT(*) AS total FROM threads WHERE forum_id = ? AND is_visible = 1')
      .get(forumId) as { total: number };
    const total = Number(countResult.total);

    const rows = db
      .prepare(
        `SELECT t.id, t.forum_id, t.title, t.content, t.type, t.is_pinned, t.is_locked,
                t.is_essence, t.view_count, t.reply_count, t.like_count, t.last_post_time,
                t.created_at, t.updated_at,
                u.id AS user_id, u.username, u.avatar
         FROM threads t
         JOIN users u ON u.id = t.user_id
         WHERE t.forum_id = ? AND t.is_visible = 1
         ORDER BY t.is_pinned DESC, COALESCE(t.last_post_time, t.created_at) DESC
         LIMIT ? OFFSET ?`
      )
      .all(forumId, safePageSize, offset) as ThreadRow[];

    return {
      items: rows.map(mapThreadSummary),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }
}

export const forumService = new ForumService();
