import type Database from 'better-sqlite3';
import { getDatabase } from '../database/connection';
import { notificationService } from './notificationService';
import { HttpError } from '../utils/httpError';

export interface PublicProfile {
  id: number;
  username: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  level: number;
  experience: number;
  postCount: number;
  threadCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface UpdateProfileInput {
  avatar?: string;
  bio?: string;
}

export interface FollowActionResult {
  following: boolean;
  followerCount: number;
}

interface UserProfileRow {
  id: number;
  username: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  level: number;
  experience: number;
  post_count: number;
  thread_count: number;
  follower_count: number;
  following_count: number;
  created_at: string;
}

interface UserNameRow {
  username: string;
}

function mapProfile(row: UserProfileRow): PublicProfile {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    bio: row.bio,
    role: row.role,
    level: Number(row.level),
    experience: Number(row.experience),
    postCount: Number(row.post_count),
    threadCount: Number(row.thread_count),
    followerCount: Number(row.follower_count),
    followingCount: Number(row.following_count),
    createdAt: row.created_at,
  };
}

class UserService {
  private ensureUserExists(userId: number, db: Database.Database = getDatabase()): void {
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as
      | { id: number }
      | undefined;
    if (!row) {
      throw new HttpError(404, 'User not found');
    }
  }

  private getFollowerCount(userId: number, db: Database.Database = getDatabase()): number {
    const row = db
      .prepare('SELECT COUNT(*) AS total FROM follows WHERE following_id = ?')
      .get(userId) as { total: number };
    return Number(row.total);
  }

  getPublicProfile(userId: number): PublicProfile {
    const db = getDatabase();
    const row = db
      .prepare(
        `SELECT u.id, u.username, u.avatar, u.bio, u.role, u.level, u.experience,
                u.post_count, u.thread_count, u.created_at,
                COALESCE(followers.total, 0) AS follower_count,
                COALESCE(following.total, 0) AS following_count
         FROM users u
         LEFT JOIN (
           SELECT following_id, COUNT(*) AS total
           FROM follows
           GROUP BY following_id
         ) followers ON followers.following_id = u.id
         LEFT JOIN (
           SELECT follower_id, COUNT(*) AS total
           FROM follows
           GROUP BY follower_id
         ) following ON following.follower_id = u.id
         WHERE u.id = ?`
      )
      .get(userId) as UserProfileRow | undefined;

    if (!row) {
      throw new HttpError(404, 'User not found');
    }

    return mapProfile(row);
  }

  updateCurrentUser(userId: number, input: UpdateProfileInput): PublicProfile {
    const db = getDatabase();
    const current = this.getPublicProfile(userId);

    const nextBio = input.bio?.trim() ?? current.bio;
    const nextAvatar = input.avatar?.trim() ?? current.avatar;

    db.prepare(
      `UPDATE users
       SET bio = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(nextBio ?? null, nextAvatar ?? null, userId);

    return this.getPublicProfile(userId);
  }

  getFollowStatus(currentUserId: number, targetUserId: number): FollowActionResult {
    const db = getDatabase();
    this.ensureUserExists(currentUserId, db);
    this.ensureUserExists(targetUserId, db);

    const row = db
      .prepare(
        `SELECT 1 AS followed
         FROM follows
         WHERE follower_id = ? AND following_id = ?`
      )
      .get(currentUserId, targetUserId) as { followed: number } | undefined;

    return {
      following: Boolean(row),
      followerCount: this.getFollowerCount(targetUserId, db),
    };
  }

  followUser(currentUserId: number, targetUserId: number): FollowActionResult {
    const db = getDatabase();
    if (currentUserId === targetUserId) {
      throw new HttpError(400, 'Cannot follow yourself');
    }

    this.ensureUserExists(currentUserId, db);
    this.ensureUserExists(targetUserId, db);

    const tx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT OR IGNORE INTO follows (follower_id, following_id)
           VALUES (?, ?)`
        )
        .run(currentUserId, targetUserId);

      if (result.changes > 0) {
        const actor = db
          .prepare('SELECT username FROM users WHERE id = ?')
          .get(currentUserId) as UserNameRow | undefined;
        const actorName = actor?.username ?? `User#${currentUserId}`;
        notificationService.createNotification(
          {
            userId: targetUserId,
            actorUserId: currentUserId,
            type: 'follow',
            title: `${actorName} followed you`,
            relatedType: 'user',
            relatedId: currentUserId,
          },
          db
        );
      }

      return {
        following: true,
        followerCount: this.getFollowerCount(targetUserId, db),
      };
    });

    return tx();
  }

  unfollowUser(currentUserId: number, targetUserId: number): FollowActionResult {
    const db = getDatabase();
    if (currentUserId === targetUserId) {
      throw new HttpError(400, 'Cannot unfollow yourself');
    }

    this.ensureUserExists(currentUserId, db);
    this.ensureUserExists(targetUserId, db);

    db.prepare(
      `DELETE FROM follows
       WHERE follower_id = ? AND following_id = ?`
    ).run(currentUserId, targetUserId);

    return {
      following: false,
      followerCount: this.getFollowerCount(targetUserId, db),
    };
  }
}

export const userService = new UserService();
