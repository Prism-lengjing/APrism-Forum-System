import type Database from 'better-sqlite3';
import { getDatabase } from '../database/connection';
import { badgeService } from './badgeService';
import type { PaginatedResult } from '../types/models';
import { HttpError } from '../utils/httpError';

const POINTS_CREATE_THREAD = Number(process.env.POINTS_CREATE_THREAD ?? 10);
const POINTS_CREATE_POST = Number(process.env.POINTS_CREATE_POST ?? 5);
const POINTS_DAILY_SIGNIN = Number(process.env.POINTS_DAILY_SIGNIN ?? 2);
const LEVEL_STEP_EXPERIENCE = Math.max(
  10,
  Number(process.env.LEVEL_STEP_EXPERIENCE ?? 100)
);

interface UserPointsRow {
  id: number;
  level: number;
  experience: number;
}

interface SigninRow {
  id: number;
  sign_date: string;
  streak: number;
  points_awarded: number;
}

interface PointLogRow {
  id: number;
  user_id: number;
  action: string;
  points: number;
  reason: string | null;
  related_id: number | null;
  created_at: string;
}

interface PointsLeaderboardRow {
  user_id: number;
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
  thread_count: number;
  post_count: number;
  score_value: number;
}

interface SigninLeaderboardRow {
  user_id: number;
  username: string;
  avatar: string | null;
  best_streak: number;
  total_signin_days: number;
  last_sign_date: string | null;
}

type LeaderboardPeriod = 'all' | '7d' | '30d';

export interface UserPointsSummary {
  userId: number;
  level: number;
  experience: number;
  totalPoints: number;
  nextLevelExperience: number;
  progressInLevel: number;
  levelProgressPercent: number;
  currentStreak: number;
  lastSignDate: string | null;
  canSignInToday: boolean;
}

export interface PointLogItem {
  id: number;
  userId: number;
  action: string;
  points: number;
  reason: string | null;
  relatedId: number | null;
  createdAt: string;
}

export interface PointsAwardResult {
  pointsAdded: number;
  action: string;
  leveledUp: boolean;
  summary: UserPointsSummary;
}

export interface DailySigninResult {
  signDate: string;
  streak: number;
  pointsAwarded: number;
  summary: UserPointsSummary;
}

export interface PointsLeaderboardItem {
  rank: number;
  userId: number;
  username: string;
  avatar: string | null;
  level: number;
  experience: number;
  score: number;
  period: LeaderboardPeriod;
  threadCount: number;
  postCount: number;
}

export interface SigninLeaderboardItem {
  rank: number;
  userId: number;
  username: string;
  avatar: string | null;
  bestStreak: number;
  totalSigninDays: number;
  lastSignDate: string | null;
  period: LeaderboardPeriod;
}

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function previousUtcDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return utcDateString(date);
}

function calcLevel(experience: number): number {
  return Math.max(1, Math.floor(experience / LEVEL_STEP_EXPERIENCE) + 1);
}

function normalizePeriod(period: string | undefined): LeaderboardPeriod {
  if (period === '7d' || period === '30d') {
    return period;
  }
  return 'all';
}

function periodStartDate(period: LeaderboardPeriod): string | null {
  if (period === 'all') {
    return null;
  }

  const days = period === '7d' ? 7 : 30;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return utcDateString(date);
}

function normalizePage(page: number): number {
  return Math.max(1, page);
}

function normalizePageSize(pageSize: number): number {
  return Math.min(100, Math.max(1, pageSize));
}

function mapPointLog(row: PointLogRow): PointLogItem {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    points: Number(row.points),
    reason: row.reason,
    relatedId: row.related_id,
    createdAt: row.created_at,
  };
}

class PointsService {
  private getUserPointsRow(
    userId: number,
    db: Database.Database = getDatabase()
  ): UserPointsRow {
    const row = db
      .prepare('SELECT id, level, experience FROM users WHERE id = ?')
      .get(userId) as UserPointsRow | undefined;

    if (!row) {
      throw new HttpError(404, '用户不存在');
    }

    return row;
  }

  private buildSummary(
    userId: number,
    db: Database.Database = getDatabase()
  ): UserPointsSummary {
    const user = this.getUserPointsRow(userId, db);
    const latestSignin = db
      .prepare(
        `SELECT id, sign_date, streak, points_awarded
         FROM daily_signins
         WHERE user_id = ?
         ORDER BY sign_date DESC
         LIMIT 1`
      )
      .get(userId) as SigninRow | undefined;

    const today = utcDateString();
    const nextLevelExperience = user.level * LEVEL_STEP_EXPERIENCE;
    const progressInLevel = Math.max(
      0,
      user.experience - (user.level - 1) * LEVEL_STEP_EXPERIENCE
    );
    const levelProgressPercent = Math.min(
      100,
      Math.round((progressInLevel / LEVEL_STEP_EXPERIENCE) * 100)
    );

    return {
      userId: user.id,
      level: Number(user.level),
      experience: Number(user.experience),
      totalPoints: Number(user.experience),
      nextLevelExperience,
      progressInLevel,
      levelProgressPercent,
      currentStreak: latestSignin ? Number(latestSignin.streak) : 0,
      lastSignDate: latestSignin?.sign_date ?? null,
      canSignInToday: latestSignin?.sign_date !== today,
    };
  }

  getSummary(userId: number): UserPointsSummary {
    return this.buildSummary(userId);
  }

  awardPoints(
    userId: number,
    action: string,
    points: number,
    reason: string,
    relatedId?: number,
    db: Database.Database = getDatabase()
  ): PointsAwardResult {
    const user = this.getUserPointsRow(userId, db);
    const nextExperience = Math.max(0, Number(user.experience) + Number(points));
    const nextLevel = calcLevel(nextExperience);
    const leveledUp = nextLevel > Number(user.level);

    db.prepare(
      `UPDATE users
       SET experience = ?, level = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(nextExperience, nextLevel, userId);

    db.prepare(
      `INSERT INTO point_logs (user_id, action, points, reason, related_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(userId, action, points, reason, relatedId ?? null);

    // Re-evaluate achievement badges after points and related counters are updated.
    badgeService.evaluateAndAward(userId, db);

    return {
      pointsAdded: points,
      action,
      leveledUp,
      summary: this.buildSummary(userId, db),
    };
  }

  awardForThreadCreated(
    userId: number,
    threadId: number,
    db: Database.Database = getDatabase()
  ): PointsAwardResult {
    return this.awardPoints(userId, 'create_thread', POINTS_CREATE_THREAD, '发布主题', threadId, db);
  }

  awardForPostCreated(
    userId: number,
    postId: number,
    db: Database.Database = getDatabase()
  ): PointsAwardResult {
    return this.awardPoints(userId, 'create_post', POINTS_CREATE_POST, '发布回复', postId, db);
  }

  getPointLogs(
    userId: number,
    page: number,
    pageSize: number
  ): PaginatedResult<PointLogItem> {
    const db = getDatabase();
    this.getUserPointsRow(userId, db);

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const countRow = db
      .prepare('SELECT COUNT(*) AS total FROM point_logs WHERE user_id = ?')
      .get(userId) as { total: number };

    const rows = db
      .prepare(
        `SELECT id, user_id, action, points, reason, related_id, created_at
         FROM point_logs
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT ? OFFSET ?`
      )
      .all(userId, safePageSize, offset) as PointLogRow[];

    const total = Number(countRow.total);
    return {
      items: rows.map(mapPointLog),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  getPointsLeaderboard(
    page = 1,
    pageSize = 20,
    periodInput?: string
  ): PaginatedResult<PointsLeaderboardItem> {
    const db = getDatabase();
    const safePage = normalizePage(page);
    const safePageSize = normalizePageSize(pageSize);
    const offset = (safePage - 1) * safePageSize;
    const period = normalizePeriod(periodInput);
    const startDate = periodStartDate(period);

    if (period === 'all') {
      const countRow = db.prepare('SELECT COUNT(*) AS total FROM users').get() as {
        total: number;
      };
      const total = Number(countRow.total);

      const rows = db
        .prepare(
          `SELECT id AS user_id, username, avatar, level, experience, thread_count, post_count,
                  experience AS score_value
           FROM users
           ORDER BY experience DESC, level DESC, thread_count DESC, post_count DESC, id ASC
           LIMIT ? OFFSET ?`
        )
        .all(safePageSize, offset) as PointsLeaderboardRow[];

      return {
        items: rows.map((row, index) => ({
          rank: offset + index + 1,
          userId: Number(row.user_id),
          username: row.username,
          avatar: row.avatar,
          level: Number(row.level),
          experience: Number(row.experience),
          score: Number(row.score_value),
          period,
          threadCount: Number(row.thread_count),
          postCount: Number(row.post_count),
        })),
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      };
    }

    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM (
           SELECT pl.user_id
           FROM point_logs pl
           WHERE pl.created_at >= ?
           GROUP BY pl.user_id
           HAVING SUM(pl.points) > 0
         ) t`
      )
      .get(startDate) as { total: number };
    const total = Number(countRow.total);

    const rows = db
      .prepare(
        `SELECT u.id AS user_id, u.username, u.avatar, u.level, u.experience, u.thread_count, u.post_count,
                SUM(pl.points) AS score_value
         FROM point_logs pl
         JOIN users u ON u.id = pl.user_id
         WHERE pl.created_at >= ?
         GROUP BY u.id, u.username, u.avatar, u.level, u.experience, u.thread_count, u.post_count
         HAVING SUM(pl.points) > 0
         ORDER BY score_value DESC, u.level DESC, u.thread_count DESC, u.post_count DESC, u.id ASC
         LIMIT ? OFFSET ?`
      )
      .all(startDate, safePageSize, offset) as PointsLeaderboardRow[];

    return {
      items: rows.map((row, index) => ({
        rank: offset + index + 1,
        userId: Number(row.user_id),
        username: row.username,
        avatar: row.avatar,
        level: Number(row.level),
        experience: Number(row.experience),
        score: Number(row.score_value),
        period,
        threadCount: Number(row.thread_count),
        postCount: Number(row.post_count),
      })),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  getSigninLeaderboard(
    page = 1,
    pageSize = 20,
    periodInput?: string
  ): PaginatedResult<SigninLeaderboardItem> {
    const db = getDatabase();
    const safePage = normalizePage(page);
    const safePageSize = normalizePageSize(pageSize);
    const offset = (safePage - 1) * safePageSize;
    const period = normalizePeriod(periodInput);
    const startDate = periodStartDate(period);

    if (period === 'all') {
      const countRow = db
        .prepare('SELECT COUNT(DISTINCT user_id) AS total FROM daily_signins')
        .get() as { total: number };
      const total = Number(countRow.total);

      const rows = db
        .prepare(
          `SELECT u.id AS user_id, u.username, u.avatar,
                  MAX(ds.streak) AS best_streak,
                  COUNT(ds.id) AS total_signin_days,
                  MAX(ds.sign_date) AS last_sign_date
           FROM daily_signins ds
           JOIN users u ON u.id = ds.user_id
           GROUP BY u.id, u.username, u.avatar
           ORDER BY best_streak DESC, total_signin_days DESC, last_sign_date DESC, u.id ASC
           LIMIT ? OFFSET ?`
        )
        .all(safePageSize, offset) as SigninLeaderboardRow[];

      return {
        items: rows.map((row, index) => ({
          rank: offset + index + 1,
          userId: Number(row.user_id),
          username: row.username,
          avatar: row.avatar,
          bestStreak: Number(row.best_streak),
          totalSigninDays: Number(row.total_signin_days),
          lastSignDate: row.last_sign_date,
          period,
        })),
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      };
    }

    const countRow = db
      .prepare(
        `SELECT COUNT(DISTINCT ds.user_id) AS total
         FROM daily_signins ds
         WHERE ds.sign_date >= ?`
      )
      .get(startDate) as { total: number };
    const total = Number(countRow.total);

    const rows = db
      .prepare(
        `SELECT u.id AS user_id, u.username, u.avatar,
                MAX(ds.streak) AS best_streak,
                COUNT(ds.id) AS total_signin_days,
                MAX(ds.sign_date) AS last_sign_date
         FROM daily_signins ds
         JOIN users u ON u.id = ds.user_id
         WHERE ds.sign_date >= ?
         GROUP BY u.id, u.username, u.avatar
         ORDER BY best_streak DESC, total_signin_days DESC, last_sign_date DESC, u.id ASC
         LIMIT ? OFFSET ?`
      )
      .all(startDate, safePageSize, offset) as SigninLeaderboardRow[];

    return {
      items: rows.map((row, index) => ({
        rank: offset + index + 1,
        userId: Number(row.user_id),
        username: row.username,
        avatar: row.avatar,
        bestStreak: Number(row.best_streak),
        totalSigninDays: Number(row.total_signin_days),
        lastSignDate: row.last_sign_date,
        period,
      })),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  dailySignin(userId: number): DailySigninResult {
    const db = getDatabase();
    const today = utcDateString();

    const existing = db
      .prepare('SELECT id FROM daily_signins WHERE user_id = ? AND sign_date = ?')
      .get(userId, today) as { id: number } | undefined;
    if (existing) {
      throw new HttpError(409, '今日已签到');
    }

    const tx = db.transaction(() => {
      const latest = db
        .prepare(
          `SELECT id, sign_date, streak, points_awarded
           FROM daily_signins
           WHERE user_id = ?
           ORDER BY sign_date DESC
           LIMIT 1`
        )
        .get(userId) as SigninRow | undefined;

      const isConsecutive = latest?.sign_date === previousUtcDate(today);
      const streak = isConsecutive ? Number(latest.streak) + 1 : 1;
      const streakBonus = streak > 1 ? Math.min(5, Math.floor(streak / 3)) : 0;
      const pointsAwarded = POINTS_DAILY_SIGNIN + streakBonus;

      const insert = db
        .prepare(
          `INSERT INTO daily_signins (user_id, sign_date, streak, points_awarded)
           VALUES (?, ?, ?, ?)`
        )
        .run(userId, today, streak, pointsAwarded);

      const signinId = Number(insert.lastInsertRowid);
      const award = this.awardPoints(
        userId,
        'daily_signin',
        pointsAwarded,
        `每日签到（连续${streak}天）`,
        signinId,
        db
      );

      return {
        signDate: today,
        streak,
        pointsAwarded,
        summary: award.summary,
      };
    });

    return tx();
  }
}

export const pointsService = new PointsService();
