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
  if (url.searchParams.has('refLat') && url.searchParams.has('refLng')) {
    items.forEach((item, index) => {
      item.distanceKm = index === items.length - 1 ? null : 0.8 + index
    })
  }
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
  const state = {
    reads: [] as URL[],
    mapReads: [] as URL[],
    geocodeReads: [] as URL[],
    errors: [] as string[],
  }
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
  await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\//, route =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    })
  )
  await page.route(/\/api\/rentals\/geocode(?:\?|$)/, route => {
    state.geocodeReads.push(new URL(route.request().url()))
    return route.fulfill({
      json: {
        items: [
          {
            label: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO',
            lat: -34.88974051732336,
            lng: -56.1768286423287,
          },
        ],
        source: 'IDE Uruguay',
      },
    })
  })
  await page.route(/\/api\/rentals(?:\/mapa)?(?:\?|$)/, async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/mapa')) {
      state.mapReads.push(url)
      // An empty located subset must still allow selecting a reference point.
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

async function chooseType(
  page: Page,
  form: Locator,
  label: 'Viviendas' | 'Oficinas' | 'Garajes',
  selected = true
) {
  // Selected chips consume clicks; use the dropdown affordance beside them.
  await form.getByTestId('rental-filter-type').locator('.v-field__append-inner').click()
  await page.getByRole('option', { name: label, exact: true }).click()
  await page.keyboard.press('Escape')
  if (selected) await expect(form.getByTestId('rental-filter-type')).toContainText(label)
  else await expect(form.getByTestId('rental-filter-type')).not.toContainText(label)
}

async function changeRentalView(page: Page, mobile: boolean, next: 'Mapa' | 'Lista') {
  const container = mobile
    ? page.getByTestId('rental-mobile-toolbar')
    : page.locator('.rentals-toolbar')
  await container.getByRole('button', { name: next, exact: true }).click()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('view'))
    .toBe(next === 'Mapa' ? 'mapa' : null)
}

for (const mobile of [true, false]) {
  test(`${mobile ? '390px mobile' : 'desktop'}: homes and offices are separate, applied filters persist across views`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mobile ? 390 : 1366, height: mobile ? 844 : 900 })
    const state = await setup(page, 'department=Montevideo&pets=1')
    const originalUrl = page.url()
    const originalReads = state.reads.length
    let form = mobile ? await openFilters(page) : page.locator('.rental-search--sidebar')
    await expect(form.getByTestId('rental-filter-type')).toBeInViewport()
    await chooseType(page, form, 'Viviendas')
    expect(page.url()).toBe(originalUrl)
    expect(state.reads.length).toBe(originalReads)
    if (mobile) {
      await form.getByTestId('rental-filters-cancel').click()
      await expect(form).toBeHidden()
      expect(page.url()).toBe(originalUrl)
      form = await openFilters(page)
      await expect(form.getByTestId('rental-filter-type')).not.toContainText('Viviendas')
      await chooseType(page, form, 'Viviendas')
    }
    await form.getByTestId('rental-filters-apply').click()
    if (mobile) await expect(form).toBeHidden()
    await expect.poll(() => new URL(page.url()).searchParams.get('type')).toBe('vivienda')
    await expect(page.locator('.rentals-chips')).toContainText('Viviendas')
    expect(new URL(page.url()).searchParams.get('department')).toBe('Montevideo')
    expect(new URL(page.url()).searchParams.get('pets')).toBe('1')
    await changeRentalView(page, mobile, 'Mapa')
    await expect.poll(() => state.mapReads.at(-1)?.searchParams.get('type')).toBe('vivienda')
    await changeRentalView(page, mobile, 'Lista')
    form = mobile ? await openFilters(page) : page.locator('.rental-search--sidebar')
    await expect(form.getByTestId('rental-filter-type')).toContainText('Viviendas')
    await chooseType(page, form, 'Oficinas')
    await chooseType(page, form, 'Garajes')
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-rentals-multiple-types-${mobile ? '390' : '1366'}.png`),
    })
    await chooseType(page, form, 'Garajes', false)
    await form.getByTestId('rental-filters-apply').click()
    if (mobile) await expect(form).toBeHidden()
    await expect.poll(() => new URL(page.url()).searchParams.get('types')).toBe('oficina,vivienda')
    expect(new URL(page.url()).searchParams.get('type')).toBeNull()
    await expect(page.locator('.rentals-chips')).toContainText('Viviendas')
    await expect(page.locator('.rentals-chips')).toContainText('Oficina')
    await expect.poll(() => state.reads.at(-1)?.searchParams.get('types')).toBe('oficina,vivienda')
    form = mobile ? await openFilters(page) : page.locator('.rental-search--sidebar')
    await chooseType(page, form, 'Viviendas', false)
    await form.getByTestId('rental-filters-apply').click()
    if (mobile) await expect(form).toBeHidden()
    await expect.poll(() => new URL(page.url()).searchParams.get('type')).toBe('oficina')
    await expect(page.locator('.rentals-chips')).toContainText('Oficina')
    await expect(page.locator('.rentals-chips')).not.toContainText('Viviendas')
    await expect.poll(() => state.reads.at(-1)?.searchParams.get('type')).toBe('oficina')
    await page.goBack()
    await expect.poll(() => new URL(page.url()).searchParams.get('types')).toBe('oficina,vivienda')
    await expect(page.locator('.rentals-chips')).toContainText('Viviendas')
    await page.goForward()
    await expect.poll(() => new URL(page.url()).searchParams.get('type')).toBe('oficina')
    await expect(page.locator('.rentals-chips')).toContainText('Oficina')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(state.errors).toEqual([])
  })

  test(`${mobile ? '390px mobile map click' : 'desktop keyboard map center'}: nearest sorting preserves filters and reference edits remain explicit`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mobile ? 390 : 1366, height: mobile ? 844 : 900 })
    const state = await setup(page, 'department=Montevideo&type=vivienda&pets=1')
    await page.locator('.rentals-sort').getByRole('combobox').click()
    await page.getByRole('option', { name: 'Más cerca', exact: true }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('mapa')
    const map = page.locator('.rentals-map__frame .leaflet-container')
    await expect(map).toBeVisible()
    // No indexed points is not the same thing as no map to choose a reference.
    await expect(page.locator('.rentals-map__coverage')).toContainText('0')
    const useCenter = page.getByRole('button', { name: 'Usar centro del mapa', exact: true })
    await expect(useCenter).toBeEnabled()
    const apply = page.getByTestId('rental-point-apply')
    await expect(apply).toBeDisabled()
    if (mobile) {
      const box = await map.boundingBox()
      expect(box).not.toBeNull()
      await map.click({ position: { x: box!.width / 2, y: box!.height / 2 } })
    } else {
      // The center shortcut is operable without placing a precise mouse/touch point.
      await useCenter.focus()
      await page.keyboard.press('Enter')
    }
    await expect(apply).toBeEnabled()
    expect(new URL(page.url()).searchParams.get('refLat')).toBeNull()
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-rentals-point-selection-${mobile ? '390' : '1366'}.png`),
    })
    await apply.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('distancia')
    await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBeNull()
    let selectedUrl = page.url()
    const selected = new URL(selectedUrl).searchParams
    expect(Number(selected.get('refLat'))).toBeGreaterThan(-35.9)
    expect(Number(selected.get('refLat'))).toBeLessThan(-30)
    expect(Number(selected.get('refLng'))).toBeGreaterThan(-58.6)
    expect(Number(selected.get('refLng'))).toBeLessThan(-53)
    for (const [key, value] of [
      ['department', 'Montevideo'],
      ['type', 'vivienda'],
      ['pets', '1'],
    ]) {
      expect(selected.get(key)).toBe(value)
      await expect.poll(() => state.reads.at(-1)?.searchParams.get(key)).toBe(value)
    }
    await expect(page.getByTestId('rental-card-distance').first()).toContainText('≈ 0,8 km')
    await expect(page.getByTestId('rental-card-distance').last()).toContainText(
      'Distancia sin datos'
    )
    await expect(page.getByTestId('rental-reference')).toContainText('línea recta')
    await expect(page.getByTestId('rental-reference')).toContainText('no recorridos por calle')
    await page.screenshot({
      path: resolve(artifactRoot, `.sdd-rentals-distance-results-${mobile ? '390' : '1366'}.png`),
    })

    await page
      .getByTestId('rental-reference')
      .getByRole('button', { name: 'Cambiar punto', exact: true })
      .click()
    await expect(map).toBeVisible()
    await expect(useCenter).toBeEnabled()
    const box = await map.boundingBox()
    await map.click({ position: { x: box!.width / 2 + 16, y: box!.height / 2 - 16 } })
    await expect(apply).toBeEnabled()
    // Choosing a candidate is a draft: cancellation leaves the committed URL intact.
    expect(new URL(page.url()).searchParams.get('refLat')).toBe(selected.get('refLat'))
    expect(new URL(page.url()).searchParams.get('refLng')).toBe(selected.get('refLng'))
    await page
      .locator('.rentals-map__point-controls')
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click()
    await expect(apply).toBeHidden()
    expect(new URL(page.url()).searchParams.get('refLat')).toBe(selected.get('refLat'))
    expect(new URL(page.url()).searchParams.get('refLng')).toBe(selected.get('refLng'))
    await changeRentalView(page, mobile, 'Lista')
    await expect(page).toHaveURL(selectedUrl)
    await page
      .getByTestId('rental-reference')
      .getByRole('button', { name: 'Cambiar punto', exact: true })
      .click()
    await expect(map).toBeVisible()
    await expect(useCenter).toBeEnabled()
    const editBox = await map.boundingBox()
    await map.click({ position: { x: editBox!.width / 2 + 24, y: editBox!.height / 2 - 24 } })
    await apply.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBeNull()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('refLat'))
      .not.toBe(selected.get('refLat'))
    selectedUrl = page.url()
    expect(new URL(selectedUrl).searchParams.get('type')).toBe('vivienda')
    expect(new URL(selectedUrl).searchParams.get('pets')).toBe('1')
    await page
      .getByTestId('rental-reference')
      .getByRole('button', { name: 'Quitar punto', exact: true })
      .click()
    await expect(page.getByTestId('rental-reference')).toBeHidden()
    await expect.poll(() => new URL(page.url()).searchParams.get('refLat')).toBeNull()
    expect(new URL(page.url()).searchParams.get('refLng')).toBeNull()
    expect(new URL(page.url()).searchParams.get('sort')).not.toBe('distancia')
    expect(new URL(page.url()).searchParams.get('type')).toBe('vivienda')
    expect(new URL(page.url()).searchParams.get('pets')).toBe('1')
    await expect(page.getByTestId('rental-card-distance')).toHaveCount(0)
    // Back and Forward replay the serialised point, without a hidden local preference.
    await page.goBack()
    await expect(page).toHaveURL(selectedUrl)
    await expect(page.getByTestId('rental-card-distance').first()).toContainText('≈ 0,8 km')
    await page.goForward()
    await expect(page.getByTestId('rental-reference')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(state.errors).toEqual([])
  })
}

test('390px mobile: a street intersection stays independent from the properties department filter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, 'department=Canelones&type=vivienda&pets=1')
  await page.locator('.rentals-sort').getByRole('combobox').click()
  await page.getByRole('option', { name: 'Más cerca', exact: true }).click()
  const address = page.getByTestId('rental-reference-address').getByRole('combobox')
  await expect(address).toBeVisible()
  await address.fill('Hocquart y Democracia')
  // Lookup is debounced; typing never changes the committed search.
  expect(state.geocodeReads).toHaveLength(0)
  expect(new URL(page.url()).searchParams.get('refLat')).toBeNull()
  await expect.poll(() => state.geocodeReads.length).toBe(1)
  expect(state.geocodeReads[0].searchParams.get('q')).toBe('Hocquart y Democracia')
  expect(state.geocodeReads[0].searchParams.get('autocomplete')).toBe('1')
  expect(state.geocodeReads[0].searchParams.get('department')).toBeNull()
  await page
    .getByRole('option', { name: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO', exact: true })
    .click()
  const apply = page.getByTestId('rental-point-apply')
  await expect(apply).toBeEnabled()
  expect(new URL(page.url()).searchParams.get('refLat')).toBeNull()
  await address.fill('Hocquart y Minas')
  await expect(apply).toBeDisabled()
  expect(new URL(page.url()).searchParams.get('refLat')).toBeNull()
  expect(state.geocodeReads).toHaveLength(1)
  await address.fill('Hocquart y Democracia')
  await expect(apply).toBeDisabled()
  await expect.poll(() => state.geocodeReads.length).toBe(2)
  await page.screenshot({ path: resolve(artifactRoot, '.sdd-rentals-address-390.png') })
  await page
    .getByRole('option', { name: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO', exact: true })
    .click()
  await expect(apply).toBeEnabled()
  await apply.click()
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('distancia')
  const savedUrl = page.url()
  const params = new URL(savedUrl).searchParams
  expect(Number(params.get('refLat'))).toBeCloseTo(-34.88974051732336, 4)
  expect(Number(params.get('refLng'))).toBeCloseTo(-56.1768286423287, 4)
  expect(params.get('refLabel')).toBe('HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO')
  expect(params.get('type')).toBe('vivienda')
  expect(params.get('pets')).toBe('1')
  expect(params.get('department')).toBe('Canelones')
  await expect(page.getByTestId('rental-reference')).toContainText('HOCQUART ESQ DEMOCRACIA')
  await changeRentalView(page, true, 'Mapa')
  await expect
    .poll(() => state.mapReads.at(-1)?.searchParams.get('refLat'))
    .toBe(params.get('refLat'))
  await changeRentalView(page, true, 'Lista')
  await expect(page).toHaveURL(savedUrl)
  await expect(page.getByTestId('rental-reference')).toContainText('HOCQUART ESQ DEMOCRACIA')
  expect(state.errors).toEqual([])
})

test('390px mobile: late map results cannot move the camera away from the chosen address', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, 'type=vivienda')
  let releaseMap = () => {}
  const mapGate = new Promise<void>(resolve => {
    releaseMap = resolve
  })
  let mapRequested = false
  await page.route(/\/api\/rentals\/mapa(?:\?|$)/, async route => {
    mapRequested = true
    await mapGate
    await route.fulfill({
      json: {
        points: [
          {
            key: 'far-map-fixture-west',
            lat: -31.39,
            lng: -57.96,
            price: 20000,
            currency: 'UYU',
            bedrooms: 1,
            area: 40,
            neighborhood: 'Salto',
            offers: 1,
            url: 'https://www.infocasas.com.uy/fixture/far-west',
          },
          {
            key: 'far-map-fixture-east',
            lat: -34.48,
            lng: -54.33,
            price: 22000,
            currency: 'UYU',
            bedrooms: 1,
            area: 42,
            neighborhood: 'Rocha',
            offers: 1,
            url: 'https://www.infocasas.com.uy/fixture/far-east',
          },
        ],
        total: 12,
        located: 2,
        shown: 2,
        limit: 3000,
      },
    })
  })
  try {
    await page.locator('.rentals-sort').getByRole('combobox').click()
    await page.getByRole('option', { name: 'Más cerca', exact: true }).click()
    await expect.poll(() => mapRequested).toBe(true)
    await expect(
      page.getByRole('button', { name: 'Usar centro del mapa', exact: true })
    ).toBeEnabled()
    await page
      .getByTestId('rental-reference-address')
      .getByRole('combobox')
      .fill('Hocquart y Democracia')
    await page
      .getByRole('option', { name: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO', exact: true })
      .click()
    const map = page.locator('.rentals-map__frame .leaflet-container')
    const reference = map.locator('.reference-pin')
    await expect(reference).toBeVisible()
    async function distanceFromCenter() {
      const frame = await map.boundingBox()
      const pin = await reference.boundingBox()
      if (!frame || !pin) return Infinity
      return Math.hypot(
        pin.x + pin.width / 2 - (frame.x + frame.width / 2),
        pin.y + pin.height / 2 - (frame.y + frame.height / 2)
      )
    }
    await expect.poll(distanceFromCenter).toBeLessThan(4)
    releaseMap()
    await expect(page.locator('.rentals-map__coverage')).toContainText('2 de 12')
    await expect.poll(distanceFromCenter).toBeLessThan(4)
    await expect(page.getByTestId('rental-point-apply')).toBeEnabled()
    expect(new URL(page.url()).searchParams.get('refLat')).toBeNull()
    await page.screenshot({ path: resolve(artifactRoot, '.sdd-rentals-late-map-address-390.png') })
    await page.getByTestId('rental-point-apply').click()
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('distancia')
    expect(Number(new URL(page.url()).searchParams.get('refLat'))).toBeCloseTo(-34.88974, 4)
    expect(Number(new URL(page.url()).searchParams.get('refLng'))).toBeCloseTo(-56.17683, 4)
    expect(new URL(page.url()).searchParams.get('type')).toBe('vivienda')
    expect(state.errors).toEqual([])
  } finally {
    releaseMap()
  }
})

test('390px mobile: an address chosen before Leaflet loads is centered when the map becomes ready', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, 'type=vivienda')
  let releaseLeaflet = () => {}
  const leafletGate = new Promise<void>(resolve => {
    releaseLeaflet = resolve
  })
  let leafletBlocked = false
  // Keep the real JavaScript unchanged. Delay only the map library response,
  // identified by its preserved license header rather than a build-specific hash.
  await page.route(/\/_nuxt\/.*\.js(?:\?|$)/, async route => {
    const response = await route.fetch()
    const body = await response.text()
    if (/\*\s*Leaflet \d+\./.test(body)) {
      leafletBlocked = true
      await leafletGate
    }
    await route.fulfill({ response, body })
  })
  try {
    await page.locator('.rentals-sort').getByRole('combobox').click()
    await page.getByRole('option', { name: 'Más cerca', exact: true }).click()
    await expect.poll(() => leafletBlocked).toBe(true)
    const center = page.getByRole('button', { name: 'Usar centro del mapa', exact: true })
    await expect(center).toBeDisabled()
    await page
      .getByTestId('rental-reference-address')
      .getByRole('combobox')
      .fill('Hocquart y Democracia')
    await page
      .getByRole('option', { name: 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO', exact: true })
      .click()
    await expect(page.getByTestId('rental-point-apply')).toBeEnabled()
    await expect(center).toBeDisabled()
    expect(new URL(page.url()).searchParams.get('refLat')).toBeNull()
    releaseLeaflet()
    await expect(center).toBeEnabled()
    const map = page.locator('.rentals-map__frame .leaflet-container')
    // At country zoom the chosen intersection is only a pixel from the default
    // Montevideo center. Require the street-level camera, not merely a nearby pin.
    await expect
      .poll(() =>
        map
          .locator('img.leaflet-tile-loaded')
          .evaluateAll(images =>
            images.some(image =>
              /\/16\/\d+\/\d+\.png(?:\?|$)/.test((image as HTMLImageElement).src)
            )
          )
      )
      .toBe(true)
    await expect(map.locator('.reference-pin')).toBeVisible()
    await expect
      .poll(() =>
        map.evaluate(element => {
          const frame = element.getBoundingClientRect()
          const pin = element.querySelector('.reference-pin')?.getBoundingClientRect()
          if (!pin) return Infinity
          return Math.hypot(
            pin.x + pin.width / 2 - (frame.x + frame.width / 2),
            pin.y + pin.height / 2 - (frame.y + frame.height / 2)
          )
        })
      )
      .toBeLessThan(4)
    await expect(center).toBeEnabled()
    await page.screenshot({
      path: resolve(artifactRoot, '.sdd-rentals-late-leaflet-address-390.png'),
    })
    await center.click()
    await expect(page.getByTestId('rental-point-apply')).toBeEnabled()
    await page.getByTestId('rental-point-apply').click()
    await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('distancia')
    expect(Number(new URL(page.url()).searchParams.get('refLat'))).toBeCloseTo(-34.88974, 4)
    expect(Number(new URL(page.url()).searchParams.get('refLng'))).toBeCloseTo(-56.17683, 4)
    expect(state.errors).toEqual([])
  } finally {
    releaseLeaflet()
  }
})

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
