import { threadService } from './threadService'
import type { ThreadDetail } from '../types/thread'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('./api', () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
  },
  unwrapResponse: <T>(response: { data: { data: T } }): T => response.data.data,
}))

describe('threadService moderation endpoints', () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.post.mockReset()
    mocks.patch.mockReset()
  })

  it('calls moderation endpoint with patch payload', async () => {
    const updatedThread = {
      id: 1,
      forumId: 1,
      title: 't',
      content: 'c',
      excerpt: 'c',
      type: 'normal',
      isPinned: true,
      isLocked: false,
      isEssence: false,
      viewCount: 1,
      replyCount: 1,
      likeCount: 0,
      lastPostTime: null,
      createdAt: '2026-02-14T00:00:00.000Z',
      updatedAt: '2026-02-14T00:00:00.000Z',
      forum: { id: 1, name: 'f', slug: 'f' },
      author: { id: 1, username: 'u', avatar: null },
    } satisfies ThreadDetail

    mocks.patch.mockResolvedValue({ data: { data: updatedThread } })

    const result = await threadService.updateThreadModeration(1, { isPinned: true })

    expect(mocks.patch).toHaveBeenCalledWith('/threads/1/moderation', {
      isPinned: true,
    })
    expect(result).toEqual(updatedThread)
  })

  it('calls move endpoint with target forum id', async () => {
    const movedThread = {
      id: 1,
      forumId: 2,
      title: 't',
      content: 'c',
      excerpt: 'c',
      type: 'normal',
      isPinned: false,
      isLocked: false,
      isEssence: false,
      viewCount: 1,
      replyCount: 1,
      likeCount: 0,
      lastPostTime: null,
      createdAt: '2026-02-14T00:00:00.000Z',
      updatedAt: '2026-02-14T00:00:00.000Z',
      forum: { id: 2, name: 'f2', slug: 'f2' },
      author: { id: 1, username: 'u', avatar: null },
    } satisfies ThreadDetail

    mocks.post.mockResolvedValue({ data: { data: movedThread } })

    const result = await threadService.moveThread(1, 2)

    expect(mocks.post).toHaveBeenCalledWith('/threads/1/move', {
      targetForumId: 2,
    })
    expect(result).toEqual(movedThread)
  })
})
