import type { PaginatedResult } from './api'
import type { ThreadSummary } from './thread'

export interface SearchUserItem {
  id: number
  username: string
  avatar: string | null
  bio: string | null
  level: number
  experience: number
  threadCount: number
  postCount: number
  createdAt: string
}

export type SearchThreadPage = PaginatedResult<ThreadSummary>
export type SearchUserPage = PaginatedResult<SearchUserItem>
