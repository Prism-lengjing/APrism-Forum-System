export interface UserProfile {
  id: number
  username: string
  email: string
  avatar: string | null
  bio: string | null
  role: string
  level: number
  experience: number
  postCount: number
  threadCount: number
  createdAt: string
}

export interface AuthResult {
  token: string
  user: UserProfile
}
