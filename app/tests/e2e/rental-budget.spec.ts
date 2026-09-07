import { expect, test, type Page, type Locator } from '@playwright/test'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeRentalBudgetQuery,
  RENTAL_BUDGET_BANDS,
  type RentalBudgetQuery,
  type RentalBudgetResponse,
} from '../../utils/rentalBudget'
import type { RentalOffer } from '../../utils/rentals'

const artifactRoot = fileURLToPath(new URL('../../../', import.meta.url))
const path = '/oportunidades-inmobiliarias-uruguay'
const date = '2026-09-06T12:00:00Z'
test.use({ serviceWorkers: 'block', extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })
test.setTimeout(120000)

function response(query: RentalBudgetQuery): RentalBudgetResponse {
  const monthly = query.basis === 'monthly'
  const base = query.band === 'under10000' ? 8500 : 11500
  const known = query.band === 'under10000' ? 9000 : 12000
  const offers = (['infocasas', 'casasweb'] as const).map(
    (source): RentalOffer => ({
      source,
      listingId: `${source}:fixture301`,
      url:
        source === 'infocasas'
          ? 'https://www.infocasas.com.uy/fixture/301'
          : 'https://casasweb.com/fixture301',
      title: 'Apartamento mensual de prueba',
      price: source === 'infocasas' ? base : known,
      priceUyu: source === 'infocasas' ? base : known,
      currency: 'UYU',
      commonExpenses: source === 'infocasas' ? null : 1000,
      commonExpensesCurrency: source === 'infocasas' ? null : 'UYU',
      sellerName: 'Anunciante de prueba',
      sellerType: 'inmobiliaria',
      image: null,
      parkingSpaces: null,
      furnished: null,
      publishedAt: date,
      firstSeen: date,
      lastSeen: date,
      availability: { count: 0, lastReportedAt: null, status: 'unconfirmed' },
    })
  )
  const selected = offers[monthly ? 1 : 0]
  return {
    generatedAt: date,
    usdUyu: 40.725,
    query,
    total: 8,
    page: query.page,
    pages: 1,
    items: Array.from({ length: 8 }, (_, index) => ({
      key: `fixture-${301 + index}`,
      title: `Apartamento mensual ${index + 1}`,
      propertyType: 'apartamento',
      department: query.department || 'Montevideo',
      neighborhood: query.neighborhood || 'Cordón',
      address: 'Chana 1800',
      latitude: null,
      longitude: null,
      bedrooms: 1,
      bathrooms: 1,
      area: 40,
      parkingSpaces: null,
      furnished: null,
      petsAllowed: null,
      guarantees: [],
      price: offers[0].price,
      priceUyu: offers[0].price,
      currency: 'UYU',
      offers,
      matchingOffer: selected,
      sources: ['infocasas', 'casasweb'],
      firstSeen: date,
      lastSeen: date,
      freshAt: date,
      budget: {
        amountUyu: selected.price + (monthly ? 1000 : 0),
        rentUyu: selected.price,
        expensesUyu: monthly ? 1000 : null,
        monthlyUyu: monthly ? selected.price + 1000 : null,
      },
    })),
    bands: RENTAL_BUDGET_BANDS.map(band => ({ ...band, count: 8, pendingExpensesCount: 2 })),
    facets: {
      departments: monthly ? ['Montevideo'] : ['Montevideo', 'Canelones'],
      neighborhoods:
        query.department === 'Canelones' ? (monthly ? [] : ['Las Piedras']) : ['Cordón', 'Centro'],
    },
    pendingExpensesCount: 2,
  }
}

async function navigate(page: Page, target: string) {
  await page.evaluate(async target => {
    const app = (document.getElementById('__nuxt') as any).__vue_app__
    await app.config.globalProperties.$router.push(target)
  }, target)
}
async function setup(page: Page, query = 'mode=budget') {
  // Fixtures are the only permitted mutations, including when testing a deployed frontend.
  await page.route('**/*', route =>
    ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
      ? route.continue()
      : route.abort('blockedbyclient')
  )
  const state = {
    reads: [] as URL[],
    comparisonReads: [] as URL[],
    errors: [] as string[],
    fail: false,
  }
  page.on('pageerror', error => state.errors.push(error.message))
  await page.route('**/api/rentals/budget**', async route => {
    const url = new URL(route.request().url())
    state.reads.push(url)
    if (state.fail)
      return route.fulfill({ status: 503, json: { statusMessage: 'Temporarily unavailable' } })
    return route.fulfill({
      json: response(normalizeRentalBudgetQuery(Object.fromEntries(url.searchParams))),
    })
  })
  await page.route('**/api/property-opportunities**', async route => {
    const url = new URL(route.request().url())
    state.comparisonReads.push(url)
    return route.fulfill({
      json: {
        operation: url.searchParams.get('operation') || 'rent',
        generatedAt: date,
        sourceReadAt: date,
        stale: false,
        currency: 'UYU',
        usdUyu: 40,
        total: 0,
        page: 1,
        pages: 1,
        perPage: 24,
        items: [],
        coverage: [],
        facets: { departments: ['Montevideo'], neighborhoods: ['Cordón'] },
        stats: {
          input: 100,
          eligible: 80,
          analyzed: 40,
          shortlisted: 0,
          qualified: 0,
          excluded: {},
          risks: {},
        },
      },
    })
  })
  await page.goto('/acerca', { waitUntil: 'domcontentloaded', timeout: 90000 })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 60000 })
  await navigate(page, `${path}?${query}`)
  await expect(page.getByTestId('budget-rental-card')).toHaveCount(8)
  return state
}
async function select(page: Page, parent: Locator, label: string, option: string | RegExp) {
  await parent
    .locator('.v-select')
    .filter({ has: page.getByLabel(label, { exact: true }) })
    .locator('.v-field__input')
    .click()
  const choice = page.getByRole('option', { name: option, exact: typeof option === 'string' })
  await choice.click()
  await expect(choice).toBeHidden()
}
async function openFilters(page: Page) {
  await page.getByTestId('budget-filter-trigger').click()
  const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveCSS('opacity', '1')
  await expect(dialog).toHaveCSS('transform', 'none')
  return dialog
}
async function fit(page: Page, dialog: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const button of await dialog.locator('footer button').all()) {
    await expect(button).toBeInViewport()
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
  expect(
    await dialog
      .locator('input')
      .first()
      .evaluate(node => parseFloat(getComputedStyle(node).fontSize))
  ).toBeGreaterThanOrEqual(16)
}

for (const width of [320, 390]) {
  test(`${width}px: compact sticky filters preserve drafts, focus and exact same-advert monthly cost`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
    const state = await setup(page)
    const card = page.getByTestId('budget-rental-card').first()
    await expect(card.locator('.budget-card__price')).toHaveText('$ 8.500')
    await expect(card).toContainText('Gastos no confirmados')
    await expect(card).toContainText('Precio de InfoCasas')
    await expect(page.getByTestId('budget-rentals')).toContainText('US$ 1 = $ 40,725')
    await expect(page.getByTestId('rental-alert-trigger')).toHaveCount(0)
    expect(state.comparisonReads).toHaveLength(0)
    const share = page.getByRole('button', { name: 'Compartir búsqueda', exact: true })
    const introLink = page.locator('.opportunities__intro-links a')
    const shareBox = await share.boundingBox(),
      linkBox = await introLink.boundingBox()
    expect(shareBox!.height).toBeGreaterThanOrEqual(44)
    expect(Math.abs(shareBox!.y - linkBox!.y)).toBeLessThan(3)
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: unknown) => {
          ;(window as any).__budgetShare = data
        },
      })
    )
    await share.click()
    expect(await page.evaluate(() => (window as any).__budgetShare)).toEqual({
      title: 'Alquileres económicos en Uruguay',
      url: page.url(),
    })
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-budget-${width}.png`),
      fullPage: false,
    })
    await page.evaluate(() => scrollTo(0, innerHeight * 3))
    const trigger = page.getByTestId('budget-filter-trigger')
    await expect(trigger).toBeInViewport()
    expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const before = page.url(),
      scroll = await page.evaluate(() => scrollY),
      reads = state.reads.filter(url => url.searchParams.get('perPage') !== '1').length
    let dialog = await openFilters(page)
    await fit(page, dialog)
    await select(page, dialog, 'Precio de la franja', 'Alquiler + gastos conocidos')
    expect(page.url()).toBe(before)
    expect(state.reads.filter(url => url.searchParams.get('perPage') !== '1')).toHaveLength(reads)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    expect(Math.abs((await page.evaluate(() => scrollY)) - scroll)).toBeLessThan(4)
    dialog = await openFilters(page)
    await expect(dialog).toContainText('Sólo alquiler')
    await select(page, dialog, 'Precio de la franja', 'Alquiler + gastos conocidos')
    await page.setViewportSize({ width, height: 390 })
    await fit(page, dialog)
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-budget-filters-${width}.png`),
      fullPage: false,
    })
    await dialog.getByRole('button', { name: 'Ver resultados', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/basis=monthly/)
    await expect(card.locator('.budget-card__price')).toHaveText('$ 10.000')
    await expect(card).toContainText('Precio de Casasweb')
    await expect(card.locator('.budget-card__costs')).toContainText('$ 9.000')
    await expect(card.locator('.budget-card__costs')).toContainText('$ 1.000')
    await expect(card).not.toContainText('Gastos no confirmados')
    expect(state.reads.filter(url => url.searchParams.get('perPage') !== '1')).toHaveLength(
      reads + 1
    )
    expect(state.errors).toEqual([])
  })
}

test('bands, applied geography and browser Back remain shareable; active mode never clears them', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(
    page,
    'mode=budget&department=Montevideo&neighborhood=Cord%C3%B3n&availability=hide_any'
  )
  const ui = page.getByTestId('budget-rentals')
  await select(page, ui, 'Franja ($)', /Más de \$ 10\.000 a \$ 13\.000/)
  await expect(page).toHaveURL(/band=10000_13000/)
  const bandUrl = page.url()
  await page
    .getByRole('navigation', { name: 'Cómo buscar alquileres' })
    .getByRole('link', { name: 'Alquileres económicos' })
    .click()
  expect(page.url()).toBe(bandUrl)
  await expect(ui).toContainText('Cordón')
  const dialog = await openFilters(page)
  await select(page, dialog, 'Precio de la franja', 'Alquiler + gastos conocidos')
  await dialog.getByRole('button', { name: 'Ver resultados', exact: true }).click()
  await expect(page).toHaveURL(/basis=monthly/)
  await expect(
    page.getByTestId('budget-rental-card').first().locator('.budget-card__price')
  ).toHaveText('$ 13.000')
  await page.goBack()
  await expect(page).toHaveURL(bandUrl)
  await expect(
    page.getByTestId('budget-rental-card').first().locator('.budget-card__price')
  ).toHaveText('$ 11.500')
  const reopened = await openFilters(page)
  await expect(reopened).toContainText('Sólo alquiler')
  await reopened.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await expect(page).toHaveURL(/band=under10000$/)
  await expect(ui.locator('.budget-chips')).toHaveCount(0)
})

test('draft base-rent facets reveal locations excluded from the applied known-monthly view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, 'mode=budget&basis=monthly')
  const before = page.url()
  const dialog = await openFilters(page)
  await select(page, dialog, 'Precio de la franja', 'Sólo alquiler')
  await expect
    .poll(() =>
      state.reads.some(
        url => url.searchParams.get('perPage') === '1' && !url.searchParams.has('basis')
      )
    )
    .toBe(true)
  await select(page, dialog, 'Departamento', 'Canelones')
  const neighborhood = dialog.getByLabel('Barrio o localidad', { exact: true })
  await neighborhood.fill('Las')
  await page.getByRole('option', { name: 'Las Piedras', exact: true }).click()
  expect(page.url()).toBe(before)
  expect(state.reads.filter(url => url.searchParams.get('perPage') !== '1')).toHaveLength(1)
  await expect(page.getByTestId('budget-rental-card').first()).toContainText('Precio de Casasweb')
  await dialog.getByRole('button', { name: 'Ver resultados', exact: true }).click()
  await expect(page).toHaveURL(/department=Canelones/)
  await expect(page).not.toHaveURL(/basis=monthly/)
  await expect(page).toHaveURL(/neighborhood=Las\+Piedras|neighborhood=Las%20Piedras/)
  await expect(page.getByTestId('budget-rental-card').first()).toContainText('Las Piedras')
  await expect(page.getByTestId('budget-rental-card').first()).toContainText(
    'Gastos no confirmados'
  )
  const last = state.reads.filter(url => url.searchParams.get('perPage') !== '1').at(-1)!
  expect(last.searchParams.get('department')).toBe('Canelones')
  expect(last.searchParams.has('basis')).toBe(false)
  expect(state.errors).toEqual([])
})

test('desktop sidebar, failed read retry and sale comparison remain separate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const state = await setup(page)
  await expect(page.locator('.budget-sidebar')).toBeVisible()
  await expect(page.getByTestId('budget-filter-trigger')).toHaveCount(0)
  state.fail = true
  await select(
    page,
    page.getByTestId('budget-rentals'),
    'Franja de precio en pesos',
    /Más de \$ 10\.000 a \$ 13\.000/
  )
  await expect(page.getByRole('alert')).toContainText('No pudimos consultar')
  await expect(page.getByTestId('budget-rental-card')).toHaveCount(0)
  state.fail = false
  await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click()
  await expect(page.getByTestId('budget-rental-card')).toHaveCount(8)
  await page.screenshot({ path: resolve(artifactRoot, '.sdd-budget-desktop.png'), fullPage: false })
  await navigate(page, `${path}?operation=sale&mode=budget`)
  await expect(page.getByTestId('budget-rentals')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Cómo buscar alquileres' })).toHaveCount(0)
  await expect(page.locator('.opportunities__workspace')).toBeVisible()
  expect(state.comparisonReads.some(url => url.searchParams.get('operation') === 'sale')).toBe(true)
  expect(state.errors).toEqual([])
})
