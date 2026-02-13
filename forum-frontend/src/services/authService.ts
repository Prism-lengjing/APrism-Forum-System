import { apiClient, unwrapResponse } from './api'
import type { AuthResult, UserProfile } from '../types/auth'

interface RegisterInput {
  username: string
  email: string
  password: string
}

interface LoginInput {
  identifier: string
  password: string
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const response = await apiClient.post('/auth/register', input)
    return unwrapResponse<AuthResult>(response)
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const response = await apiClient.post('/auth/login', input)
    return unwrapResponse<AuthResult>(response)
  },

  async me(): Promise<UserProfile> {
    const response = await apiClient.get('/auth/me')
    return unwrapResponse<UserProfile>(response)
  },
}
