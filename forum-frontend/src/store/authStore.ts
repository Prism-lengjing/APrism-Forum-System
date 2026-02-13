import axios from 'axios'
import { create } from 'zustand'
import { authService } from '../services/authService'
import { TOKEN_KEY } from '../services/api'
import type { UserProfile } from '../types/auth'

const USER_KEY = 'ap_user'

interface AuthState {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  hydrate: () => void
  login: (identifier: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
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

function persistAuth(token: string, user: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)

    if (!token || !userRaw) {
      set({ user: null, token: null, isAuthenticated: false })
      return
    }

    try {
      const user = JSON.parse(userRaw) as UserProfile
      set({
        token,
        user,
        isAuthenticated: true,
      })
    } catch {
      clearAuthStorage()
      set({ user: null, token: null, isAuthenticated: false })
    }
  },

  login: async (identifier, password) => {
    set({ loading: true, error: null })
    try {
      const result = await authService.login({ identifier, password })
      persistAuth(result.token, result.user)
      set({
        token: result.token,
        user: result.user,
        isAuthenticated: true,
        loading: false,
      })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null })
    try {
      const result = await authService.register({ username, email, password })
      persistAuth(result.token, result.user)
      set({
        token: result.token,
        user: result.user,
        isAuthenticated: true,
        loading: false,
      })
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) })
      throw error
    }
  },

  fetchMe: async () => {
    set({ loading: true, error: null })
    try {
      const user = await authService.me()
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        throw new Error('token missing')
      }
      persistAuth(token, user)
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
      })
    } catch (error) {
      clearAuthStorage()
      set({
        loading: false,
        error: getErrorMessage(error),
        user: null,
        token: null,
        isAuthenticated: false,
      })
    }
  },

  logout: () => {
    clearAuthStorage()
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      loading: false,
    })
  },
}))
