import { test, expect } from '@playwright/test'

test('/por-que-sube-el-dolar renders the analysis surface', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/por-que-sube-el-dolar')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // drivers panel title present (from i18n)
  await expect(
    page.getByText(/mueve al d[oó]lar|moves the dollar|move o d[oó]lar/i).first()
  ).toBeVisible()
  await page.waitForLoadState('networkidle')
  // chart canvas mounted client-side
  await expect(page.locator('canvas').first()).toBeVisible()
  expect(errors).toEqual([])
})
