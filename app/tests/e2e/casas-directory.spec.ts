import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

/** Click until Vue has hydrated — clicks landing before hydration are lost. */
async function clickUntilActive(page: import('@playwright/test').Page, testId: string) {
  const btn = page.locator(`[data-testid="${testId}"]`)
  await expect(btn).toBeVisible({ timeout: 30_000 })
  await expect(async () => {
    const active = (await btn.getAttribute('class'))?.includes('v-btn--active')
    if (!active) await btn.click()
    expect((await btn.getAttribute('class')) ?? '').toContain('v-btn--active')
  }).toPass({ timeout: 60_000 })
  return btn
}

const visibleRows = (page: import('@playwright/test').Page) =>
  page.locator('[data-testid="casas-row"]:visible')

test('casas directory renders the comparison with reputation + live data', async ({ page }) => {
  await page.goto('/casas-de-cambio')

  await expect(page.locator('h1')).toContainText(/casas de cambio/i, { timeout: 90_000 })

  // Structural anchors
  await expect(page.locator('[data-testid="casas-methodology"]')).toBeVisible()
  await expect(page.locator('[data-testid="casas-faq"]')).toBeVisible()

  // The comparison renders one row per tracked house (desktop table + mobile
  // cards share the testid; only one set is visible per viewport, both exist).
  await expect(async () => {
    expect(await visibleRows(page).count()).toBeGreaterThan(20)
  }).toPass({ timeout: 30_000 })

  for (const origin of ['oca', 'santander', 'scotiabank']) {
    await expect(page.locator(`a[href$="/casa/${origin}"]:visible`).first()).toBeVisible()
  }

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

  const bancoBtn = await clickUntilActive(page, 'casas-cat-banco')

  // Only the banks remain. Asserted against the shipped dataset rather than a
  // hard-coded 5, so adding a bank does not silently rot this test.
  const { CASAS_REPUTATION } = await import('../../utils/casasDirectory')
  const expectedBanks = CASAS_REPUTATION.filter(c => c.category === 'banco').length
  expect(expectedBanks).toBeGreaterThan(0)
  await expect(async () => {
    expect(await visibleRows(page).count()).toBe(expectedBanks)
  }).toPass({ timeout: 15_000 })

  // Re-clicking the active button must NOT empty the table: the toggle is
  // `mandatory`, so the category can never fall back to undefined.
  await bancoBtn.click()
  await page.waitForTimeout(500)
  await expect(async () => {
    expect(await visibleRows(page).count()).toBe(expectedBanks)
  }).toPass({ timeout: 10_000 })

  // The choice is shareable.
  await expect(page).toHaveURL(/tipo=banco/)
})

test('department filter matches both spellings and links to the department page', async ({
  page,
}) => {
  await page.goto('/casas-de-cambio')
  await expect(page.locator('h1')).toContainText(/casas de cambio/i, { timeout: 90_000 })

  const select = page.locator('[data-testid="casas-dept"]')
  await expect(select).toBeVisible({ timeout: 30_000 })

  // The selector must list each department exactly once. The live payload
  // spells four of them both with and without accents (PAYSANDU/PAYSANDÚ), and
  // a raw dedupe used to show 23 options for 19 departments.
  await expect(async () => {
    await select.locator('.v-field').click()
    const options = await page.locator('.v-overlay-container .v-list-item-title').allInnerTexts()
    expect(options.length).toBeGreaterThan(10)
    const normalized = options.map(o =>
      o
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toUpperCase()
    )
    expect(new Set(normalized).size).toBe(normalized.length)
  }).toPass({ timeout: 30_000 })
  await page.keyboard.press('Escape')

  // `?dep=` is slug-based, so it resolves whichever way the houses spell it.
  await page.goto('/casas-de-cambio?dep=san-jose')
  await expect(page.locator('h1')).toContainText(/casas de cambio/i, { timeout: 90_000 })
  await expect(async () => {
    const names = await visibleRows(page).allInnerTexts()
    // Both spellings must be represented: BROU/Santander publish "SAN JOSE",
    // OCA/Cambilex publish "SAN JOSÉ". Picking one used to hide the other pair.
    expect(names.join(' ')).toMatch(/BROU/i)
    expect(names.join(' ')).toMatch(/OCA|Cambilex/i)
  }).toPass({ timeout: 30_000 })

  await expect(page.locator('[data-testid="casas-dept-link"]')).toHaveAttribute(
    'href',
    /\/dolar\/san-jose$/
  )
})

test('per-type pages render their own slice, title and canonical', async ({ page }) => {
  for (const [slug, heading] of [
    ['bancos', /bancos/i],
    ['fintech', /fintech/i],
  ] as const) {
    await page.goto(`/casas-de-cambio/${slug}`)
    await expect(page.locator('h1')).toContainText(heading, { timeout: 90_000 })

    await expect(async () => {
      expect(await visibleRows(page).count()).toBeGreaterThan(0)
    }).toPass({ timeout: 30_000 })

    // Own canonical, not the parent's.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/casas-de-cambio/${slug}$`)
    )

    // The category toggle is gone: the URL already fixes the slice.
    await expect(page.locator('[data-testid="casas-cat-banco"]')).toHaveCount(0)
    // ...and the type nav links back to the full directory.
    await expect(page.locator('[data-testid="casas-type-all"]')).toBeVisible()
  }
})

test('an unknown type slug 404s instead of rendering an empty table', async ({ page }) => {
  const response = await page.goto('/casas-de-cambio/cripto')
  expect(response?.status()).toBe(404)
})
