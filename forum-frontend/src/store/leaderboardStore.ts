import axios from 'axios'
import { create } from 'zustand'
import { pointsService } from '../services/pointsService'
import type {
  LeaderboardPeriod,
  PointsLeaderboardPage,
  SigninLeaderboardPage,
} from '../types/points'

interface LeaderboardState {
  pointsBoard: PointsLeaderboardPage | null
  signinBoard: SigninLeaderboardPage | null
  period: LeaderboardPeriod
  loadingPoints: boolean
  loadingSignin: boolean
  error: string | null
  fetchPointsBoard: (page?: number, pageSize?: number, period?: LeaderboardPeriod) => Promise<void>
  fetchSigninBoard: (page?: number, pageSize?: number, period?: LeaderboardPeriod) => Promise<void>
  setPeriod: (period: LeaderboardPeriod) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    return message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed, please try again later.'
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  pointsBoard: null,
  signinBoard: null,
  period: 'all',
  loadingPoints: false,
  loadingSignin: false,
  error: null,

  fetchPointsBoard: async (page = 1, pageSize = 20, period) => {
    const nextPeriod = period ?? get().period
    set({ loadingPoints: true, error: null })
    try {
      const pointsBoard = await pointsService.getLeaderboard(page, pageSize, nextPeriod)
      set({ pointsBoard, loadingPoints: false, period: nextPeriod })
    } catch (error) {
      set({ loadingPoints: false, error: getErrorMessage(error), pointsBoard: null })
      throw error
    }
  },

  fetchSigninBoard: async (page = 1, pageSize = 20, period) => {
    const nextPeriod = period ?? get().period
    set({ loadingSignin: true, error: null })
    try {
      const signinBoard = await pointsService.getSigninLeaderboard(page, pageSize, nextPeriod)
      set({ signinBoard, loadingSignin: false, period: nextPeriod })
    } catch (error) {
      set({ loadingSignin: false, error: getErrorMessage(error), signinBoard: null })
      throw error
    }
  },

  setPeriod: async (period) => {
    set({ period })
  },
}))
