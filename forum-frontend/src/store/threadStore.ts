import axios from 'axios'
import { create } from 'zustand'
import { threadService } from '../services/threadService'
import type { CreateThreadInput, ThreadDetail } from '../types/thread'

interface ThreadState {
  currentThread: ThreadDetail | null
  loading: boolean
  creating: boolean
  error: string | null
  fetchThreadById: (threadId: number) => Promise<void>
  createThread: (input: CreateThreadInput) => Promise<ThreadDetail>
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

export const useThreadStore = create<ThreadState>((set) => ({
  currentThread: null,
  loading: false,
  creating: false,
  error: null,

  fetchThreadById: async (threadId) => {
    set({ loading: true, error: null })
    try {
      const currentThread = await threadService.getThreadById(threadId)
      set({ currentThread, loading: false })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error), currentThread: null })
      throw error
    }
  },

  createThread: async (input) => {
    set({ creating: true, error: null })
    try {
      const created = await threadService.createThread(input)
      set({ creating: false })
      return created
    } catch (error) {
      set({ creating: false, error: getErrorMessage(error) })
      throw error
    }
  },
}))
