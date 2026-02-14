import axios from 'axios'
import { create } from 'zustand'
import { badgeService } from '../services/badgeService'
import type { UserBadgeItem } from '../types/badge'

interface BadgeState {
  myBadges: UserBadgeItem[]
  loadingMyBadges: boolean
  error: string | null
  fetchMyBadges: () => Promise<void>
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

  return 'Request failed, please try again later.'
}

export const useBadgeStore = create<BadgeState>((set) => ({
  myBadges: [],
  loadingMyBadges: false,
  error: null,

  fetchMyBadges: async () => {
    set({ loadingMyBadges: true, error: null })
    try {
      const myBadges = await badgeService.getMine()
      set({ myBadges, loadingMyBadges: false })
    } catch (error) {
      set({ myBadges: [], loadingMyBadges: false, error: getErrorMessage(error) })
      throw error
    }
  },

  reset: () => {
    set({
      myBadges: [],
      loadingMyBadges: false,
      error: null,
    })
  },
}))
