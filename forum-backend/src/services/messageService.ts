import type Database from 'better-sqlite3';
import { getDatabase } from '../database/connection';
import type { PaginatedResult } from '../types/models';
import { HttpError } from '../utils/httpError';

interface UserExistsRow {
  id: number;
}

interface ConversationRow {
  id: number;
  user1_id: number;
  user2_id: number;
  peer_user_id: number;
  peer_username: string;
  peer_avatar: string | null;
}

interface ConversationMembershipRow {
  id: number;
  user1_id: number;
  user2_id: number;
}

interface LastMessageRow {
  id: number;
  content: string;
  created_at: string;
}

interface ConversationListRow {
  id: number;
  peer_user_id: number;
  peer_username: string;
  peer_avatar: string | null;
}

interface MessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: number;
  read_at: string | null;
  sender_deleted: number;
  receiver_deleted: number;
  created_at: string;
  sender_username: string;
  sender_avatar: string | null;
  receiver_username: string;
  receiver_avatar: string | null;
}

interface CountRow {
  total: number;
}

export interface ConversationItem {
  id: number;
  peerUser: {
    id: number;
    username: string;
    avatar: string | null;
  };
  lastMessage: {
    id: number;
    content: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface MessageItem {
  id: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    avatar: string | null;
  };
  receiver: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

export interface SendMessageInput {
  receiverId: number;
  content: string;
}

export interface DeleteMessageResult {
  deleted: boolean;
}

function mapMessage(row: MessageRow): MessageItem {
  return {
    id: Number(row.id),
    conversationId: Number(row.conversation_id),
    senderId: Number(row.sender_id),
    receiverId: Number(row.receiver_id),
    content: row.content,
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
    createdAt: row.created_at,
    sender: {
      id: Number(row.sender_id),
      username: row.sender_username,
      avatar: row.sender_avatar,
    },
    receiver: {
      id: Number(row.receiver_id),
      username: row.receiver_username,
      avatar: row.receiver_avatar,
    },
  };
}

class MessageService {
  private ensureUserExists(userId: number, db: Database.Database): void {
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as
      | UserExistsRow
      | undefined;
    if (!row) {
      throw new HttpError(404, 'User not found');
    }
  }

  private normalizePair(userA: number, userB: number): [number, number] {
    return userA < userB ? [userA, userB] : [userB, userA];
  }

  private getConversationById(
    conversationId: number,
    db: Database.Database
  ): ConversationMembershipRow | undefined {
    return db
      .prepare('SELECT id, user1_id, user2_id FROM message_conversations WHERE id = ?')
      .get(conversationId) as ConversationMembershipRow | undefined;
  }

  private ensureConversationParticipant(
    conversationId: number,
    currentUserId: number,
    db: Database.Database
  ): ConversationMembershipRow {
    const row = this.getConversationById(conversationId, db);
    if (!row) {
      throw new HttpError(404, 'Conversation not found');
    }
    if (row.user1_id !== currentUserId && row.user2_id !== currentUserId) {
      throw new HttpError(403, 'Forbidden');
    }
    return row;
  }

  private getOrCreateConversation(
    currentUserId: number,
    peerUserId: number,
    db: Database.Database
  ): ConversationRow {
    const [user1, user2] = this.normalizePair(currentUserId, peerUserId);

    db.prepare(
      `INSERT OR IGNORE INTO message_conversations (user1_id, user2_id)
       VALUES (?, ?)`
    ).run(user1, user2);

    const row = db
      .prepare(
        `SELECT c.id, c.user1_id, c.user2_id,
                CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END AS peer_user_id,
                u.username AS peer_username,
                u.avatar AS peer_avatar
         FROM message_conversations c
         JOIN users u ON u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
         WHERE c.user1_id = ? AND c.user2_id = ?`
      )
      .get(currentUserId, currentUserId, user1, user2) as ConversationRow | undefined;

    if (!row) {
      throw new HttpError(500, 'Conversation create failed');
    }
    return row;
  }

  private refreshConversationLastMessage(
    conversationId: number,
    db: Database.Database
  ): void {
    const lastMessage = db
      .prepare(
        `SELECT id, created_at
         FROM messages
         WHERE conversation_id = ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(conversationId) as { id: number; created_at: string } | undefined;

    db.prepare(
      `UPDATE message_conversations
       SET last_message_id = ?,
           last_message_at = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(lastMessage?.id ?? null, lastMessage?.created_at ?? null, conversationId);
  }

  private getLastVisibleMessage(
    conversationId: number,
    currentUserId: number,
    db: Database.Database
  ): LastMessageRow | null {
    const row = db
      .prepare(
        `SELECT id, content, created_at
         FROM messages
         WHERE conversation_id = ?
           AND (
             (sender_id = ? AND sender_deleted = 0)
             OR (receiver_id = ? AND receiver_deleted = 0)
           )
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(conversationId, currentUserId, currentUserId) as LastMessageRow | undefined;
    return row ?? null;
  }

  private getConversationUnreadCount(
    conversationId: number,
    currentUserId: number,
    db: Database.Database
  ): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM messages
         WHERE conversation_id = ?
           AND receiver_id = ?
           AND is_read = 0
           AND receiver_deleted = 0`
      )
      .get(conversationId, currentUserId) as CountRow;
    return Number(row.total);
  }

  private getMessageById(
    messageId: number,
    db: Database.Database
  ): MessageItem {
    const row = db
      .prepare(
        `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.content,
                m.is_read, m.read_at, m.sender_deleted, m.receiver_deleted, m.created_at,
                su.username AS sender_username, su.avatar AS sender_avatar,
                ru.username AS receiver_username, ru.avatar AS receiver_avatar
         FROM messages m
         JOIN users su ON su.id = m.sender_id
         JOIN users ru ON ru.id = m.receiver_id
         WHERE m.id = ?`
      )
      .get(messageId) as MessageRow | undefined;

    if (!row) {
      throw new HttpError(404, 'Message not found');
    }

    return mapMessage(row);
  }

  sendMessage(
    input: SendMessageInput,
    currentUserId: number,
    db: Database.Database = getDatabase()
  ): MessageItem {
    const content = input.content.trim();
    if (content.length === 0) {
      throw new HttpError(400, 'Message content is required');
    }
    if (input.receiverId === currentUserId) {
      throw new HttpError(400, 'Cannot send message to yourself');
    }

    this.ensureUserExists(currentUserId, db);
    this.ensureUserExists(input.receiverId, db);

    const tx = db.transaction(() => {
      const conversation = this.getOrCreateConversation(currentUserId, input.receiverId, db);
      const insert = db
        .prepare(
          `INSERT INTO messages (conversation_id, sender_id, receiver_id, content)
           VALUES (?, ?, ?, ?)`
        )
        .run(conversation.id, currentUserId, input.receiverId, content);
      const messageId = Number(insert.lastInsertRowid);
      this.refreshConversationLastMessage(conversation.id, db);
      return messageId;
    });

    const messageId = tx();
    return this.getMessageById(messageId, db);
  }

  listConversations(
    currentUserId: number,
    page: number,
    pageSize: number,
    db: Database.Database = getDatabase()
  ): PaginatedResult<ConversationItem> {
    this.ensureUserExists(currentUserId, db);
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM message_conversations c
         WHERE (c.user1_id = ? OR c.user2_id = ?)
           AND EXISTS (
             SELECT 1 FROM messages m
             WHERE m.conversation_id = c.id
               AND (
                 (m.sender_id = ? AND m.sender_deleted = 0)
                 OR (m.receiver_id = ? AND m.receiver_deleted = 0)
               )
           )`
      )
      .get(currentUserId, currentUserId, currentUserId, currentUserId) as CountRow;

    const rows = db
      .prepare(
        `SELECT c.id,
                CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END AS peer_user_id,
                u.username AS peer_username,
                u.avatar AS peer_avatar
         FROM message_conversations c
         JOIN users u ON u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
         WHERE (c.user1_id = ? OR c.user2_id = ?)
           AND EXISTS (
             SELECT 1 FROM messages m
             WHERE m.conversation_id = c.id
               AND (
                 (m.sender_id = ? AND m.sender_deleted = 0)
                 OR (m.receiver_id = ? AND m.receiver_deleted = 0)
               )
           )
         ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC, c.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        safePageSize,
        offset
      ) as ConversationListRow[];

    const items = rows.map((row) => {
      const lastMessage = this.getLastVisibleMessage(row.id, currentUserId, db);
      return {
        id: Number(row.id),
        peerUser: {
          id: Number(row.peer_user_id),
          username: row.peer_username,
          avatar: row.peer_avatar,
        },
        lastMessage: lastMessage
          ? {
              id: Number(lastMessage.id),
              content: lastMessage.content,
              createdAt: lastMessage.created_at,
            }
          : null,
        unreadCount: this.getConversationUnreadCount(row.id, currentUserId, db),
      };
    });

    const total = Number(countRow.total);
    return {
      items,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  listMessages(
    conversationId: number,
    currentUserId: number,
    page: number,
    pageSize: number,
    db: Database.Database = getDatabase()
  ): PaginatedResult<MessageItem> {
    this.ensureUserExists(currentUserId, db);
    this.ensureConversationParticipant(conversationId, currentUserId, db);

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    db.prepare(
      `UPDATE messages
       SET is_read = 1,
           read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ?
         AND receiver_id = ?
         AND is_read = 0
         AND receiver_deleted = 0`
    ).run(conversationId, currentUserId);

    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM messages
         WHERE conversation_id = ?
           AND (
             (sender_id = ? AND sender_deleted = 0)
             OR (receiver_id = ? AND receiver_deleted = 0)
           )`
      )
      .get(conversationId, currentUserId, currentUserId) as CountRow;

    const rows = db
      .prepare(
        `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.content,
                m.is_read, m.read_at, m.sender_deleted, m.receiver_deleted, m.created_at,
                su.username AS sender_username, su.avatar AS sender_avatar,
                ru.username AS receiver_username, ru.avatar AS receiver_avatar
         FROM messages m
         JOIN users su ON su.id = m.sender_id
         JOIN users ru ON ru.id = m.receiver_id
         WHERE m.conversation_id = ?
           AND (
             (m.sender_id = ? AND m.sender_deleted = 0)
             OR (m.receiver_id = ? AND m.receiver_deleted = 0)
           )
         ORDER BY m.id ASC
         LIMIT ? OFFSET ?`
      )
      .all(conversationId, currentUserId, currentUserId, safePageSize, offset) as MessageRow[];

    const total = Number(countRow.total);
    return {
      items: rows.map(mapMessage),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  deleteMessage(
    messageId: number,
    currentUserId: number,
    db: Database.Database = getDatabase()
  ): DeleteMessageResult {
    this.ensureUserExists(currentUserId, db);

    const message = db
      .prepare(
        `SELECT id, conversation_id, sender_id, receiver_id, sender_deleted, receiver_deleted
         FROM messages
         WHERE id = ?`
      )
      .get(messageId) as MessageRow | undefined;

    if (!message) {
      throw new HttpError(404, 'Message not found');
    }

    const isSender = Number(message.sender_id) === currentUserId;
    const isReceiver = Number(message.receiver_id) === currentUserId;
    if (!isSender && !isReceiver) {
      throw new HttpError(403, 'Forbidden');
    }

    const tx = db.transaction(() => {
      if (isSender) {
        db.prepare(
          `UPDATE messages
           SET sender_deleted = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).run(messageId);
      } else {
        db.prepare(
          `UPDATE messages
           SET receiver_deleted = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).run(messageId);
      }

      const updated = db
        .prepare('SELECT sender_deleted, receiver_deleted FROM messages WHERE id = ?')
        .get(messageId) as { sender_deleted: number; receiver_deleted: number } | undefined;

      if (updated && updated.sender_deleted === 1 && updated.receiver_deleted === 1) {
        db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
      }

      this.refreshConversationLastMessage(Number(message.conversation_id), db);
    });

    tx();
    return { deleted: true };
  }
}

export const messageService = new MessageService();
