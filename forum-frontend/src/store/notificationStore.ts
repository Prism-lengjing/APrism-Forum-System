import axios from 'axios'
import { create } from 'zustand'
import { notificationService } from '../services/notificationService'
import type { NotificationPage } from '../types/notification'

interface NotificationState {
  page: NotificationPage | null
  unreadCount: number
  loadingPage: boolean
  loadingUnreadCount: boolean
  markingAllRead: boolean
  markingIds: number[]
  error: string | null
  fetchPage: (page?: number, pageSize?: number, unreadOnly?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markAllAsRead: () => Promise<void>
  markAsRead: (notificationId: number) => Promise<void>
  reset: () => void
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    return message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed, please try again later.'
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  page: null,
  unreadCount: 0,
  loadingPage: false,
  loadingUnreadCount: false,
  markingAllRead: false,
  markingIds: [],
  error: null,

  fetchPage: async (page = 1, pageSize = 8, unreadOnly = false) => {
    set({ loadingPage: true, error: null })
    try {
      const pageData = await notificationService.getNotifications(page, pageSize, unreadOnly)
      set({ page: pageData, loadingPage: false })
    } catch (error) {
      set({ loadingPage: false, error: getErrorMessage(error), page: null })
      throw error
    }
  },

  fetchUnreadCount: async () => {
    set({ loadingUnreadCount: true, error: null })
    try {
      const unreadCount = await notificationService.getUnreadCount()
      set({ unreadCount, loadingUnreadCount: false })
    } catch (error) {
      set({ loadingUnreadCount: false, error: getErrorMessage(error), unreadCount: 0 })
      throw error
    }
  },

  markAllAsRead: async () => {
    if (get().markingAllRead) {
      return
    }

    set({ markingAllRead: true, error: null })
    try {
      const result = await notificationService.markAllAsRead()
      const page = get().page
      const nextPage = page
        ? {
            ...page,
            items: page.items.map((item) => {
              if (item.isRead) {
                return item
              }
              return {
                ...item,
                isRead: true,
                readAt: item.readAt ?? new Date().toISOString(),
              }
            }),
          }
        : null

      set({
        page: nextPage,
        unreadCount: Number(result.unreadCount),
      })
    } catch (error) {
      set({ error: getErrorMessage(error) })
      throw error
    } finally {
      set({ markingAllRead: false })
    }
  },

  markAsRead: async (notificationId) => {
    const currentIds = get().markingIds
    if (currentIds.includes(notificationId)) {
      return
    }

    set({ markingIds: [...currentIds, notificationId], error: null })
    try {
      const updated = await notificationService.markAsRead(notificationId)

      const page = get().page
      const unreadCount = get().unreadCount
      if (page) {
        const nextItems = page.items.map((item) =>
          item.id === notificationId ? { ...item, ...updated } : item
        )
        const wasUnread = page.items.some((item) => item.id === notificationId && !item.isRead)
        set({
          page: { ...page, items: nextItems },
          unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
        })
      }
    } catch (error) {
      set({ error: getErrorMessage(error) })
      throw error
    } finally {
      const nextMarkingIds = get().markingIds.filter((id) => id !== notificationId)
      set({ markingIds: nextMarkingIds })
    }
  },

  reset: () => {
    set({
      page: null,
      unreadCount: 0,
      loadingPage: false,
      loadingUnreadCount: false,
      markingAllRead: false,
      markingIds: [],
      error: null,
    })
  },
}))
