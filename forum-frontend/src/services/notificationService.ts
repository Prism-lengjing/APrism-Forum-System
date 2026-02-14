import { API_BASE_URL, apiClient, unwrapResponse } from './api'
import type {
  MarkAllReadResult,
  NotificationItem,
  NotificationPage,
  NotificationSettings,
  UpdateNotificationSettingsInput,
} from '../types/notification'

export const notificationService = {
  async getNotifications(
    page = 1,
    pageSize = 20,
    unreadOnly = false
  ): Promise<NotificationPage> {
    const response = await apiClient.get('/notifications', {
      params: { page, pageSize, unreadOnly },
    })
    return unwrapResponse<NotificationPage>(response)
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/notifications/unread-count')
    const data = unwrapResponse<{ unreadCount: number }>(response)
    return Number(data.unreadCount)
  },

  async markAsRead(notificationId: number): Promise<NotificationItem> {
    const response = await apiClient.post(`/notifications/${notificationId}/read`)
    return unwrapResponse<NotificationItem>(response)
  },

  async markAllAsRead(): Promise<MarkAllReadResult> {
    const response = await apiClient.post('/notifications/read-all')
    return unwrapResponse<MarkAllReadResult>(response)
  },

  async getSettings(): Promise<NotificationSettings> {
    const response = await apiClient.get('/notifications/settings')
    return unwrapResponse<NotificationSettings>(response)
  },

  async updateSettings(input: UpdateNotificationSettingsInput): Promise<NotificationSettings> {
    const response = await apiClient.put('/notifications/settings', input)
    return unwrapResponse<NotificationSettings>(response)
  },

  createStream(token: string): EventSource {
    const base = API_BASE_URL.endsWith('/')
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL
    const url = `${base}/notifications/stream?token=${encodeURIComponent(token)}`
    return new EventSource(url)
  },
}
