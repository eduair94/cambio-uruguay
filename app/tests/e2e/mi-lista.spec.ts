import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

/**
 * Pick a department, apply it as the zone, and wait for the board to appear.
 * Retries the interaction: the page hydrates after the market fetch, so a click
 * that lands too early is a no-op rather than a failure.
 */
async function configureZone(page: import('@playwright/test').Page) {
  const select = page.locator('[data-testid="wl-dept-select"]')
  await expect(select).toBeVisible({ timeout: 90_000 })

  await expect(async () => {
    await select.click({ timeout: 5_000 }).catch(() => {})
    const option = page.locator('.v-overlay .v-list-item').first()
    await option.click({ timeout: 5_000 })
    await page.locator('[data-testid="wl-apply-zone"]').click({ timeout: 5_000 })
    await expect(page.locator('[data-testid="wl-summary"]')).toBeVisible({ timeout: 10_000 })
  }).toPass({ timeout: 60_000 })
}

test('builds a board from a department zone and keeps it after a reload', async ({ page }) => {
  await page.goto('/mi-lista')
  await expect(page.locator('h1')).toContainText(/lista/i, { timeout: 90_000 })

  await configureZone(page)

  const rows = page.locator('[data-testid="wl-board-row"]')
  await expect(rows.first()).toBeVisible({ timeout: 30_000 })
  expect(await rows.count()).toBeGreaterThan(0)

  // The list is localStorage-first: it must survive a reload with no account.
  await page.reload()
  await expect(page.locator('[data-testid="wl-summary"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('[data-testid="wl-board-row"]').first()).toBeVisible({
    timeout: 30_000,
  })
})

test('prices the cards the user picks', async ({ page }) => {
  await page.goto('/mi-lista')
  await expect(page.locator('h1')).toContainText(/lista/i, { timeout: 90_000 })

  const chip = page.locator('[data-testid="wl-card-chip"]').first()
  await expect(chip).toBeVisible({ timeout: 90_000 })
  await expect(async () => {
    await chip.click({ timeout: 5_000 }).catch(() => {})
    await expect(page.locator('[data-testid="wl-summary"]')).toBeVisible({ timeout: 10_000 })
  }).toPass({ timeout: 60_000 })

  await expect(page.locator('[data-testid="wl-card-row"]').first()).toBeVisible({
    timeout: 30_000,
  })
})

test('a shared ?l= link configures a fresh visitor without asking', async ({ page }) => {
  // A department zone plus one card, encoded the way the copy-link button does.
  const list = {
    zone: { mode: 'department', department: 'MONTEVIDEO', label: 'MONTEVIDEO' },
    origins: [],
    cards: ['prex'],
    currencies: ['USD'],
    direction: 'sell',
    amountUsd: 49.99,
  }
  const token = Buffer.from(JSON.stringify(list), 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  await page.goto(`/mi-lista?l=${token}`)
  await expect(page.locator('[data-testid="wl-summary"]')).toBeVisible({ timeout: 90_000 })
  await expect(page.locator('[data-testid="wl-board-row"]').first()).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.locator('[data-testid="wl-card-row"]').first()).toBeVisible({
    timeout: 30_000,
  })
})
