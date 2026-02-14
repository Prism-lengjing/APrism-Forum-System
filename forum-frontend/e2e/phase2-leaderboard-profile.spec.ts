import { expect, test } from '@playwright/test'

test('user can open leaderboard and navigate to user badge wall', async ({ page, request }) => {
  await page.goto('/login')

  const loginInputs = page.locator('form input')
  await loginInputs.nth(0).fill('testuser')
  await loginInputs.nth(1).fill('password123')
  await page.locator('form button[type="submit"]').click()

  await expect(page).toHaveURL(/\/forums$/)

  const token = await page.evaluate(() => localStorage.getItem('ap_token'))
  expect(token).toBeTruthy()

  if (token) {
    const signinResponse = await request.post('http://localhost:3001/api/points/me/signin', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([200, 409]).toContain(signinResponse.status())
  }

  await page.goto('/leaderboard')
  await expect(page).toHaveURL(/\/leaderboard$/)

  const userLink = page.locator('main a[href^="/users/"]').first()
  await expect(userLink).toBeVisible()
  await userLink.click()

  await expect(page).toHaveURL(/\/users\/\d+$/)
  await expect(page.locator('main section').nth(1).locator('h2')).toBeVisible()
})
