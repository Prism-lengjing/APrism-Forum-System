import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeaderboardPage from './LeaderboardPage'

const mocks = vi.hoisted(() => ({
  fetchPointsBoard: vi.fn().mockResolvedValue(undefined),
  fetchSigninBoard: vi.fn().mockResolvedValue(undefined),
  setPeriod: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../store/leaderboardStore', () => ({
  useLeaderboardStore: () => ({
    pointsBoard: {
      items: [
        {
          rank: 1,
          userId: 11,
          username: 'jest_points_user',
          avatar: null,
          level: 2,
          experience: 120,
          score: 40,
          period: 'all',
          threadCount: 2,
          postCount: 6,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
    signinBoard: {
      items: [
        {
          rank: 1,
          userId: 22,
          username: 'jest_signin_user',
          avatar: null,
          bestStreak: 7,
          totalSigninDays: 12,
          lastSignDate: '2026-02-13',
          period: 'all',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
    period: 'all',
    loadingPoints: false,
    loadingSignin: false,
    error: null,
    fetchPointsBoard: mocks.fetchPointsBoard,
    fetchSigninBoard: mocks.fetchSigninBoard,
    setPeriod: mocks.setPeriod,
  }),
}))

describe('LeaderboardPage', () => {
  beforeEach(() => {
    mocks.fetchPointsBoard.mockClear()
    mocks.fetchSigninBoard.mockClear()
    mocks.setPeriod.mockClear()
  })

  it('renders leaderboard data and loads initial boards', async () => {
    render(
      <MemoryRouter>
        <LeaderboardPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: '排行榜' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '积分榜' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '签到榜' })).toBeInTheDocument()
    expect(screen.getByText('jest_points_user')).toBeInTheDocument()
    expect(screen.getByText('周期积分 40')).toBeInTheDocument()
    expect(screen.getByText('jest_signin_user')).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.fetchPointsBoard).toHaveBeenCalledWith(1, 20, 'all')
      expect(mocks.fetchSigninBoard).toHaveBeenCalledWith(1, 20, 'all')
    })
  })

  it('changes period when period button is clicked', async () => {
    render(
      <MemoryRouter>
        <LeaderboardPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: '近7天' }))

    await waitFor(() => {
      expect(mocks.setPeriod).toHaveBeenCalledWith('7d')
    })
  })
})
