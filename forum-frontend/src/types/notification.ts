import type { PaginatedResult } from './api'

export interface NotificationActor {
  id: number
  username: string
  avatar: string | null
}

export interface NotificationItem {
  id: number
  userId: number
  actorUserId: number | null
  type: string
  title: string
  content: string | null
  relatedType: string | null
  relatedId: number | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  actor: NotificationActor | null
}

export type NotificationPage = PaginatedResult<NotificationItem>

export interface MarkAllReadResult {
  updated: number
  unreadCount: number
}

export interface NotificationStreamEvent {
  type: 'connected' | 'notification_created' | 'notification_read' | 'notification_read_all'
  userId: number
  notificationId?: number
  unreadCount: number
  createdAt: string
}

export interface NotificationSettings {
  userId: number
  threadReplyEnabled: boolean
  postReplyEnabled: boolean
  mentionEnabled: boolean
  postLikedEnabled: boolean
  followEnabled: boolean
  systemEnabled: boolean
  dndEnabled: boolean
  dndStartHour: number
  dndEndHour: number
  updatedAt: string
}

export type UpdateNotificationSettingsInput = Partial<
  Omit<NotificationSettings, 'userId' | 'updatedAt'>
>
