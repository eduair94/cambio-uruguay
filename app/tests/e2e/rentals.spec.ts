import { resolve } from 'node:path'
import { expect, test, type Locator, type Page, type Request } from '@playwright/test'
import type { RentalOffer, RentalProperty, RentalsResponse } from '../../utils/rentals'
import { RENTAL_SAVED_STORAGE_KEY } from '../../utils/rentalSaved'

// Synthetic browser fixtures only. No production listing or storage is modified by these tests.
const day = '2026-09-04'
const diagnostics = new WeakMap<
  Page,
  { errors: string[]; failed: string[]; pending: Map<Request, { path: string; start: number }> }
>()
const mapRequests = new WeakMap<Page, URL[]>()
const listRequests = new WeakMap<Page, URL[]>()
function offer(
  listingId: string,
  price: number,
  commonExpenses: number | null,
  source: RentalOffer['source'] = 'infocasas'
): RentalOffer {
  return {
    listingId,
    source,
    url: `https://example.com/rental-test/${listingId}`,
    title: listingId,
    price,
    currency: 'UYU',
    priceUyu: price,
    commonExpenses,
    commonExpensesCurrency: commonExpenses === null ? null : 'UYU',
    sellerName: 'Anunciante de prueba',
    sellerType: 'particular',
    image: null,
    parkingSpaces: null,
    furnished: null,
    publishedAt: `${day}T10:00:00.000Z`,
    firstSeen: day,
    lastSeen: day,
  }
}

function property(
  key: string,
  title: string,
  bedrooms: number,
  offers: RentalOffer[],
  petsAllowed: true | null = null
): RentalProperty {
  return {
    key,
    title,
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: 'Dirección de prueba',
    addressKey: key,
    latitude: -34.9,
    longitude: -56.16,
    bedrooms,
    bathrooms: 1,
    area: 45,
    parkingSpaces: null,
    furnished: null,
    petsAllowed,
    guarantees: ['anda'],
    price: offers[0].price,
    priceUyu: offers[0].priceUyu,
    currency: 'UYU',
    offers,
    sources: [...new Set(offers.map(item => item.source))],
    freshAt: day,
    firstSeen: day,
    lastSeen: day,
  }
}

const fixtureProperties = [
  property('e2e-zero', 'Prueba: estudio sin gastos comunes', 0, [offer('zero', 24_000, 0)], true),
  property('e2e-unknown', 'Prueba: gastos comunes desconocidos', 1, [
    offer('unknown', 18_000, null),
  ]),
  property('e2e-multiple', 'Prueba: dos avisos de una propiedad', 2, [
    offer('multiple-low-rent', 20_000, 8_000, 'mercadolibre'),
    offer('multiple-low-total', 22_000, 1_000),
  ]),
]
fixtureProperties[1].neighborhood = 'Malvín'
fixtureProperties[2].neighborhood = 'Pocitos'

function fixtureResponse(url: URL, copies = 1): RentalsResponse {
  const max = Number(url.searchParams.get('monthlyMax')) || Infinity
  const pets = url.searchParams.get('pets') === '1'
  const neighborhoods = (
    url.searchParams.get('neighborhoods') ||
    url.searchParams.get('neighborhood') ||
    ''
  )
    .split(',')
    .filter(Boolean)
  const areaMin = Number(url.searchParams.get('areaMin')) || 0
  const items = fixtureProperties.flatMap(item => {
    if (pets && !item.petsAllowed) return []
    if (neighborhoods.length && !neighborhoods.includes(item.neighborhood)) return []
    if (areaMin && (item.area === null || item.area < areaMin)) return []
    const matches = item.offers.filter(candidate => {
      if (max === Infinity) return true
      return (
        candidate.commonExpenses !== null && candidate.priceUyu + candidate.commonExpenses <= max
      )
    })
    if (!matches.length) return []
    return Array.from({ length: copies }, (_, index) => ({
      ...item,
      key: copies === 1 ? item.key : `${item.key}-${index}`,
      title: copies === 1 ? item.title : `${item.title} ${index + 1}`,
      matchingOffer: matches[0],
    }))
  })
  return {
    meta: {
      key: 'uy-rentals',
      generatedAt: `${day}T12:00:00.000Z`,
      mode: 'full',
      durationMs: 1,
      usdUyu: 40,
      properties: 3,
      offers: 4,
      merged: 1,
      sources: [
        { key: 'infocasas', ok: true, listings: 3, note: 'test fixture' },
        { key: 'mercadolibre', ok: true, listings: 1, note: 'test fixture' },
      ],
    },
    items,
    total: items.length,
    page: 1,
    perPage: 24,
    medianUyu: 20_000,
    facets: {
      departments: [{ value: 'Montevideo', count: 3 }],
      neighborhoods: ['Cordón', 'Malvín', 'Pocitos'].map(value => ({ value, count: copies })),
      types: [{ value: 'apartamento', count: 3 }],
      sources: [
        { value: 'infocasas', count: 3 },
        { value: 'mercadolibre', count: 1 },
      ],
      priceMaxUyu: 24_000,
    },
  }
}

async function openMobileFilters(page: Page) {
  const dialog = page.getByTestId('rental-mobile-filters-dialog')
  const trigger = page.getByTestId('rental-mobile-filters-trigger')
  await expect(async () => {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click()
    await expect(dialog).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 90_000, intervals: [250, 500, 1000] })
  return dialog
}

async function submitFilters(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 600)
    await page.getByTestId('rental-filters-apply').click()
  else await page.locator('.rental-search__submit').click()
}

async function expectInsideViewport(locator: Locator, page: Page) {
  await expect(locator).toBeVisible()
  await expect
    .poll(async () => {
      const box = await locator.boundingBox()
      const viewport = page.viewportSize()!
      return (
        !!box &&
        box.x >= -1 &&
        box.y >= -1 &&
        box.x + box.width <= viewport.width + 1 &&
        box.y + box.height <= viewport.height + 1
      )
    })
    .toBe(true)
}

async function openAdvanced(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 600) await openMobileFilters(page)
  await expect(async () => {
    if (!(await page.locator('#rental-advanced').isVisible()))
      await page.getByRole('button', { name: 'Más filtros', exact: true }).click()
    await expect(page.locator('#rental-advanced')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 90_000, intervals: [250, 500, 1000] })
}

async function startFixtureSearch(page: Page, expectedCount = 3) {
  // The initial SSR fetch runs outside the browser interception. Submitting page 2 as page 1
  // changes the route and loads our fixture through the real hydrated form and client fetch.
  await page.goto('/alquileres-uruguay?page=2', { waitUntil: 'domcontentloaded' })
  await openAdvanced(page)
  await submitFilters(page)
  await expect(page.locator('.rental-card')).toHaveCount(expectedCount)
  await expect(page).toHaveURL(/\/alquileres-uruguay$/)
  if ((page.viewportSize()?.width ?? 1440) < 600) {
    await expect(page.getByTestId('rental-mobile-filters-dialog')).not.toBeVisible()
    await expect(page.locator('#rental-results')).toBeFocused()
  }
}

async function applyBudget(page: Page, value: string) {
  await page
    .getByRole('spinbutton', { name: 'Presupuesto mensual máximo ($)', exact: true })
    .fill(value)
  await page.locator('.rental-search__submit').click()
  await expect(page).toHaveURL(new RegExp(`monthlyMax=${value}`))
}

test.use({
  extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
  // These tests intercept the API; a production PWA worker would bypass that interception.
  serviceWorkers: 'block',
})

test.describe('rental directory', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ context, page }, testInfo) => {
    const log = {
      errors: [] as string[],
      failed: [] as string[],
      pending: new Map<Request, { path: string; start: number }>(),
    }
    diagnostics.set(page, log)
    mapRequests.set(page, [])
    listRequests.set(page, [])
    page.on('pageerror', error => log.errors.push(error.stack || error.message))
    page.on('request', request => {
      const url = new URL(request.url())
      log.pending.set(request, { path: `${url.origin}${url.pathname}`, start: Date.now() })
    })
    page.on('requestfinished', request => log.pending.delete(request))
    page.on('requestfailed', request => {
      const pending = log.pending.get(request)
      if (pending) log.failed.push(`${pending.path}: ${request.failure()?.errorText}`)
      log.pending.delete(request)
    })
    const cookieDomain = new URL(testInfo.project.use.baseURL || 'http://localhost:3311').hostname
    await context.addCookies([
      { name: 'lang', value: 'es', domain: cookieDomain, path: '/' },
      { name: 'cu_consent', value: 'denied', domain: cookieDomain, path: '/' },
    ])
    await page.addInitScript(() => localStorage.setItem('not_show_twitter', 'true'))
    await page.route(/\/api\/rentals(?:\/mapa)?(?:\?|$)/, async route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/rentals/mapa') {
        mapRequests.get(page)!.push(url)
        const response = fixtureResponse(url)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            points: response.items.map(item => ({
              key: item.key,
              lat: item.latitude,
              lng: item.longitude,
              price: item.matchingOffer!.price,
              currency: item.currency,
              bedrooms: item.bedrooms,
              area: item.area,
              neighborhood: item.neighborhood,
              offers: item.offers.length,
              url: item.matchingOffer!.url,
            })),
            total: response.total,
            located: response.total,
            shown: response.total,
            limit: 3000,
          }),
        })
        return
      }
      if (url.pathname !== '/api/rentals') return route.continue()
      listRequests.get(page)!.push(url)
      const response = fixtureResponse(
        url,
        testInfo.title.startsWith('opens mobile filters') ? 4 : 1
      )
      // The mobile case also exercises navigation across many result pages.
      if (testInfo.title.startsWith('keeps mobile')) {
        response.total = 2400
        response.page = Number(url.searchParams.get('page')) || 1
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) return
    const screen = (page.viewportSize()?.width ?? 1440) < 600 ? 'mobile' : 'desktop'
    await page
      .screenshot({ path: resolve('..', `rentals-e2e-${screen}-failure.png`), timeout: 10_000 })
      .catch(() => undefined)
    const log = diagnostics.get(page)
    if (!log) return
    const overflow = await page
      .evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll('body *')]
          .filter(element => {
            const rect = element.getBoundingClientRect()
            if (!rect.width || rect.right <= window.innerWidth + 1 || rect.left < 0) return false
            for (let parent = element.parentElement; parent; parent = parent.parentElement) {
              if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX))
                return false
            }
            return true
          })
          .slice(0, 30)
          .map(element => ({
            tag: element.tagName,
            class: element.getAttribute('class'),
            right: element.getBoundingClientRect().right,
            width: element.getBoundingClientRect().width,
          })),
      }))
      .catch(() => null)
    await testInfo.attach('browser-diagnostics', {
      body: JSON.stringify(
        {
          errors: log.errors,
          failed: log.failed,
          overflow,
          pending: [...log.pending.values()].map(item => ({
            path: item.path,
            elapsedMs: Date.now() - item.start,
          })),
        },
        null,
        2
      ),
      contentType: 'application/json',
    })
  })

  test('applies monthly cost from one offer and restores filters on browser Back', async ({
    page,
  }) => {
    await startFixtureSearch(page)
    const neighborhoods = page.getByRole('textbox', { name: 'Barrios o localidades', exact: true })
    await neighborhoods.fill('cordon')
    await page.getByRole('option', { name: 'Cordón', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('.rental-search .v-chip')).toContainText(['Cordón'])
    await page
      .locator('.rental-search')
      .getByRole('button', { name: 'Limpiar filtros', exact: true })
      .click()
    await expect(page.locator('.rental-search .v-chip')).toHaveCount(0)
    await applyBudget(page, '25000')
    await expect(page.locator('.rental-card')).toHaveCount(2)
    await expect(page.getByRole('heading', { name: fixtureProperties[1].title })).toHaveCount(0)
    const multiple = page.locator('.rental-card').filter({ hasText: fixtureProperties[2].title })
    await expect(multiple.locator('.rental-card__price')).toContainText('$ 22.000')
    await expect(multiple.locator('.rental-card__total')).toContainText('$ 23.000')
    await expect(multiple.locator('.rental-card__expenses')).toContainText('$ 1.000')

    await page.getByRole('checkbox', { name: 'Admite mascotas', exact: true }).check()
    await page.locator('.rental-search__submit').click()
    await expect(page).toHaveURL(/pets=1/)
    await expect(page.locator('.rental-card')).toHaveCount(1)
    await page.goBack()
    await expect(page).toHaveURL(/monthlyMax=25000$/)
    await expect(page.locator('.rental-card')).toHaveCount(2)
    await expect(
      page.getByRole('checkbox', { name: 'Admite mascotas', exact: true })
    ).not.toBeChecked()
    await expect(
      page.getByRole('spinbutton', { name: 'Presupuesto mensual máximo ($)', exact: true })
    ).toHaveValue('25000')
  })

  test('clears an invalid unsubmitted draft even when the URL has no filters', async ({ page }) => {
    await startFixtureSearch(page)
    await page.getByRole('spinbutton', { name: 'Alquiler desde ($)', exact: true }).fill('40000')
    await page.getByRole('spinbutton', { name: 'Alquiler hasta ($)', exact: true }).fill('20000')
    await page.locator('.rental-search__submit').click()
    await expect(
      page.getByRole('alert').filter({ hasText: 'El mínimo no puede ser mayor que el máximo.' })
    ).toBeVisible()
    await page
      .locator('.rental-search')
      .getByRole('button', { name: 'Limpiar filtros', exact: true })
      .click()
    await expect(
      page.getByRole('spinbutton', { name: 'Alquiler desde ($)', exact: true })
    ).toHaveValue('')
    await expect(
      page.getByRole('spinbutton', { name: 'Alquiler hasta ($)', exact: true })
    ).toHaveValue('')
    await expect(page).toHaveURL(/\/alquileres-uruguay$/)
    await expect(
      page.getByRole('alert').filter({ hasText: 'El mínimo no puede ser mayor que el máximo.' })
    ).toHaveCount(0)
  })

  test('restores saved searches and compares zero versus unknown expenses after reload', async ({
    page,
  }) => {
    test.setTimeout(300_000)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await startFixtureSearch(page)
    await page.getByRole('button', { name: 'Menos filtros', exact: true }).click()
    await page.screenshot({ path: resolve('..', 'rentals-e2e-desktop.png') })
    for (const item of fixtureProperties.slice(0, 2)) {
      await page
        .getByRole('button', { name: `Guardar propiedad: ${item.title}`, exact: true })
        .click()
    }
    await expect
      .poll(() =>
        page.evaluate(
          key => JSON.parse(localStorage.getItem(key) || '{}').favorites?.length,
          RENTAL_SAVED_STORAGE_KEY
        )
      )
      .toBe(2)
    await applyBudget(page, '25000')
    await page.getByRole('button', { name: 'Guardar búsqueda', exact: true }).click()
    await expect(page.locator('#rental-saved')).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          key => JSON.parse(localStorage.getItem(key) || '{}').searches?.[0]?.params?.monthlyMax,
          RENTAL_SAVED_STORAGE_KEY
        )
      )
      .toBe('25000')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Mis guardados (3)', exact: true })).toBeVisible({
      timeout: 90_000,
    })
    await expect(async () => {
      if (!(await page.locator('#rental-saved').isVisible()))
        await page.getByRole('button', { name: 'Mis guardados (3)', exact: true }).click()
      await expect(page.locator('.saved-compare-table')).toBeVisible()
    }).toPass({ timeout: 60_000 })
    const totalRow = page
      .locator('.saved-compare-table')
      .getByRole('row')
      .filter({ hasText: 'Alquiler + gastos comunes' })
    await expect(totalRow).toContainText('$ 24.000')
    await expect(totalRow).toContainText('Sin dato')
    const expensesRow = page
      .locator('.saved-compare-table')
      .getByRole('row')
      .filter({ hasText: 'Gastos comunes del mismo aviso' })
    await expect(expensesRow).toContainText('Sin gastos comunes')
    await expect(expensesRow).toContainText('Sin dato')
    await expect(page.locator('.saved-compare-table a').first()).toHaveAttribute(
      'href',
      /^https:\/\/example\.com\/rental-test\//
    )
    await page.locator('.saved-compare-table').scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve('..', 'rentals-e2e-desktop-compare.png') })

    await page
      .locator('.rentals-chips')
      .getByRole('button', { name: 'Limpiar filtros', exact: true })
      .click()
    await expect(page).toHaveURL(/\/alquileres-uruguay$/)
    await page.getByRole('button', { name: /^Abrir búsqueda:/ }).click()
    await expect(page).toHaveURL(/monthlyMax=25000/)
    await expect(page.locator('.rental-card')).toHaveCount(2)
    await expect(page.locator('.saved-favorite')).toHaveCount(2)

    expect(mapRequests.get(page)).toHaveLength(0)
    await page.getByRole('button', { name: 'Mapa', exact: true }).click()
    await expect.poll(() => mapRequests.get(page)?.length).toBe(1)
    await page.getByRole('button', { name: 'Lista', exact: true }).click()
    await applyBudget(page, '24000')
    await expect(page.locator('.rental-card')).toHaveCount(2)
    expect(mapRequests.get(page)).toHaveLength(1)
    await page.getByRole('button', { name: 'Mapa', exact: true }).click()
    await expect.poll(() => mapRequests.get(page)?.length).toBe(2)
    expect(mapRequests.get(page)?.[1].searchParams.get('monthlyMax')).toBe('24000')
  })

  for (const width of [320, 390]) {
    test(`opens mobile filters from deep results at ${width}px and keeps drafts private until applied`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 740 })
      await startFixtureSearch(page, 12)
      const trigger = page.getByTestId('rental-mobile-filters-trigger')
      const dialog = page.getByTestId('rental-mobile-filters-dialog')
      const apply = page.getByTestId('rental-filters-apply')
      const cancel = page.getByTestId('rental-filters-cancel')
      const reset = page.getByTestId('rental-filters-reset')
      const budget = page.getByRole('spinbutton', {
        name: 'Presupuesto mensual máximo ($)',
        exact: true,
      })
      const area = page.getByRole('spinbutton', { name: 'Superficie desde (m²)', exact: true })
      const pets = page.getByRole('checkbox', { name: 'Admite mascotas', exact: true })
      const neighborhoods = page.getByRole('textbox', {
        name: 'Barrios o localidades',
        exact: true,
      })
      const initialUrl = page.url()
      const requestsBeforeEditing = listRequests.get(page)!.length

      // This is a real page scroll across several cards, not a scroll to the form.
      await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(740 * 2)
      const previousScroll = await page.evaluate(() => window.scrollY)
      const previousHeadingTop = await page
        .locator('.rentals-head')
        .evaluate(element => element.getBoundingClientRect().top)
      await expectInsideViewport(trigger, page)
      await openMobileFilters(page)
      await expect(dialog).toHaveAttribute('role', 'dialog')
      await expect
        .poll(() => dialog.evaluate(element => element.contains(document.activeElement)))
        .toBe(true)
      await expect
        .poll(() =>
          page.locator('.rentals-head').evaluate(element => element.getBoundingClientRect().top)
        )
        .toBeCloseTo(previousHeadingTop, 0)
      await expectInsideViewport(cancel, page)
      await expectInsideViewport(apply, page)

      for (const [typed, label] of [
        ['cordon', 'Cordón'],
        ['pocitos', 'Pocitos'],
      ]) {
        await neighborhoods.fill(typed)
        await page.getByRole('option', { name: label, exact: true }).click()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('listbox')).not.toBeVisible()
      }
      await expect(dialog.locator('.rental-search .v-chip')).toContainText(['Cordón', 'Pocitos'])
      await budget.fill('25000')
      await pets.check()
      await openAdvanced(page)
      await area.fill('40')
      await expectInsideViewport(apply, page)
      await expectInsideViewport(cancel, page)
      expect(page.url()).toBe(initialUrl)
      expect(listRequests.get(page)).toHaveLength(requestsBeforeEditing)

      await cancel.click()
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(previousScroll, 0)
      expect(page.url()).toBe(initialUrl)
      await expect(page.locator('.rental-card')).toHaveCount(12)
      expect(listRequests.get(page)).toHaveLength(requestsBeforeEditing)

      await openMobileFilters(page)
      await expect(budget).toHaveValue('')
      await expect(pets).not.toBeChecked()
      await expect(dialog.locator('.rental-search .v-chip')).toHaveCount(0)
      await openAdvanced(page)
      await expect(area).toHaveValue('')

      // Simulate the reduced visible space of a soft keyboard. Desktop Chrome does not show a
      // native phone keyboard, so this checks layout/reachability under an explicit short viewport.
      await budget.focus()
      await page.setViewportSize({ width, height: 360 })
      await budget.fill('25000')
      await expectInsideViewport(budget, page)
      await expectInsideViewport(apply, page)
      await expectInsideViewport(cancel, page)
      await page.setViewportSize({ width, height: 740 })
      for (const [typed, label] of [
        ['cordon', 'Cordón'],
        ['pocitos', 'Pocitos'],
      ]) {
        await neighborhoods.fill(typed)
        await page.getByRole('option', { name: label, exact: true }).click()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('listbox')).not.toBeVisible()
      }
      await pets.check()
      await area.fill('40')
      await page.screenshot({ path: resolve('..', `rentals-e2e-mobile-filters-${width}.png`) })
      await apply.click()
      await expect(dialog).not.toBeVisible()
      await expect(
        page.locator('.rental-card'),
        JSON.stringify(listRequests.get(page)?.map(url => url.search))
      ).toHaveCount(4)
      await expect(page.locator('#rental-results')).toBeFocused()
      await expect
        .poll(() => new URL(page.url()).searchParams.get('neighborhoods'))
        .toBe('Cordón,Pocitos')
      const applied = new URL(page.url()).searchParams
      expect(applied.get('monthlyMax')).toBe('25000')
      expect(applied.get('pets')).toBe('1')
      expect(applied.get('areaMin')).toBe('40')
      expect(listRequests.get(page)).toHaveLength(requestsBeforeEditing + 1)
      expect(mapRequests.get(page)).toHaveLength(0)
      await expectInsideViewport(trigger, page)

      const appliedUrl = page.url()
      await openMobileFilters(page)
      await expect(budget).toHaveValue('25000')
      await expect(pets).toBeChecked()
      await expect(dialog.locator('.rental-search .v-chip')).toContainText(['Cordón', 'Pocitos'])
      await reset.click()
      await expect(budget).toHaveValue('')
      expect(page.url()).toBe(appliedUrl)
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
      expect(page.url()).toBe(appliedUrl)
      await expect(page.locator('.rental-card')).toHaveCount(4)
      expect(listRequests.get(page)).toHaveLength(requestsBeforeEditing + 1)
    })
  }

  test('keeps mobile filters and a wide comparison inside the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await startFixtureSearch(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: resolve('..', 'rentals-e2e-mobile.png') })
    await expect(page.locator('.v-pagination__next')).toBeVisible()
    for (const nextPage of [2, 3]) {
      const nextResponse = page.waitForResponse(response => {
        const url = new URL(response.url())
        return url.pathname === '/api/rentals' && url.searchParams.get('page') === String(nextPage)
      })
      await page.locator('.v-pagination__next button').click()
      await nextResponse
      await expect(page).toHaveURL(new RegExp(`page=${nextPage}`))
      await expect(page.getByText(`Página ${nextPage} de 100`, { exact: true })).toBeVisible()
    }
    for (const item of fixtureProperties) {
      await page
        .getByRole('button', { name: `Guardar propiedad: ${item.title}`, exact: true })
        .click()
    }
    await page.getByRole('button', { name: 'Mis guardados (3)', exact: true }).click()
    await expect(page.locator('.saved-compare-table')).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      )
      .toBe(true)
    const comparison = page.locator('.saved-table-scroll')
    expect(await comparison.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(
      true
    )
    await comparison.focus()
    await expect(comparison).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => comparison.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
    await page.screenshot({ path: resolve('..', 'rentals-e2e-mobile-compare.png') })
    await page.setViewportSize({ width: 320, height: 740 })
    await expect
      .poll(() =>
        page.locator('.rentals').evaluate(element => element.scrollWidth <= element.clientWidth + 1)
      )
      .toBe(true)
    await page.screenshot({ path: resolve('..', 'rentals-e2e-mobile-320.png') })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.screenshot({ path: resolve('..', 'rentals-e2e-mobile-compare-dark.png') })
  })
})
