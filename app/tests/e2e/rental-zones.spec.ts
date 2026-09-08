import { expect, test, type Page, type TestInfo } from '@playwright/test'
import type { RentalZone, RentalZoneResponse } from '../../utils/rentalZoneTypes'

test.use({ locale: 'es-UY', hasTouch: true, serviceWorkers: 'block' })
test.setTimeout(90000)
const date = '2026-09-08T12:00:00.000Z'
const source = {
  name: 'Fuente pública de prueba',
  url: 'https://example.org/source',
  dataAsOf: date,
  fetchedAt: date,
}
const distribution = (count = 12) => ({
  count,
  mean: count >= 8 ? 22000 : null,
  median: count >= 8 ? 20000 : null,
  p25: count >= 8 ? 18000 : null,
  p75: count >= 8 ? 24000 : null,
})
const zone = (
  id: string,
  neighborhood: string,
  department = 'Montevideo',
  count = 12
): RentalZone => ({
  id,
  ref: { neighborhood, department },
  officialCode: department === 'Montevideo' ? id : null,
  boundaryAvailable: department === 'Montevideo',
  prices: {
    rent: distribution(count),
    commonExpenses: distribution(count),
    monthlyTotal: distribution(count),
    builtSquareMeter: distribution(count),
    sources: 3,
    lastSeenFrom: date,
    lastSeenTo: date,
  },
  services:
    id === 'pocitos'
      ? null
      : {
          status: 'ready',
          counts: { supermarket: 3, grocery: 8, healthcare: 0, transit: 5 },
          source,
          coverage: 'partial',
        },
  crime: {
    status: 'ready',
    geography: department === 'Montevideo' ? 'neighborhood' : 'department',
    geographyName: department === 'Montevideo' ? neighborhood : department,
    periodFrom: '2025-07-01',
    periodTo: '2026-06-30',
    total: 124,
    byOffense: { Hurtos: 100, Rapiñas: 23, 'violencia-domestica': 1 },
    source,
  },
})
const zones = [
  zone('cordon', 'Cordón'),
  zone('pocitos', 'Pocitos', 'Montevideo', 3),
  zone('atlantida', 'Atlántida', 'Canelones'),
]
zones[2]!.prices.rent = { count: 12, mean: 17000, median: 15000, p25: 14000, p75: 18000 }

async function setup(page: Page, target: string, marketOnly = false, mapScaleRegression = false) {
  const state = {
    requests: [] as URL[],
    posts: [] as Record<string, unknown>[],
    rentalReads: [] as URL[],
    errors: [] as string[],
  }
  page.on('pageerror', error => state.errors.push(error.message))
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
      ? route.continue()
      : route.abort('blockedbyclient')
  })
  await page.route(/\/api\/rentals\/zones(?:\?|$)/, route => {
    const url = new URL(route.request().url())
    state.requests.push(url)
    const department = url.searchParams.get('department') || ''
    const response: RentalZoneResponse = {
      version: 1,
      status: 'ready',
      generatedAt: date,
      rentalDataAsOf: date,
      sampleMinimum: 8,
      filters: { department, propertyType: 'apartamento', bedrooms: '1' },
      departments: ['Montevideo', 'Canelones'],
      zones: zones
        .filter(item => !department || item.ref.department === department)
        .map(item =>
          marketOnly
            ? { ...item, services: null, crime: null, boundaryAvailable: false, officialCode: null }
            : !mapScaleRegression
              ? item
              : {
                  ...item,
                  prices: {
                    ...item.prices,
                    rent: {
                      ...distribution(12),
                      mean:
                        item.id === 'atlantida' ? 163727 : item.id === 'pocitos' ? 37323 : 22000,
                    },
                  },
                  services: {
                    status: 'ready',
                    source,
                    coverage: 'partial',
                    counts: {
                      supermarket: item.id === 'atlantida' ? 9999 : item.id === 'pocitos' ? 20 : 3,
                    },
                  },
                  crime: {
                    ...item.crime!,
                    total: item.id === 'atlantida' ? 99999 : item.id === 'pocitos' ? 500 : 124,
                    byOffense: {
                      Hurtos: item.id === 'atlantida' ? 99975 : item.id === 'pocitos' ? 476 : 100,
                      Rapiñas: 23,
                      'violencia-domestica': 1,
                    },
                  },
                }
        ),
      boundaryUrl: marketOnly ? null : '/api/rentals/zones/boundaries',
      sources: [source],
    }
    return route.fulfill({ json: response })
  })
  await page.route(/\/api\/rentals\/zones\/boundaries/, route =>
    route.fulfill({
      json: {
        type: 'FeatureCollection',
        source,
        features: zones.slice(0, 2).map((item, index) => ({
          type: 'Feature',
          properties: {
            zoneId: item.id,
            name: item.ref.neighborhood,
            department: 'Montevideo',
            officialCode: item.id,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-56.2 + index * 0.02, -34.9],
                [-56.18 + index * 0.02, -34.9],
                [-56.18 + index * 0.02, -34.88],
                [-56.2 + index * 0.02, -34.88],
                [-56.2 + index * 0.02, -34.9],
              ],
            ],
          },
        })),
      },
    })
  )
  await page.route(/\/api\/rentals\/fit$/, route => {
    state.posts.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        generatedAt: date,
        usdUyu: 40,
        scanned: 100,
        matched: 0,
        complete: 0,
        incomplete: 0,
        results: [],
      },
    })
  })
  await page.route(/\/api\/rentals(?:\?|$)/, route => {
    state.rentalReads.push(new URL(route.request().url()))
    return route.fulfill({
      json: {
        meta: null,
        coverage: { computedAt: date, properties: 0, sources: [] },
        items: [],
        total: 0,
        page: 1,
        perPage: 24,
        medianUyu: null,
        facets: {
          departments: [{ value: 'Montevideo', count: 12 }],
          neighborhoods: [
            { value: 'Cordón', count: 12 },
            { value: 'Pocitos', count: 3 },
          ],
          types: [{ value: 'apartamento', count: 12 }],
          sources: [],
          priceMaxUyu: 100000,
        },
      },
    })
  })
  await page.goto('/acerca', { waitUntil: 'domcontentloaded' })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible()
  await expect(async () => {
    if (await consent.isVisible())
      await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 60000 })
  await page.evaluate(async path => {
    const element = document.getElementById('__nuxt') as HTMLElement & {
      __vue_app__: {
        config: { globalProperties: { $router: { push: (path: string) => unknown } } }
      }
    }
    await element.__vue_app__.config.globalProperties.$router.push(path)
  }, target)
  return state
}
async function shot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), animations: 'disabled' })
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ).toBeLessThanOrEqual(1)
}
async function selectField(page: Page, label: string, choice: string) {
  await page
    .locator('.v-select')
    .filter({ has: page.getByRole('textbox', { name: label, exact: true }) })
    .locator('.v-field__append-inner')
    .click()
  await page.getByRole('option', { name: choice, exact: true }).click()
}
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await shot(page, info, 'failure').catch(() => {})
})

for (const width of [320, 390])
  test(`${width}px: public comparison keeps prices and no-data context readable`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    const state = await setup(page, '/barrios-alquileres-uruguay')
    await expect(
      page.getByRole('button', { name: 'Ver información de Cordón, Montevideo', exact: true })
    ).toBeVisible()
    await shot(page, info, `controls-${width}`)
    await page
      .getByRole('button', { name: 'Ver información de Cordón, Montevideo', exact: true })
      .click()
    const detail = page.getByTestId('rental-zone-detail')
    await expect(detail).toContainText('$ 20.000')
    await expect(detail).toContainText('$ 22.000')
    await expect(detail).toContainText('12 avisos comparables')
    await page.locator('.cohort-toggle').click()
    await selectField(page, 'Precio', 'Promedio')
    await selectField(page, 'Ordenar por', 'Menor valor')
    await expect(page.locator('.zone-list > li').first()).toContainText('Atlántida')
    await expect(page.locator('.zone-list > li').last()).toContainText('Pocitos')
    await selectField(page, 'Ordenar por', 'Mayor valor')
    await expect(page.locator('.zone-list > li').first()).toContainText('Cordón')
    await expect(page.locator('.zone-list > li').last()).toContainText('Pocitos')
    await page
      .getByRole('button', { name: 'Ver información de Cordón, Montevideo', exact: true })
      .click()
    await expect(detail.locator('.stat-label')).toHaveText('Alquiler promedio')
    await noOverflow(page)
    await shot(page, info, `price-detail-${width}`)
    await selectField(page, 'Qué querés comparar', 'Servicios registrados')
    await page
      .getByRole('button', { name: 'Ver información de Pocitos, Montevideo', exact: true })
      .click()
    await expect(detail).toContainText('Todavía no hay una lectura')
    await expect(detail).not.toContainText('0 servicios')
    await selectField(page, 'Qué querés comparar', 'Denuncias registradas')
    await page
      .getByRole('button', { name: 'Ver información de Atlántida, Canelones', exact: true })
      .click()
    await expect(detail).toContainText('departamento completo')
    await expect(detail).toContainText('Canelones')
    await expect(detail).toContainText('No incluye homicidios')
    await expect(detail).toContainText('tentativas')
    await expect(detail).toContainText('100.000 habitantes')
    await noOverflow(page)
    expect(state.requests[0].searchParams.get('propertyType')).toBe('apartamento')
    expect(state.requests[0].searchParams.get('bedrooms')).toBe('1')
    expect(state.posts).toHaveLength(0)
    expect(state.errors).toEqual([])
  })

test('390px: planner zones cancel, apply and remain private in the household request', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, '/alquiler-ideal-uruguay')
  await page.getByTestId('fit-next').click()
  await page.getByTestId('fit-next').click()
  await page.getByRole('button', { name: 'Elegir y comparar zonas', exact: true }).click()
  await page.getByRole('button', { name: 'Elegir zona: Cordón', exact: true }).click()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByTestId('rental-zones-picker')).not.toContainText('1 zonas elegidas')
  await page.getByRole('button', { name: 'Elegir y comparar zonas', exact: true }).click()
  await page.getByRole('button', { name: 'Elegir zona: Cordón', exact: true }).click()
  await page
    .getByRole('button', { name: 'Ver información de Pocitos, Montevideo', exact: true })
    .click()
  await page.getByRole('button', { name: 'Excluir zona', exact: true }).click()
  await page.getByRole('radio', { name: 'Buscar sólo aquí', exact: true }).check()
  await shot(page, info, 'planner-selection-390')
  await page.getByTestId('rental-zones-apply').click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByTestId('fit-next').click()
  await expect.poll(() => state.posts.length).toBe(1)
  expect(state.posts[0].zones).toEqual({
    mode: 'only',
    include: [{ department: 'Montevideo', neighborhood: 'Cordón' }],
    exclude: [{ department: 'Montevideo', neighborhood: 'Pocitos' }],
  })
  expect(page.url()).not.toMatch(/Cord|Pocitos|include|exclude/)
  expect(
    await page.evaluate(() => `${JSON.stringify(localStorage)}${JSON.stringify(sessionStorage)}`)
  ).not.toMatch(/Cordón|Pocitos/)
  await noOverflow(page)
  expect(state.errors).toEqual([])
})

test('390px: directory comparison applies to the draft before applying rental filters', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, '/alquileres-uruguay')
  await page.getByTestId('rental-mobile-filters-trigger').click()
  const drawer = page.getByTestId('rental-mobile-filters-dialog')
  await drawer.getByRole('button', { name: 'Elegir y comparar zonas', exact: true }).click()
  await page.getByRole('button', { name: 'Elegir zona: Cordón', exact: true }).click()
  await page.getByRole('button', { name: 'Elegir zona: Pocitos', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Elegir zona: Atlántida', exact: true })
  ).toBeDisabled()
  await page.getByTestId('rental-zones-apply').click()
  await expect(drawer).toBeVisible()
  expect(new URL(page.url()).searchParams.has('department')).toBe(false)
  await expect(drawer.getByTestId('rental-zones-picker')).toContainText('Cordón')
  await expect(drawer.getByTestId('rental-zones-picker')).toContainText('Pocitos')
  await drawer.getByTestId('rental-filters-apply').click()
  await expect.poll(() => new URL(page.url()).searchParams.get('department')).toBe('Montevideo')
  expect(new URL(page.url()).searchParams.get('neighborhoods')).toBe('Cordón,Pocitos')
  await shot(page, info, 'directory-applied-390')
  expect(state.posts).toHaveLength(0)
  expect(state.errors).toEqual([])
})

test('390px: available prices work when no official context snapshot exists', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, '/barrios-alquileres-uruguay', true)
  await page
    .getByRole('button', { name: 'Ver información de Cordón, Montevideo', exact: true })
    .click()
  const detail = page.getByTestId('rental-zone-detail')
  await expect(detail).toContainText('$ 20.000')
  await expect(page.getByRole('button', { name: 'Mapa', exact: true })).toBeDisabled()
  await selectField(page, 'Qué querés comparar', 'Servicios registrados')
  await expect(detail).toContainText('Todavía no hay una lectura')
  await expect(page.getByRole('button', { name: 'Elegir zona', exact: true })).toBeEnabled()
  await shot(page, info, 'partial-data-390')
  await noOverflow(page)
  expect(state.errors).toEqual([])
})

test('1366px: map polygons provide keyboard actions and an equivalent list', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 844 })
  const state = await setup(page, '/barrios-alquileres-uruguay', false, true)
  await expect(
    page.getByRole('button', { name: 'Ver información de Cordón, Montevideo', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Mapa', exact: true }).click()
  const polygon = page.getByRole('button', { name: /Cordón: Alquiler mediano/ })
  await expect(polygon).toBeVisible()
  await polygon.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('rental-zone-detail')).toContainText('Cordón')
  await expect(polygon).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.legend')).toContainText('UYU')
  await expect(page.locator('.legend')).toContainText('Sin datos')
  await selectField(page, 'Precio', 'Promedio')
  const meanPolygon = page.getByRole('button', { name: /Cordón: Alquiler promedio/ })
  await expect(meanPolygon).toHaveAttribute('aria-label', /22\.000/)
  await expect(page.locator('.legend')).toContainText('Alquiler promedio · UYU')
  await expect(page.locator('.legend')).toContainText('37.323')
  await expect(page.locator('.legend')).not.toContainText('163.727')
  expect(await meanPolygon.getAttribute('fill')).not.toBe(
    await page.getByRole('button', { name: /Pocitos: Alquiler promedio/ }).getAttribute('fill')
  )
  await meanPolygon.focus()
  await page.keyboard.press('Enter')
  await shot(page, info, 'map-detail-1366')
  await selectField(page, 'Qué querés comparar', 'Servicios registrados')
  await expect(page.locator('.legend')).toContainText('20')
  await expect(page.locator('.legend')).not.toContainText('9999')
  await selectField(page, 'Qué querés comparar', 'Denuncias registradas')
  await expect(page.locator('.legend')).toContainText('500')
  await expect(page.locator('.legend')).not.toContainText('99.999')
  await expect(page.getByTestId('rental-zone-detail')).toContainText('Violencia doméstica')
  await expect(page.getByTestId('rental-zone-detail')).not.toContainText('violencia-domestica')
  await shot(page, info, 'crime-detail-1366')
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Ver información de Cordón, Montevideo', exact: true })
  ).toBeVisible()
  await noOverflow(page)
  expect(state.errors).toEqual([])
})
