import axios, { type AxiosResponse } from 'axios'
import type { ApiSuccessResponse } from '../types/api'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 10000)
const TOKEN_KEY = 'ap_token'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function unwrapResponse<T>(response: AxiosResponse<ApiSuccessResponse<T>>): T {
  return response.data.data
}

export { TOKEN_KEY }
