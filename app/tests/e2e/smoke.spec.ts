import { test, expect } from '@playwright/test'
test('home loads with title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Cambio Uruguay|Dólar/i)
})
