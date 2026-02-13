import axios from 'axios'
import { create } from 'zustand'
import { forumService } from '../services/forumService'
import type { PaginatedResult } from '../types/api'
import type { ForumCategory, ForumItem } from '../types/forum'
import type { ThreadSummary } from '../types/thread'

interface ForumState {
  categories: ForumCategory[]
  forums: ForumItem[]
  currentForum: ForumItem | null
  threadPage: PaginatedResult<ThreadSummary> | null
  loading: boolean
  error: string | null
  fetchCategories: () => Promise<void>
  fetchForums: () => Promise<void>
  fetchForumById: (forumId: number) => Promise<void>
  fetchForumThreads: (forumId: number, page?: number, pageSize?: number) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    return message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '请求失败，请稍后重试'
}

export const useForumStore = create<ForumState>((set) => ({
  categories: [],
  forums: [],
  currentForum: null,
  threadPage: null,
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null })
    try {
      const categories = await forumService.getCategories()
      set({ categories, loading: false })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  fetchForums: async () => {
    set({ loading: true, error: null })
    try {
      const forums = await forumService.getForums()
      set({ forums, loading: false })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  fetchForumById: async (forumId) => {
    set({ loading: true, error: null })
    try {
      const currentForum = await forumService.getForumById(forumId)
      set({ currentForum, loading: false })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  fetchForumThreads: async (forumId, page = 1, pageSize = 20) => {
    set({ loading: true, error: null })
    try {
      const threadPage = await forumService.getForumThreads(forumId, page, pageSize)
      set({ threadPage, loading: false })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) })
      throw error
    }
  },
}))
