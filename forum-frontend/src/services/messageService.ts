import { apiClient, unwrapResponse } from './api'
import type {
  ConversationPage,
  MessageItem,
  MessagePage,
  SendMessageInput,
} from '../types/message'

export const messageService = {
  async getConversations(page = 1, pageSize = 20): Promise<ConversationPage> {
    const response = await apiClient.get('/messages/conversations', {
      params: { page, pageSize },
    })
    return unwrapResponse<ConversationPage>(response)
  },

  async getConversationMessages(
    conversationId: number,
    page = 1,
    pageSize = 50
  ): Promise<MessagePage> {
    const response = await apiClient.get(`/messages/conversations/${conversationId}`, {
      params: { page, pageSize },
    })
    return unwrapResponse<MessagePage>(response)
  },

  async sendMessage(input: SendMessageInput): Promise<MessageItem> {
    const response = await apiClient.post('/messages', input)
    return unwrapResponse<MessageItem>(response)
  },

  async deleteMessage(messageId: number): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete(`/messages/${messageId}`)
    return unwrapResponse<{ deleted: boolean }>(response)
  },
}
