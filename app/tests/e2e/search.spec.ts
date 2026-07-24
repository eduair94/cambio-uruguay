import { expect, test, type Page } from '@playwright/test'

test.setTimeout(120_000)

// The browser's default Accept-Language is `en`, which makes @nuxtjs/i18n
// redirect `/` to `/en` and render English labels. Pin Spanish: it is the
// default, unprefixed locale these assertions describe.
test.use({ locale: 'es-UY' })

/**
 * Open the palette and wait for its lazily-imported index to arrive.
 *
 * Uses the hotkey rather than the trigger on purpose. The trigger is a real
 * anchor to /buscar, so a click landing before hydration navigates away — the
 * graceful-degradation behaviour the dedicated test below asserts, but a trap
 * for a retry loop on this slow-hydrating dev server: every retry would click
 * pre-hydration, navigate, and reset hydration on the new page. The hotkey
 * listener only exists after hydration, so retrying it is safe.
 */
async function openPalette(page: Page) {
  const input = page.locator('.search-palette__input')

  await expect(async () => {
    await page.keyboard.press('Control+k')
    await expect(input).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 60_000 })

  // The catalogue chunk resolves a tick later; typing before it lands shows a skeleton.
  await expect(async () => {
    await input.fill('dolar')
    await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 30_000 })
  await input.fill('')

  return input
}

test('the search trigger is a working link to /buscar before hydration', async ({ page }) => {
  await page.goto('/')
  // Graceful degradation: with no JS — or before hydration, when this app drops
  // clicks — the anchor must still reach the server-rendered search page.
  await expect(page.locator('a.search-trigger')).toHaveAttribute('href', '/buscar')
  await expect(page.locator('a.search-trigger-icon')).toHaveAttribute('href', '/buscar')
})

test('once hydrated, clicking the trigger opens the palette instead of navigating', async ({
  page,
}) => {
  await page.goto('/')
  // Hydration gate: the hotkey handler only exists once Vue has taken over.
  await openPalette(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('.search-palette__input')).toBeHidden()

  await page.locator('a.search-trigger').click()
  await expect(page.locator('.search-palette__input')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('Ctrl+K opens the palette with a valid combobox', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('.search-palette__input')

  await expect(async () => {
    await page.keyboard.press('Control+k')
    await expect(input).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 60_000 })

  await expect(input).toBeFocused()
  await expect(input).toHaveAttribute('role', 'combobox')
  await expect(input).toHaveAttribute('aria-controls', 'cu-search-listbox')
  await expect(page.locator('[aria-live="polite"]')).toHaveCount(1)
})

test('searching a footer-only page finds it and Enter navigates there', async ({ page }) => {
  await page.goto('/')
  const input = await openPalette(page)

  await input.fill('prestamo')
  const first = page.locator('[role="option"]').first()
  await expect(first).toContainText(/Préstamos en Uruguay/i)
  await expect(first).toHaveAttribute('aria-selected', 'true')
  await expect(input).toHaveAttribute('aria-activedescendant', 'cu-search-opt-0')
  await expect(input).toHaveAttribute('aria-expanded', 'true')

  await input.press('Enter')
  await expect(page).toHaveURL(/\/prestamos-uruguay$/)
})

test('arrow keys move the virtual cursor without moving DOM focus', async ({ page }) => {
  await page.goto('/')
  const input = await openPalette(page)

  await input.fill('dolar')
  await expect(input).toHaveAttribute('aria-activedescendant', 'cu-search-opt-0')
  await input.press('ArrowDown')
  await expect(input).toHaveAttribute('aria-activedescendant', 'cu-search-opt-1')
  await expect(input).toBeFocused()
  await expect(page.locator('#cu-search-opt-1')).toHaveAttribute('aria-selected', 'true')
})

test('Escape closes the palette and restores focus to whatever opened it', async ({ page }) => {
  await page.goto('/')
  const input = await openPalette(page)
  await input.press('Escape')
  await expect(input).toBeHidden()

  // Re-open from the trigger so there is a focused element to return to.
  const trigger = page.locator('a.search-trigger')
  await trigger.click()
  await expect(input).toBeVisible()
  await input.press('Escape')
  await expect(input).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('a numeric query offers the conversion page for that exact amount', async ({ page }) => {
  await page.goto('/')
  const input = await openPalette(page)

  await input.fill('100 usd')
  const pinned = page.locator('.search-palette__pinned-row')
  await expect(pinned).toContainText('100 dólares')
  // The pinned row is the default selection: "100" also substring-matches the
  // prebaked "1000 dólares" page, which must not steal Enter.
  await expect(pinned).toHaveClass(/pinned-row--active/)
  await input.press('Enter')
  await expect(page).toHaveURL(/\/convertir\/100-dolares-a-pesos-uruguayos$/)
})

test('ArrowDown moves off the pinned conversion row into the scored results', async ({ page }) => {
  await page.goto('/')
  const input = await openPalette(page)

  await input.fill('100 usd')
  await expect(page.locator('.search-palette__pinned-row')).toHaveClass(/pinned-row--active/)
  await input.press('ArrowDown')
  await expect(page.locator('.search-palette__pinned-row')).not.toHaveClass(/pinned-row--active/)
  await expect(input).toHaveAttribute('aria-activedescendant', 'cu-search-opt-0')
})

test('a non-prebaked amount falls back to the currency page instead of an empty one', async ({
  page,
}) => {
  await page.goto('/')
  const input = await openPalette(page)

  await input.fill('137 usd')
  await expect(page.locator('.search-palette__pinned-row')).toContainText('137 dólares')
  await input.press('Enter')
  await expect(page).toHaveURL(/\/cotizacion\/dolar$/)
})

test('the theme action cycles the theme and keeps the palette open', async ({ page }) => {
  await page.goto('/')
  const input = await openPalette(page)

  // Assert on the stored preference, not `data-theme`: headless Chrome reports a
  // light `prefers-color-scheme`, so the system -> light step of the cycle
  // resolves to the same rendered theme.
  const before = await page.evaluate(() => localStorage.getItem('cu_theme'))
  await input.fill('tema')
  const themeRow = page.locator('[role="option"]').first()
  await expect(themeRow).toContainText(/tema/i)
  await themeRow.click()

  await expect.poll(() => page.evaluate(() => localStorage.getItem('cu_theme'))).not.toBe(before)
  // Changing a setting is not a destination, so the palette stays open.
  await expect(input).toBeVisible()
})

test('a typo falls back to a did-you-mean suggestion', async ({ page }) => {
  await page.goto('/')
  const input = await openPalette(page)

  await input.fill('histrico')
  await expect(page.locator('.search-palette__did-you-mean')).toBeVisible()
  await expect(page.locator('[role="option"]').first()).toContainText(/Histórico/i)
})

test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false })

  test('/buscar renders crawlable result anchors', async ({ page }) => {
    await page.goto('/buscar?q=prestamo')
    // Scope to the results list: the footer and drawer link this route too.
    const results = page.locator('.search-results--links')
    await expect(results.locator('a[href="/prestamos-uruguay"]')).toBeVisible()
    await expect(page.locator('h1')).toContainText(/prestamo/i)
  })
})

test('/buscar noindexes result pages but not the landing', async ({ page }) => {
  await page.goto('/buscar?q=dolar')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  await page.goto('/buscar')
  // The landing must not carry the page-level noindex; whatever rule shows up
  // comes from the site config (which noindexes non-production builds).
  const landingRobots = await page.locator('meta[name="robots"]').getAttribute('content')
  expect(landingRobots).not.toBe('noindex, follow')
})

test('the WebSite SearchAction points at /buscar on the homepage', async ({ page }) => {
  await page.goto('/')
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  const joined = blocks.join('\n')
  expect(joined).toContain('/buscar?q={search_term_string}')
  expect(joined).not.toContain('/avanzado?search=')
})

test('/buscar keeps result links inside the active locale', async ({ page }) => {
  await page.goto('/en/buscar?q=prestamo')
  // Scope to the results list: the footer and drawer link these routes too.
  const results = page.locator('.search-results--links')
  await expect(results.locator('a[href="/en/prestamos-uruguay"]')).toBeVisible()
  await expect(results.locator('a[href="/prestamos-uruguay"]')).toHaveCount(0)
})

test('/mapa-del-sitio links the pages that used to be orphaned', async ({ page }) => {
  await page.goto('/mapa-del-sitio')

  await expect(page.locator('h1')).toBeVisible()
  // Scope to the page body: the footer and drawer also link these routes.
  const body = page.locator('.sitemap-page')
  for (const route of ['/preguntas-frecuentes', '/por-que-sube-el-dolar', '/dolar/records']) {
    await expect(body.locator(`a[href="${route}"]`)).toHaveCount(1)
  }
  for (const origin of ['oca', 'santander', 'scotiabank']) {
    await expect(body.locator(`a[href="/casa/${origin}"]`)).toHaveCount(1)
  }
  expect(await body.locator('a[href^="/herramientas/"]').count()).toBeGreaterThanOrEqual(14)
  expect(await body.locator('a[href^="/casa/"]').count()).toBeGreaterThanOrEqual(40)
})

test('the mobile drawer exposes every section, including the desktop-only pages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dolar-hoy')

  const drawer = page.locator('.mobile-navigation-drawer')
  await expect(async () => {
    await page
      .locator('.v-app-bar-nav-icon')
      .click({ timeout: 5_000 })
      .catch(() => {})
    await expect(drawer.locator('a[href="/buscar"]')).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 60_000 })

  // Sections are collapsed; the links exist in the DOM regardless.
  for (const route of [
    '/mapa', // was desktop-only
    '/estado', // was desktop-only
    '/prestamos-uruguay', // was footer-only
    '/inversiones-uruguay', // was footer-only
    '/preguntas-frecuentes', // was orphaned
    '/dolar/records', // was orphaned
  ]) {
    await expect(drawer.locator(`a[href="${route}"]`)).toHaveCount(1)
  }
})
