import { apiClient, unwrapResponse } from './api'
import type { CreateThreadInput, ThreadDetail } from '../types/thread'

export const threadService = {
  async getThreadById(id: number): Promise<ThreadDetail> {
    const response = await apiClient.get(`/threads/${id}`)
    return unwrapResponse<ThreadDetail>(response)
  },

  async createThread(input: CreateThreadInput): Promise<ThreadDetail> {
    const response = await apiClient.post('/threads', input)
    return unwrapResponse<ThreadDetail>(response)
  },
}
