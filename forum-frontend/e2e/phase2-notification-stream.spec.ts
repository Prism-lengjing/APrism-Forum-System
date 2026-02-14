import { expect, test } from '@playwright/test'
import type { APIRequestContext, Locator, Page } from '@playwright/test'

const API_BASE_URL = 'http://localhost:3001/api'
const TEST_PASSWORD = 'password123'

interface UserSession {
  userId: number
  username: string
  userToken: string
  adminToken: string
}

function createUniqueUserSeed(): string {
  const rand = Math.floor(Math.random() * 100000)
  return `${Date.now()}_${rand}`
}

async function createUserSession(request: APIRequestContext): Promise<UserSession> {
  const seed = createUniqueUserSeed()
  const username = `e2e_stream_${seed}`
  const email = `${username}@example.com`

  const registerResponse = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      username,
      email,
      password: TEST_PASSWORD,
    },
  })
  expect(registerResponse.ok()).toBeTruthy()
  const registerBody = (await registerResponse.json()) as {
    data?: { token?: string; user?: { id?: number } }
  }
  const userToken = registerBody.data?.token
  const userId = registerBody.data?.user?.id
  if (typeof userToken !== 'string' || typeof userId !== 'number') {
    throw new Error('failed to create e2e user session')
  }

  const adminLoginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { identifier: 'admin', password: TEST_PASSWORD },
  })
  expect(adminLoginResponse.ok()).toBeTruthy()
  const adminLoginBody = (await adminLoginResponse.json()) as {
    data?: { token?: string }
  }
  if (typeof adminLoginBody.data?.token !== 'string') {
    throw new Error('admin token missing')
  }

  const headers = { Authorization: `Bearer ${userToken}` }
  const clearReadResponse = await request.post(`${API_BASE_URL}/notifications/read-all`, {
    headers,
  })
  expect(clearReadResponse.ok()).toBeTruthy()

  const enableSystemResponse = await request.put(`${API_BASE_URL}/notifications/settings`, {
    headers,
    data: {
      systemEnabled: true,
      dndEnabled: false,
      dndStartHour: 23,
      dndEndHour: 8,
    },
  })
  expect(enableSystemResponse.ok()).toBeTruthy()

  return {
    userId,
    username,
    userToken,
    adminToken: adminLoginBody.data.token,
  }
}

async function loginViaUi(page: Page, username: string, password: string) {
  const streamRequestPromise = page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes('/api/notifications/stream?token='),
    { timeout: 15000 }
  )

  await page.goto('/login')
  const loginInputs = page.locator('form input')
  await loginInputs.nth(0).fill(username)
  await loginInputs.nth(1).fill(password)
  await page.locator('form button[type="submit"]').click()

  await expect(page).toHaveURL(/\/forums$/)
  await streamRequestPromise
}

async function waitForStreamRequest(page: Page): Promise<void> {
  await page.waitForRequest(
    (req) =>
      req.method() === 'GET' &&
      req.url().includes('/api/notifications/stream?token='),
    { timeout: 15000 }
  )
}

async function createSystemNotification(
  request: APIRequestContext,
  adminToken: string,
  userId: number,
  title: string
) {
  const response = await request.post(`${API_BASE_URL}/notifications/system`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      userId,
      title,
      content: `${title} content`,
    },
  })
  expect(response.ok()).toBeTruthy()
}

async function readBadgeCount(toggleButton: Locator): Promise<number> {
  const badge = toggleButton.locator('span')
  if ((await badge.count()) === 0) {
    return 0
  }
  const text = (await badge.first().innerText()).trim()
  if (text === '99+') {
    return 99
  }
  const value = Number(text)
  return Number.isNaN(value) ? 0 : value
}

test('notification stream should refresh open dropdown list and unread badge in realtime', async ({
  page,
  request,
}) => {
  const session = await createUserSession(request)
  await loginViaUi(page, session.username, TEST_PASSWORD)

  const toggleButton = page.locator('header nav div.relative > button').first()
  await toggleButton.click()

  const dropdown = page.locator('header div.absolute.right-0.z-30')
  await expect(dropdown).toBeVisible()

  const firstTitle = `E2E SSE first ${Date.now()}`
  await expect(dropdown.getByText(firstTitle)).toHaveCount(0)

  await createSystemNotification(
    request,
    session.adminToken,
    session.userId,
    firstTitle
  )

  await expect(
    dropdown.locator('p.text-sm.font-medium.text-gray-900', { hasText: firstTitle })
  ).toBeVisible()
  await expect.poll(() => readBadgeCount(toggleButton)).toBe(1)

  await toggleButton.click()
  await expect(dropdown).toHaveCount(0)

  const secondTitle = `E2E SSE second ${Date.now()}`
  await createSystemNotification(
    request,
    session.adminToken,
    session.userId,
    secondTitle
  )

  await expect.poll(() => readBadgeCount(toggleButton)).toBe(2)

  await toggleButton.click()
  await expect(
    dropdown.locator('p.text-sm.font-medium.text-gray-900', { hasText: secondTitle })
  ).toBeVisible()
})

test('notification stream should reconnect after reload and continue realtime updates', async ({
  page,
  request,
}) => {
  const session = await createUserSession(request)
  await loginViaUi(page, session.username, TEST_PASSWORD)

  const reconnectPromise = waitForStreamRequest(page)
  await page.reload()
  await expect(page).toHaveURL(/\/forums$/)
  await reconnectPromise

  const toggleButton = page.locator('header nav div.relative > button').first()
  const titleAfterReload = `E2E SSE reconnect ${Date.now()}`

  await createSystemNotification(
    request,
    session.adminToken,
    session.userId,
    titleAfterReload
  )

  await expect.poll(() => readBadgeCount(toggleButton)).toBe(1)

  await toggleButton.click()
  const dropdown = page.locator('header div.absolute.right-0.z-30')
  await expect(dropdown).toBeVisible()
  await expect(
    dropdown.locator('p.text-sm.font-medium.text-gray-900', { hasText: titleAfterReload })
  ).toBeVisible()
})

test('notification stream should recover from transient stream error and continue updates', async ({
  page,
  request,
}) => {
  const session = await createUserSession(request)

  let streamRequestCount = 0
  let injectedFailure = false
  await page.route('**/api/notifications/stream**', async (route) => {
    const req = route.request()
    if (req.method() !== 'GET') {
      await route.continue()
      return
    }

    streamRequestCount += 1
    if (!injectedFailure) {
      injectedFailure = true
      await route.abort('failed')
      return
    }

    await route.continue()
  })

  await loginViaUi(page, session.username, TEST_PASSWORD)

  await expect.poll(() => streamRequestCount, { timeout: 20000 }).toBeGreaterThanOrEqual(2)

  const toggleButton = page.locator('header nav div.relative > button').first()
  const recoveryTitle = `E2E SSE recovery ${Date.now()}`
  await createSystemNotification(
    request,
    session.adminToken,
    session.userId,
    recoveryTitle
  )

  await expect.poll(() => readBadgeCount(toggleButton)).toBe(1)

  await toggleButton.click()
  const dropdown = page.locator('header div.absolute.right-0.z-30')
  await expect(dropdown).toBeVisible()
  await expect(
    dropdown.locator('p.text-sm.font-medium.text-gray-900', { hasText: recoveryTitle })
  ).toBeVisible()
})

test('notification stream should keep badge and dropdown list consistent under burst updates', async ({
  page,
  request,
}) => {
  const session = await createUserSession(request)
  await loginViaUi(page, session.username, TEST_PASSWORD)

  const toggleButton = page.locator('header nav div.relative > button').first()
  await toggleButton.click()

  const dropdown = page.locator('header div.absolute.right-0.z-30')
  await expect(dropdown).toBeVisible()

  const burstSize = 4
  const seed = Date.now()
  const titles = Array.from(
    { length: burstSize },
    (_, index) => `E2E SSE burst ${seed}-${index + 1}`
  )

  await Promise.all(
    titles.map((title) =>
      createSystemNotification(request, session.adminToken, session.userId, title)
    )
  )

  await expect.poll(() => readBadgeCount(toggleButton)).toBe(burstSize)

  for (const title of titles) {
    await expect(
      dropdown.locator('p.text-sm.font-medium.text-gray-900', { hasText: title })
    ).toBeVisible()
  }
})
