import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ForumListPage from './ForumListPage'

const fetchCategoriesMock = vi.fn()
const fetchForumsMock = vi.fn()

vi.mock('../store/forumStore', () => ({
  useForumStore: () => ({
    categories: [
      { id: 1, name: '技术交流', icon: '💻', sortOrder: 1, forumCount: 1 },
    ],
    forums: [
      {
        id: 1,
        categoryId: 1,
        categoryName: '技术交流',
        name: 'JavaScript',
        slug: 'javascript',
        description: 'JS 技术讨论',
        icon: '🟨',
        threadCount: 10,
        postCount: 20,
        lastThreadId: null,
        lastPostTime: null,
        sortOrder: 1,
      },
    ],
    loading: false,
    error: null,
    fetchCategories: fetchCategoriesMock,
    fetchForums: fetchForumsMock,
  }),
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated: false }),
}))

describe('ForumListPage', () => {
  beforeEach(() => {
    fetchCategoriesMock.mockClear()
    fetchForumsMock.mockClear()
  })

  it('renders categories and forum cards', () => {
    render(
      <MemoryRouter>
        <ForumListPage />
      </MemoryRouter>
    )

    expect(screen.getByText('论坛板块')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /技术交流/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /JavaScript/ })).toBeInTheDocument()
    expect(fetchCategoriesMock).toHaveBeenCalled()
    expect(fetchForumsMock).toHaveBeenCalled()
  })
})
