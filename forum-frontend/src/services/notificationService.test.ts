import { notificationService } from './notificationService'
import type { NotificationSettings, UpdateNotificationSettingsInput } from '../types/notification'

const mocks = vi.hoisted(() => ({
  put: vi.fn(),
}))

vi.mock('./api', () => ({
  API_BASE_URL: 'http://localhost:3001/api',
  apiClient: {
    put: mocks.put,
  },
  unwrapResponse: <T>(response: { data: { data: T } }): T => response.data.data,
}))

describe('notificationService.updateSettings', () => {
  beforeEach(() => {
    mocks.put.mockReset()
  })

  it('sends boolean and number payload fields to /notifications/settings', async () => {
    const patch: UpdateNotificationSettingsInput = {
      followEnabled: false,
      mentionEnabled: true,
      dndEnabled: true,
      dndStartHour: 0,
      dndEndHour: 8,
    }
    const saved: NotificationSettings = {
      userId: 2,
      threadReplyEnabled: true,
      postReplyEnabled: true,
      mentionEnabled: true,
      postLikedEnabled: true,
      followEnabled: false,
      systemEnabled: true,
      dndEnabled: true,
      dndStartHour: 0,
      dndEndHour: 8,
      updatedAt: '2026-02-14T00:00:00.000Z',
    }
    mocks.put.mockResolvedValue({
      data: {
        data: saved,
      },
    })

    const result = await notificationService.updateSettings(patch)

    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(mocks.put).toHaveBeenCalledWith('/notifications/settings', patch)
    const [, requestBody] = mocks.put.mock.calls[0] as [string, Record<string, unknown>]
    expect(requestBody).toEqual({
      followEnabled: false,
      mentionEnabled: true,
      dndEnabled: true,
      dndStartHour: 0,
      dndEndHour: 8,
    })
    expect(typeof requestBody.followEnabled).toBe('boolean')
    expect(typeof requestBody.mentionEnabled).toBe('boolean')
    expect(typeof requestBody.dndEnabled).toBe('boolean')
    expect(typeof requestBody.dndStartHour).toBe('number')
    expect(typeof requestBody.dndEndHour).toBe('number')
    expect(result).toEqual(saved)
  })

  it('passes through malformed payload without silent coercion and surfaces api errors', async () => {
    const malformedPatch = {
      followEnabled: 'false',
      dndEnabled: 'true',
      dndStartHour: '12',
      dndEndHour: '8',
    } as unknown as UpdateNotificationSettingsInput
    const apiError = new Error('validation failed')
    mocks.put.mockRejectedValue(apiError)

    await expect(notificationService.updateSettings(malformedPatch)).rejects.toBe(apiError)

    expect(mocks.put).toHaveBeenCalledTimes(1)
    expect(mocks.put).toHaveBeenCalledWith('/notifications/settings', malformedPatch)
    const [, requestBody] = mocks.put.mock.calls[0] as [string, Record<string, unknown>]
    expect(typeof requestBody.followEnabled).toBe('string')
    expect(typeof requestBody.dndEnabled).toBe('string')
    expect(typeof requestBody.dndStartHour).toBe('string')
    expect(typeof requestBody.dndEndHour).toBe('string')
  })
})
