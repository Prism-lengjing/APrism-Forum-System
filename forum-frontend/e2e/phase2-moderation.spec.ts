import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const API_BASE_URL = 'http://localhost:3001/api'

interface UserSession {
  token: string
  userId: number
}

interface ForumSummary {
  id: number
  name: string
}

async function loginAndGetSession(
  page: Page,
  request: APIRequestContext,
  username: string,
  password: string
): Promise<UserSession> {
  await page.goto('/login')

  const loginInputs = page.locator('form input')
  await loginInputs.nth(0).fill(username)
  await loginInputs.nth(1).fill(password)
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/forums$/)

  const token = await page.evaluate(() => localStorage.getItem('ap_token'))
  if (typeof token !== 'string') {
    throw new Error('token missing after login')
  }

  const meResponse = await request.get(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(meResponse.ok()).toBeTruthy()
  const meBody = (await meResponse.json()) as { data?: { id?: number } }
  if (typeof meBody.data?.id !== 'number') {
    throw new Error('failed to load user id from profile')
  }

  return {
    token,
    userId: meBody.data.id,
  }
}

async function fetchForums(request: APIRequestContext): Promise<ForumSummary[]> {
  const response = await request.get(`${API_BASE_URL}/forums`)
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as {
    data?: Array<{ id?: number; name?: string }>
  }
  const forums = (body.data ?? [])
    .filter(
      (item): item is { id: number; name: string } =>
        typeof item.id === 'number' && typeof item.name === 'string'
    )
    .map((item) => ({ id: item.id, name: item.name }))
  expect(forums.length).toBeGreaterThanOrEqual(2)
  return forums
}

async function createThread(
  request: APIRequestContext,
  token: string,
  forumId: number,
  title: string
): Promise<number> {
  const response = await request.post(`${API_BASE_URL}/threads`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      forumId,
      title,
      content: `E2E moderation content ${Date.now()}`,
      type: 'normal',
    },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { data?: { id?: number } }
  if (typeof body.data?.id !== 'number') {
    throw new Error('thread id missing after create')
  }
  return body.data.id
}

test('admin can moderate thread, move thread, and view moderator logs', async ({
  page,
  request,
}) => {
  const admin = await loginAndGetSession(page, request, 'admin', 'password123')
  const forums = await fetchForums(request)
  const sourceForum = forums[0]
  const targetForum = forums.find((forum) => forum.id !== sourceForum.id)
  if (!targetForum) {
    throw new Error('target forum not found')
  }

  const threadTitle = `E2E_MOD_${Date.now()}`
  const threadId = await createThread(request, admin.token, sourceForum.id, threadTitle)

  await page.goto(`/threads/${threadId}`)
  await expect(page.getByRole('heading', { name: threadTitle })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Moderation Tools' })).toBeVisible()

  await page.getByRole('button', { name: 'Set Pinned' }).click()
  await expect(page.getByRole('button', { name: 'Unpin' })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Recent Moderator Logs' })).toBeVisible()
  await expect(
    page.locator('li').filter({ hasText: 'thread_moderation_update' }).first()
  ).toBeVisible()

  await page.getByLabel('Target Forum').selectOption(String(targetForum.id))
  await page.getByRole('button', { name: 'Move Thread' }).click()

  await expect.poll(async () => {
    const detail = await request.get(`${API_BASE_URL}/threads/${threadId}`)
    if (!detail.ok()) {
      return -1
    }
    const body = (await detail.json()) as { data?: { forum?: { id?: number } } }
    return Number(body.data?.forum?.id ?? -1)
  }).toBe(targetForum.id)

  const logsResponse = await request.get(
    `${API_BASE_URL}/forums/${sourceForum.id}/moderator-logs?page=1&pageSize=20`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
    }
  )
  expect(logsResponse.ok()).toBeTruthy()
  const logsBody = (await logsResponse.json()) as {
    data?: { items?: Array<{ action?: string; threadId?: number }> }
  }
  const logItems = logsBody.data?.items ?? []
  expect(
    logItems.some((item) => item.action === 'thread_move' && item.threadId === threadId)
  ).toBeTruthy()

  await expect(page.getByRole('link', { name: targetForum.name })).toBeVisible()
})
