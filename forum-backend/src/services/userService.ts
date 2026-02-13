import { getDatabase } from '../database/connection';
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
  createdAt: string;
}

export interface UpdateProfileInput {
  avatar?: string;
  bio?: string;
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
  created_at: string;
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
    createdAt: row.created_at,
  };
}

class UserService {
  getPublicProfile(userId: number): PublicProfile {
    const db = getDatabase();
    const row = db
      .prepare(
        `SELECT id, username, avatar, bio, role, level, experience,
                post_count, thread_count, created_at
         FROM users
         WHERE id = ?`
      )
      .get(userId) as UserProfileRow | undefined;

    if (!row) {
      throw new HttpError(404, '用户不存在');
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
}

export const userService = new UserService();
