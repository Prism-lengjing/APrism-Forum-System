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
  moderateThread: vi.fn().mockResolvedValue(undefined),
  moveThread: vi.fn().mockResolvedValue(undefined),
  getForumModerators: vi.fn().mockResolvedValue([]),
  getForumModeratorLogs: vi.fn().mockResolvedValue({
    items: [
      {
        id: 10,
        forumId: 1,
        threadId: 101,
        moderatorUserId: 99,
        action: 'thread_moderation_update',
        detail: 'set pinned=true',
        createdAt: '2026-01-01T00:00:00.000Z',
        moderator: {
          id: 99,
          username: 'jest_admin',
          avatar: null,
        },
      },
    ],
    page: 1,
    pageSize: 8,
    total: 1,
    totalPages: 1,
  }),
  getForums: vi.fn().mockResolvedValue([
    {
      id: 1,
      categoryId: 1,
      categoryName: 'Cat',
      name: 'JavaScript',
      slug: 'javascript',
      description: null,
      icon: null,
      threadCount: 0,
      postCount: 0,
      lastThreadId: null,
      lastPostTime: null,
      sortOrder: 1,
    },
    {
      id: 2,
      categoryId: 1,
      categoryName: 'Cat',
      name: 'Python',
      slug: 'python',
      description: null,
      icon: null,
      threadCount: 0,
      postCount: 0,
      lastThreadId: null,
      lastPostTime: null,
      sortOrder: 2,
    },
  ]),
  authState: {
    isAuthenticated: true,
    user: {
      id: 99,
      username: 'jest_user',
      email: 'jest_user@example.com',
      avatar: null,
      bio: null,
      role: 'user',
      level: 1,
      experience: 0,
      postCount: 0,
      threadCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  },
  threadState: {
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
    moderating: false,
    moving: false,
  },
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
  useAuthStore: (
    selector: (state: { isAuthenticated: boolean; user: unknown }) => unknown
  ) => selector(mocks.authState),
}))

vi.mock('../services/forumService', () => ({
  forumService: {
    getForumModerators: mocks.getForumModerators,
    getForumModeratorLogs: mocks.getForumModeratorLogs,
    getForums: mocks.getForums,
  },
}))

vi.mock('../store/threadStore', () => ({
  useThreadStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      ...mocks.threadState,
      fetchThreadById: mocks.fetchThreadById,
      moderateThread: mocks.moderateThread,
      moveThread: mocks.moveThread,
    }

    if (typeof selector === 'function') {
      return selector(state)
    }
    return state
  },
}))

vi.mock('../store/postStore', () => ({
  usePostStore: () => ({
    postPage: mocks.postPage,
    loading: false,
    creating: false,
    fetchThreadPosts: mocks.fetchThreadPosts,
    createPost: mocks.createPost,
  }),
}))

describe('ThreadDetailPage', () => {
  beforeEach(() => {
    mocks.authState.isAuthenticated = true
    mocks.authState.user.role = 'user'
    mocks.threadState.currentThread.isPinned = false
    mocks.threadState.currentThread.isLocked = false
    mocks.threadState.currentThread.isEssence = false
    mocks.threadState.currentThread.forumId = 1
    mocks.navigate.mockClear()
    mocks.toastSuccess.mockClear()
    mocks.toastError.mockClear()
    mocks.fetchThreadById.mockClear()
    mocks.fetchThreadPosts.mockClear()
    mocks.createPost.mockClear()
    mocks.moderateThread.mockClear()
    mocks.moveThread.mockClear()
    mocks.getForumModerators.mockClear()
    mocks.getForumModeratorLogs.mockClear()
    mocks.getForums.mockClear()
  })

  it('submits reply and refreshes thread/posts', async () => {
    const { container } = render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.fetchThreadById).toHaveBeenCalledWith(101)
      expect(mocks.fetchThreadPosts).toHaveBeenCalledWith(101, 1, 30)
    })

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'JEST_new_reply' },
    })

    const submitButton = container.querySelector('form button[type="submit"]')
    if (!submitButton) {
      throw new Error('submit button not found')
    }
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mocks.createPost).toHaveBeenCalledWith({
        threadId: 101,
        content: 'JEST_new_reply',
      })
    })
    await waitFor(() => {
      expect(mocks.fetchThreadById).toHaveBeenCalledWith(101)
      expect(mocks.fetchThreadPosts).toHaveBeenLastCalledWith(101, 1, 30)
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Reply created')
    })
  })

  it('shows error toast and keeps reply content when submit fails', async () => {
    mocks.createPost.mockRejectedValueOnce(new Error('reply failed'))
    const { container } = render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    const replyInput = screen.getByRole('textbox')
    fireEvent.change(replyInput, {
      target: { value: 'JEST_reply_failure_content' },
    })
    const submitButton = container.querySelector('form button[type="submit"]')
    if (!submitButton) {
      throw new Error('submit button not found')
    }
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mocks.createPost).toHaveBeenCalledWith({
        threadId: 101,
        content: 'JEST_reply_failure_content',
      })
    })
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledTimes(1)
    })
    expect(replyInput).toHaveValue('JEST_reply_failure_content')
  })

  it('disables reply controls for unauthenticated user', () => {
    mocks.authState.isAuthenticated = false

    const { container } = render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    const submitButton = container.querySelector('form button[type="submit"]')
    if (!submitButton) {
      throw new Error('submit button not found')
    }
    expect(submitButton).toBeDisabled()
    expect(mocks.createPost).not.toHaveBeenCalled()
  })

  it('shows moderation tools for admin and can call moderation API', async () => {
    mocks.authState.user.role = 'admin'

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Moderation Tools' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Set Pinned' }))

    await waitFor(() => {
      expect(mocks.moderateThread).toHaveBeenCalledWith(101, { isPinned: true })
    })
  })

  it('loads and renders moderator logs for admin', async () => {
    mocks.authState.user.role = 'admin'

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.getForumModeratorLogs).toHaveBeenCalledWith(1, 1, 8)
    })
    expect(screen.getByRole('heading', { name: 'Recent Moderator Logs' })).toBeInTheDocument()
    expect(screen.getByText('thread_moderation_update')).toBeInTheDocument()
    expect(screen.getByText('by jest_admin · Thread #101')).toBeInTheDocument()
  })

  it('allows admin to move thread to another forum', async () => {
    mocks.authState.user.role = 'admin'

    render(
      <MemoryRouter>
        <ThreadDetailPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.getForums).toHaveBeenCalled()
    })

    fireEvent.change(screen.getByLabelText('Target Forum'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Move Thread' }))

    await waitFor(() => {
      expect(mocks.moveThread).toHaveBeenCalledWith(101, 2)
    })
  })
})
