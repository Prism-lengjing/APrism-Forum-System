import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SearchPage from './SearchPage'

const mocks = vi.hoisted(() => ({
  getForums: vi.fn().mockResolvedValue([
    {
      id: 1,
      categoryId: 1,
      categoryName: 'Cat',
      name: 'Forum One',
      slug: 'forum-one',
      description: null,
      icon: null,
      threadCount: 0,
      postCount: 0,
      lastThreadId: null,
      lastPostTime: null,
      sortOrder: 1,
    },
  ]),
  searchThreads: vi.fn().mockResolvedValue({
    items: [
      {
        id: 101,
        forumId: 1,
        title: 'JEST thread title',
        excerpt: 'JEST thread excerpt',
        type: 'normal',
        isPinned: false,
        isLocked: false,
        isEssence: false,
        viewCount: 0,
        replyCount: 2,
        likeCount: 0,
        lastPostTime: null,
        createdAt: '2026-02-14T00:00:00.000Z',
        updatedAt: '2026-02-14T00:00:00.000Z',
        author: { id: 1, username: 'jest_author', avatar: null },
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  }),
  searchUsers: vi.fn().mockResolvedValue({
    items: [
      {
        id: 201,
        username: 'jest_user',
        avatar: null,
        bio: 'JEST user bio',
        level: 2,
        experience: 120,
        threadCount: 3,
        postCount: 4,
        createdAt: '2026-02-14T00:00:00.000Z',
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  }),
}))

vi.mock('../services/forumService', () => ({
  forumService: {
    getForums: mocks.getForums,
  },
}))

vi.mock('../services/searchService', () => ({
  searchService: {
    searchThreads: mocks.searchThreads,
    searchUsers: mocks.searchUsers,
  },
}))

describe('SearchPage', () => {
  beforeEach(() => {
    mocks.getForums.mockClear()
    mocks.searchThreads.mockClear()
    mocks.searchUsers.mockClear()
  })

  it('searches threads and renders thread results', async () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByText('Enter a keyword to start searching.')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search keyword...'), {
      target: { value: 'JEST' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mocks.searchThreads).toHaveBeenCalledWith('JEST', 1, 20, undefined)
    })
    expect(screen.getByText('JEST thread title')).toBeInTheDocument()
  })

  it('switches to user tab and renders user results', async () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('Search keyword...'), {
      target: { value: 'jest_user' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mocks.searchThreads).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Users' }))

    await waitFor(() => {
      expect(mocks.searchUsers).toHaveBeenCalledWith('jest_user', 1, 20)
    })
    expect(screen.getByText('jest_user')).toBeInTheDocument()
    expect(screen.getByText('JEST user bio')).toBeInTheDocument()
  })
})
