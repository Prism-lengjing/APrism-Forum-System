import { expect, test } from '@playwright/test'

test('user can login and browse forum pages', async ({ page }) => {
  await page.goto('/login')

  await page.getByPlaceholder('用户名或邮箱').fill('testuser')
  await page.getByPlaceholder('密码').fill('password123')
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(/\/forums$/)
  await expect(page.getByRole('heading', { name: '论坛板块' })).toBeVisible()

  const forumEntry = page
    .locator('main a[href^="/forums/"]:not([href="/forums"])')
    .first()
  await expect(forumEntry).toBeVisible()
  await forumEntry.click()

  await expect(page).toHaveURL(/\/forums\/\d+$/)
  await expect(page.getByRole('heading', { name: /主题列表/ })).toBeVisible()
})
