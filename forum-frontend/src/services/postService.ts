import { apiClient, unwrapResponse } from './api'
import type { PaginatedResult } from '../types/api'
import type { CreatePostInput, PostItem } from '../types/post'

export const postService = {
  async getThreadPosts(
    threadId: number,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<PostItem>> {
    const response = await apiClient.get(`/threads/${threadId}/posts`, {
      params: { page, pageSize },
    })
    return unwrapResponse<PaginatedResult<PostItem>>(response)
  },

  async createPost(input: CreatePostInput): Promise<PostItem> {
    const response = await apiClient.post('/posts', input)
    return unwrapResponse<PostItem>(response)
  },
}
