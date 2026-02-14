import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const API_BASE_URL = 'http://localhost:3001/api'

test.describe.configure({ mode: 'serial' })

interface SessionContext {
  userToken: string
  adminToken: string
  currentUserId: number
}

interface SettingsSnapshot {
  followEnabled: boolean
  dndEnabled: boolean
  dndStartHour: number
  dndEndHour: number
}

async function getUnreadCount(token: string, request: APIRequestContext) {
  const response = await request.get(`${API_BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { data?: { unreadCount?: number } }
  return Number(body.data?.unreadCount ?? 0)
}

async function getFollowSetting(token: string, request: APIRequestContext) {
  const response = await request.get(`${API_BASE_URL}/notifications/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { data?: { followEnabled?: boolean } }
  return Boolean(body.data?.followEnabled)
}

async function getSettings(token: string, request: APIRequestContext): Promise<SettingsSnapshot> {
  const response = await request.get(`${API_BASE_URL}/notifications/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as {
    data?: {
      followEnabled?: boolean
      dndEnabled?: boolean
      dndStartHour?: number
      dndEndHour?: number
    }
  }
  return {
    followEnabled: Boolean(body.data?.followEnabled),
    dndEnabled: Boolean(body.data?.dndEnabled),
    dndStartHour: Number(body.data?.dndStartHour ?? 0),
    dndEndHour: Number(body.data?.dndEndHour ?? 0),
  }
}

async function updateSettings(
  token: string,
  request: APIRequestContext,
  patch: Partial<SettingsSnapshot>
) {
  const response = await request.put(`${API_BASE_URL}/notifications/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: patch,
  })
  expect(response.ok()).toBeTruthy()
}

async function buildSession(page: Page, request: APIRequestContext): Promise<SessionContext> {
  await page.goto('/login')
  const loginInputs = page.locator('form input')
  await loginInputs.nth(0).fill('testuser')
  await loginInputs.nth(1).fill('password123')
  await page.locator('form button[type="submit"]').click()

  await expect(page).toHaveURL(/\/forums$/)

  const userToken = await page.evaluate(() => localStorage.getItem('ap_token'))
  if (typeof userToken !== 'string') {
    throw new Error('user token missing after login')
  }

  const adminLoginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { identifier: 'admin', password: 'password123' },
  })
  expect(adminLoginResponse.ok()).toBeTruthy()
  const adminLoginBody = (await adminLoginResponse.json()) as { data?: { token?: string } }
  if (typeof adminLoginBody.data?.token !== 'string') {
    throw new Error('admin token missing')
  }
  const adminToken = adminLoginBody.data.token

  const meResponse = await request.get(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  expect(meResponse.ok()).toBeTruthy()
  const meBody = (await meResponse.json()) as { data?: { id?: number } }
  if (typeof meBody.data?.id !== 'number') {
    throw new Error('current user id missing')
  }

  return {
    userToken,
    adminToken,
    currentUserId: meBody.data.id,
  }
}

async function openNotificationSettings(page: Page) {
  const settingsLink = page.locator('a[href="/me/notifications/settings"]').first()
  await expect(settingsLink).toBeVisible()
  await settingsLink.click()
  await expect(page).toHaveURL(/\/me\/notifications\/settings$/)
  await expect(page.getByRole('checkbox').first()).toBeVisible()
}

async function resetScenario(session: SessionContext, request: APIRequestContext) {
  const userHeaders = { Authorization: `Bearer ${session.userToken}` }
  const adminHeaders = { Authorization: `Bearer ${session.adminToken}` }

  const cleanupUnfollowResponse = await request.delete(
    `${API_BASE_URL}/users/${session.currentUserId}/follow`,
    { headers: adminHeaders }
  )
  expect(cleanupUnfollowResponse.ok()).toBeTruthy()

  const clearReadResponse = await request.post(`${API_BASE_URL}/notifications/read-all`, {
    headers: userHeaders,
  })
  expect(clearReadResponse.ok()).toBeTruthy()

  await updateSettings(session.userToken, request, {
    followEnabled: true,
    dndEnabled: false,
    dndStartHour: 23,
    dndEndHour: 8,
  })
}

test('follow notification setting controls follow notification delivery', async ({
  page,
  request,
}) => {
  const session = await buildSession(page, request)
  await resetScenario(session, request)

  const userHeaders = { Authorization: `Bearer ${session.userToken}` }
  const adminHeaders = { Authorization: `Bearer ${session.adminToken}` }
  const baselineUnread = await getUnreadCount(session.userToken, request)

  await openNotificationSettings(page)

  const followToggle = page.getByRole('checkbox').nth(4)
  await expect(followToggle).toBeVisible()

  if (await followToggle.isChecked()) {
    await followToggle.click()
  }
  await expect.poll(() => getFollowSetting(session.userToken, request)).toBe(false)

  const followWhileDisabledResponse = await request.post(
    `${API_BASE_URL}/users/${session.currentUserId}/follow`,
    { headers: adminHeaders }
  )
  expect(followWhileDisabledResponse.ok()).toBeTruthy()

  const unreadAfterDisabledFollow = await getUnreadCount(session.userToken, request)
  expect(unreadAfterDisabledFollow).toBe(baselineUnread)

  if (!(await followToggle.isChecked())) {
    await followToggle.click()
  }
  await expect.poll(() => getFollowSetting(session.userToken, request)).toBe(true)

  const unfollowForRetriggerResponse = await request.delete(
    `${API_BASE_URL}/users/${session.currentUserId}/follow`,
    { headers: adminHeaders }
  )
  expect(unfollowForRetriggerResponse.ok()).toBeTruthy()

  const followWhileEnabledResponse = await request.post(
    `${API_BASE_URL}/users/${session.currentUserId}/follow`,
    { headers: adminHeaders }
  )
  expect(followWhileEnabledResponse.ok()).toBeTruthy()

  await expect.poll(() => getUnreadCount(session.userToken, request)).toBe(baselineUnread + 1)

  const listResponse = await request.get(`${API_BASE_URL}/notifications?page=1&pageSize=10`, {
    headers: userHeaders,
  })
  expect(listResponse.ok()).toBeTruthy()
  const listBody = (await listResponse.json()) as {
    data?: { items?: Array<{ type?: string }> }
  }
  const notifications = listBody.data?.items ?? []
  expect(notifications.some((item) => item.type === 'follow')).toBeTruthy()
})

test('notification settings requests should use boolean and number payload types', async ({
  page,
  request,
}) => {
  const session = await buildSession(page, request)
  await resetScenario(session, request)

  const putPayloads: Array<Record<string, unknown>> = []
  await page.route('**/api/notifications/settings', async (route) => {
    const req = route.request()
    if (req.method() === 'PUT') {
      const payload = req.postDataJSON()
      if (payload && typeof payload === 'object') {
        putPayloads.push(payload as Record<string, unknown>)
      }
    }
    await route.continue()
  })

  await openNotificationSettings(page)

  const followToggle = page.getByRole('checkbox').nth(4)
  const dndToggle = page.getByRole('checkbox').nth(6)
  await expect(followToggle).toBeVisible()
  await expect(dndToggle).toBeVisible()

  if (await followToggle.isChecked()) {
    await followToggle.click()
  }
  await expect
    .poll(() =>
      putPayloads.some((item) =>
        Object.prototype.hasOwnProperty.call(item, 'followEnabled')
      )
    )
    .toBe(true)

  if (!(await dndToggle.isChecked())) {
    await dndToggle.click()
  }
  await expect
    .poll(() =>
      putPayloads.some((item) => Object.prototype.hasOwnProperty.call(item, 'dndEnabled'))
    )
    .toBe(true)

  const hourSelects = page.locator('main select')
  await hourSelects.nth(0).selectOption('0')
  await expect
    .poll(() =>
      putPayloads.some((item) => Object.prototype.hasOwnProperty.call(item, 'dndStartHour'))
    )
    .toBe(true)

  await hourSelects.nth(1).selectOption('0')
  await expect
    .poll(() =>
      putPayloads.some((item) => Object.prototype.hasOwnProperty.call(item, 'dndEndHour'))
    )
    .toBe(true)

  const followPatch = putPayloads.find((item) =>
    Object.prototype.hasOwnProperty.call(item, 'followEnabled')
  )
  const dndPatch = putPayloads.find((item) =>
    Object.prototype.hasOwnProperty.call(item, 'dndEnabled')
  )
  const startHourPatch = putPayloads.find((item) =>
    Object.prototype.hasOwnProperty.call(item, 'dndStartHour')
  )
  const endHourPatch = putPayloads.find((item) =>
    Object.prototype.hasOwnProperty.call(item, 'dndEndHour')
  )

  expect(typeof followPatch?.followEnabled).toBe('boolean')
  expect(typeof dndPatch?.dndEnabled).toBe('boolean')
  expect(typeof startHourPatch?.dndStartHour).toBe('number')
  expect(typeof endHourPatch?.dndEndHour).toBe('number')
})

test('full-day DND should mute follow notifications but keep system notifications', async ({
  page,
  request,
}) => {
  const session = await buildSession(page, request)
  await resetScenario(session, request)

  const userHeaders = { Authorization: `Bearer ${session.userToken}` }
  const adminHeaders = { Authorization: `Bearer ${session.adminToken}` }
  const baselineUnread = await getUnreadCount(session.userToken, request)

  await openNotificationSettings(page)

  const dndToggle = page.getByRole('checkbox').nth(6)
  await expect(dndToggle).toBeVisible()
  if (!(await dndToggle.isChecked())) {
    await dndToggle.click()
  }

  const hourSelects = page.locator('main select')
  await hourSelects.nth(0).selectOption('0')
  await hourSelects.nth(1).selectOption('0')

  await expect.poll(() => getSettings(session.userToken, request)).toMatchObject({
    dndEnabled: true,
    dndStartHour: 0,
    dndEndHour: 0,
  })

  const followUnderDndResponse = await request.post(
    `${API_BASE_URL}/users/${session.currentUserId}/follow`,
    { headers: adminHeaders }
  )
  expect(followUnderDndResponse.ok()).toBeTruthy()
  const unreadAfterFollow = await getUnreadCount(session.userToken, request)
  expect(unreadAfterFollow).toBe(baselineUnread)

  const createSystemResponse = await request.post(`${API_BASE_URL}/notifications/system`, {
    headers: adminHeaders,
    data: {
      userId: session.currentUserId,
      title: 'E2E DND System Title',
      content: 'E2E DND System Content',
    },
  })
  expect(createSystemResponse.ok()).toBeTruthy()

  await expect.poll(() => getUnreadCount(session.userToken, request)).toBe(baselineUnread + 1)

  const listResponse = await request.get(
    `${API_BASE_URL}/notifications?page=1&pageSize=20&unreadOnly=true`,
    {
      headers: userHeaders,
    }
  )
  expect(listResponse.ok()).toBeTruthy()
  const listBody = (await listResponse.json()) as {
    data?: { items?: Array<{ type?: string }> }
  }
  const notifications = listBody.data?.items ?? []
  expect(notifications.some((item) => item.type === 'follow')).toBeFalsy()
  expect(notifications.some((item) => item.type === 'system')).toBeTruthy()

  await updateSettings(session.userToken, request, {
    dndEnabled: false,
    dndStartHour: 23,
    dndEndHour: 8,
  })
})
