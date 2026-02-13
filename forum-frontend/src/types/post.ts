export interface PostItem {
  id: number
  threadId: number
  userId: number
  content: string
  floor: number
  parentId: number | null
  isThreadAuthor: boolean
  likeCount: number
  createdAt: string
  updatedAt: string
  author: {
    id: number
    username: string
    avatar: string | null
    level: number
    postCount: number
  }
}

export interface CreatePostInput {
  threadId: number
  content: string
  parentId?: number
}
