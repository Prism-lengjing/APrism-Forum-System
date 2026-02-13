import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ThreadDetailPage from './ThreadDetailPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  fetchThreadById: vi.fn().mockResolvedValue(undefined),
  fetchThreadPosts: vi.fn().mockResolvedValue(undefined),
  createPost: vi.fn().mockResolvedValue({ id: 501 }),
  authState: { isAuthenticated: true },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ id: '101' }),
  }
})

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => boolean) =>
    selector(mocks.authState),
}))

vi.mock('../store/threadStore', () => ({
  useThreadStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      currentThread: {
        id: 101,
        forumId: 1,
        title: 'JEST Thread Detail',
        content: 'JEST Thread Content',
        excerpt: 'JEST excerpt',
        type: 'normal',
        isPinned: false,
        isLocked: false,
        isEssence: false,
        viewCount: 12,
        replyCount: 1,
        likeCount: 0,
        lastPostTime: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        forum: {
          id: 1,
          name: 'JavaScript',
          slug: 'javascript',
        },
        author: {
          id: 2,
          username: 'jest_author',
          avatar: null,
        },
      },
      loading: false,
      fetchThreadById: mocks.fetchThreadById,
    }

    if (typeof selector === 'function') {
      return selector(state)
    }

    return state
  },
}))

vi.mock('../store/postStore', () => ({
  usePostStore: () => ({
    postPage: {
      items: [
        {
          id: 301,
          threadId: 101,
          userId: 3,
          content: 'JEST reply content',
          floor: 1,
          parentId: null,
          isThreadAuthor: false,
          likeCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          author: {
            id: 3,
            username: 'jest_replier',
            avatar: null,
            level: 1,
            postCount: 5,
          },
        },
      ],
      page: 1,
      pageSize: 30,
      total: 1,
      totalPages: 2,
    },
    loading: false,
    creating: false,
    fetchThreadPosts: mocks.fetchThreadPosts,
    createPost: mocks.createPost,
  }),
}))

describe('ThreadDetailPage', () => {
  beforeEach(() => {
    mocks.authState.isAuthenticated = true
    mocks.navigate.mockClear()
    mocks.toastSuccess.mockClear()
    mocks.toastError.mockClear()
    mocks.fetchThreadById.mockClear()
    mocks.fetchThreadPosts.mockClear()
    mocks.createPost.mockClear()
  })

  it('submits reply and refreshes thread/posts', async () => {
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.fetchThreadById).toHaveBeenCalledWith(101)
      expect(mocks.fetchThreadPosts).toHaveBeenCalledWith(101, 1, 30)
    })

    fireEvent.change(screen.getByPlaceholderText('写下你的回复...'), {
      target: { value: 'JEST_new_reply' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提交回复' }))

    await waitFor(() => {
      expect(mocks.createPost).toHaveBeenCalledWith({
        threadId: 101,
        content: 'JEST_new_reply',
      })
    })
    await waitFor(() => {
      expect(mocks.fetchThreadById).toHaveBeenCalledWith(101)
      expect(mocks.fetchThreadPosts).toHaveBeenLastCalledWith(101, 1, 30)
      expect(mocks.toastSuccess).toHaveBeenCalledWith('回复成功')
    })
  })

  it('changes page and reloads replies', async () => {
    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))

    await waitFor(() => {
      expect(mocks.fetchThreadPosts).toHaveBeenCalledWith(101, 2, 30)
    })
  })

  it('disables reply controls for unauthenticated user', async () => {
    mocks.authState.isAuthenticated = false

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('写下你的回复...'), {
      target: { value: 'JEST_guest_reply' },
    })
    expect(screen.getByRole('button', { name: '提交回复' })).toBeDisabled()
    expect(mocks.createPost).not.toHaveBeenCalled()
    expect(screen.getByText('登录后可回复')).toBeInTheDocument()
  })
})
