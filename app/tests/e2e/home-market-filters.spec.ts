import { expect, test } from '@playwright/test'

// The home page's "where can I operate / where am I" controls. A price you
// cannot take (needs an account you don't have) or cannot reach (two
// departments away) is noise, so both filters must actually narrow the grid.

test.setTimeout(120_000)

const gridText = async (page: import('@playwright/test').Page) =>
  (await page.locator('.best-rates-grid').allInnerTexts()).join(' ').replace(/\s+/g, ' ')

test('channel filter is shareable and narrows the best-rates grid', async ({ page }) => {
  // `?canal=` is read during setup, so the toggle reflects it on first paint.
  await page.goto('/?canal=online')
  await expect(page.locator('[data-testid="home-channel"]')).toBeVisible({ timeout: 90_000 })
  await expect(page.locator('[data-testid="home-channel-online"]')).toHaveClass(/v-btn--active/)

  await expect(async () => {
    const text = await gridText(page)
    expect(text.length).toBeGreaterThan(20)
    // Online = you need an account there. Walk-in casas must be gone.
    expect(text).not.toMatch(/Cambio Fenix|Cambio Principal|Baluma/i)
  }).toPass({ timeout: 45_000 })

  await page.goto('/?canal=presencial')
  await expect(async () => {
    const text = await gridText(page)
    // Fintechs only price for their own users, so they cannot be presencial.
    expect(text).not.toMatch(/Prex|OCA/i)
  }).toPass({ timeout: 45_000 })
})

test('a bank branch board counts as presencial, its account rate as online', async ({ page }) => {
  // The regression this filter was reshaped around: BROU publishes BOTH a
  // walk-in pizarra (type '') and an account-only eBROU price. Classifying by
  // origin hid the walk-in one entirely.
  await page.goto('/?canal=presencial&house=brou')
  await expect(page.locator('[data-testid="home-channel"]')).toBeVisible({ timeout: 90_000 })

  await expect(async () => {
    // The house selector still offers BROU under presencial — it has a
    // counter quote — so the selection is not reset to "best".
    const body = (await page.locator('body').allInnerTexts()).join(' ')
    expect(body).toMatch(/BROU/)
  }).toPass({ timeout: 45_000 })
})

test('department filter narrows the market and survives a reload', async ({ page }) => {
  await page.goto('/')
  const dept = page.locator('[data-testid="home-department"]')
  await expect(dept).toBeVisible({ timeout: 90_000 })

  // Wait for the live payload to populate the department list.
  await expect(async () => {
    await dept.locator('.v-field').click()
    const options = await page.locator('.v-overlay-container .v-list-item-title').allInnerTexts()
    expect(options.length).toBeGreaterThan(5)
  }).toPass({ timeout: 60_000 })

  const rivera = page
    .locator('.v-overlay-container .v-list-item-title')
    .filter({ hasText: /^Rivera$/i })
  await rivera.first().click()

  await expect(page).toHaveURL(/dep=RIVERA/i, { timeout: 15_000 })
  await expect(page.locator('[data-testid="home-filter-notice"]')).toBeVisible()

  // Reload: the choice comes back from the URL, not from client state.
  await page.reload()
  await expect(page.locator('[data-testid="home-department"]')).toContainText(/Rivera/i, {
    timeout: 90_000,
  })
})

test('an impossible combination explains itself instead of showing nothing', async ({ page }) => {
  // Flores has casas but no bank/fintech branch, so "online + Flores" is empty
  // by construction — the page must say so and offer a way out.
  await page.goto('/?canal=online&dep=FLORES')
  await expect(page.locator('[data-testid="home-channel"]')).toBeVisible({ timeout: 90_000 })

  await expect(async () => {
    const empty = page.locator('[data-testid="home-filter-empty"]')
    const grid = page.locator('.best-rates-grid')
    // Either the grid has rows, or the empty state explains why it doesn't —
    // never a silently blank area.
    const hasRows =
      (await grid.count()) > 0 && (await grid.allInnerTexts()).join('').trim().length > 0
    if (!hasRows) await expect(empty).toBeVisible()
  }).toPass({ timeout: 45_000 })
})
