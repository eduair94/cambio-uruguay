import { expect, test, type Page } from '@playwright/test'
import { analyzeRentalMarket, type RentalAnalysisCatalogue } from '../../utils/rentalAnalysis'
import type { RentalZoneBoundaryCollection, RentalZoneResponse } from '../../utils/rentalZoneTypes'

test.use({ serviceWorkers: 'block', extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })
test.setTimeout(120_000)

// Synthetic geometry and source figures exercise joins; no real-world values are asserted here.
const names = ['Cordón', 'Pocitos', 'Centro']
const source = {
  name: 'Fuente de prueba',
  url: 'https://www.gub.uy/',
  dataAsOf: '2026-09-01',
  fetchedAt: '2026-09-02',
}
const boundaries: RentalZoneBoundaryCollection = {
  type: 'FeatureCollection',
  source,
  features: names.map((name, index) => ({
    type: 'Feature',
    properties: {
      zoneId: `test-${index}`,
      name,
      department: 'Montevideo',
      officialCode: String(index),
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
}
function catalogue(): RentalAnalysisCatalogue {
  const generatedAt = new Date().toISOString()
  const listings = names.flatMap((neighborhood, zone) =>
    Array.from({ length: zone === 2 ? 3 : 8 }, (_, i) => ({
      propertyKey: `map-${zone}-${i}`,
      advertId: `infocasas:map-${zone}-${i}`,
      advertiserKey: `infocasas:agency-${i % 4}`,
      source: 'infocasas' as const,
      title: `Vivienda de prueba ${i}`,
      url: `https://www.infocasas.com.uy/test/${zone}-${i}`,
      department: 'Montevideo',
      neighborhood,
      type: 'apartamento' as const,
      bedrooms: 1,
      bathrooms: 1,
      parkingSpaces: 0,
      area: 50,
      areaBasis: 'built' as const,
      price: zone === 0 ? (i === 7 ? 60000 : 20000) : 30000,
      currency: 'UYU' as const,
      commonExpenses: 3000,
      lastSeen: generatedAt,
    }))
  )
  return { generatedAt, listings, catalogueProperties: listings.length }
}
function context(): RentalZoneResponse {
  const forbiddenPrices = {
    count: 999,
    mean: 999999999,
    median: 999999999,
    p25: 999999999,
    p75: 999999999,
  }
  return {
    version: 1,
    status: 'ready',
    generatedAt: new Date().toISOString(),
    rentalDataAsOf: null,
    sampleMinimum: 8,
    filters: { department: 'Montevideo', propertyType: 'apartamento', bedrooms: 'any' },
    departments: ['Montevideo'],
    boundaryUrl: null,
    sources: [],
    zones: names.map((name, i) => ({
      id: `test-${i}`,
      ref: { department: 'Montevideo', neighborhood: name },
      officialCode: String(i),
      boundaryAvailable: true,
      prices: {
        rent: forbiddenPrices,
        commonExpenses: forbiddenPrices,
        monthlyTotal: forbiddenPrices,
        builtSquareMeter: forbiddenPrices,
        sources: {},
        lastSeenFrom: null,
        lastSeenTo: null,
      },
      services: {
        status: 'ready',
        coverage: 'partial',
        counts: {
          supermarket: 11 + i,
          grocery: 22 + i,
          pharmacy: 33 + i,
          healthcare: 44 + i,
          transit: 55 + i,
          education: 66 + i,
        },
        source,
      },
      crime: {
        status: 'ready',
        geography: i === 1 ? 'department' : 'neighborhood',
        geographyName: i === 1 ? 'Montevideo' : name,
        periodFrom: '2025-07-01',
        periodTo: '2026-06-30',
        total: 110 + i,
        byOffense: {
          hurto: 60 + i,
          rapina: 20,
          lesiones: 10,
          'violencia-domestica': 20,
          abigeato: 0,
        },
        source,
      },
    })),
  }
}
async function prepare(
  page: Page,
  path = '/analisis-alquileres-uruguay',
  options: { boundaryFails?: () => boolean; contextFails?: () => boolean } = {}
) {
  const requests = { analysis: 0, boundaries: 0, context: 0 }
  const data = catalogue()
  await page.route('**/api/rentals/analysis?**', async route => {
    requests.analysis++
    await route.fulfill({
      json: analyzeRentalMarket(
        data,
        Object.fromEntries(new URL(route.request().url()).searchParams)
      ),
    })
  })
  await page.route('**/api/rentals/zone-boundaries', async route => {
    requests.boundaries++
    await route.fulfill(
      options.boundaryFails?.() ? { status: 503, json: {} } : { json: boundaries }
    )
  })
  await page.route('**/api/rentals/zones?**', async route => {
    requests.context++
    await route.fulfill(options.contextFails?.() ? { status: 503, json: {} } : { json: context() })
  })
  // The polygons and controls work without external tile servers.
  await page.route('**/*.tile.openstreetmap.org/**', route => route.abort())
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.getElementById('__nuxt') as any)?.__vue_app__?.$nuxt?.isHydrating === false,
    undefined,
    { timeout: 90_000 }
  )
  await expect(page.locator('.rental-analysis__state [role="status"]')).toHaveCount(0)
  return requests
}

test('map loads on request and switches same-currency mean, median, services and recorded crime', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const requests = await prepare(page)
  await expect(page.locator('.rental-analysis__provenance')).toContainText('19 viviendas')
  expect(requests.analysis).toBe(1)
  expect(requests.boundaries).toBe(0)
  await expect(page.locator('.leaflet-container')).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Ver mapa por barrio', exact: true })
  ).toBeInViewport()
  await page.getByRole('link', { name: 'Ver mapa por barrio', exact: true }).click()
  const map = page.getByTestId('rental-analysis-map')
  const cordon = map.locator('path[data-zone-id="test-0"]')
  await expect(cordon).toHaveAttribute('aria-label', /25\.000/)
  await cordon.focus()
  await cordon.press('Enter')
  const detail = page.getByTestId('analysis-map-detail')
  await expect(detail.locator('.analysis-map__value')).toContainText('25.000')
  await map.locator('select[name="analysis-map-statistic"]').selectOption('median')
  await expect(detail.locator('.analysis-map__value')).toContainText('20.000')
  await expect(map.locator('path[data-zone-id="test-2"]')).toHaveAttribute('fill', '#d4d9df')
  await detail.getByRole('button', { name: 'Cerrar detalle' }).click()
  await expect(detail).toHaveCount(0)
  await expect(cordon).toBeFocused()
  await cordon.press('Enter')
  await map.getByRole('button', { name: 'Servicios', exact: true }).click()
  await expect(detail.locator('.analysis-map__value')).toHaveText('11')
  await map.locator('select[name="analysis-map-service"]').selectOption('pharmacy')
  await expect(detail.locator('.analysis-map__value')).toHaveText('33')
  await map.getByRole('button', { name: 'Denuncias de delitos', exact: true }).click()
  await expect(detail.locator('.analysis-map__value')).toHaveText('110')
  await map.locator('select[name="analysis-map-offense"]').selectOption('hurto')
  await expect(detail.locator('.analysis-map__value')).toHaveText('60')
  await expect(map.locator('path[data-zone-id="test-1"]')).toHaveAttribute('fill', '#d4d9df')
  await expect(map).not.toContainText(/999[.,]999[.,]999/)
  await map.scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('analysis-map-desktop-crime.png') })
  await map.getByRole('button', { name: 'Precio de alquiler', exact: true }).click()
  await map.locator('.analysis-map__list summary').click()
  await expect(map.locator('tbody tr')).toHaveCount(3)
  await detail.getByRole('button', { name: 'Analizar los alquileres de este barrio' }).click()
  await expect(page).toHaveURL(/neighborhood=Cord/)
  await expect(page.locator('.rental-analysis__provenance')).toContainText('8 viviendas')
  expect(requests.boundaries).toBe(1)
})

test('an empty price cohort still opens the map and contextual layers; failed layers recover independently', async ({
  page,
}) => {
  let boundaryFails = true,
    contextFails = true
  const requests = await prepare(
    page,
    '/analisis-alquileres-uruguay?currency=USD&department=Montevideo&neighborhood=PUNTA+RIELES&type=apartamento&bedrooms=1#mapa-alquileres',
    { boundaryFails: () => boundaryFails, contextFails: () => contextFails }
  )
  const map = page.getByTestId('rental-analysis-map')
  await expect(map.getByRole('button', { name: 'Reintentar mapa' })).toBeVisible()
  boundaryFails = false
  await map.getByRole('button', { name: 'Reintentar mapa' }).click()
  await expect(map.locator('path[data-zone-id]')).toHaveCount(3)
  await expect(map).toContainText(
    'La zona «PUNTA RIELES» no coincide exactamente con un barrio del mapa'
  )
  await expect(map.locator('path[data-zone-id]').first()).toHaveAttribute('fill', '#d4d9df')
  expect(requests.context).toBe(0)
  await map.getByRole('button', { name: 'Servicios', exact: true }).click()
  await expect(map.getByRole('button', { name: 'Reintentar datos de contexto' })).toBeVisible()
  contextFails = false
  await map.getByRole('button', { name: 'Reintentar datos de contexto' }).click()
  await map.locator('path[data-zone-id="test-0"]').focus()
  await map.locator('path[data-zone-id="test-0"]').press('Enter')
  await expect(page.getByTestId('analysis-map-detail').locator('.analysis-map__value')).toHaveText(
    '11'
  )
  await map.getByRole('button', { name: 'Precio de alquiler', exact: true }).click()
  await expect(map.locator('.analysis-map__scope')).toContainText('USD')
  await expect(page.getByTestId('analysis-map-detail').locator('.analysis-map__value')).toHaveText(
    'Sin muestra de al menos 8 viviendas'
  )
})

for (const [locale, title, services] of [
  ['en', 'Map of asking rents, reported crime and services', 'Services'],
  ['pt', 'Mapa de aluguéis, denúncias e serviços', 'Serviços'],
])
  test(`map deep links, detail and list fit 320px in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    if (locale === 'en') await page.addInitScript(() => localStorage.setItem('cu_theme', 'dark'))
    await prepare(page, `/${locale}/analisis-alquileres-uruguay#mapa-alquileres`)
    const map = page.getByTestId('rental-analysis-map')
    await expect(map.getByRole('heading', { name: title })).toBeVisible()
    await expect(map.locator('path[data-zone-id]')).toHaveCount(3)
    await map.getByRole('button', { name: services, exact: true }).click()
    await map.locator('.analysis-map__list summary').click()
    await map.locator('tbody').getByRole('button', { name: 'Cordón', exact: true }).click()
    await expect(
      page.getByTestId('analysis-map-detail').locator('.analysis-map__value')
    ).toHaveText('11')
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    await page.screenshot({ path: test.info().outputPath(`analysis-map-${locale}-320.png`) })
  })
