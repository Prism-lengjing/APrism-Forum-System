import { apiClient, unwrapResponse } from './api'
import type {
  DailySigninResult,
  LeaderboardPeriod,
  PointLogPage,
  PointsLeaderboardPage,
  PointsSummary,
  SigninLeaderboardPage,
} from '../types/points'

export const pointsService = {
  async getSummary(): Promise<PointsSummary> {
    const response = await apiClient.get('/points/me/summary')
    return unwrapResponse<PointsSummary>(response)
  },

  async getLogs(page = 1, pageSize = 20): Promise<PointLogPage> {
    const response = await apiClient.get('/points/me/logs', {
      params: { page, pageSize },
    })
    return unwrapResponse<PointLogPage>(response)
  },

  async signin(): Promise<DailySigninResult> {
    const response = await apiClient.post('/points/me/signin')
    return unwrapResponse<DailySigninResult>(response)
  },

  async getLeaderboard(
    page = 1,
    pageSize = 20,
    period: LeaderboardPeriod = 'all'
  ): Promise<PointsLeaderboardPage> {
    const response = await apiClient.get('/points/leaderboard', {
      params: { page, pageSize, period },
    })
    return unwrapResponse<PointsLeaderboardPage>(response)
  },

  async getSigninLeaderboard(
    page = 1,
    pageSize = 20,
    period: LeaderboardPeriod = 'all'
  ): Promise<SigninLeaderboardPage> {
    const response = await apiClient.get('/points/signin-leaderboard', {
      params: { page, pageSize, period },
    })
    return unwrapResponse<SigninLeaderboardPage>(response)
  },
}
