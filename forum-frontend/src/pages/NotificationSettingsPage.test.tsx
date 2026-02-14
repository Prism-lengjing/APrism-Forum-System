import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationSettingsPage from './NotificationSettingsPage'
import type { NotificationSettings } from '../types/notification'

const baseSettings: NotificationSettings = {
  userId: 2,
  threadReplyEnabled: true,
  postReplyEnabled: true,
  mentionEnabled: true,
  postLikedEnabled: true,
  followEnabled: true,
  systemEnabled: true,
  dndEnabled: false,
  dndStartHour: 23,
  dndEndHour: 8,
  updatedAt: '2026-02-14T00:00:00.000Z',
}

const mocks = vi.hoisted(() => ({
  authState: { isAuthenticated: true },
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => boolean) =>
    selector(mocks.authState),
}))

vi.mock('../services/notificationService', () => ({
  notificationService: {
    getSettings: mocks.getSettings,
    updateSettings: mocks.updateSettings,
  },
}))

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    mocks.authState.isAuthenticated = true
    mocks.getSettings.mockReset()
    mocks.updateSettings.mockReset()
    mocks.getSettings.mockResolvedValue({ ...baseSettings })
    mocks.updateSettings.mockImplementation(async (patch: Record<string, unknown>) => ({
      ...baseSettings,
      ...patch,
      updatedAt: '2026-02-14T01:00:00.000Z',
    }))
  })

  it('shows login hint when user is unauthenticated', () => {
    mocks.authState.isAuthenticated = false

    render(
      <MemoryRouter>
        <NotificationSettingsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('请先登录后配置通知设置。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '去登录' })).toHaveAttribute('href', '/login')
    expect(mocks.getSettings).not.toHaveBeenCalled()
  })

  it('loads settings and updates follow toggle', async () => {
    render(
      <MemoryRouter>
        <NotificationSettingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.getSettings).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole('heading', { name: '通知设置' })).toBeInTheDocument()
    expect(screen.getByText('当前免打扰时间段：23:00 - 08:00')).toBeInTheDocument()

    const followToggle = screen.getByRole('checkbox', { name: '关注通知' })
    expect(followToggle).toBeChecked()

    fireEvent.click(followToggle)

    await waitFor(() => {
      expect(mocks.updateSettings).toHaveBeenCalledWith({ followEnabled: false })
    })
    await waitFor(() => {
      expect(followToggle).not.toBeChecked()
    })
    expect(screen.getByText(/已保存：/)).toBeInTheDocument()
  })

  it('updates DND toggle and time range', async () => {
    let current = { ...baseSettings }
    mocks.updateSettings.mockImplementation(async (patch: Record<string, unknown>) => {
      current = {
        ...current,
        ...patch,
        updatedAt: '2026-02-14T01:00:00.000Z',
      }
      return current
    })

    render(
      <MemoryRouter>
        <NotificationSettingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.getSettings).toHaveBeenCalledTimes(1)
    })

    const dndToggle = screen.getByRole('checkbox', { name: '开启免打扰' })
    const startHourSelect = screen.getByRole('combobox', { name: '开始时间' })
    const endHourSelect = screen.getByRole('combobox', { name: '结束时间' })

    expect(dndToggle).not.toBeChecked()
    expect(startHourSelect).toHaveValue('23')
    expect(endHourSelect).toHaveValue('8')

    fireEvent.click(dndToggle)
    await waitFor(() => {
      expect(mocks.updateSettings).toHaveBeenCalledWith({ dndEnabled: true })
    })
    await waitFor(() => {
      expect(dndToggle).toBeChecked()
    })

    fireEvent.change(startHourSelect, { target: { value: '0' } })
    await waitFor(() => {
      expect(mocks.updateSettings).toHaveBeenCalledWith({ dndStartHour: 0 })
    })

    fireEvent.change(endHourSelect, { target: { value: '0' } })
    await waitFor(() => {
      expect(mocks.updateSettings).toHaveBeenCalledWith({ dndEndHour: 0 })
    })

    await waitFor(() => {
      expect(screen.getByText('当前免打扰时间段：00:00 - 00:00')).toBeInTheDocument()
    })
  })

  it('sends numeric hour values to updateSettings', async () => {
    render(
      <MemoryRouter>
        <NotificationSettingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.getSettings).toHaveBeenCalledTimes(1)
    })

    const startHourSelect = screen.getByRole('combobox', { name: '开始时间' })
    const endHourSelect = screen.getByRole('combobox', { name: '结束时间' })

    fireEvent.change(startHourSelect, { target: { value: '12' } })
    await waitFor(() => {
      expect(startHourSelect).toHaveValue('12')
      expect(mocks.updateSettings).toHaveBeenCalledWith({ dndStartHour: 12 })
    })

    fireEvent.change(endHourSelect, { target: { value: '7' } })
    await waitFor(() => {
      expect(endHourSelect).toHaveValue('7')
      expect(mocks.updateSettings).toHaveBeenCalledWith({ dndEndHour: 7 })
    })

    const calls = mocks.updateSettings.mock.calls.map(
      (args) => args[0] as Record<string, unknown>
    )
    const startPatch = calls.find((item) => 'dndStartHour' in item)
    const endPatch = calls.find((item) => 'dndEndHour' in item)

    expect(typeof startPatch?.dndStartHour).toBe('number')
    expect(typeof endPatch?.dndEndHour).toBe('number')
  })

  it('shows save error when updating settings fails', async () => {
    mocks.updateSettings.mockRejectedValueOnce(new Error('validation failed'))

    render(
      <MemoryRouter>
        <NotificationSettingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mocks.getSettings).toHaveBeenCalledTimes(1)
    })

    const followToggle = screen.getByRole('checkbox', { name: '关注通知' })
    expect(followToggle).toBeChecked()

    fireEvent.click(followToggle)

    await waitFor(() => {
      expect(screen.getByText('保存通知设置失败')).toBeInTheDocument()
    })
    expect(followToggle).toBeChecked()
  })

  it('shows load error when settings request fails', async () => {
    mocks.getSettings.mockRejectedValueOnce(new Error('network error'))

    render(
      <MemoryRouter>
        <NotificationSettingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('加载通知设置失败')).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: '通知设置' })).not.toBeInTheDocument()
  })
})
