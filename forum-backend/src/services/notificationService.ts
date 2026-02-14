import type Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import { getDatabase } from '../database/connection';
import type { PaginatedResult } from '../types/models';
import { HttpError } from '../utils/httpError';

interface NotificationRow {
  id: number;
  user_id: number;
  actor_user_id: number | null;
  type: string;
  title: string;
  content: string | null;
  related_type: string | null;
  related_id: number | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
  actor_username: string | null;
  actor_avatar: string | null;
}

interface ThreadOwnerRow {
  user_id: number;
  title: string;
}

interface ParentPostRow {
  user_id: number;
}

interface MentionUserRow {
  id: number;
  username: string;
}

interface PostLikeTargetRow {
  thread_id: number;
  user_id: number;
  content: string;
}

interface NotificationSettingsRow {
  user_id: number;
  enable_thread_reply: number;
  enable_post_reply: number;
  enable_mention: number;
  enable_post_liked: number;
  enable_follow: number;
  enable_system: number;
  dnd_enabled: number;
  dnd_start_hour: number;
  dnd_end_hour: number;
  updated_at: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  actorUserId: number | null;
  type: string;
  title: string;
  content: string | null;
  relatedType: string | null;
  relatedId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    avatar: string | null;
  } | null;
}

export interface CreateNotificationInput {
  userId: number;
  actorUserId?: number | null;
  type: string;
  title: string;
  content?: string | null;
  relatedType?: string | null;
  relatedId?: number | null;
}

export interface NotificationEventPayload {
  type: 'notification_created' | 'notification_read' | 'notification_read_all';
  userId: number;
  notificationId?: number;
  unreadCount: number;
  createdAt: string;
}

export interface MarkAllReadResult {
  updated: number;
  unreadCount: number;
}

export interface NotificationSettings {
  userId: number;
  threadReplyEnabled: boolean;
  postReplyEnabled: boolean;
  mentionEnabled: boolean;
  postLikedEnabled: boolean;
  followEnabled: boolean;
  systemEnabled: boolean;
  dndEnabled: boolean;
  dndStartHour: number;
  dndEndHour: number;
  updatedAt: string;
}

export interface UpdateNotificationSettingsInput {
  threadReplyEnabled?: boolean;
  postReplyEnabled?: boolean;
  mentionEnabled?: boolean;
  postLikedEnabled?: boolean;
  followEnabled?: boolean;
  systemEnabled?: boolean;
  dndEnabled?: boolean;
  dndStartHour?: number;
  dndEndHour?: number;
}

interface NotifyPostCreatedInput {
  threadId: number;
  postId: number;
  parentId?: number;
  postAuthorId: number;
  content: string;
}

interface NotifyPostLikedInput {
  postId: number;
  actorUserId: number;
}

function preview(content: string, max = 140): string {
  const value = content.trim();
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}...`;
}

function extractMentionUsernames(content: string): string[] {
  const result = new Set<string>();
  const regex = /@([\p{L}\p{N}_-]{2,50})/gu;
  let match: RegExpExecArray | null = regex.exec(content);
  while (match) {
    result.add(match[1]);
    match = regex.exec(content);
  }
  return Array.from(result);
}

function mapNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    actorUserId: row.actor_user_id,
    type: row.type,
    title: row.title,
    content: row.content,
    relatedType: row.related_type,
    relatedId: row.related_id,
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
    createdAt: row.created_at,
    actor:
      row.actor_user_id && row.actor_username
        ? {
            id: Number(row.actor_user_id),
            username: row.actor_username,
            avatar: row.actor_avatar,
          }
        : null,
  };
}

function mapSettings(row: NotificationSettingsRow): NotificationSettings {
  return {
    userId: Number(row.user_id),
    threadReplyEnabled: Boolean(row.enable_thread_reply),
    postReplyEnabled: Boolean(row.enable_post_reply),
    mentionEnabled: Boolean(row.enable_mention),
    postLikedEnabled: Boolean(row.enable_post_liked),
    followEnabled: Boolean(row.enable_follow),
    systemEnabled: Boolean(row.enable_system),
    dndEnabled: Boolean(row.dnd_enabled),
    dndStartHour: Number(row.dnd_start_hour),
    dndEndHour: Number(row.dnd_end_hour),
    updatedAt: row.updated_at,
  };
}

class NotificationService {
  private events = new EventEmitter();

  constructor() {
    this.events.setMaxListeners(0);
  }

  private ensureUser(userId: number, db: Database.Database): void {
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as
      | { id: number }
      | undefined;
    if (!row) {
      throw new HttpError(404, 'User not found');
    }
  }

  subscribe(
    userId: number,
    listener: (payload: NotificationEventPayload) => void
  ): () => void {
    const key = `notifications:${userId}`;
    this.events.on(key, listener);
    return () => {
      this.events.off(key, listener);
    };
  }

  private emitEvent(
    userId: number,
    type: NotificationEventPayload['type'],
    notificationId?: number,
    db: Database.Database = getDatabase()
  ): void {
    const payload: NotificationEventPayload = {
      type,
      userId,
      notificationId,
      unreadCount: this.getUnreadCount(userId, db),
      createdAt: new Date().toISOString(),
    };
    this.events.emit(`notifications:${userId}`, payload);
  }

  private ensureSettingsRow(userId: number, db: Database.Database): void {
    this.ensureUser(userId, db);
    db.prepare('INSERT OR IGNORE INTO notification_settings (user_id) VALUES (?)').run(userId);
  }

  private getSettingsRow(userId: number, db: Database.Database): NotificationSettingsRow {
    this.ensureSettingsRow(userId, db);
    const row = db
      .prepare(
        `SELECT user_id, enable_thread_reply, enable_post_reply, enable_mention,
                enable_post_liked, enable_follow, enable_system,
                dnd_enabled, dnd_start_hour, dnd_end_hour, updated_at
         FROM notification_settings
         WHERE user_id = ?`
      )
      .get(userId) as NotificationSettingsRow | undefined;

    if (!row) {
      throw new HttpError(500, 'Notification settings load failed');
    }
    return row;
  }

  private isTypeEnabled(type: string, settings: NotificationSettings): boolean {
    if (type === 'thread_reply') {
      return settings.threadReplyEnabled;
    }
    if (type === 'post_reply') {
      return settings.postReplyEnabled;
    }
    if (type === 'mention') {
      return settings.mentionEnabled;
    }
    if (type === 'post_liked') {
      return settings.postLikedEnabled;
    }
    if (type === 'follow') {
      return settings.followEnabled;
    }
    if (type === 'system') {
      return settings.systemEnabled;
    }
    return true;
  }

  private isInDnd(settings: NotificationSettings): boolean {
    if (!settings.dndEnabled) {
      return false;
    }

    const start = settings.dndStartHour;
    const end = settings.dndEndHour;
    const hour = new Date().getHours();

    if (start === end) {
      return true;
    }

    if (start < end) {
      return hour >= start && hour < end;
    }

    return hour >= start || hour < end;
  }

  private shouldCreateNotification(userId: number, type: string, db: Database.Database): boolean {
    const settings = this.getSettings(userId, db);
    if (!this.isTypeEnabled(type, settings)) {
      return false;
    }
    if (type !== 'system' && this.isInDnd(settings)) {
      return false;
    }
    return true;
  }

  getSettings(
    userId: number,
    db: Database.Database = getDatabase()
  ): NotificationSettings {
    const row = this.getSettingsRow(userId, db);
    return mapSettings(row);
  }

  updateSettings(
    userId: number,
    input: UpdateNotificationSettingsInput,
    db: Database.Database = getDatabase()
  ): NotificationSettings {
    const current = this.getSettings(userId, db);

    const nextThreadReply = input.threadReplyEnabled ?? current.threadReplyEnabled;
    const nextPostReply = input.postReplyEnabled ?? current.postReplyEnabled;
    const nextMention = input.mentionEnabled ?? current.mentionEnabled;
    const nextPostLiked = input.postLikedEnabled ?? current.postLikedEnabled;
    const nextFollow = input.followEnabled ?? current.followEnabled;
    const nextSystem = input.systemEnabled ?? current.systemEnabled;
    const nextDndEnabled = input.dndEnabled ?? current.dndEnabled;
    const nextDndStartHour = input.dndStartHour ?? current.dndStartHour;
    const nextDndEndHour = input.dndEndHour ?? current.dndEndHour;

    db.prepare(
      `UPDATE notification_settings
       SET enable_thread_reply = ?,
           enable_post_reply = ?,
           enable_mention = ?,
           enable_post_liked = ?,
           enable_follow = ?,
           enable_system = ?,
           dnd_enabled = ?,
           dnd_start_hour = ?,
           dnd_end_hour = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).run(
      nextThreadReply ? 1 : 0,
      nextPostReply ? 1 : 0,
      nextMention ? 1 : 0,
      nextPostLiked ? 1 : 0,
      nextFollow ? 1 : 0,
      nextSystem ? 1 : 0,
      nextDndEnabled ? 1 : 0,
      nextDndStartHour,
      nextDndEndHour,
      userId
    );

    return this.getSettings(userId, db);
  }

  createNotification(
    input: CreateNotificationInput,
    db: Database.Database = getDatabase()
  ): number | null {
    const actorUserId = input.actorUserId ?? null;
    if (actorUserId && actorUserId === input.userId) {
      return null;
    }
    if (!this.shouldCreateNotification(input.userId, input.type, db)) {
      return null;
    }

    const result = db
      .prepare(
        `INSERT INTO notifications (
           user_id, actor_user_id, type, title, content, related_type, related_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.userId,
        actorUserId,
        input.type,
        input.title,
        input.content ?? null,
        input.relatedType ?? null,
        input.relatedId ?? null
      );

    const notificationId = Number(result.lastInsertRowid);
    this.emitEvent(input.userId, 'notification_created', notificationId, db);
    return notificationId;
  }

  listNotifications(
    userId: number,
    page: number,
    pageSize: number,
    unreadOnly = false,
    db: Database.Database = getDatabase()
  ): PaginatedResult<NotificationItem> {
    this.ensureUser(userId, db);

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const whereSql = unreadOnly ? 'WHERE n.user_id = ? AND n.is_read = 0' : 'WHERE n.user_id = ?';
    const countSql = unreadOnly
      ? 'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0'
      : 'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?';

    const countRow = db.prepare(countSql).get(userId) as { total: number };
    const rows = db
      .prepare(
        `SELECT n.id, n.user_id, n.actor_user_id, n.type, n.title, n.content, n.related_type, n.related_id,
                n.is_read, n.read_at, n.created_at,
                a.username AS actor_username, a.avatar AS actor_avatar
         FROM notifications n
         LEFT JOIN users a ON a.id = n.actor_user_id
         ${whereSql}
         ORDER BY n.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(userId, safePageSize, offset) as NotificationRow[];

    const total = Number(countRow.total);
    return {
      items: rows.map(mapNotification),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  getUnreadCount(userId: number, db: Database.Database = getDatabase()): number {
    this.ensureUser(userId, db);
    const row = db
      .prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(userId) as { total: number };
    return Number(row.total);
  }

  markAsRead(
    userId: number,
    notificationId: number,
    db: Database.Database = getDatabase()
  ): NotificationItem {
    this.ensureUser(userId, db);

    const update = db
      .prepare(
        `UPDATE notifications
         SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE id = ? AND user_id = ? AND is_read = 0`
      )
      .run(notificationId, userId);

    const row = db
      .prepare(
        `SELECT n.id, n.user_id, n.actor_user_id, n.type, n.title, n.content, n.related_type, n.related_id,
                n.is_read, n.read_at, n.created_at,
                a.username AS actor_username, a.avatar AS actor_avatar
         FROM notifications n
         LEFT JOIN users a ON a.id = n.actor_user_id
         WHERE n.id = ? AND n.user_id = ?`
      )
      .get(notificationId, userId) as NotificationRow | undefined;

    if (!row) {
      throw new HttpError(404, 'Notification not found');
    }

    if (update.changes > 0) {
      this.emitEvent(userId, 'notification_read', notificationId, db);
    }

    return mapNotification(row);
  }

  markAllAsRead(userId: number, db: Database.Database = getDatabase()): MarkAllReadResult {
    this.ensureUser(userId, db);

    const update = db
      .prepare(
        `UPDATE notifications
         SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE user_id = ? AND is_read = 0`
      )
      .run(userId);

    if (update.changes > 0) {
      this.emitEvent(userId, 'notification_read_all', undefined, db);
    }

    return {
      updated: Number(update.changes),
      unreadCount: this.getUnreadCount(userId, db),
    };
  }

  notifyPostCreated(
    input: NotifyPostCreatedInput,
    db: Database.Database = getDatabase()
  ): number {
    const createdForUsers = new Set<number>();
    const actorRow = db
      .prepare('SELECT username FROM users WHERE id = ?')
      .get(input.postAuthorId) as { username: string } | undefined;
    const actorName = actorRow?.username ?? `User#${input.postAuthorId}`;

    const thread = db
      .prepare('SELECT user_id, title FROM threads WHERE id = ?')
      .get(input.threadId) as ThreadOwnerRow | undefined;
    if (!thread) {
      return 0;
    }

    let created = 0;

    if (Number(thread.user_id) !== input.postAuthorId) {
      const id = this.createNotification(
        {
          userId: Number(thread.user_id),
          actorUserId: input.postAuthorId,
          type: 'thread_reply',
          title: `${actorName} replied to your thread`,
          content: preview(input.content),
          relatedType: 'thread',
          relatedId: input.threadId,
        },
        db
      );
      if (id) {
        created += 1;
        createdForUsers.add(Number(thread.user_id));
      }
    }

    if (typeof input.parentId === 'number') {
      const parent = db
        .prepare('SELECT user_id FROM posts WHERE id = ? AND thread_id = ?')
        .get(input.parentId, input.threadId) as ParentPostRow | undefined;

      if (parent && Number(parent.user_id) !== input.postAuthorId) {
        const targetUserId = Number(parent.user_id);
        if (!createdForUsers.has(targetUserId)) {
          const id = this.createNotification(
            {
              userId: targetUserId,
              actorUserId: input.postAuthorId,
              type: 'post_reply',
              title: `${actorName} replied to your post`,
              content: preview(input.content),
              relatedType: 'thread',
              relatedId: input.threadId,
            },
            db
          );
          if (id) {
            created += 1;
            createdForUsers.add(targetUserId);
          }
        }
      }
    }

    const mentionNames = extractMentionUsernames(input.content);
    if (mentionNames.length === 0) {
      return created;
    }

    const placeholders = mentionNames.map(() => '?').join(', ');
    const mentionUsers = db
      .prepare(`SELECT id, username FROM users WHERE username IN (${placeholders})`)
      .all(...mentionNames) as MentionUserRow[];

    for (const mentionUser of mentionUsers) {
      const targetUserId = Number(mentionUser.id);
      if (targetUserId === input.postAuthorId) {
        continue;
      }
      if (createdForUsers.has(targetUserId)) {
        continue;
      }

      const id = this.createNotification(
        {
          userId: targetUserId,
          actorUserId: input.postAuthorId,
          type: 'mention',
          title: `${actorName} mentioned you`,
          content: preview(input.content),
          relatedType: 'thread',
          relatedId: input.threadId,
        },
        db
      );

      if (id) {
        created += 1;
        createdForUsers.add(targetUserId);
      }
    }

    return created;
  }

  notifyPostLiked(input: NotifyPostLikedInput, db: Database.Database = getDatabase()): number {
    const actorRow = db
      .prepare('SELECT username FROM users WHERE id = ?')
      .get(input.actorUserId) as { username: string } | undefined;
    const actorName = actorRow?.username ?? `User#${input.actorUserId}`;

    const target = db
      .prepare(
        `SELECT p.thread_id, p.user_id, p.content
         FROM posts p
         WHERE p.id = ? AND p.is_visible = 1`
      )
      .get(input.postId) as PostLikeTargetRow | undefined;

    if (!target) {
      return 0;
    }

    const created = this.createNotification(
      {
        userId: Number(target.user_id),
        actorUserId: input.actorUserId,
        type: 'post_liked',
        title: `${actorName} liked your post`,
        content: preview(target.content),
        relatedType: 'thread',
        relatedId: Number(target.thread_id),
      },
      db
    );

    return created ? 1 : 0;
  }

  createSystemNotification(
    userId: number,
    title: string,
    content?: string | null,
    db: Database.Database = getDatabase()
  ): number | null {
    return this.createNotification(
      {
        userId,
        actorUserId: null,
        type: 'system',
        title,
        content: content ?? null,
      },
      db
    );
  }
}

export const notificationService = new NotificationService();
