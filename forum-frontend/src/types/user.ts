export interface PublicUserProfile {
  id: number
  username: string
  avatar: string | null
  bio: string | null
  role: string
  level: number
  experience: number
  postCount: number
  threadCount: number
  followerCount?: number
  followingCount?: number
  createdAt: string
}

export interface FollowStatus {
  following: boolean
  followerCount: number
}
