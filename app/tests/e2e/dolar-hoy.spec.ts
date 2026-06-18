import { test, expect } from '@playwright/test'

test('/dolar-hoy renders the dollar momentum surface', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/dolar-hoy')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // buy/sell labels present
  await expect(page.getByText(/Compra|Buy/).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})

test('/dolar/records renders record boxes or a no-data notice', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/dolar/records')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})
