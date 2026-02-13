export interface ThreadAuthor {
  id: number
  username: string
  avatar: string | null
}

export interface ThreadSummary {
  id: number
  forumId: number
  title: string
  excerpt: string
  type: string
  isPinned: boolean
  isLocked: boolean
  isEssence: boolean
  viewCount: number
  replyCount: number
  likeCount: number
  lastPostTime: string | null
  createdAt: string
  updatedAt: string
  author: ThreadAuthor
}

export interface ThreadDetail extends ThreadSummary {
  content: string
  forum: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateThreadInput {
  forumId: number
  title: string
  content: string
  type?: string
}
