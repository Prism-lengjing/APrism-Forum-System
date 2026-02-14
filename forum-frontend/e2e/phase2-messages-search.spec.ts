import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const API_BASE_URL = 'http://localhost:3001/api'

interface UserSession {
  token: string
  userId: number
  username: string
}

async function loginAndGetSession(
  page: Page,
  request: APIRequestContext
): Promise<UserSession> {
  await page.goto('/login')

  const loginInputs = page.locator('form input')
  await loginInputs.nth(0).fill('testuser')
  await loginInputs.nth(1).fill('password123')
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
  const meBody = (await meResponse.json()) as { data?: { id?: number; username?: string } }
  if (typeof meBody.data?.id !== 'number' || typeof meBody.data?.username !== 'string') {
    throw new Error('failed to load current user profile')
  }

  return {
    token,
    userId: meBody.data.id,
    username: meBody.data.username,
  }
}

async function registerUser(
  request: APIRequestContext,
  prefix: string
): Promise<UserSession> {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`
  const username = `${prefix}_${unique}`
  const email = `${username}@example.com`
  const password = 'password123'

  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      username,
      email,
      password,
    },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as {
    data?: { token?: string; user?: { id?: number; username?: string } }
  }
  if (
    typeof body.data?.token !== 'string' ||
    typeof body.data?.user?.id !== 'number' ||
    typeof body.data?.user?.username !== 'string'
  ) {
    throw new Error('register response missing user info')
  }

  return {
    token: body.data.token,
    userId: body.data.user.id,
    username: body.data.user.username,
  }
}

test('private messages page should load conversations and support sending message', async ({
  page,
  request,
}) => {
  const currentUser = await loginAndGetSession(page, request)
  const peer = await registerUser(request, 'e2e_msg_peer')
  const incomingContent = `E2E incoming ${Date.now()}`
  const outgoingContent = `E2E outgoing ${Date.now()}`

  const peerSend = await request.post(`${API_BASE_URL}/messages`, {
    headers: { Authorization: `Bearer ${peer.token}` },
    data: {
      receiverId: currentUser.userId,
      content: incomingContent,
    },
  })
  expect(peerSend.ok()).toBeTruthy()

  await page.goto('/me/messages')
  await expect(page).toHaveURL(/\/me\/messages$/)
  await expect(page.getByRole('heading', { name: 'Private Messages' })).toBeVisible()
  const conversationButton = page.getByRole('button', { name: new RegExp(peer.username) })
  await expect(conversationButton).toBeVisible()
  await conversationButton.click()
  await expect(page.getByText(incomingContent)).toBeVisible()

  await page.getByPlaceholder('Type your message...').fill(outgoingContent)
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText(outgoingContent)).toBeVisible()

  const peerConversations = await request.get(`${API_BASE_URL}/messages/conversations`, {
    headers: { Authorization: `Bearer ${peer.token}` },
  })
  expect(peerConversations.ok()).toBeTruthy()
  const conversationsBody = (await peerConversations.json()) as {
    data?: { items?: Array<{ id?: number; peerUser?: { id?: number } }> }
  }
  const targetConversation = (conversationsBody.data?.items ?? []).find(
    (item) => item.peerUser?.id === currentUser.userId
  )
  expect(targetConversation?.id).toBeTruthy()

  const peerMessages = await request.get(
    `${API_BASE_URL}/messages/conversations/${targetConversation?.id}?page=1&pageSize=50`,
    {
      headers: { Authorization: `Bearer ${peer.token}` },
    }
  )
  expect(peerMessages.ok()).toBeTruthy()
  const messagesBody = (await peerMessages.json()) as {
    data?: { items?: Array<{ content?: string }> }
  }
  const items = messagesBody.data?.items ?? []
  expect(items.some((item) => item.content === outgoingContent)).toBeTruthy()
})

test('search page should return thread results and user results', async ({ page, request }) => {
  const currentUser = await loginAndGetSession(page, request)
  const unique = Date.now()
  const threadKeyword = `E2E_SEARCH_${unique}`
  const threadTitle = `${threadKeyword}_TITLE`

  const createThread = await request.post(`${API_BASE_URL}/threads`, {
    headers: { Authorization: `Bearer ${currentUser.token}` },
    data: {
      forumId: 1,
      title: threadTitle,
      content: `E2E content ${threadKeyword}`,
      type: 'normal',
    },
  })
  expect(createThread.ok()).toBeTruthy()

  await page.goto('/search')
  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()

  await page.getByPlaceholder('Search keyword...').fill(threadKeyword)
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText(threadTitle)).toBeVisible()

  await page.getByPlaceholder('Search keyword...').fill(currentUser.username)
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('button', { name: 'Users' }).click()
  await expect(page.locator('main section').last().getByText(currentUser.username)).toBeVisible()
})
