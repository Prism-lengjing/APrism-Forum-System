import axios from 'axios'
import { create } from 'zustand'
import { pointsService } from '../services/pointsService'
import type { DailySigninResult, PointLogPage, PointsSummary } from '../types/points'

interface PointsState {
  summary: PointsSummary | null
  logsPage: PointLogPage | null
  loadingSummary: boolean
  loadingLogs: boolean
  signingIn: boolean
  error: string | null
  fetchSummary: () => Promise<void>
  fetchLogs: (page?: number, pageSize?: number) => Promise<void>
  signin: () => Promise<DailySigninResult>
  reset: () => void
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    return message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '请求失败，请稍后重试'
}

export const usePointsStore = create<PointsState>((set) => ({
  summary: null,
  logsPage: null,
  loadingSummary: false,
  loadingLogs: false,
  signingIn: false,
  error: null,

  fetchSummary: async () => {
    set({ loadingSummary: true, error: null })
    try {
      const summary = await pointsService.getSummary()
      set({ summary, loadingSummary: false })
    } catch (error) {
      set({ loadingSummary: false, error: getErrorMessage(error), summary: null })
      throw error
    }
  },

  fetchLogs: async (page = 1, pageSize = 20) => {
    set({ loadingLogs: true, error: null })
    try {
      const logsPage = await pointsService.getLogs(page, pageSize)
      set({ logsPage, loadingLogs: false })
    } catch (error) {
      set({ loadingLogs: false, error: getErrorMessage(error), logsPage: null })
      throw error
    }
  },

  signin: async () => {
    set({ signingIn: true, error: null })
    try {
      const result = await pointsService.signin()
      set({ signingIn: false, summary: result.summary })
      return result
    } catch (error) {
      set({ signingIn: false, error: getErrorMessage(error) })
      throw error
    }
  },

  reset: () => {
    set({
      summary: null,
      logsPage: null,
      loadingSummary: false,
      loadingLogs: false,
      signingIn: false,
      error: null,
    })
  },
}))
