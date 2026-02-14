import type { PaginatedResult } from './api'

export interface PointsSummary {
  userId: number
  level: number
  experience: number
  totalPoints: number
  nextLevelExperience: number
  progressInLevel: number
  levelProgressPercent: number
  currentStreak: number
  lastSignDate: string | null
  canSignInToday: boolean
}

export interface PointLogItem {
  id: number
  userId: number
  action: string
  points: number
  reason: string | null
  relatedId: number | null
  createdAt: string
}

export type PointLogPage = PaginatedResult<PointLogItem>

export interface DailySigninResult {
  signDate: string
  streak: number
  pointsAwarded: number
  summary: PointsSummary
}

export type LeaderboardPeriod = 'all' | '7d' | '30d'

export interface PointsLeaderboardItem {
  rank: number
  userId: number
  username: string
  avatar: string | null
  level: number
  experience: number
  score: number
  period: LeaderboardPeriod
  threadCount: number
  postCount: number
}

export interface SigninLeaderboardItem {
  rank: number
  userId: number
  username: string
  avatar: string | null
  bestStreak: number
  totalSigninDays: number
  lastSignDate: string | null
  period: LeaderboardPeriod
}

export type PointsLeaderboardPage = PaginatedResult<PointsLeaderboardItem>
export type SigninLeaderboardPage = PaginatedResult<SigninLeaderboardItem>
