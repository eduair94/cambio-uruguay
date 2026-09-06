import { expect, test, type Page, type Locator } from '@playwright/test'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const artifactRoot = fileURLToPath(new URL('../../../', import.meta.url))

test.use({ serviceWorkers: 'block', extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })
test.setTimeout(120000)

// All reports and account requests are intercepted. No real user or advert is modified.
const iso = '2026-09-06T12:00:00.000Z'
const firstRevision = '00000000-0000-4000-8000-000000000001'
const nextRevision = '00000000-0000-4000-8000-000000000002'
const summary = (count: number) => ({
  count,
  lastReportedAt: count ? iso : null,
  status: 'unconfirmed',
})
const ownState = () => ({
  reported: false,
  canReport: true,
  expiresAt: null as string | null,
  revision: null as string | null,
})

async function setup(page: Page) {
  // The specific API fixtures below take precedence. Nothing else may write to a real service,
  // including when this suite verifies the deployed frontend.
  await page.route('**/*', route =>
    ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
      ? route.continue()
      : route.abort('blockedbyclient')
  )
  const state = {
    counts: { infocasas: 1, casasweb: 1 },
    own: { infocasas: ownState(), casasweb: ownState() },
    writes: [] as { method: string; input: any }[],
    publicReads: [] as URL[],
    listReads: [] as URL[],
    conflict: false,
    failure: '',
    accountError: '',
  }
  function property(filter = 'all') {
    const offers = (['infocasas', 'casasweb'] as const)
      .map(source => ({
        source,
        listingId: `${source}:fixture301`,
        url:
          source === 'infocasas'
            ? 'https://www.infocasas.com.uy/fixture/301'
            : 'https://casasweb.com/fixture301',
        title: source === 'infocasas' ? 'Unidad 301 con terraza' : 'Apartamento 301 disponible',
        price: source === 'infocasas' ? 28000 : 29000,
        priceUyu: source === 'infocasas' ? 28000 : 29000,
        currency: 'UYU',
        commonExpenses: 1000,
        commonExpensesCurrency: 'UYU',
        sellerName: 'Anunciante de prueba',
        sellerType: 'inmobiliaria',
        image: null,
        parkingSpaces: 1,
        furnished: null,
        publishedAt: iso,
        firstSeen: iso,
        lastSeen: iso,
        availability: summary(state.counts[source]),
      }))
      .filter(offer =>
        filter === 'hide_any'
          ? offer.availability.count === 0
          : filter === 'hide_multiple'
            ? offer.availability.count < 2
            : true
      )
    return {
      key: 'fixture-301',
      title: 'Apartamento de prueba en Cordón',
      propertyType: 'apartamento',
      department: 'Montevideo',
      neighborhood: 'Cordón',
      address: 'Chana 1800 unidad 301',
      latitude: -34.907,
      longitude: -56.179,
      bedrooms: 1,
      bathrooms: 1,
      area: 55,
      parkingSpaces: 1,
      furnished: null,
      petsAllowed: true,
      guarantees: ['anda'],
      price: offers[0]?.price || 28000,
      priceUyu: offers[0]?.price || 28000,
      currency: 'UYU',
      offers,
      matchingOffer: offers[0],
      sources: offers.map(offer => offer.source),
      freshAt: iso,
      firstSeen: iso,
      lastSeen: iso,
      availability: summary(offers.reduce((total, offer) => total + offer.availability.count, 0)),
    }
  }
  await page.route('**/api/me/**', async route => {
    const url = new URL(route.request().url()),
      method = route.request().method()
    if (url.pathname.includes('/rental-alerts'))
      return route.fulfill({
        json: {
          items: [],
          capabilities: {
            accountEligible: false,
            emailAvailable: false,
            emailVerified: false,
            email: null,
            pushAvailable: false,
            pushRegistered: false,
          },
          limit: 10,
        },
      })
    if (!url.pathname.includes('/rental-availability')) return route.fulfill({ json: [] })
    const input =
      method === 'POST' ? route.request().postDataJSON() : Object.fromEntries(url.searchParams)
    const source = input.source as 'infocasas' | 'casasweb'
    if (method === 'GET') {
      if (state.accountError)
        return route.fulfill({ status: 403, json: { data: { code: state.accountError } } })
      return route.fulfill({ json: state.own[source] })
    }
    state.writes.push({ method, input })
    if (state.failure)
      return route.fulfill({
        status: state.failure === 'rate_limited' ? 429 : 503,
        json: { data: { code: state.failure } },
      })
    if (state.conflict) {
      state.conflict = false
      state.own[source] = {
        reported: true,
        canReport: false,
        expiresAt: '2026-10-06T12:00:00Z',
        revision: nextRevision,
      }
      return route.fulfill({ status: 409, json: { data: { code: 'report_changed' } } })
    }
    const reported = method === 'POST'
    state.counts[source] += reported ? 1 : -1
    state.own[source] = {
      reported,
      canReport: !reported,
      expiresAt: '2026-10-06T12:00:00Z',
      revision: reported ? firstRevision : nextRevision,
    }
    return route.fulfill({ json: { ...state.own[source], summary: summary(state.counts[source]) } })
  })
  await page.route('**/api/rentals**', async route => {
    const url = new URL(route.request().url())
    const filter = url.searchParams.get('availability') || 'all'
    if (url.pathname.includes('/availability')) {
      state.publicReads.push(url)
      expect([...url.searchParams.keys()].sort()).toEqual(['listingId', 'source'])
      return route.fulfill({
        json: {
          summary: summary(
            state.counts[url.searchParams.get('source') as 'infocasas' | 'casasweb']
          ),
          currentPropertyKey: 'fixture-301',
        },
      })
    }
    const item = property(filter)
    if (url.pathname.includes('/ficha/'))
      return route.fulfill({
        json: {
          property: property(),
          usdUyu: 41.5,
          canonicalPath: '/alquileres/fixture-301',
          seo: { indexable: false, reasons: ['fixture'], contentUpdatedAt: null },
          market: {
            status: 'insufficient',
            minimumSample: 10,
            sampleSize: 0,
            medianRentUyu: null,
            p25RentUyu: null,
            p75RentUyu: null,
            differencePercent: null,
            scope: null,
          },
          similar: [],
        },
      })
    if (url.pathname.includes('/propiedad/'))
      return route.fulfill({ json: { property: item, usdUyu: 41.5 } })
    if (url.pathname.endsWith('/mapa'))
      return route.fulfill({
        json: {
          points: [
            {
              key: item.key,
              lat: item.latitude,
              lng: item.longitude,
              price: item.price,
              currency: 'UYU',
              bedrooms: 1,
              area: 55,
              neighborhood: item.neighborhood,
              offers: item.offers.length,
              url: item.offers[0]?.url,
              availability: item.availability,
            },
          ],
          total: 1,
          located: 1,
          shown: 1,
          limit: 1500,
        },
      })
    state.listReads.push(url)
    return route.fulfill({
      json: {
        meta: null,
        coverage: null,
        items: item.offers.length ? [item] : [],
        total: item.offers.length ? 1 : 0,
        page: 1,
        perPage: 24,
        medianUyu: 28000,
        facets: {
          departments: [{ value: 'Montevideo', count: 1 }],
          neighborhoods: [{ value: 'Cordón', count: 1 }],
          types: [{ value: 'apartamento', count: 1 }],
          sources: [
            { value: 'infocasas', count: 1 },
            { value: 'casasweb', count: 1 },
          ],
          priceMaxUyu: 29000,
        },
      },
    })
  })
  await page.route('**/api/property-opportunities**', async route => {
    const operation =
      new URL(route.request().url()).searchParams.get('operation') === 'sale' ? 'sale' : 'rent'
    const item = property(),
      price = operation === 'rent' ? 29000 : 160000
    const subject = {
      ...item.offers[0],
      id: `${operation}:infocasas:fixture301`,
      operation,
      propertyKey: item.key,
      propertyType: 'apartamento',
      department: 'Montevideo',
      locality: 'Montevideo',
      neighborhood: 'Cordón',
      bedrooms: 1,
      bathrooms: 1,
      area: { value: 55, basis: 'built' },
      price: { amount: price, currency: operation === 'rent' ? 'UYU' : 'USD' },
      expenses: null,
      comparisonPrice: price,
    }
    const analysis = {
      pricingBasis: operation === 'rent' ? 'monthly_total' : 'asking_price',
      currency: subject.price.currency,
      median: price * 1.3,
      q25: price * 1.2,
      q75: price * 1.4,
      spread: 0.1,
      gapPct: 20,
      conservativeGapPct: 15,
      distinctN: 12,
      sellersN: 6,
      sources: ['infocasas'],
      oldestLastSeen: iso,
      newestLastSeen: iso,
      areaBasis: 'built',
      areaMin: 50,
      areaMax: 60,
      confidence: 'supported',
    }
    return route.fulfill({
      json: {
        operation,
        generatedAt: iso,
        sourceReadAt: iso,
        stale: false,
        currency: subject.price.currency,
        usdUyu: 40,
        total: 1,
        page: 1,
        perPage: 24,
        pages: 1,
        items: [{ subject, analysis, comparables: [], cautions: ['availability_unverified'] }],
        stats: {
          input: 100,
          eligible: 80,
          analyzed: 40,
          shortlisted: 1,
          qualified: 1,
          excluded: {},
          risks: {},
        },
        coverage: [],
        facets: { departments: ['Montevideo'], neighborhoods: ['Cordón'] },
      },
    })
  })
  await page.goto('/acerca', { waitUntil: 'domcontentloaded', timeout: 90000 })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 60000 })
  await navigate(page, '/alquileres-uruguay?department=Montevideo')
  await expect(page.locator('.rental-card')).toHaveCount(1)
  return state
}
async function navigate(page: Page, path: string) {
  await page.evaluate(async path => {
    const app = (document.getElementById('__nuxt') as any).__vue_app__
    await app.config.globalProperties.$router.push(path)
  }, path)
}
async function signIn(page: Page) {
  await page.evaluate(() => {
    const auth = (
      document.getElementById('__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('auth')
    auth.setUser({
      uid: 'intercepted-availability-user',
      email: 'fixture@example.invalid',
      emailVerified: true,
    })
    auth.getToken = async () => 'intercepted-availability-token'
  })
}
const reportDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Reportar disponibilidad', exact: true })
async function openReport(page: Page, parent: Page | Locator = page) {
  await parent.getByTestId('rental-availability-report').first().getByRole('button').first().click()
  const dialog = reportDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(0)
  return dialog
}
async function select(page: Page, parent: Locator, label: string, option: string | RegExp) {
  await parent
    .locator('.v-select')
    .filter({ has: page.getByLabel(label, { exact: true }) })
    .locator('.v-field__input')
    .click()
  await page.getByRole('option', { name: option }).click()
}
async function closeReport(page: Page) {
  await reportDialog(page).getByRole('button', { name: 'Cerrar', exact: true }).last().click()
  await expect(reportDialog(page)).toBeHidden()
}
async function mobileFit(page: Page, dialog: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const button of await dialog.locator('footer button').all()) {
    await expect(button).toBeInViewport()
    const box = await button.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
}

test('320px: no passive requests, unconfirmed unique count, explicit source and recoverable sign-in', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 })
  const state = await setup(page)
  expect(state.publicReads).toHaveLength(0)
  await expect(page.getByText('Informado por 2 usuarios', { exact: true })).toBeVisible()
  const dialog = await openReport(page)
  await expect(dialog.getByText(/durante 30 días/)).toBeVisible()
  await expect(dialog.locator('.availability-dialog__sources')).toContainText(
    'InfoCasas: 1 usuario'
  )
  await expect(dialog.locator('.availability-dialog__sources')).toContainText('Casasweb: 1 usuario')
  await expect(dialog.getByRole('link', { name: 'Consultar anuncio original' })).toHaveAttribute(
    'href',
    /infocasas/
  )
  await mobileFit(page, dialog)
  const login = dialog.getByRole('button', { name: 'Iniciar sesión para informar' })
  await expect(login).toBeInViewport()
  expect((await login.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await page.screenshot({
    path: resolve(artifactRoot, '.sdd-availability-guest-320.png'),
    fullPage: false,
  })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(
    page.getByTestId('rental-availability-report').first().getByRole('button')
  ).toBeFocused()
  await openReport(page)
  await reportDialog(page).getByRole('button', { name: 'Iniciar sesión para informar' }).click()
  expect(state.writes).toHaveLength(0)
  await expect(reportDialog(page)).toBeHidden()
})

test('390px: report chosen advert, then withdraw without renewing or duplicating', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page)
  await signIn(page)
  const dialog = await openReport(page)
  await select(page, dialog, 'Anuncio al que se refiere tu reporte', /Casasweb/)
  await dialog
    .getByRole('button', { name: 'Informar como posiblemente alquilado', exact: true })
    .click()
  await expect(dialog.getByRole('status')).toHaveText('Tu reporte quedó registrado.')
  expect(state.writes).toEqual([
    {
      method: 'POST',
      input: { source: 'casasweb', listingId: 'casasweb:fixture301', revision: null },
    },
  ])
  expect(state.listReads.at(-1)!.searchParams.has('availabilityRevision')).toBe(false)
  await closeReport(page)
  await expect
    .poll(() => state.listReads.at(-1)!.searchParams.has('availabilityRevision'))
    .toBe(true)
  await expect(page.getByText('Informado por 3 usuarios', { exact: true })).toBeVisible()
  await openReport(page)
  await select(page, dialog, 'Anuncio al que se refiere tu reporte', /Casasweb/)
  await expect(dialog.getByRole('button', { name: 'Retirar mi reporte' })).toBeEnabled()
  await mobileFit(page, dialog)
  await page.screenshot({
    path: resolve(artifactRoot, '.sdd-availability-own-390.png'),
    fullPage: false,
  })
  await dialog.getByRole('button', { name: 'Retirar mi reporte' }).click()
  await expect(dialog.getByRole('status')).toHaveText('Retiraste tu reporte.')
  expect(state.writes[1]).toEqual({
    method: 'DELETE',
    input: { source: 'casasweb', listingId: 'casasweb:fixture301', revision: firstRevision },
  })
  await closeReport(page)
  expect(new URL(page.url()).searchParams.has('availabilityRevision')).toBe(false)
  await expect(page.getByText('Informado por 2 usuarios', { exact: true })).toBeVisible()
})

test('390px: CAS conflict refreshes state, rate limit preserves explicit retry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page)
  await signIn(page)
  const dialog = await openReport(page)
  state.conflict = true
  await dialog
    .getByRole('button', { name: 'Informar como posiblemente alquilado', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('El estado de tu reporte cambió')
  expect(state.writes).toHaveLength(1)
  await expect(dialog.getByRole('button', { name: 'Retirar mi reporte' })).toBeEnabled()
  state.failure = 'rate_limited'
  await dialog.getByRole('button', { name: 'Retirar mi reporte' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Esperá un momento')
  expect(state.writes).toHaveLength(2)
  await closeReport(page)
})

test('320px: availability filter remains draft until applied and appears in alert summary', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 })
  const state = await setup(page)
  const trigger = page.getByTestId('rental-mobile-filters-trigger')
  await trigger.click()
  const drawer = page.getByTestId('rental-mobile-filters-dialog')
  await drawer.getByTestId('rental-advanced-toggle').click()
  await select(page, drawer, 'Reportes de disponibilidad', 'Ocultar anuncios con algún reporte')
  expect(new URL(page.url()).searchParams.has('availability')).toBe(false)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page.locator('.rental-card')).toHaveCount(1)
  await trigger.click()
  await drawer.getByTestId('rental-advanced-toggle').click()
  await expect(
    drawer
      .locator('.v-select')
      .filter({ has: page.getByLabel('Reportes de disponibilidad', { exact: true }) })
  ).toContainText('Mostrar todos')
  await select(
    page,
    drawer,
    'Reportes de disponibilidad',
    'Ocultar anuncios con reportes de 2 o más usuarios'
  )
  await drawer.getByTestId('rental-filters-apply').click()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('availability'))
    .toBe('hide_multiple')
  await expect(page.locator('.rental-card')).toHaveCount(1)
  await page.getByTestId('rental-alert-trigger').first().click()
  const alert = page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
  await expect(alert).toContainText('Ocultar anuncios con reportes de 2 o más usuarios')
  expect(state.writes).toHaveLength(0)
})

test('390px: detail and map expose the same report action without intercepting source links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page)
  await page.locator('.rental-card h3 a').click()
  await expect(page).toHaveURL(/\/alquileres\/fixture-301/)
  let dialog = await openReport(page)
  await expect(dialog.getByRole('link', { name: 'Consultar anuncio original' })).toHaveAttribute(
    'href',
    /infocasas/
  )
  await closeReport(page)
  await navigate(page, '/alquileres-uruguay?view=mapa')
  await page.locator('.leaflet-marker-icon').first().click()
  const panel = page.locator('.rental-map-detail')
  await expect(panel).toBeVisible()
  dialog = await openReport(page, panel)
  await expect(dialog.locator('.availability-dialog__sources')).toContainText('Casasweb')
  await mobileFit(page, dialog)
  await closeReport(page)
  expect(state.writes).toHaveLength(0)
})

test('1440px: an anonymous account rejected by the API can sign in without reporting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const state = await setup(page)
  state.accountError = 'account_required'
  await page.evaluate(() => {
    const auth = (
      document.getElementById('__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('auth')
    auth.setUser({ uid: 'intercepted-guest-user', email: null })
    auth.getToken = async () => 'intercepted-guest-token'
  })
  const dialog = await openReport(page)
  await expect(dialog.getByRole('button', { name: 'Iniciar sesión para informar' })).toBeEnabled()
  await expect(
    dialog.getByRole('button', { name: 'Informar como posiblemente alquilado', exact: true })
  ).toHaveCount(0)
  await mobileFit(page, dialog)
  await page.screenshot({
    path: resolve(artifactRoot, '.sdd-availability-guest-1440.png'),
    fullPage: false,
  })
  await dialog.getByRole('button', { name: 'Iniciar sesión para informar' }).click()
  expect(state.writes).toHaveLength(0)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            document.getElementById('__nuxt') as any
          ).__vue_app__.config.globalProperties.$pinia._s.get('auth').dialogOpen
      )
    )
    .toBe(true)
})

test('390px: an eligible custom account without email follows the server capability', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page)
  await page.evaluate(() => {
    const auth = (
      document.getElementById('__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('auth')
    auth.setUser({ uid: 'intercepted-custom-user', email: null })
    auth.getToken = async () => 'intercepted-custom-token'
  })
  const dialog = await openReport(page)
  await expect(dialog.getByRole('button', { name: 'Iniciar sesión para informar' })).toHaveCount(0)
  await expect(
    dialog.getByText('¿Tenés información de que este anuncio podría estar alquilado?', {
      exact: true,
    })
  ).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: 'Informar como posiblemente alquilado', exact: true })
  ).toBeEnabled()
  await closeReport(page)
  state.own.infocasas = {
    reported: true,
    canReport: false,
    expiresAt: '2026-10-06T12:00:00Z',
    revision: firstRevision,
  }
  await openReport(page)
  await expect(
    dialog.getByText('Ya informaste este anuncio. Podés retirar tu reporte.', { exact: true })
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Retirar mi reporte' })).toBeEnabled()
  await page.screenshot({
    path: resolve(artifactRoot, '.sdd-availability-own-neutral-390.png'),
    fullPage: false,
  })
  expect(state.writes).toHaveLength(0)
})

test('320px: rental opportunities expose reports and filter; sale does not', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 })
  await setup(page)
  await navigate(
    page,
    '/oportunidades-inmobiliarias-uruguay?operation=rent&availability=hide_multiple'
  )
  await expect(page.getByTestId('opportunity-card')).toHaveCount(1)
  await openReport(page)
  await closeReport(page)
  await page.getByTestId('opportunity-filter-trigger').click()
  const drawer = page.getByRole('dialog', { name: 'Filtros', exact: true })
  await expect(drawer.getByLabel('Reportes de disponibilidad', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await navigate(page, '/oportunidades-inmobiliarias-uruguay?operation=sale')
  await expect(page.getByTestId('opportunity-card')).toHaveCount(1)
  await expect(page.getByTestId('rental-availability-report')).toHaveCount(0)
  await page.getByTestId('opportunity-filter-trigger').click()
  await expect(drawer.getByLabel('Reportes de disponibilidad', { exact: true })).toHaveCount(0)
})

test('local preview: fresh small screens show real seeded reports without writes', async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.RENTAL_AVAILABILITY_LOCAL_QA !== '1',
    'Requires the isolated local QA database'
  )
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      baseURL,
      viewport,
      serviceWorkers: 'block',
      extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
    })
    const page = await context.newPage()
    const writes: string[] = []
    const errors: string[] = []
    page.on('request', request => {
      if (request.url().includes('/rental-availability') && request.method() !== 'GET')
        writes.push(request.method())
    })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/alquileres-uruguay', { waitUntil: 'domcontentloaded', timeout: 90000 })
    const consent = page.getByTestId('cookie-consent-inline')
    await expect(consent).toBeVisible()
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-availability-local-first-${viewport.width}.png`),
      fullPage: false,
    })
    await expect(async () => {
      await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
      await expect(consent).toBeHidden({ timeout: 1000 })
    }).toPass({ timeout: 60000 })
    await expect(page.locator('.rental-card')).toHaveCount(3)
    await page.evaluate(() => scrollTo(0, innerHeight * 2))
    const trigger = page.getByTestId('rental-mobile-filters-trigger')
    await expect(trigger).toBeInViewport()
    await trigger.click()
    const drawer = page.getByTestId('rental-mobile-filters-dialog')
    await drawer.getByTestId('rental-advanced-toggle').click()
    const filter = drawer
      .locator('.v-select')
      .filter({ has: page.getByLabel('Reportes de disponibilidad', { exact: true }) })
    await filter.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-availability-local-filters-${viewport.width}.png`),
      fullPage: false,
    })
    await page.keyboard.press('Escape')
    const card = page
      .locator('.rental-card')
      .filter({ has: page.locator('a[href*="qa-otra-publicacion"]') })
    await expect(card).toHaveCount(1)
    const dialog = await openReport(page, card)
    await expect(dialog.locator('.availability-dialog__sources')).toContainText(
      'Sin reportes vigentes'
    )
    await mobileFit(page, dialog)
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-availability-local-dialog-${viewport.width}.png`),
      fullPage: false,
    })
    await closeReport(page)
    expect(writes).toEqual([])
    expect(errors).toEqual([])
    await context.close()
  }
})
