import axios from 'axios'
import { create } from 'zustand'
import { messageService } from '../services/messageService'
import type { ConversationPage, MessagePage } from '../types/message'

interface MessageState {
  conversationPage: ConversationPage | null
  messagePage: MessagePage | null
  currentConversationId: number | null
  loadingConversations: boolean
  loadingMessages: boolean
  sending: boolean
  deletingIds: number[]
  error: string | null
  fetchConversations: (page?: number, pageSize?: number) => Promise<void>
  fetchMessages: (
    conversationId: number,
    page?: number,
    pageSize?: number
  ) => Promise<void>
  setCurrentConversation: (conversationId: number | null) => void
  sendMessage: (receiverId: number, content: string) => Promise<void>
  deleteMessage: (messageId: number) => Promise<void>
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

export const useMessageStore = create<MessageState>((set, get) => ({
  conversationPage: null,
  messagePage: null,
  currentConversationId: null,
  loadingConversations: false,
  loadingMessages: false,
  sending: false,
  deletingIds: [],
  error: null,

  fetchConversations: async (page = 1, pageSize = 20) => {
    set({ loadingConversations: true, error: null })
    try {
      const conversationPage = await messageService.getConversations(page, pageSize)
      const currentConversationId = get().currentConversationId
      const hasCurrentConversation =
        typeof currentConversationId === 'number' &&
        conversationPage.items.some((item) => item.id === currentConversationId)

      set({
        conversationPage,
        currentConversationId: hasCurrentConversation
          ? currentConversationId
          : conversationPage.items[0]?.id ?? null,
        loadingConversations: false,
      })
    } catch (error) {
      set({
        loadingConversations: false,
        error: getErrorMessage(error),
        conversationPage: null,
      })
      throw error
    }
  },

  fetchMessages: async (conversationId, page = 1, pageSize = 50) => {
    set({ loadingMessages: true, error: null })
    try {
      const messagePage = await messageService.getConversationMessages(
        conversationId,
        page,
        pageSize
      )
      set({
        messagePage,
        currentConversationId: conversationId,
        loadingMessages: false,
      })
    } catch (error) {
      set({
        loadingMessages: false,
        error: getErrorMessage(error),
        messagePage: null,
      })
      throw error
    }
  },

  setCurrentConversation: (conversationId) => {
    set({
      currentConversationId: conversationId,
      messagePage: null,
    })
  },

  sendMessage: async (receiverId, content) => {
    const currentConversationId = get().currentConversationId
    set({ sending: true, error: null })
    try {
      await messageService.sendMessage({ receiverId, content })
      const conversationPage = get().conversationPage
      const currentMessages = get().messagePage

      if (conversationPage) {
        await get().fetchConversations(conversationPage.page, conversationPage.pageSize)
      } else {
        await get().fetchConversations(1, 20)
      }

      if (typeof currentConversationId === 'number') {
        await get().fetchMessages(
          currentConversationId,
          currentMessages?.page ?? 1,
          currentMessages?.pageSize ?? 50
        )
      }
    } catch (error) {
      set({ error: getErrorMessage(error) })
      throw error
    } finally {
      set({ sending: false })
    }
  },

  deleteMessage: async (messageId) => {
    if (get().deletingIds.includes(messageId)) {
      return
    }

    set({ deletingIds: [...get().deletingIds, messageId], error: null })
    try {
      await messageService.deleteMessage(messageId)

      const currentConversationId = get().currentConversationId
      const conversationPage = get().conversationPage
      const currentMessages = get().messagePage

      if (conversationPage) {
        await get().fetchConversations(conversationPage.page, conversationPage.pageSize)
      }

      if (typeof currentConversationId === 'number') {
        await get().fetchMessages(
          currentConversationId,
          currentMessages?.page ?? 1,
          currentMessages?.pageSize ?? 50
        )
      }
    } catch (error) {
      set({ error: getErrorMessage(error) })
      throw error
    } finally {
      set({ deletingIds: get().deletingIds.filter((id) => id !== messageId) })
    }
  },

  reset: () => {
    set({
      conversationPage: null,
      messagePage: null,
      currentConversationId: null,
      loadingConversations: false,
      loadingMessages: false,
      sending: false,
      deletingIds: [],
      error: null,
    })
  },
}))
