import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const API_BASE_URL = 'http://localhost:3001/api'

async function loginAndGetToken(page: Page): Promise<string> {
  await page.goto('/login')

  const loginInputs = page.locator('form input')
  await loginInputs.nth(0).fill('testuser')
  await loginInputs.nth(1).fill('password123')
  await page.locator('form button[type="submit"]').click()

  await expect(page).toHaveURL(/\/forums$/)

  const token = await page.evaluate(() => localStorage.getItem('ap_token'))
  if (typeof token !== 'string') {
    throw new Error('user token missing after login')
  }
  return token
}

async function createThreadViaApi(
  request: APIRequestContext,
  token: string
): Promise<number> {
  const unique = Date.now()
  const response = await request.post(`${API_BASE_URL}/threads`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      forumId: 1,
      title: `E2E thread ${unique}`,
      content: `E2E content ${unique}`,
      type: 'normal',
    },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { data?: { id?: number } }
  if (typeof body.data?.id !== 'number') {
    throw new Error('thread id missing from create response')
  }
  return body.data.id
}

test('forum thread creation failure should not redirect and should keep form input', async ({
  page,
}) => {
  const unique = Date.now()
  const inputTitle = `E2E create fail title ${unique}`
  const inputContent = `E2E create fail content ${unique}`

  await loginAndGetToken(page)
  await page.goto('/forums/1')
  await expect(page).toHaveURL(/\/forums\/1$/)

  let blockedCreateCalls = 0
  await page.route('**/api/threads', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      blockedCreateCalls += 1
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'E2E forced create error',
        }),
      })
      return
    }
    await route.continue()
  })

  const editor = page.locator('main form').first()
  await editor.locator('input').fill(inputTitle)
  await editor.locator('textarea').fill(inputContent)
  await editor.locator('button[type="submit"]').click()

  await expect.poll(() => blockedCreateCalls).toBe(1)
  await expect(page).toHaveURL(/\/forums\/1$/)
  await expect(page).not.toHaveURL(/\/threads\/\d+$/)
  await expect(editor.locator('input')).toHaveValue(inputTitle)
  await expect(editor.locator('textarea')).toHaveValue(inputContent)
})

test('thread reply failure should keep current page and keep textarea content', async ({
  page,
  request,
}) => {
  const unique = Date.now()
  const replyContent = `E2E reply fail content ${unique}`

  const token = await loginAndGetToken(page)
  const threadId = await createThreadViaApi(request, token)

  await page.goto(`/threads/${threadId}`)
  await expect(page).toHaveURL(new RegExp(`/threads/${threadId}$`))

  let blockedReplyCalls = 0
  await page.route('**/api/posts', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      blockedReplyCalls += 1
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'E2E forced reply error',
        }),
      })
      return
    }
    await route.continue()
  })

  const replyForm = page.locator('main form').first()
  await replyForm.locator('textarea').fill(replyContent)
  await replyForm.locator('button[type="submit"]').click()

  await expect.poll(() => blockedReplyCalls).toBe(1)
  await expect(page).toHaveURL(new RegExp(`/threads/${threadId}$`))
  await expect(replyForm.locator('textarea')).toHaveValue(replyContent)
})

test('forum empty thread list should still trigger reload when paging', async ({ page }) => {
  await loginAndGetToken(page)

  const requestedPages: number[] = []
  await page.route('**/api/forums/1/threads**', async (route) => {
    const req = route.request()
    if (req.method() === 'GET') {
      const url = new URL(req.url())
      const pageParam = Number(url.searchParams.get('page') ?? '1')
      requestedPages.push(pageParam)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            page: pageParam,
            pageSize: 20,
            total: 0,
            totalPages: 2,
          },
        }),
      })
      return
    }
    await route.continue()
  })

  await page.goto('/forums/1')
  await expect(page).toHaveURL(/\/forums\/1$/)
  await expect.poll(() => requestedPages.includes(1)).toBe(true)
  await expect(page.locator('main a[href^="/threads/"]')).toHaveCount(0)

  const pager = page.locator('main div.flex.items-center.justify-end.gap-2').last()
  await pager.locator('button').nth(1).click()

  await expect.poll(() => requestedPages.includes(2)).toBe(true)
})

test('thread empty reply list should still trigger reload when paging', async ({
  page,
  request,
}) => {
  const token = await loginAndGetToken(page)
  const threadId = await createThreadViaApi(request, token)

  const requestedPages: number[] = []
  await page.route(`**/api/threads/${threadId}/posts**`, async (route) => {
    const req = route.request()
    if (req.method() === 'GET') {
      const url = new URL(req.url())
      const pageParam = Number(url.searchParams.get('page') ?? '1')
      requestedPages.push(pageParam)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            page: pageParam,
            pageSize: 30,
            total: 0,
            totalPages: 2,
          },
        }),
      })
      return
    }
    await route.continue()
  })

  await page.goto(`/threads/${threadId}`)
  await expect(page).toHaveURL(new RegExp(`/threads/${threadId}$`))
  await expect.poll(() => requestedPages.includes(1)).toBe(true)

  const repliesSection = page.locator('main section').nth(1)
  await expect(repliesSection.locator('article')).toHaveCount(0)

  const pager = page.locator('main div.flex.items-center.justify-end.gap-2').last()
  await pager.locator('button').nth(1).click()

  await expect.poll(() => requestedPages.includes(2)).toBe(true)
})
