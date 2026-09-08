import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  analyzeRentalMarket,
  estimateRentalPrice,
  normalizeRentalEstimateQuery,
  type RentalAnalysisCatalogue,
  type RentalAnalysisListing,
} from '../../utils/rentalAnalysis'
import type { RentalZoneResponse } from '../../utils/rentalZoneTypes'

test.use({ serviceWorkers: 'block', extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })
test.setTimeout(120_000)

// Synthetic browser fixtures only. Live endpoints and source projection are tested separately.
function catalogue(): RentalAnalysisCatalogue {
  const date = new Date().toISOString()
  const listings: RentalAnalysisListing[] = ['Cordón', 'Pocitos', 'Centro'].flatMap(
    (zone, zoneIndex) =>
      Array.from({ length: 12 }, (_, i) => ({
        propertyKey: `analysis-fixture-${zoneIndex}-${i}`,
        advertId: `infocasas:fixture-${zoneIndex}-${i}`,
        advertiserKey: `infocasas:agency-${i % 4}`,
        source: 'infocasas' as const,
        title: `Apartamento de prueba ${i + 1} en ${zone}`,
        url: `https://www.infocasas.com.uy/fixture/${zoneIndex}-${i}`,
        department: 'Montevideo',
        neighborhood: zone,
        type: 'apartamento' as const,
        bedrooms: 1,
        bathrooms: 1,
        area: 48 + (i % 5),
        areaBasis: 'built' as const,
        areas: {
          built: 48 + (i % 5),
          total: zoneIndex < 2 && i < 6 ? 68 + (i % 5) : null,
        },
        parkingSpaces: 0,
        price: 24000 + zoneIndex * 3000 + i * 500,
        currency: 'UYU' as const,
        commonExpenses: i < 10 ? 3000 : null,
        lastSeen: date,
      }))
  )
  return { generatedAt: date, catalogueProperties: listings.length, listings }
}

function territorialContext(): RentalZoneResponse {
  const date = new Date().toISOString()
  const unrelatedPrice = {
    count: 99,
    mean: 999999999,
    median: 999999999,
    p25: 999999999,
    p75: 999999999,
  }
  return {
    version: 1,
    status: 'ready',
    generatedAt: date,
    rentalDataAsOf: date,
    sampleMinimum: 8,
    filters: { department: 'Montevideo', propertyType: 'apartamento', bedrooms: 'any' },
    departments: ['Montevideo'],
    boundaryUrl: null,
    sources: [],
    zones: [' cordon ', 'Pocitos', 'Centro'].map((name, index) => ({
      id: `fixture-zone-${index}`,
      // Same-name locations in another department must never supply territorial context.
      ref: { department: index === 2 ? 'Canelones' : 'Montevideo', neighborhood: name },
      officialCode: String(index),
      boundaryAvailable: false,
      // This endpoint's converted-price cohort must not enter the analysis calculations.
      prices: {
        rent: unrelatedPrice,
        commonExpenses: unrelatedPrice,
        monthlyTotal: unrelatedPrice,
        builtSquareMeter: unrelatedPrice,
        sources: 1,
        lastSeenFrom: date,
        lastSeenTo: date,
      },
      services: {
        status: index === 1 ? 'stale' : 'ready',
        counts: {
          supermarket: index === 2 ? 999999999 : 10 + index,
          grocery: 20,
          pharmacy: 8,
          healthcare: 4,
          transit: 120,
          education: 15,
        },
        coverage: 'partial',
        source: {
          name: 'OpenStreetMap / Geofabrik',
          url: 'https://download.geofabrik.de/south-america/uruguay.html',
          dataAsOf: '2026-09-01T00:00:00.000Z',
          fetchedAt: date,
        },
      },
      crime: {
        status: 'ready',
        geography: index === 1 ? 'department' : 'neighborhood',
        geographyName: index === 1 ? 'Montevideo' : name.trim(),
        periodFrom: '2025-09-01T00:00:00.000Z',
        periodTo: '2026-08-31T00:00:00.000Z',
        total: 110,
        byOffense: { hurto: 60, rapina: 20, lesiones: 10, 'violencia-domestica': 20, abigeato: 0 },
        source: {
          name: 'Ministerio del Interior · fuente de prueba',
          url: 'https://www.gub.uy/ministerio-interior/',
          dataAsOf: '2026-08-31T00:00:00.000Z',
          fetchedAt: date,
        },
      },
    })),
  }
}

async function prepare(
  page: Page,
  path = '/analisis-alquileres-uruguay',
  options: { contextFails?: () => boolean } = {}
) {
  const sample = catalogue()
  await page.route('**/api/rentals/zones?**', async route => {
    if (options.contextFails?.()) {
      await route.fulfill({ status: 503, json: { statusMessage: 'Fixture context unavailable' } })
      return
    }
    await route.fulfill({ json: territorialContext() })
  })
  await page.route('**/api/rentals/analysis?**', async route => {
    const url = new URL(route.request().url())
    const query = Object.fromEntries(url.searchParams)
    await route.fulfill({ json: analyzeRentalMarket(sample, query) })
  })
  await page.route('**/api/rentals/estimate', async route => {
    const query = normalizeRentalEstimateQuery(route.request().postDataJSON())!
    if (query.askingPrice === 999) {
      await route.fulfill({ status: 503, json: { statusMessage: 'Fixture unavailable' } })
      return
    }
    if (query.askingPrice === 31000) await new Promise(resolve => setTimeout(resolve, 1200))
    await route.fulfill({ json: estimateRentalPrice(sample, query) })
  })
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.getElementById('__nuxt') as any)?.__vue_app__?.$nuxt?.isHydrating === false,
    undefined,
    { timeout: 90000 }
  )
  await expect(page.locator('.rental-analysis__provenance')).toContainText('36')
}

test('filters, chart drilldown, currency and local income comparison stay consistent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await prepare(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'El mercado de alquileres, zona por zona'
  )
  await expect(page.locator('.rental-analysis__range-list > li')).toHaveCount(3)
  const directory = new URL(
    (await page
      .getByRole('link', { name: 'Ver viviendas en alquiler', exact: true })
      .first()
      .getAttribute('href')) as string,
    page.url()
  )
  expect(directory.searchParams.get('currency')).toBe('UYU')
  expect(directory.searchParams.get('bedroomsExact')).toBe('1')
  await page.screenshot({ path: test.info().outputPath('rental-analysis-desktop-viewport.png') })
  await page.getByTestId('analysis-income').fill('100000')
  await expect(page.locator('.rental-analysis__budget')).toContainText('30.000')
  await page.getByRole('button', { name: 'Explorar Cordón', exact: true }).click()
  await expect(page).toHaveURL(/neighborhood=Cord/)
  await expect(page.locator('.rental-analysis__provenance')).toContainText('12 viviendas')
  await expect(page.locator('.rental-analysis__scope')).toContainText('Cordón')
  await page.getByRole('button', { name: 'Todas las zonas', exact: true }).click()
  await expect(page.locator('.rental-analysis__provenance')).toContainText('36 viviendas')
  await page.screenshot({
    path: test.info().outputPath('rental-analysis-desktop.png'),
    fullPage: true,
  })
  await page.locator('select[name="currency"]').selectOption('USD')
  await page.getByRole('button', { name: 'Comparar zonas', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Todavía no hay una muestra con estos filtros' })
  ).toBeVisible()
  await expect(page.locator('.rental-analysis__measures')).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://cambio-uruguay.com/analisis-alquileres-uruguay'
  )
})

test('mobile estimator handles supported, insufficient, stale and failed responses', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepare(page)
  await page.locator('.rental-analysis__zones').scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('rental-analysis-mobile-market.png') })
  const estimator = page.getByTestId('rental-price-estimator')
  await estimator.locator('select[name="estimator-neighborhood"]').selectOption('Cordón')
  await estimator.locator('input[name="estimator-area"]').fill('50')
  await estimator.locator('input[name="estimator-asking"]').fill('30000')
  await estimator.getByRole('button', { name: 'Comparar con avisos similares' }).click()
  const result = page.getByTestId('rental-estimate-result')
  await expect(result).toContainText('12')
  await expect(result).toContainText('4 anunciantes')
  await expect(result.locator('tbody tr')).toHaveCount(6)
  await expect(result).toContainText('42,5–57,5 m²')
  await expect(result).toContainText('12 piden menos que vos, 0 piden lo mismo y 0 piden más')
  await result.getByRole('button', { name: 'Ver los 12 comparables', exact: true }).click()
  await expect(result.locator('tbody tr')).toHaveCount(12)
  await result.locator('select[name="estimator-comparable-sort"]').selectOption('price-asc')
  await expect(result.locator('tbody tr').first()).toContainText('24.000')
  await result.locator('select[name="estimator-comparable-sort"]').selectOption('price-desc')
  await expect(result.locator('tbody tr').first()).toContainText('29.500')
  await result.getByText('Cómo se eligieron los comparables', { exact: true }).click()
  await expect(result.locator('.rent-estimator__selection-steps li')).toHaveCount(5)
  await expect(result.locator('.rent-estimator__selection-steps li').first()).toContainText('12')
  await expect(result).toContainText('por encima')
  await expect(
    estimator
      .getByRole('button', { name: 'Comparar con avisos similares' })
      .locator('.v-btn__content')
  ).toHaveCSS('opacity', '1')
  await result.scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('rental-analysis-mobile-estimate.png') })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.screenshot({
    path: test.info().outputPath('rental-analysis-mobile.png'),
    fullPage: true,
  })
  await estimator.locator('input[name="estimator-area"]').fill('21')
  await expect(result).toHaveCount(0)
  await estimator.getByRole('button', { name: 'Comparar con avisos similares' }).click()
  await expect(result.locator('.rent-estimator__abstention')).toBeVisible()
  await expect(result.locator('.rent-estimator__range')).toHaveCount(0)
  await expect(result.locator('.rent-estimator__selection')).toHaveAttribute('open', '')
  await expect(result.locator('.rent-estimator__selection-steps li').nth(2)).toContainText('0')
  await estimator.locator('input[name="estimator-area"]').fill('50')
  await estimator.locator('input[name="estimator-asking"]').fill('31000')
  await estimator.getByRole('button', { name: 'Comparar con avisos similares' }).click()
  await estimator.locator('input[name="estimator-area"]').fill('21')
  await expect(result).toHaveCount(0)
  await expect(
    estimator.getByRole('button', { name: 'Comparar con avisos similares' })
  ).toBeEnabled()
  await estimator.locator('input[name="estimator-area"]').fill('50')
  await estimator.locator('input[name="estimator-asking"]').fill('999')
  await estimator.getByRole('button', { name: 'Comparar con avisos similares' }).click()
  await expect(estimator.locator('[role="alert"]')).toBeVisible()
  await expect(result).toHaveCount(0)
  await expect(estimator.getByRole('button', { name: /intentar/ })).toBeVisible()
})

test('detailed charts, household scenarios and three-area context use their own evidence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await prepare(page)
  const search = page.getByRole('searchbox', { name: 'Buscar una zona en el gráfico' })
  await search.fill('cordon')
  await expect(page.locator('.rental-analysis__range-list > li')).toHaveCount(1)
  await expect(page.locator('.rental-analysis__range-list > li')).toContainText('Cordón')
  await expect(page).not.toHaveURL(/neighborhood=/)
  await search.fill('zona sin coincidencia')
  await expect(
    page.getByText('No hay zonas que coincidan con esa búsqueda.', { exact: true })
  ).toBeVisible()
  await search.fill('')
  await expect(page.locator('.rental-analysis__range-list > li')).toHaveCount(3)

  const details = page.getByTestId('rental-market-details')
  await expect(details.locator('.market-details__plot circle')).toHaveCount(36)
  await details.locator('select[name="market-area-basis"]').selectOption('total')
  await expect(details.locator('.market-details__plot circle')).toHaveCount(12)
  await details.locator('.market-details__points-table summary').click()
  await expect(details.locator('.market-details__point-values tbody tr')).toHaveCount(12)
  await expect(details.locator('.market-details__point-values tbody tr').first()).toContainText(
    '68'
  )
  await details.locator('select[name="market-area-basis"]').selectOption('built')
  await expect(details.locator('.market-details__plot circle')).toHaveCount(36)
  await expect(details.locator('.market-details__point-values tbody tr')).toHaveCount(36)
  await details.locator('.market-details__points-table summary').click()
  await details.locator('#market-area-title').scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('rental-analysis-detailed-scatter.png') })
  const downloadPromise = page.waitForEvent('download')
  await details.getByRole('button', { name: 'Descargar análisis CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^alquileres-uyu-\d{4}-\d{2}-\d{2}\.csv$/)
  const csvPath = test.info().outputPath('rental-analysis-fixture.csv')
  await download.saveAs(csvPath)
  const csv = await readFile(csvPath, 'utf8')
  expect(csv).toContain(
    '"selection","all","properties","36","count","UYU","Montevideo","","apartamento","1"'
  )
  expect(csv).toContain('"selection","all","rent_median","29750","UYU/month"')
  expect(csv).toContain('"data_quality","all","totalAreaKnown","12","count"')
  expect(csv).not.toMatch(/999999999|analysis-fixture|advertiserKey|contact|agency-/)
  await expect(details.getByRole('status')).toContainText('Archivo de análisis descargado.')

  await page.getByTestId('analysis-income').fill('100000')
  await page.getByTestId('analysis-extra-costs').fill('5000')
  const budget = page.locator('.rental-analysis__budget')
  await expect(budget).toContainText('37.250')
  await expect(budget).toContainText('447.000')
  await expect(budget).toContainText('62.750')
  await page.locator('.rental-analysis__income-fields input').nth(1).fill('40')
  await expect(budget).toContainText('40.000')
  await expect(budget).toContainText('93.125')

  const comparison = page.getByTestId('rental-zone-comparison')
  for (const index of [1, 2, 3])
    await comparison.locator(`select[name="comparison-zone-${index}"]`).selectOption('')
  for (const [index, name] of ['Cordón', 'Pocitos', 'Centro'].entries()) {
    await comparison.locator(`select[name="comparison-zone-${index + 1}"]`).selectOption(name)
  }
  const areas = comparison.locator('.rental-comparison__area')
  await expect(areas).toHaveCount(3)
  await expect(areas.nth(0).locator('.rental-comparison__price')).toContainText('26.750')
  await expect(areas.nth(1).locator('.rental-comparison__price')).toContainText('29.750')
  await expect(areas.nth(2).locator('.rental-comparison__price')).toContainText('32.750')
  await expect(areas.nth(0)).toContainText('85.625')
  await expect(areas.nth(1).locator('dl > div').last()).toContainText(/\+.*3\.000/)
  await expect(comparison).not.toContainText(/999[.,]999[.,]999/)
  const services = comparison.locator('.rental-comparison__evidence').first()
  const cordonServices = services
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Cordón', exact: true }) })
  await expect(
    cordonServices
      .locator('dl > div')
      .filter({ has: page.getByText('Supermercados', { exact: true }) })
      .locator('dd')
  ).toHaveText('10')
  await expect(services).toContainText('un cero no prueba ausencia')
  await expect(services).toContainText('La fuente está pendiente de una lectura reciente.')
  await expect(services.locator('article').last()).toContainText(
    'No hay datos territoriales compatibles'
  )
  const crime = comparison.locator('.rental-comparison__evidence').nth(1)
  await crime.locator('summary').click()
  await expect(crime).toContainText('no permiten ordenar barrios por seguridad')
  await expect(crime).toContainText('Este total corresponde al departamento completo')
  await expect(crime).toContainText('2025')
  await expect(crime).toContainText('2026')
  await page.getByTestId('analysis-extra-costs').fill('-1')
  await expect(comparison).not.toContainText('Ingreso para destinar')
  await expect(budget.locator('.rental-analysis__budget-facts')).toHaveCount(0)
  await page.getByTestId('analysis-extra-costs').fill('5000')
  await expect(areas.nth(0)).toContainText('85.625')
  await comparison.scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('rental-analysis-three-area-context.png') })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

test('territorial context can fail and recover without replacing the asking-price sample', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let fail = true
  await prepare(page, '/analisis-alquileres-uruguay?department=montevideo', {
    contextFails: () => fail,
  })
  const comparison = page.getByTestId('rental-zone-comparison')
  await expect(comparison).toContainText('Los precios del catálogo siguen disponibles.')
  await expect(comparison.locator('.rental-comparison__area')).toHaveCount(3)
  await expect(comparison.locator('.rental-comparison__price').first()).toContainText('32.750')
  await expect(comparison.locator('.rental-comparison__evidence')).toHaveCount(0)
  fail = false
  await comparison.getByRole('button', { name: 'Reintentar contexto' }).click()
  await expect(comparison.locator('.rental-comparison__evidence')).toHaveCount(2)
  await expect(comparison.locator('.rental-comparison__price').first()).toContainText('32.750')
  await expect(comparison).not.toContainText(/999[.,]999[.,]999/)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})

test('an expired catalogue is distinct from an empty search and can recover', async ({ page }) => {
  await prepare(page)
  let expired = true
  await page.route('**/api/rentals/analysis?**', async route => {
    if (expired) {
      await route.fulfill({
        status: 503,
        json: {
          statusCode: 503,
          data: { code: 'RENTAL_ANALYSIS_STALE', generatedAt: '2026-08-20T04:22:36Z' },
        },
      })
    } else {
      const query = Object.fromEntries(new URL(route.request().url()).searchParams)
      await route.fulfill({ json: analyzeRentalMarket(catalogue(), query) })
    }
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => (document.getElementById('__nuxt') as any)?.__vue_app__?.$nuxt?.isHydrating === false,
    undefined,
    { timeout: 90000 }
  )
  await expect(
    page.getByRole('heading', { name: 'El catálogo necesita una actualización' })
  ).toBeVisible()
  await expect(page.locator('.rental-analysis__measures')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Todavía no hay una muestra con estos filtros' })
  ).toHaveCount(0)
  expired = false
  await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click()
  await expect(page.locator('.rental-analysis__provenance')).toContainText('36 viviendas')
})

for (const [locale, heading] of [
  ['en', 'The rental market, area by area'],
  ['pt', 'O mercado de aluguéis, região por região'],
]) {
  test(`localized analysis and estimator render in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    if (locale === 'en') await page.addInitScript(() => localStorage.setItem('cu_theme', 'dark'))
    await prepare(page, `/${locale}/analisis-alquileres-uruguay`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
    await expect(
      page.getByTestId('rental-price-estimator').getByRole('heading', { level: 2 })
    ).toBeVisible()
    const details = page.getByTestId('rental-market-details')
    await expect(details.locator('.market-details__plot circle')).toHaveCount(36)
    await details.locator('#market-area-title').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: test.info().outputPath(`rental-analysis-${locale}-detail-320.png`),
    })
    const comparison = page.getByTestId('rental-zone-comparison')
    await expect(comparison.locator('.rental-comparison__area')).toHaveCount(3)
    await comparison.getByRole('heading', { level: 3 }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: test.info().outputPath(`rental-analysis-${locale}-comparison-320.png`),
    })
    const estimator = page.getByTestId('rental-price-estimator')
    await estimator.locator('select[name="estimator-neighborhood"]').selectOption('Cordón')
    await estimator.locator('input[name="estimator-area"]').fill('50')
    await estimator.locator('input[name="estimator-asking"]').fill('30000')
    await estimator
      .getByRole('button', {
        name:
          locale === 'en' ? 'Compare with similar listings' : 'Comparar com anúncios semelhantes',
      })
      .click()
    const result = page.getByTestId('rental-estimate-result')
    await expect(result.locator('.rent-estimator__range')).toBeVisible()
    await expect(result.locator('tbody tr')).toHaveCount(6)
    await expect(
      estimator
        .getByRole('button', {
          name:
            locale === 'en' ? 'Compare with similar listings' : 'Comparar com anúncios semelhantes',
        })
        .locator('.v-btn__content')
    ).toHaveCSS('opacity', '1')
    await result.getByRole('heading', { level: 3 }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: test.info().outputPath(`rental-analysis-${locale}-estimator-320.png`),
    })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
    if (locale === 'en') {
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await page.locator('.rental-analysis__zones').scrollIntoViewIfNeeded()
      await page.screenshot({ path: test.info().outputPath('rental-analysis-dark.png') })
    }
  })
}
