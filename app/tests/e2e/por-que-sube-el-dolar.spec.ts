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
  // chart region mounted client-side: either the canvas (data present) or the
  // empty-state icon (no data in this environment) — PriceMovesChart.vue
  // renders one or the other, never neither, so asserting on the canvas alone
  // false-fails whenever the API returns an empty series (e.g. in CI).
  await expect(
    page.locator('.price-moves-chart__canvas, .price-moves-chart__empty').first()
  ).toBeVisible()
  expect(errors).toEqual([])
})
