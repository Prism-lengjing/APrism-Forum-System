import { apiClient, unwrapResponse } from './api'
import type { SearchThreadPage, SearchUserPage } from '../types/search'

export const searchService = {
  async searchThreads(
    keyword: string,
    page = 1,
    pageSize = 20,
    forumId?: number
  ): Promise<SearchThreadPage> {
    const response = await apiClient.get('/search/threads', {
      params: {
        q: keyword,
        page,
        pageSize,
        ...(typeof forumId === 'number' ? { forumId } : {}),
      },
    })
    return unwrapResponse<SearchThreadPage>(response)
  },

  async searchUsers(
    keyword: string,
    page = 1,
    pageSize = 20
  ): Promise<SearchUserPage> {
    const response = await apiClient.get('/search/users', {
      params: { q: keyword, page, pageSize },
    })
    return unwrapResponse<SearchUserPage>(response)
  },
}
