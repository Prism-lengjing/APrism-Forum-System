import { apiClient, unwrapResponse } from './api'
import type { CreateThreadInput, ModerateThreadInput, ThreadDetail } from '../types/thread'

export const threadService = {
  async getThreadById(id: number): Promise<ThreadDetail> {
    const response = await apiClient.get(`/threads/${id}`)
    return unwrapResponse<ThreadDetail>(response)
  },

  async createThread(input: CreateThreadInput): Promise<ThreadDetail> {
    const response = await apiClient.post('/threads', input)
    return unwrapResponse<ThreadDetail>(response)
  },

  async updateThreadModeration(
    threadId: number,
    input: ModerateThreadInput
  ): Promise<ThreadDetail> {
    const response = await apiClient.patch(`/threads/${threadId}/moderation`, input)
    return unwrapResponse<ThreadDetail>(response)
  },

  async moveThread(threadId: number, targetForumId: number): Promise<ThreadDetail> {
    const response = await apiClient.post(`/threads/${threadId}/move`, {
      targetForumId,
    })
    return unwrapResponse<ThreadDetail>(response)
  },
}
