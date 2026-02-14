import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UserProfilePage from './UserProfilePage'

const mocks = vi.hoisted(() => ({
  params: { id: '9' },
  getPublicProfile: vi.fn(),
  getUserBadges: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => mocks.params,
  }
})

vi.mock('../services/userService', () => ({
  userService: {
    getPublicProfile: mocks.getPublicProfile,
  },
}))

vi.mock('../services/badgeService', () => ({
  badgeService: {
    getUserBadges: mocks.getUserBadges,
  },
}))

describe('UserProfilePage', () => {
  beforeEach(() => {
    mocks.params.id = '9'
    mocks.getPublicProfile.mockReset()
    mocks.getUserBadges.mockReset()
  })

  it('renders profile and badges', async () => {
    mocks.getPublicProfile.mockResolvedValue({
      id: 9,
      username: 'jest_profile_user',
      avatar: null,
      bio: 'jest bio',
      role: 'user',
      level: 3,
      experience: 230,
      postCount: 12,
      threadCount: 5,
      createdAt: '2026-02-13T00:00:00.000Z',
    })
    mocks.getUserBadges.mockResolvedValue([
      {
        id: 1,
        name: '初次发帖',
        slug: 'first-thread',
        description: '发布第一个主题',
        icon: '🧵',
        type: 'achievement',
        conditionType: 'thread_count',
        conditionValue: 1,
        color: '#3B82F6',
        sortOrder: 10,
        createdAt: '2026-02-13T00:00:00.000Z',
        awardedAt: '2026-02-13T00:00:00.000Z',
      },
    ])

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    )

    expect(screen.getByText('加载中...')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'jest_profile_user' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '徽章墙' })).toBeInTheDocument()
    expect(screen.getByText('初次发帖')).toBeInTheDocument()
    expect(screen.getByText('获得时间: 2026-02-13')).toBeInTheDocument()
  })

  it('renders not-found state on 404', async () => {
    mocks.getPublicProfile.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })
    mocks.getUserBadges.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('用户不存在')).toBeInTheDocument()
    })
  })

  it('renders network-error state when request has no response', async () => {
    mocks.getPublicProfile.mockRejectedValue({
      isAxiosError: true,
      response: undefined,
    })
    mocks.getUserBadges.mockRejectedValue({
      isAxiosError: true,
      response: undefined,
    })

    render(
      <MemoryRouter>
        <UserProfilePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('网络错误，请检查连接后重试')).toBeInTheDocument()
    })
  })
})
