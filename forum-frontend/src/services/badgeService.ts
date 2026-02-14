import { apiClient, unwrapResponse } from './api'
import type { BadgeItem, UserBadgeItem } from '../types/badge'

export const badgeService = {
  async getAll(): Promise<BadgeItem[]> {
    const response = await apiClient.get('/badges')
    return unwrapResponse<BadgeItem[]>(response)
  },

  async getMine(): Promise<UserBadgeItem[]> {
    const response = await apiClient.get('/badges/me')
    return unwrapResponse<UserBadgeItem[]>(response)
  },

  async getUserBadges(userId: number): Promise<UserBadgeItem[]> {
    const response = await apiClient.get(`/users/${userId}/badges`)
    return unwrapResponse<UserBadgeItem[]>(response)
  },
}
