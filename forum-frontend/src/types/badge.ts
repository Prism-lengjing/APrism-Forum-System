export interface BadgeItem {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  type: string
  conditionType: string | null
  conditionValue: number | null
  color: string | null
  sortOrder: number
  createdAt: string
}

export interface UserBadgeItem extends BadgeItem {
  awardedAt: string
}
