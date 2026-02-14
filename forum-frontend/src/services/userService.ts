import { apiClient, unwrapResponse } from './api'
import type { FollowStatus, PublicUserProfile } from '../types/user'

export const userService = {
  async getPublicProfile(userId: number): Promise<PublicUserProfile> {
    const response = await apiClient.get(`/users/${userId}`)
    return unwrapResponse<PublicUserProfile>(response)
  },

  async getFollowStatus(userId: number): Promise<FollowStatus> {
    const response = await apiClient.get(`/users/${userId}/follow-status`)
    return unwrapResponse<FollowStatus>(response)
  },

  async followUser(userId: number): Promise<FollowStatus> {
    const response = await apiClient.post(`/users/${userId}/follow`)
    return unwrapResponse<FollowStatus>(response)
  },

  async unfollowUser(userId: number): Promise<FollowStatus> {
    const response = await apiClient.delete(`/users/${userId}/follow`)
    return unwrapResponse<FollowStatus>(response)
  },
}
