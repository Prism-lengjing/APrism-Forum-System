import type { PaginatedResult } from './api'

export interface ForumCategory {
  id: number
  name: string
  icon: string | null
  sortOrder: number
  forumCount: number
}

export interface ForumItem {
  id: number
  categoryId: number
  categoryName: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  threadCount: number
  postCount: number
  lastThreadId: number | null
  lastPostTime: string | null
  sortOrder: number
}

export interface ForumModerator {
  userId: number
  username: string
  avatar: string | null
  grantedBy: number
  grantedByUsername: string
  createdAt: string
}

export interface ModeratorActionLogItem {
  id: number
  forumId: number
  threadId: number | null
  moderatorUserId: number
  action: string
  detail: string | null
  createdAt: string
  moderator: {
    id: number
    username: string
    avatar: string | null
  }
}

export type ModeratorActionLogPage = PaginatedResult<ModeratorActionLogItem>
