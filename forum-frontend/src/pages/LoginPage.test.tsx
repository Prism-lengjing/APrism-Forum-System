import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

const navigateMock = vi.fn()
const loginMock = vi.fn().mockResolvedValue(undefined)

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null }),
  }
})

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    login: loginMock,
    loading: false,
    error: null,
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockClear()
    navigateMock.mockClear()
  })

  it('submits credentials and redirects on success', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('用户名或邮箱'), {
      target: { value: 'testuser' },
    })
    fireEvent.change(screen.getByPlaceholderText('密码'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('testuser', 'password123')
    })
    expect(navigateMock).toHaveBeenCalledWith('/forums', { replace: true })
  })
})
