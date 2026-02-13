export interface ApiSuccessResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
