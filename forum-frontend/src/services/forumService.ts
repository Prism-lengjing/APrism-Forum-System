import { apiClient, unwrapResponse } from './api'
import type { PaginatedResult } from '../types/api'
import type {
  ForumCategory,
  ForumItem,
  ForumModerator,
  ModeratorActionLogPage,
} from '../types/forum'
import type { ThreadSummary } from '../types/thread'

export const forumService = {
  async getCategories(): Promise<ForumCategory[]> {
    const response = await apiClient.get('/categories')
    return unwrapResponse<ForumCategory[]>(response)
  },

  async getForums(): Promise<ForumItem[]> {
    const response = await apiClient.get('/forums')
    return unwrapResponse<ForumItem[]>(response)
  },

  async getForumById(id: number): Promise<ForumItem> {
    const response = await apiClient.get(`/forums/${id}`)
    return unwrapResponse<ForumItem>(response)
  },

  async getForumThreads(
    forumId: number,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<ThreadSummary>> {
    const response = await apiClient.get(`/forums/${forumId}/threads`, {
      params: { page, pageSize },
    })
    return unwrapResponse<PaginatedResult<ThreadSummary>>(response)
  },

  async getForumModerators(forumId: number): Promise<ForumModerator[]> {
    const response = await apiClient.get(`/forums/${forumId}/moderators`)
    return unwrapResponse<ForumModerator[]>(response)
  },

  async getForumModeratorLogs(
    forumId: number,
    page = 1,
    pageSize = 20
  ): Promise<ModeratorActionLogPage> {
    const response = await apiClient.get(`/forums/${forumId}/moderator-logs`, {
      params: { page, pageSize },
    })
    return unwrapResponse<ModeratorActionLogPage>(response)
  },
}
