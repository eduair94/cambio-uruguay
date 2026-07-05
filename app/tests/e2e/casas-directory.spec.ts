import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

test('casas directory renders the comparison with reputation + live data', async ({ page }) => {
  await page.goto('/casas-de-cambio')

  await expect(page.locator('h1')).toContainText(/casas de cambio/i, { timeout: 90_000 })

  // Structural anchors
  await expect(page.locator('[data-testid="casas-methodology"]')).toBeVisible()
  await expect(page.locator('[data-testid="casas-faq"]')).toBeVisible()

  // The comparison renders one row per tracked house (desktop table + mobile
  // cards share the testid; only one set is visible per viewport, both exist).
  await expect(async () => {
    const rows = await page.locator('[data-testid="casas-row"]:visible').count()
    expect(rows).toBeGreaterThan(20)
  }).toPass({ timeout: 30_000 })

  // Best-for picks resolve to concrete houses once data is in.
  await expect(page.locator('[data-testid="casas-pick-coverage"]')).toBeVisible()

  // The page's own JSON-LD graph is embedded (Article + ItemList + FAQPage) —
  // the layout injects a separate site-wide graph, so scan every script tag.
  const ldScripts = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll(nodes => nodes.map(n => n.textContent || ''))
  const pageGraph = ldScripts.find(s => s.includes('FinancialService'))
  expect(pageGraph).toBeTruthy()
  expect(pageGraph).toContain('FAQPage')
  expect(pageGraph).toContain('ItemList')
  expect(pageGraph).not.toContain('aggregateRating')
})

test('casas directory category filter narrows the rows', async ({ page }) => {
  await page.goto('/casas-de-cambio')
  await expect(page.locator('h1')).toContainText(/casas de cambio/i, { timeout: 90_000 })

  // Hydration gate: click until Vue actually toggles the button state — clicks
  // that land before hydration are lost, so retry until aria/pressed flips.
  const bancoBtn = page.locator('[data-testid="casas-cat-banco"]')
  await expect(bancoBtn).toBeVisible({ timeout: 30_000 })
  await expect(async () => {
    const active = (await bancoBtn.getAttribute('class'))?.includes('v-btn--active')
    if (!active) await bancoBtn.click()
    expect((await bancoBtn.getAttribute('class')) ?? '').toContain('v-btn--active')
  }).toPass({ timeout: 60_000 })

  // Only the banks (BROU, Itaú) remain.
  await expect(async () => {
    const rows = await page.locator('[data-testid="casas-row"]:visible').count()
    expect(rows).toBeLessThanOrEqual(4)
    expect(rows).toBeGreaterThan(0)
  }).toPass({ timeout: 15_000 })
})
