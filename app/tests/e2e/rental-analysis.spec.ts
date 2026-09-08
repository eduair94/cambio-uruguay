import { expect, test, type Page } from '@playwright/test'
import {
  analyzeRentalMarket,
  estimateRentalPrice,
  normalizeRentalEstimateQuery,
  type RentalAnalysisCatalogue,
  type RentalAnalysisListing,
} from '../../utils/rentalAnalysis'

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
        parkingSpaces: 0,
        price: 24000 + zoneIndex * 3000 + i * 500,
        currency: 'UYU' as const,
        commonExpenses: i < 10 ? 3000 : null,
        lastSeen: date,
      }))
  )
  return { generatedAt: date, catalogueProperties: listings.length, listings }
}

async function prepare(page: Page, path = '/analisis-alquileres-uruguay') {
  const sample = catalogue()
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
  await expect(result.locator('tbody tr')).toHaveCount(12)
  await expect(result).toContainText('por encima')
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
