import type Database from 'better-sqlite3';
import { getDatabase } from '../database/connection';
import { HttpError } from '../utils/httpError';

interface BadgeRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  type: string;
  condition_type: string | null;
  condition_value: number | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

interface UserBadgeRow extends BadgeRow {
  awarded_at: string;
}

interface UserMetricRow {
  id: number;
  level: number;
  experience: number;
  thread_count: number;
  post_count: number;
  signin_streak: number | null;
}

export interface BadgeItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  type: string;
  conditionType: string | null;
  conditionValue: number | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface UserBadgeItem extends BadgeItem {
  awardedAt: string;
}

function mapBadge(row: BadgeRow): BadgeItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    type: row.type,
    conditionType: row.condition_type,
    conditionValue: row.condition_value,
    color: row.color,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
  };
}

function mapUserBadge(row: UserBadgeRow): UserBadgeItem {
  return {
    ...mapBadge(row),
    awardedAt: row.awarded_at,
  };
}

class BadgeService {
  getAllBadges(db: Database.Database = getDatabase()): BadgeItem[] {
    const rows = db
      .prepare(
        `SELECT id, name, slug, description, icon, type, condition_type, condition_value,
                color, sort_order, created_at
         FROM badges
         ORDER BY sort_order ASC, id ASC`
      )
      .all() as BadgeRow[];
    return rows.map(mapBadge);
  }

  getUserBadges(userId: number, db: Database.Database = getDatabase()): UserBadgeItem[] {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as
      | { id: number }
      | undefined;
    if (!userExists) {
      throw new HttpError(404, '用户不存在');
    }

    const rows = db
      .prepare(
        `SELECT b.id, b.name, b.slug, b.description, b.icon, b.type, b.condition_type, b.condition_value,
                b.color, b.sort_order, b.created_at, ub.awarded_at
         FROM user_badges ub
         JOIN badges b ON b.id = ub.badge_id
         WHERE ub.user_id = ?
         ORDER BY ub.awarded_at DESC, b.sort_order ASC, b.id ASC`
      )
      .all(userId) as UserBadgeRow[];
    return rows.map(mapUserBadge);
  }

  evaluateAndAward(userId: number, db: Database.Database = getDatabase()): UserBadgeItem[] {
    const userMetrics = db
      .prepare(
        `SELECT u.id, u.level, u.experience, u.thread_count, u.post_count,
                COALESCE((SELECT MAX(ds.streak) FROM daily_signins ds WHERE ds.user_id = u.id), 0) AS signin_streak
         FROM users u
         WHERE u.id = ?`
      )
      .get(userId) as UserMetricRow | undefined;

    if (!userMetrics) {
      throw new HttpError(404, '用户不存在');
    }

    const candidateBadges = db
      .prepare(
        `SELECT id, name, slug, description, icon, type, condition_type, condition_value,
                color, sort_order, created_at
         FROM badges
         WHERE condition_type IS NOT NULL AND condition_value IS NOT NULL
         ORDER BY sort_order ASC, id ASC`
      )
      .all() as BadgeRow[];

    const ownedRows = db
      .prepare('SELECT badge_id FROM user_badges WHERE user_id = ?')
      .all(userId) as Array<{ badge_id: number }>;
    const ownedBadgeIds = new Set<number>(ownedRows.map((item) => Number(item.badge_id)));

    const metricsByType: Record<string, number> = {
      thread_count: Number(userMetrics.thread_count),
      post_count: Number(userMetrics.post_count),
      level: Number(userMetrics.level),
      experience: Number(userMetrics.experience),
      signin_streak: Number(userMetrics.signin_streak ?? 0),
    };

    for (const badge of candidateBadges) {
      if (ownedBadgeIds.has(badge.id)) {
        continue;
      }

      if (!badge.condition_type || badge.condition_value === null) {
        continue;
      }

      const currentMetric = metricsByType[badge.condition_type] ?? -1;
      if (currentMetric < Number(badge.condition_value)) {
        continue;
      }

      db.prepare(
        `INSERT OR IGNORE INTO user_badges (user_id, badge_id)
         VALUES (?, ?)`
      ).run(userId, badge.id);
    }

    return this.getUserBadges(userId, db);
  }
}

export const badgeService = new BadgeService();
