import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ForumDetailPage from './ForumDetailPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  fetchForumById: vi.fn().mockResolvedValue(undefined),
  fetchForumThreads: vi.fn().mockResolvedValue(undefined),
  createThread: vi.fn().mockResolvedValue({ id: 777 }),
  authState: { isAuthenticated: true },
  threadPage: {
    items: [
      {
        id: 11,
        forumId: 1,
        title: 'JEST_Thread',
        excerpt: 'JEST_Excerpt',
        type: 'normal',
        isPinned: false,
        isLocked: false,
        isEssence: false,
        viewCount: 12,
        replyCount: 3,
        likeCount: 0,
        lastPostTime: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        author: {
          id: 2,
          username: 'jest_author',
          avatar: null,
        },
      },
    ],
    page: 1,
    pageSize: 20,
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
    useParams: () => ({ id: '1' }),
  }
})

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => boolean) =>
    selector(mocks.authState),
}))

vi.mock('../store/forumStore', () => ({
  useForumStore: () => ({
    currentForum: {
      id: 1,
      categoryId: 1,
      categoryName: '技术交流',
      name: 'JavaScript',
      slug: 'javascript',
      description: 'JS Board',
      icon: '🟨',
      threadCount: 20,
      postCount: 50,
      lastThreadId: null,
      lastPostTime: null,
      sortOrder: 1,
    },
    threadPage: mocks.threadPage,
    loading: false,
    error: null,
    fetchForumById: mocks.fetchForumById,
    fetchForumThreads: mocks.fetchForumThreads,
  }),
}))

vi.mock('../store/threadStore', () => ({
  useThreadStore: (
    selector: (state: {
      createThread: typeof mocks.createThread
      creating: boolean
    }) => unknown
  ) =>
    selector({
      createThread: mocks.createThread,
      creating: false,
    }),
}))

describe('ForumDetailPage', () => {
  beforeEach(() => {
    mocks.authState.isAuthenticated = true
    mocks.navigate.mockClear()
    mocks.toastSuccess.mockClear()
    mocks.toastError.mockClear()
    mocks.fetchForumById.mockClear()
    mocks.fetchForumThreads.mockClear()
    mocks.createThread.mockClear()
    mocks.threadPage = {
      items: [
        {
          id: 11,
          forumId: 1,
          title: 'JEST_Thread',
          excerpt: 'JEST_Excerpt',
          type: 'normal',
          isPinned: false,
          isLocked: false,
          isEssence: false,
          viewCount: 12,
          replyCount: 3,
          likeCount: 0,
          lastPostTime: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          author: {
            id: 2,
            username: 'jest_author',
            avatar: null,
          },
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 2,
    }
  })

  it('submits new thread and navigates to thread detail', async () => {
    render(
      <MemoryRouter>
        <ForumDetailPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.fetchForumById).toHaveBeenCalledWith(1)
      expect(mocks.fetchForumThreads).toHaveBeenCalledWith(1, 1, 20)
    })

    fireEvent.change(screen.getByPlaceholderText('标题（3-255字）'), {
      target: { value: 'JEST_new_title' },
    })
    fireEvent.change(screen.getByPlaceholderText('内容'), {
      target: { value: 'JEST_new_content' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发布主题' }))

    await waitFor(() => {
      expect(mocks.createThread).toHaveBeenCalledWith({
        forumId: 1,
        title: 'JEST_new_title',
        content: 'JEST_new_content',
        type: 'normal',
      })
    })
    await waitFor(() => {
      expect(mocks.fetchForumThreads).toHaveBeenLastCalledWith(1, 1, 20)
      expect(mocks.navigate).toHaveBeenCalledWith('/threads/777')
      expect(mocks.toastSuccess).toHaveBeenCalledWith('主题已创建')
    })
  })

  it('shows error toast and keeps page when create thread fails', async () => {
    mocks.createThread.mockRejectedValueOnce(new Error('create failed'))

    render(
      <MemoryRouter>
        <ForumDetailPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.fetchForumById).toHaveBeenCalledWith(1)
      expect(mocks.fetchForumThreads).toHaveBeenCalledWith(1, 1, 20)
    })

    fireEvent.change(screen.getByPlaceholderText('标题（3-255字）'), {
      target: { value: 'JEST_error_title' },
    })
    fireEvent.change(screen.getByPlaceholderText('内容'), {
      target: { value: 'JEST_error_content' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发布主题' }))

    await waitFor(() => {
      expect(mocks.createThread).toHaveBeenCalledWith({
        forumId: 1,
        title: 'JEST_error_title',
        content: 'JEST_error_content',
        type: 'normal',
      })
    })
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledTimes(1)
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('changes page and reloads thread list', async () => {
    render(
      <MemoryRouter>
        <ForumDetailPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))

    await waitFor(() => {
      expect(mocks.fetchForumThreads).toHaveBeenCalledWith(1, 2, 20)
    })
  })

  it('shows empty thread state and still reloads on page change', async () => {
    mocks.threadPage = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 2,
    }

    render(
      <MemoryRouter>
        <ForumDetailPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/暂无主题/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))

    await waitFor(() => {
      expect(mocks.fetchForumThreads).toHaveBeenCalledWith(1, 2, 20)
    })
  })

  it('disables submit controls for unauthenticated user', async () => {
    mocks.authState.isAuthenticated = false

    render(
      <MemoryRouter>
        <ForumDetailPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('标题（3-255字）'), {
      target: { value: 'JEST_guest_title' },
    })
    fireEvent.change(screen.getByPlaceholderText('内容'), {
      target: { value: 'JEST_guest_content' },
    })
    expect(screen.getByRole('button', { name: '发布主题' })).toBeDisabled()
    expect(mocks.createThread).not.toHaveBeenCalled()
    expect(screen.getByText('登录后可发帖')).toBeInTheDocument()
  })
})
