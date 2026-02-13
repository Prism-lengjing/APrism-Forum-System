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
