import axios from 'axios'
import { create } from 'zustand'
import { postService } from '../services/postService'
import type { PaginatedResult } from '../types/api'
import type { CreatePostInput, PostItem } from '../types/post'

interface PostState {
  postPage: PaginatedResult<PostItem> | null
  loading: boolean
  creating: boolean
  error: string | null
  fetchThreadPosts: (threadId: number, page?: number, pageSize?: number) => Promise<void>
  createPost: (input: CreatePostInput) => Promise<PostItem>
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

export const usePostStore = create<PostState>((set) => ({
  postPage: null,
  loading: false,
  creating: false,
  error: null,

  fetchThreadPosts: async (threadId, page = 1, pageSize = 20) => {
    set({ loading: true, error: null })
    try {
      const postPage = await postService.getThreadPosts(threadId, page, pageSize)
      set({ postPage, loading: false })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error), postPage: null })
      throw error
    }
  },

  createPost: async (input) => {
    set({ creating: true, error: null })
    try {
      const created = await postService.createPost(input)
      set({ creating: false })
      return created
    } catch (error) {
      set({ creating: false, error: getErrorMessage(error) })
      throw error
    }
  },
}))
