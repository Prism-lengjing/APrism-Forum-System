import { searchService } from './searchService'
import type { SearchThreadPage, SearchUserPage } from '../types/search'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('./api', () => ({
  apiClient: {
    get: mocks.get,
  },
  unwrapResponse: <T>(response: { data: { data: T } }): T => response.data.data,
}))

describe('searchService', () => {
  beforeEach(() => {
    mocks.get.mockReset()
  })

  it('calls thread search endpoint with optional forum filter', async () => {
    const pageData: SearchThreadPage = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    }
    mocks.get.mockResolvedValue({ data: { data: pageData } })

    const result = await searchService.searchThreads('jest', 1, 20, 3)

    expect(mocks.get).toHaveBeenCalledWith('/search/threads', {
      params: { q: 'jest', page: 1, pageSize: 20, forumId: 3 },
    })
    expect(result).toEqual(pageData)
  })

  it('calls user search endpoint', async () => {
    const pageData: SearchUserPage = {
      items: [],
      page: 2,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    }
    mocks.get.mockResolvedValue({ data: { data: pageData } })

    const result = await searchService.searchUsers('jest_user', 2, 10)

    expect(mocks.get).toHaveBeenCalledWith('/search/users', {
      params: { q: 'jest_user', page: 2, pageSize: 10 },
    })
    expect(result).toEqual(pageData)
  })
})
