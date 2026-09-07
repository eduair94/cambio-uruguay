import { expect, test, type Locator, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RentalOffer, RentalProperty, RentalsResponse } from '../../utils/rentals'

const artifactRoot = fileURLToPath(new URL('../../../', import.meta.url))

test.use({
  serviceWorkers: 'block',
  extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
})
test.setTimeout(120000)

// Browser-only fixtures: this suite checks interaction and presentation, while the
// Mongo suites independently verify real filtering and selection of the same advert.
const observedAt = new Date().toISOString()
const imageUrl = 'https://example.invalid/rental-filter-fixture.png'
function advert(id: string, price: number, commonExpenses: number | null): RentalOffer {
  return {
    source: 'infocasas',
    listingId: id,
    title: 'Apartamento de prueba con luz natural',
    url: `https://www.infocasas.com.uy/fixture/${id}`,
    price,
    priceUyu: price,
    currency: 'UYU',
    commonExpenses,
    commonExpensesCurrency: commonExpenses === null ? null : 'UYU',
    sellerName: 'Anunciante de prueba',
    sellerType: 'desconocido',
    image: imageUrl,
    parkingSpaces: null,
    furnished: null,
    publishedAt: observedAt,
    firstSeen: observedAt,
    lastSeen: observedAt,
  }
}

function property(index: number, filtered: boolean): RentalProperty {
  // Canonical price is deliberately cheaper than the matching advert. The card
  // must display the API-selected offer, including its own common expenses.
  const canonical = advert(`fixture-low-${index}`, 16000, 9000)
  const matched = advert(
    `fixture-match-${index}`,
    filtered ? 22000 : 19000,
    index === 1 ? null : 1000
  )
  return {
    key: `filter-fixture-${index}`,
    title: `Apartamento luminoso de prueba ${index + 1}`,
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: '',
    addressKey: '',
    latitude: -34.9,
    longitude: -56.16,
    bedrooms: 1,
    bathrooms: 1,
    area: 42,
    parkingSpaces: null,
    furnished: null,
    petsAllowed: null,
    guarantees: ['anda'],
    price: canonical.price,
    priceUyu: canonical.priceUyu,
    currency: 'UYU',
    offers: [canonical, matched],
    matchingOffer: matched,
    sources: ['infocasas'],
    freshAt: observedAt,
    firstSeen: observedAt,
    lastSeen: observedAt,
  }
}

function response(url: URL): RentalsResponse {
  const filtered = url.searchParams.has('priceMin') || url.searchParams.has('priceMax')
  const items = Array.from({ length: filtered ? 1 : 12 }, (_, index) => property(index, filtered))
  return {
    meta: {
      key: 'uy-rentals',
      generatedAt: observedAt,
      mode: 'full',
      durationMs: 1,
      usdUyu: 40,
      properties: 12,
      offers: 24,
      merged: 12,
      sources: [{ key: 'infocasas', ok: true, listings: 24, note: 'Synthetic browser fixture' }],
    },
    coverage: {
      computedAt: observedAt,
      properties: 12,
      sources: [{ key: 'infocasas', properties: 12 }],
    },
    items,
    total: items.length,
    page: 1,
    perPage: 24,
    medianUyu: filtered ? 22000 : 19000,
    facets: {
      departments: [{ value: 'Montevideo', count: 12 }],
      neighborhoods: [{ value: 'Cordón', count: 12 }],
      types: [{ value: 'apartamento', count: 12 }],
      sources: [{ value: 'infocasas', count: 12 }],
      priceMaxUyu: 22000,
    },
  }
}

async function setup(page: Page, query = '') {
  const state = { reads: [] as URL[], mapReads: [] as URL[], errors: [] as string[] }
  page.on('pageerror', error => state.errors.push(error.message))
  // No production subscriptions, contacts, analytics events or data mutations.
  await page.route('**/*', route =>
    ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
      ? route.continue()
      : route.abort('blockedbyclient')
  )
  await page.route(imageUrl, route =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    })
  )
  await page.route(/\/api\/rentals(?:\/mapa)?(?:\?|$)/, async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/mapa')) {
      state.mapReads.push(url)
      // Empty located subset avoids loading tiles and does not fabricate precision.
      return route.fulfill({ json: { points: [], total: 1, located: 0, shown: 0, limit: 3000 } })
    }
    state.reads.push(url)
    return route.fulfill({ json: response(url) })
  })
  // A real consent gesture proves hydration. Navigate afterwards so client API
  // interception works without substituting SSR payloads or browser preferences.
  await page.goto('/acerca', { waitUntil: 'domcontentloaded' })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible()
  await expect(consent).toHaveCSS('position', 'static')
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 60000 })
  await page.evaluate(
    async target => {
      const element = document.getElementById('__nuxt') as HTMLElement & {
        __vue_app__: {
          config: { globalProperties: { $router: { push: (path: string) => unknown } } }
        }
      }
      await element.__vue_app__.config.globalProperties.$router.push(target)
    },
    `/alquileres-uruguay${query ? `?${query}` : ''}`
  )
  await expect(page.locator('.rental-card')).toHaveCount(query.includes('price') ? 1 : 12)
  await expect(page.locator('#rental-results')).toHaveAttribute('aria-busy', 'false')
  return state
}

async function openFilters(page: Page) {
  const trigger = page.getByTestId('rental-mobile-filters-trigger')
  await trigger.click()
  const dialog = page.getByTestId('rental-mobile-filters-dialog')
  await expect(dialog).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  return dialog
}

async function priceFields(dialog: Locator) {
  const min = dialog.getByRole('spinbutton', { name: 'Alquiler desde ($)', exact: true })
  if (!(await min.isVisible())) await dialog.getByTestId('rental-advanced-toggle').click()
  return {
    min,
    max: dialog.getByRole('spinbutton', { name: 'Alquiler hasta ($)', exact: true }),
  }
}

async function reachable(control: Locator) {
  await expect(control).toBeInViewport()
  const geometry = await control.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    return {
      height: rect.height,
      width: rect.width,
      unobscured: hit === element || element.contains(hit),
    }
  })
  expect(geometry.height).toBeGreaterThanOrEqual(44)
  expect(geometry.width).toBeGreaterThanOrEqual(44)
  expect(geometry.unobscured).toBe(true)
}

test('mobile range drafts cancel without changing results; applying and Back preserve the query', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, 'department=Montevideo&neighborhood=Cord%C3%B3n')
  const originalUrl = page.url()
  const initialReads = state.reads.length
  await page.evaluate(() => scrollTo(0, 1200))
  const scroll = await page.evaluate(() => scrollY)
  const trigger = page.getByTestId('rental-mobile-filters-trigger')
  await reachable(trigger)

  for (const closing of ['button', 'Escape']) {
    const dialog = await openFilters(page)
    const { min, max } = await priceFields(dialog)
    await min.fill('20000')
    await max.fill('22000')
    expect(page.url()).toBe(originalUrl)
    expect(state.reads.length).toBe(initialReads)
    expect(await page.locator('.rental-card').count()).toBe(12)
    if (closing === 'button') await dialog.getByTestId('rental-filters-cancel').click()
    else await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    expect(Math.abs((await page.evaluate(() => scrollY)) - scroll)).toBeLessThan(4)
  }

  const dialog = await openFilters(page)
  const { min, max } = await priceFields(dialog)
  await expect(min).toHaveValue('')
  await expect(max).toHaveValue('')
  await min.fill('20000')
  await max.fill('22000')
  await dialog.getByTestId('rental-filters-apply').click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.rental-card')).toHaveCount(1)
  const query = new URL(page.url()).searchParams
  expect(query.get('priceMin')).toBe('20000')
  expect(query.get('priceMax')).toBe('22000')
  expect(query.get('department')).toBe('Montevideo')
  expect(query.get('neighborhoods') || query.get('neighborhood')).toBe('Cordón')
  expect(state.reads.length).toBe(initialReads + 1)
  const card = page.locator('.rental-card').first()
  await expect(card.locator('.rental-card__price')).toContainText('$ 23.000')
  await expect(card.locator('.rental-card__price')).not.toContainText('16.000')
  await expect(card.locator('.rental-card__expenses')).toContainText('1.000')
  await expect(card.locator('.rental-card__expenses')).toContainText('22.000')
  await page.goBack()
  await expect(page).toHaveURL(originalUrl)
  await expect(page.locator('.rental-card')).toHaveCount(12)
  await expect(page.locator('.rental-card__price').first()).toContainText('$ 20.000')
  await expect(page.locator('.rental-card__price').nth(1)).toContainText('$ 19.000')
  await expect(page.locator('.rental-card__expenses').nth(1)).toContainText('sin informar')
  await expect(page.locator('.rental-card__cost-label').nth(1)).not.toContainText('gastos')
  expect(state.errors).toEqual([])
})

test('invalid ranges do not fetch; equal endpoints work; clearing the drawer remains cancellable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, 'department=Montevideo&priceMin=20000&priceMax=22000')
  const originalUrl = page.url()
  const initialReads = state.reads.length
  let dialog = await openFilters(page)
  let fields = await priceFields(dialog)
  await fields.min.fill('25000')
  await fields.max.fill('22000')
  await dialog.getByTestId('rental-filters-apply').click()
  await expect(dialog.locator('.rental-search__error')).toBeVisible()
  await expect(fields.max).toBeFocused()
  await expect(dialog).toBeVisible()
  expect(page.url()).toBe(originalUrl)
  expect(state.reads.length).toBe(initialReads)
  await fields.min.fill('')
  for (const invalidMaximum of ['0', '-1', '1e3']) {
    await fields.max.fill(invalidMaximum)
    await expect(fields.max).toHaveValue(invalidMaximum)
    await expect(dialog.getByTestId('rental-filter-priceMax')).toContainText(
      invalidMaximum === '0' ? 'El máximo debe ser mayor que cero' : 'Ingresá un número válido'
    )
    await dialog.getByTestId('rental-filters-apply').click()
    await expect(dialog.locator('.rental-search__error')).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(page.url()).toBe(originalUrl)
    expect(state.reads.length).toBe(initialReads)
  }
  await fields.min.fill('22000')
  await fields.max.fill('22000')
  await expect(dialog.locator('.rental-search__error')).toHaveCount(0)
  await dialog.getByTestId('rental-filters-apply').click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => new URL(page.url()).searchParams.get('priceMin')).toBe('22000')
  const equalUrl = page.url()
  dialog = await openFilters(page)
  await dialog.getByTestId('rental-filters-reset').click()
  expect(page.url()).toBe(equalUrl)
  await expect(dialog).toBeVisible()
  fields = await priceFields(dialog)
  await expect(fields.min).toHaveValue('')
  await expect(fields.max).toHaveValue('')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(page.url()).toBe(equalUrl)
  dialog = await openFilters(page)
  fields = await priceFields(dialog)
  await expect(fields.min).toHaveValue('22000')
  await expect(fields.max).toHaveValue('22000')
  expect(state.errors).toEqual([])
})

for (const viewport of [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  test(`${viewport.width}px: first price is visible and one-row controls survive scroll and short height`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const state = await setup(page)
    await expect(page.locator('.rental-card__price').first()).toBeInViewport({ ratio: 1 })
    await expect(page.locator('.rental-card__price').first()).toContainText('$ 20.000')
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-rentals-filter-${viewport.width}.png`),
    })
    const toolbar = page.getByTestId('rental-mobile-toolbar')
    const boxes = await toolbar.locator('button:visible').evaluateAll(elements =>
      elements.map(element => {
        const rect = element.getBoundingClientRect()
        return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
      })
    )
    expect(boxes.length).toBeGreaterThanOrEqual(3)
    expect(
      Math.max(...boxes.map(box => box.top)) - Math.min(...boxes.map(box => box.top))
    ).toBeLessThan(8)
    for (const button of await toolbar.locator('button:visible').all()) await reachable(button)
    expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(72)
    await page.evaluate(() => scrollTo(0, 1200))
    await reachable(page.getByTestId('rental-mobile-filters-trigger'))
    const dialog = await openFilters(page)
    await page.setViewportSize({ width: viewport.width, height: 390 })
    await reachable(dialog.getByTestId('rental-filters-apply'))
    await reachable(dialog.getByTestId('rental-filters-reset'))
    await reachable(dialog.getByTestId('rental-filters-cancel'))
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-rentals-filter-drawer-${viewport.width}.png`),
    })
    const min = (await priceFields(dialog)).min
    await expect(min).toBeVisible()
    expect(
      await min.evaluate(element => parseFloat(getComputedStyle(element).fontSize))
    ).toBeGreaterThanOrEqual(16)
    await min.focus()
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(state.errors).toEqual([])
  })
}
