import { expect, test, type Page } from '@playwright/test'
import {
  normalizePropertySalesQuery,
  type PropertySaleListing,
  type PropertySalesResponse,
} from '../../utils/propertySales'

test.setTimeout(120000)
test.use({ serviceWorkers: 'block', extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })

for (const [prefix, title] of [
  ['', 'Este aviso ya no está disponible'],
  ['/en', 'This advert is no longer available'],
  ['/pt', 'Este anúncio não está mais disponível'],
] as const) {
  test(`SSR unavailable sale advert ${prefix || 'es'} returns rendered 404 without a database`, async ({
    request,
  }) => {
    // Invalid keys are handled inside useAsyncData, so the real SSR wrapper must still render.
    const response = await request.get(`${prefix}/venta-viviendas-uruguay/not-a-valid-advert`)
    expect(response.status()).toBe(404)
    expect(response.headers()['cache-control']).toContain('no-store')
    const html = await response.text()
    expect(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]).toContain(title)
    expect(html).toMatch(/<meta\b[^>]+name="robots"[^>]*content="noindex/)
    expect(html).not.toContain('"@type":"RealEstateListing"')
  })
}
const image = 'https://images.infocasas.com.uy/test-sale-photo.jpg'
const properties: PropertySaleListing[] = Array.from({ length: 8 }, (_, index) => ({
  key: `infocasas-${990000001 + index}`,
  id: `sale:infocasas:${990000001 + index}`,
  operation: 'sale',
  source: 'infocasas',
  listingId: String(990000001 + index),
  url: `https://www.infocasas.com.uy/aviso-de-prueba/${990000001 + index}`,
  title: `Apartamento de prueba ${index + 1} con terraza en Cordón`,
  description:
    'Descripción de prueba del anunciante. Apartamento con dos dormitorios, un baño y terraza. Cocina definida, orientación norte y gastos comunes informados por separado. Consultar disponibilidad y costos de compra con el anunciante.',
  images: [image, image.replace('photo', 'second')],
  image,
  sellerName: `Anunciante de prueba ${index + 1}`,
  department: 'Montevideo',
  locality: 'Montevideo',
  neighborhood: 'Cordón',
  propertyType: 'apartamento',
  bedrooms: 2,
  bathrooms: 1,
  parkingSpaces: null,
  price: { amount: 150000 + index * 5000, currency: 'USD' },
  expenses: index === 1 ? null : { amount: 4200, currency: 'UYU' },
  areas: { built: 60, total: 70, land: null, terrace: 10, reported: null },
  amenities: ['Terraza', 'Ascensor'],
  furnished: null,
  conditions: index === 0 ? ['optional_parking'] : [],
  geo:
    index < 2
      ? { lat: -34.904 + index * 0.002, lng: -56.179 + index * 0.003, precision: 'approximate' }
      : null,
  lastSeen: new Date().toISOString(),
  publishedAt: '2026-09-05',
  firstSeen: new Date().toISOString(),
}))
function result(url: URL): PropertySalesResponse {
  const query = normalizePropertySalesQuery(Object.fromEntries(url.searchParams))
  const items = properties
    .filter(p => !query.keys.length || query.keys.includes(p.key))
    .map(({ description, images, amenities, ...p }) => p)
  return {
    items: query.maxPrice === 1 ? [] : items,
    total: query.maxPrice === 1 ? 0 : items.length,
    page: 1,
    pages: 1,
    perPage: 24,
    usdUyu: 40,
    query,
    facets: {
      departments: [{ value: 'Montevideo', count: 8 }],
      localities: [{ value: 'Montevideo', count: 8 }],
      neighborhoods: [{ value: 'Cordón', count: 8 }],
      types: [{ value: 'apartamento', count: 8 }],
      sellers: [],
      sources: [{ value: 'infocasas', count: 8 }],
    },
    coverage: {
      listings: 8,
      sources: [{ key: 'infocasas', listings: 8, lastSeen: properties[0]!.lastSeen }],
      computedAt: properties[0]!.lastSeen,
    },
    meta: null,
  }
}
async function setup(page: Page, theme = 'dark') {
  const domain = new URL(test.info().project.use.baseURL || 'http://localhost:3311').hostname
  await page.context().addCookies([
    { name: 'lang', value: 'es', domain, path: '/' },
    { name: 'cu_consent', value: 'denied', domain, path: '/' },
  ])
  await page.addInitScript(theme => {
    localStorage.setItem('cu_theme', theme)
    localStorage.removeItem('cu_property_sale_favorites')
  }, theme)
  await page.route('https://images.infocasas.com.uy/**', route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#8ba0a5"/><rect x="140" y="70" width="520" height="360" fill="#e7dcc6"/><path d="M200 430V160h160v270M420 160h170v140H420z" fill="#4e747d"/></svg>',
    })
  )
  await page.route('**/api/property-sales**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/ficha/')) {
      const property = properties.find(p => url.pathname.endsWith(p.key))
      return route.fulfill({
        status: property ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(
          property
            ? { property, usdUyu: 40, indexable: false, similar: [] }
            : { message: 'Not found' }
        ),
      })
    }
    if (url.pathname.endsWith('/mapa'))
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          points: properties.slice(0, 2).map(p => ({
            key: p.key,
            ...p.geo,
            price: p.price,
            image: p.image,
            title: p.title,
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            area: 60,
            areaBasis: 'built',
            neighborhood: p.neighborhood,
            locality: p.locality,
            department: p.department,
          })),
          zones: [
            {
              department: 'Montevideo',
              neighborhood: 'Cordón',
              lat: -34.902,
              lng: -56.169,
              count: 6,
            },
          ],
          total: 8,
          located: 2,
          shown: 2,
          limit: 400,
        }),
      })
    if (url.searchParams.get('maxPrice') === '170000')
      await new Promise(resolve => setTimeout(resolve, 1000))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(result(url)) })
  })
  await page.goto('/venta-viviendas-uruguay', { waitUntil: 'domcontentloaded', timeout: 60000 })
  // The count only appears after the favourites composable has mounted on the client.
  // This avoids treating third-party background network activity as app readiness.
  await expect(page.getByTestId('sale-saved-trigger')).toContainText('(0)', { timeout: 60000 })
  if (!(await page.locator('[data-sale-key]').count())) {
    const retry = page.getByRole('button', { name: 'Reintentar', exact: true })
    if (await retry.count()) await retry.first().click()
  }
  await expect(page.locator('[data-sale-key]')).toHaveCount(8)
}
for (const width of [320, 390])
  test(`mobile ${width}: persistent drawer, cancel, range validation and apply`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await setup(page)
    await page.evaluate(() => window.scrollTo(0, 1200))
    const trigger = page.getByTestId('sale-filter-trigger')
    await expect(trigger).toBeInViewport()
    const scroll = await page.evaluate(() => window.scrollY)
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Filtros' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('sale-filter-apply')).toBeInViewport()
    await dialog.getByLabel('Precio desde', { exact: true }).fill('200000')
    await dialog.getByLabel('Precio hasta', { exact: true }).fill('170000')
    await dialog.getByTestId('sale-filter-apply').click()
    await expect(dialog.getByRole('alert')).toContainText('debe ser menor')
    await dialog.getByTestId('sale-filter-close').click()
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scroll)).toBeLessThan(5)
    await trigger.click()
    await dialog.getByLabel('Precio hasta', { exact: true }).fill('170000')
    await dialog.getByTestId('sale-filter-apply').click()
    await expect(page).toHaveURL(/maxPrice=170000/)
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('[data-sale-key]')).toHaveCount(8)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBeTruthy()
    await page.screenshot({ path: `../.sdd-property-sales-mobile-${width}.png`, fullPage: false })
  })
test('desktop saved comparison, source costs, map point and zone navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await setup(page, 'light')
  await expect(page.getByRole('form', { name: 'Buscar viviendas' })).toBeVisible()
  await page
    .locator('[data-sale-key]')
    .nth(0)
    .getByRole('button', { name: 'Guardar aviso' })
    .click()
  await page
    .locator('[data-sale-key]')
    .nth(1)
    .getByRole('button', { name: 'Guardar aviso' })
    .click()
  const visual = page.locator('[data-sale-key]').first().locator('.sale-card__visual')
  const photo = visual.locator('.sale-card__photo')
  expect(
    Math.abs((await photo.boundingBox())!.width - (await visual.boundingBox())!.width)
  ).toBeLessThan(1)
  const contrast = await visual.locator('.sale-card__save').evaluate(button => {
    const channels = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
    const luminance = (color: string) =>
      channels(color)
        .map(value => {
          const channel = value / 255
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0)
    const foreground = luminance(getComputedStyle(button.querySelector('.v-icon')!).color)
    const background = luminance(getComputedStyle(button).backgroundColor)
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  })
  expect(contrast).toBeGreaterThanOrEqual(3)
  await page.screenshot({ path: '../.sdd-property-sales-favorites-light.png' })
  await page.getByTestId('sale-saved-trigger').click()
  await expect(page.locator('[data-sale-key]')).toHaveCount(2)
  await page.getByRole('checkbox', { name: 'Comparar este aviso' }).nth(0).check()
  await page.getByRole('checkbox', { name: 'Comparar este aviso' }).nth(1).check()
  await page.getByRole('button', { name: 'Comparar (2/4)' }).click()
  const comparison = page.getByRole('dialog', { name: 'Comparar avisos guardados' })
  await expect(comparison).toBeVisible()
  await expect(comparison).toContainText('Gastos comunes / mes')
  await expect(comparison).toContainText('Sin informar')
  await comparison.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page.getByTestId('sale-saved-trigger').click()
  await page.getByRole('button', { name: 'Mapa', exact: true }).click()
  await expect(page.locator('.locations-map.leaflet-container')).toBeVisible()
  await expect(page.getByText('2 de 8 avisos tienen ubicación publicada')).toBeVisible()
  const point = page.getByRole('button', {
    name: 'U$S 150.000 · Apartamento de prueba 1 con terraza en Cordón',
    exact: true,
  })
  await page.locator('.casa-pin, .marker-cluster').first().waitFor({ state: 'visible' })
  if (await page.locator('.marker-cluster').count())
    await page.locator('.marker-cluster').first().click()
  await point.click()
  await expect(page.locator('.sale-map__panel')).toContainText('Gastos comunes / mes')
  await expect(page.locator('.sale-map__panel')).toContainText(
    'Garaje opcional o con precio aparte'
  )
  await expect(page.locator('.sale-map__panel')).toContainText('Ubicación aproximada publicada')
  await page
    .locator('.sale-map__panel')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click()
  await page.getByRole('button', { name: 'Cordón · 6', exact: true }).click()
  await expect(page).toHaveURL(/neighborhood=Cord/)
  await expect(page).not.toHaveURL(/view=mapa/)
  await page.screenshot({ path: '../.sdd-property-sales-desktop.png', fullPage: false })
})
test('individual page keeps own photos, costs and canonical; no catalogue mounted', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  await page
    .locator('[data-sale-key]')
    .first()
    .getByRole('link', { name: 'Ver ficha', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(properties[0]!.title)
  await expect(page.locator('.sales-directory')).toHaveCount(0)
  await expect(page.locator('.sale-detail__facts')).toContainText('U$S 150.000')
  await expect(page.locator('.sale-detail__facts')).toContainText('$ 4.200')
  await expect(page.locator('.sale-detail__dates')).toContainText('5 de septiembre de 2026')
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents()
  const listing = schema
    .map(text => JSON.parse(text))
    .find(value => value['@type'] === 'RealEstateListing')
  expect(listing.offers).toMatchObject({
    price: 150000,
    priceCurrency: 'USD',
    url: properties[0]!.url,
  })
  expect(listing.offers.availability).toBeUndefined()
  expect(listing.datePosted).toBe('2026-09-05')
  expect(listing.mainEntity.floorSize).toMatchObject({ value: 60, unitCode: 'MTK' })
  expect(listing.mainEntity.geo).toBeUndefined()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://cambio-uruguay.com/venta-viviendas-uruguay/infocasas-990000001'
  )
  await page.getByRole('button', { name: 'Ampliar fotos' }).click()
  const gallery = page.getByRole('dialog', { name: 'Con fotos' })
  await expect(gallery).toBeVisible()
  await gallery.getByRole('button', { name: 'Siguiente' }).click()
  await expect(gallery).toContainText('Foto 2 de 2')
  await gallery.getByRole('button', { name: 'Cerrar', exact: true }).click()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBeTruthy()
})

test('mobile map opens visible own details; empty favourites stay empty and storage failure is disclosed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  await page.getByTestId('sale-saved-trigger').click()
  await expect(page.getByRole('heading', { name: 'Todavía no guardaste avisos' })).toBeVisible()
  await expect(page.locator('[data-sale-key]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver todos los avisos' }).click()
  await expect(page.locator('[data-sale-key]')).toHaveCount(8)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'cu_property_sale_favorites')
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page
    .locator('[data-sale-key]')
    .first()
    .getByRole('button', { name: 'Guardar aviso' })
    .click()
  await expect(
    page.getByText(
      'No pudimos guardarlo en este navegador. Se conservará mientras esta página esté abierta.'
    )
  ).toBeVisible()
  await page.getByRole('button', { name: 'Mapa', exact: true }).click()
  await page.locator('.casa-pin, .marker-cluster').first().waitFor({ state: 'visible' })
  if (await page.locator('.marker-cluster').count())
    await page.locator('.marker-cluster').first().click()
  await page
    .getByRole('button', {
      name: 'U$S 150.000 · Apartamento de prueba 1 con terraza en Cordón',
      exact: true,
    })
    .click()
  await expect(page.locator('.sale-map__panel h2')).toBeInViewport()
  await expect(page.locator('.sale-map__panel')).toContainText('Gastos comunes / mes')
  await page.screenshot({ path: '../.sdd-property-sales-map-mobile.png' })
  await page
    .locator('.sale-map__panel')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click()
  await expect(page.locator('.sale-map__panel')).toHaveCount(0)
  await expect(
    page.getByRole('button', {
      name: 'U$S 150.000 · Apartamento de prueba 1 con terraza en Cordón',
      exact: true,
    })
  ).toBeFocused()
})
