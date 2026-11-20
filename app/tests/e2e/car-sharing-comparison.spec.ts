import { expect, test, type Page } from '@playwright/test'
import type { PublicCarListing, PublicCarSpecs } from '../../utils/carsPublic'

test.setTimeout(150_000)

const first: PublicCarListing = {
  key: 'carone-701',
  source: 'carone',
  sourceName: 'Car One',
  brand: 'Toyota',
  brandSlug: 'toyota',
  model: 'Corolla',
  modelSlug: 'corolla',
  marketSlug: 'toyota-corolla',
  title: 'Toyota Corolla XEi 2018',
  year: 2018,
  km: 68000,
  price: 15900,
  listedPrice: null,
  currency: 'USD',
  priceUsd: 15900,
  priceConverted: false,
  currencyInferred: false,
  transmission: 'automatica',
  fuel: 'nafta',
  fuelEconomy: {
    litersPer100Km: 7.4,
    city: null,
    highway: null,
    combined: 7.4,
    basis: 'advert',
    sellers: null,
  },
  body: null,
  doors: 4,
  color: 'gris',
  engine: '1.8',
  trim: 'XEi',
  department: 'Montevideo',
  neighborhood: null,
  sellerType: 'dealer',
  dealerName: 'Car One',
  picture: null,
  pictureCount: null,
  pictures: [],
  permalink: 'https://carone.com.uy/toyota-corolla-701',
  firstSeen: '2026-11-01T12:00:00Z',
  lastSeen: '2026-11-05T10:00:00Z',
  priceDrop: null,
  flags: [],
  risks: [],
  opportunity: null,
  reference: null,
  specs: { equipment: ['abs', 'isofix'], missing: ['control_estabilidad'] } as PublicCarSpecs,
}
const second: PublicCarListing = {
  ...first,
  key: 'carone-702',
  brand: 'Suzuki',
  brandSlug: 'suzuki',
  model: 'Swift',
  modelSlug: 'swift',
  marketSlug: 'suzuki-swift',
  title: 'Suzuki Swift GLX 2019',
  year: 2019,
  km: null,
  price: 13900,
  priceUsd: 13900,
  trim: 'GLX',
  engine: '1.2',
  transmission: 'manual',
  specs: null,
  fuelEconomy: {
    litersPer100Km: 5.7,
    city: null,
    highway: null,
    combined: null,
    basis: 'model',
    sellers: 6,
  },
  permalink: 'https://carone.com.uy/suzuki-swift-702',
  risks: [{ category: 'mecanica', severity: 'alta', quote: 'No arranca', from: 'description' }],
}
const third: PublicCarListing = {
  ...first,
  key: 'carone-703',
  brand: 'BYD',
  brandSlug: 'byd',
  model: 'F3',
  modelSlug: 'f3',
  marketSlug: 'byd-f3',
  title: 'BYD F3 2017',
  year: 2017,
  price: 2500,
  priceUsd: 2500,
  flags: ['financing'],
  permalink: 'https://carone.com.uy/byd-f3-703',
}
const cars = [first, second, third]

async function openComparator(page: Page) {
  if (process.env.CAR_COMPARISON_PREVIEW === '1') {
    // The optional isolated runner mounts the real SFC + Vuetify. It does not replace app E2E.
    await page.goto('/autos-usados-uruguay/comparar', { waitUntil: 'domcontentloaded' })
    return
  }
  // A client navigation makes the HTTP mocks apply to useAsyncData; never alter the SSR payload.
  await page.goto('/acerca', { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await expect(async () => {
    await page.locator('.primary-nav').getByRole('button', { name: 'Más', exact: true }).click()
    await expect(page.locator('.mega-menu')).toBeVisible({ timeout: 3000 })
  }).toPass({ timeout: 60_000 })
  await page.keyboard.press('Escape')
  // The comparator is out of the menu and the footer (noindex, reached from the directory and each
  // advert): navigate through the app's own router, still a client navigation.
  await page.evaluate(() =>
    (
      document.querySelector('#__nuxt') as unknown as {
        __vue_app__: { config: { globalProperties: { $router: { push(path: string): unknown } } } }
      }
    ).__vue_app__.config.globalProperties.$router.push('/autos-usados-uruguay/comparar')
  )
  await expect(page).toHaveURL(/\/autos-usados-uruguay\/comparar/)
}

test('select cars, compare sourced facts, share the exact shortlist and restore it with Back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const saved: Array<{ path: string }> = []
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.route(
    url => url.pathname === '/api/cars',
    async route => {
      const query = new URL(route.request().url()).searchParams.get('q')?.toLowerCase() ?? ''
      const items = cars.filter(car => car.title.toLowerCase().includes(query))
      await route.fulfill({ json: { items, total: items.length } })
    }
  )
  await page.route('**/api/cars/compare-listings?**', async route => {
    const keys = new URL(route.request().url()).searchParams.get('autos')?.split(',') ?? []
    await route.fulfill({
      json: {
        items: keys.flatMap(key => {
          const car = cars.find(candidate => candidate.key === key)
          return car ? [{ car, stale: false }] : []
        }),
        missing: keys.filter(key => !cars.some(car => car.key === key)),
      },
    })
  })
  await page.route('**/api/share-links', async route => {
    const payload = route.request().postDataJSON() as (typeof saved)[number]
    saved.push(payload)
    await route.fulfill({
      json: { ...payload, id: 'CarFixture01', url: 'https://cambio-uruguay.com/s/CarFixture01' },
    })
  })

  await openComparator(page)
  await expect(
    page.getByRole('heading', { name: 'Comparar autos usados en Uruguay', exact: true })
  ).toBeVisible()
  const firstAdd = page.getByRole('button', {
    name: `Agregar ${first.title} a la comparación`,
    exact: true,
  })
  await expect(async () => {
    if (!new URL(page.url()).searchParams.get('autos')?.includes(first.key)) await firstAdd.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('autos')).toBe(first.key)
  }).toPass({ timeout: 45_000 })
  await expect(
    page.getByText('Agregá otro auto para ver las diferencias.', { exact: true })
  ).toBeVisible()
  await expect(page.locator('.comparison-table')).toHaveCount(0)

  await page.getByLabel('Marca, modelo o versión', { exact: true }).fill('Suzuki')
  await page.getByRole('button', { name: 'Buscar autos', exact: true }).click()
  await expect(page.locator('.comparison-results li')).toHaveCount(1)
  await page
    .getByRole('button', { name: `Agregar ${second.title} a la comparación`, exact: true })
    .click()
  const selection = `${first.key},${second.key}`
  await expect.poll(() => new URL(page.url()).searchParams.get('autos')).toBe(selection)
  const table = page.locator('.comparison-table')
  await expect(table).toBeVisible()
  const priceRow = table
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'Precio publicado', exact: true }) })
  await expect(priceRow.locator('td')).toHaveText(['US$ 15.900', 'US$ 13.900'])
  const absRow = table
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'Frenos ABS', exact: true }) })
  await expect(absRow.locator('td')).toHaveText(['Sí', 'Sin dato'])
  const kmRow = table
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'Kilómetros', exact: true }) })
  await expect(kmRow.locator('td')).toHaveText(['68.000 km', 'Sin dato'])
  await expect(table.getByText('Declarado en este aviso', { exact: true })).toBeVisible()
  await expect(
    table.getByText('Estimado con otros avisos; no medido en este auto', { exact: true })
  ).toBeVisible()
  await expect(table.getByRole('link', { name: 'Ver aviso en Car One' })).toHaveCount(2)
  await expect(
    table.getByText('Declara problemas mecánicos: «No arranca»', { exact: true })
  ).toBeVisible()
  await page.locator('.car-comparison .share-trigger').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Enlace corto', { exact: true })).toHaveValue(
    'https://cambio-uruguay.com/s/CarFixture01'
  )
  expect(saved).toHaveLength(1)
  expect(saved[0]!.path).toBe(
    `/autos-usados-uruguay/comparar?autos=${encodeURIComponent(selection)}`
  )
  // The body carries the destination only: the link's title and description are written by the
  // server (sharedLinkText), never by whoever creates the link (tests/unit/sharedLinksServerText).
  expect(Object.keys(saved[0]!)).toEqual(['path'])
  await expect(dialog.locator('.share-panel__preview')).toBeVisible()
  await expect(
    dialog.getByRole('link', { name: 'Descargar tarjeta', exact: true })
  ).toHaveAttribute('download', 'cambio-uruguay.png')
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()

  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.locator('#comparison-selection').scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: test.info().outputPath(`comparison-${width}.png`),
      fullPage: true,
    })
  }

  await page.getByRole('button', { name: `Quitar ${first.title}`, exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('autos')).toBe(second.key)
  await expect(table).toHaveCount(0)
  await page.goBack()
  await expect.poll(() => new URL(page.url()).searchParams.get('autos')).toBe(selection)
  await expect(priceRow.locator('td')).toHaveText(['US$ 15.900', 'US$ 13.900'])

  await page.getByLabel('Marca, modelo o versión', { exact: true }).fill('BYD')
  await page.getByRole('button', { name: 'Buscar autos', exact: true }).click()
  await page
    .getByRole('button', { name: `Agregar ${third.title} a la comparación`, exact: true })
    .click()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('autos'))
    .toBe(`${selection},${third.key}`)
  await expect(
    page.getByText('Ya elegiste tres autos. Quitá uno para agregar otro.', { exact: true })
  ).toBeVisible()
  await page.locator('.car-comparison .share-trigger').first().click()
  await expect(dialog.getByLabel('Enlace corto', { exact: true })).toBeVisible()
  // Destination only (the server writes the text); the third car travels in the selection.
  expect(Object.keys(saved[1]!)).toEqual(['path'])
  expect(saved[1]!.path).toContain(encodeURIComponent(third.key))
  expect(pageErrors).toEqual([])
})

test('a failed comparison can always be cleared, even after selecting three cars', async ({
  page,
}) => {
  let catalogueRequests = 0
  await page.route(
    url => url.pathname === '/api/cars',
    async route => {
      catalogueRequests += 1
      await route.fulfill({ json: { items: cars, total: cars.length } })
    }
  )
  await page.route('**/api/cars/compare-listings?**', route =>
    route.fulfill({
      status: 503,
      json: { statusCode: 503, statusMessage: 'Temporarily unavailable' },
    })
  )
  await openComparator(page)
  for (const [index, car] of cars.entries()) {
    await page
      .getByRole('button', { name: `Agregar ${car.title} a la comparación`, exact: true })
      .click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('autos')?.split(',').length)
      .toBe(index + 1)
  }
  const failure = page
    .locator('.v-alert')
    .filter({ hasText: 'No pudimos cargar los autos. Volvé a intentarlo.' })
  await expect(failure).toBeVisible()
  await expect(page.getByLabel('Marca, modelo o versión', { exact: true })).toHaveCount(0)
  expect(catalogueRequests).toBe(1)
  await page.getByRole('button', { name: 'Vaciar selección', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('autos')).toBeNull()
  await expect(page.getByLabel('Marca, modelo o versión', { exact: true })).toBeVisible()
  await expect.poll(() => catalogueRequests).toBe(2)
  await expect(failure).toHaveCount(0)
})
