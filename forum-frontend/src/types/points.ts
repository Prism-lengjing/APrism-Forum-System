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
