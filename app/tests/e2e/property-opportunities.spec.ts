import { expect, test, type Page } from '@playwright/test'
import type { OpportunityItem, OpportunityOperation } from '../../utils/propertyOpportunities'
import {
  normalizeOpportunityQuery,
  type PropertyOpportunitiesResponse,
} from '../../utils/propertyOpportunityQuery'

test.use({ serviceWorkers: 'block', extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })

function fixture(operation: OpportunityOperation): PropertyOpportunitiesResponse {
  const date = new Date().toISOString()
  const subject: OpportunityItem['subject'] = {
    id: `${operation}:infocasas:fixture1`,
    listingId: 'infocasas:fixture1',
    operation,
    propertyKey: operation === 'rent' ? 'montevideo-cordon-prueba' : undefined,
    source: 'infocasas',
    url: 'https://www.infocasas.com.uy/fixture/1',
    title: 'Apartamento de prueba con terraza en Cordón',
    image: null,
    sellerName: 'Anunciante de prueba',
    department: 'Montevideo',
    locality: 'Montevideo',
    neighborhood: 'Cordón',
    propertyType: 'apartamento',
    bedrooms: 2,
    bathrooms: 1,
    area: { value: 60, basis: 'built' },
    price: {
      amount: operation === 'rent' ? 28000 : 160000,
      currency: operation === 'rent' ? 'UYU' : 'USD',
    },
    expenses: operation === 'rent' ? { amount: 4000, currency: 'UYU' } : null,
    comparisonPrice: operation === 'rent' ? 32000 : 160000,
    lastSeen: date,
    publishedAt: null,
  }
  const median = operation === 'rent' ? 40000 : 200000
  const item: OpportunityItem = {
    subject,
    analysis: {
      pricingBasis: operation === 'rent' ? 'monthly_total' : 'asking_price',
      currency: operation === 'rent' ? 'UYU' : 'USD',
      median,
      q25: median * 0.95,
      q75: median * 1.05,
      spread: 0.1,
      gapPct: 20,
      conservativeGapPct: 15.8,
      perAreaGapPct: 18,
      distinctN: 12,
      sellersN: 6,
      sources: ['infocasas', 'casasweb'],
      oldestLastSeen: date,
      newestLastSeen: date,
      areaBasis: 'built',
      areaMin: 55,
      areaMax: 65,
      confidence: 'supported',
    },
    comparables: Array.from({ length: 8 }, (_, i) => ({
      ...subject,
      id: `${operation}:infocasas:fixture${i + 2}`,
      listingId: `infocasas:fixture${i + 2}`,
      title: `Comparable verificable ${i + 2}`,
      url: `https://www.infocasas.com.uy/fixture/${i + 2}`,
      comparisonPrice: median + i * 100,
      differences: { areaPercent: i },
    })),
    cautions: ['asking_prices_only', 'condition_unverified', 'availability_unverified'],
  }
  return {
    operation,
    generatedAt: date,
    sourceReadAt: date,
    stale: false,
    currency: operation === 'rent' ? 'UYU' : 'USD',
    usdUyu: 40,
    total: 1,
    page: 1,
    perPage: 24,
    pages: 1,
    items: [item],
    stats: {
      input: 100,
      eligible: 80,
      analyzed: 40,
      shortlisted: 1,
      qualified: 1,
      excluded: {},
      risks: {},
    },
    coverage: [{ source: 'infocasas', observed: 100, lastRead: date, complete: true, note: '' }],
    facets: { departments: ['Montevideo', 'Canelones'], neighborhoods: ['Cordón', 'Pocitos'] },
    query: normalizeOpportunityQuery({ operation }),
  }
}

async function setup(page: Page, theme: 'light' | 'dark' = 'dark') {
  const domain = new URL(test.info().project.use.baseURL || 'http://127.0.0.1:3311').hostname
  await page.context().addCookies([
    { name: 'lang', value: 'es', domain, path: '/' },
    { name: 'cu_consent', value: 'denied', domain, path: '/' },
  ])
  await page.addInitScript(theme => {
    localStorage.setItem('cu_theme', theme)
  }, theme)
  await page.route('**/api/property-opportunities?**', async route => {
    const url = new URL(route.request().url())
    const result = fixture(url.searchParams.get('operation') === 'sale' ? 'sale' : 'rent')
    // Expose stale-card bugs while a changed budget is waiting for the server.
    if (url.searchParams.get('maxPrice') === '35000')
      await new Promise(resolve => setTimeout(resolve, 1800))
    if (url.searchParams.get('maxPrice') === '1') {
      result.items = []
      result.total = 0
      result.pages = 0
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) })
  })
  await page.goto('/oportunidades-inmobiliarias-uruguay?operation=sale', {
    waitUntil: 'domcontentloaded',
  })
  // An SSR link can navigate before Nuxt attaches its handler, bypassing the
  // browser API fixture. Wait for the actual app to finish hydration first.
  await page.waitForFunction(
    () => (document.getElementById('__nuxt') as any)?.__vue_app__?.$nuxt?.isHydrating === false,
    undefined,
    { timeout: 90000 }
  )
  await expect(async () => {
    if (new URL(page.url()).searchParams.get('operation') === 'sale')
      await page.getByRole('link', { name: 'Alquiler', exact: true }).click()
    await expect(page.getByTestId('opportunity-card')).toHaveCount(1, { timeout: 2000 })
  }).toPass({ timeout: 90000, intervals: [500, 1000] })
}

async function checkButtonContrast(page: Page, theme: string, width: number) {
  const measurements = []
  for (const button of [
    page.getByRole('link', { name: 'Alquiler', exact: true }),
    page.getByRole('link', { name: 'Ver ficha del alquiler', exact: true }),
  ]) {
    const measurement = await button.evaluate(element => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      const rgba = (color: string) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data]
      }
      let background = [255, 255, 255]
      const layer = (color: string, opacity = 1) => {
        const pixels = rgba(color)
        const alpha = (pixels[3] / 255) * opacity
        background = background.map(
          (channel, index) => pixels[index] * alpha + channel * (1 - alpha)
        )
      }
      const ancestors: Element[] = []
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement)
        ancestors.unshift(ancestor)
      for (const ancestor of ancestors) layer(getComputedStyle(ancestor).backgroundColor)
      for (const overlay of element.querySelectorAll('.v-btn__underlay, .v-btn__overlay')) {
        const style = getComputedStyle(overlay)
        if (style.display !== 'none') layer(style.backgroundColor, Number(style.opacity))
      }
      const foreground = rgba(getComputedStyle(element).color)
      const luminance = (pixels: number[]) =>
        pixels
          .slice(0, 3)
          .map(channel => channel / 255)
          .map(channel =>
            channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
          )
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
      const ink = luminance(foreground)
      const surface = luminance(background)
      return {
        label: element.textContent?.trim(),
        foreground: getComputedStyle(element).color,
        background,
        ratio: (Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05),
      }
    })
    expect(measurement.ratio).toBeGreaterThanOrEqual(4.5)
    measurements.push(measurement)
  }
  await test.info().attach(`contrast-${theme}-${width}`, {
    body: JSON.stringify(measurements),
    contentType: 'application/json',
  })
}

for (const width of [320, 390, 1440]) {
  test(`opportunities expose evidence and preserve usable filters at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(150000)
    await page.setViewportSize({ width, height: 820 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await setup(page)
    const card = page.getByTestId('opportunity-card')
    await expect(card).toContainText('UYU 32.000')
    await expect(card).toContainText('UYU 28.000')
    await expect(card).toContainText('20% por debajo de la mediana')
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    if (width < 960) {
      await expect(card.locator('.opportunity-card__asking')).toBeInViewport({ ratio: 1 })
      await expect(card.locator('.opportunity-card__comparison')).toBeInViewport({ ratio: 1 })
    }
    await checkButtonContrast(page, 'dark', width)
    await page.screenshot({ path: `../.sdd-opportunities-first-${width}.png` })
    await card.locator('summary').click()
    await expect(card.getByRole('link', { name: 'Comparable verificable 2' })).toHaveAttribute(
      'href',
      'https://www.infocasas.com.uy/fixture/2'
    )
    await expect(card).toContainText(
      'El estado, las reformas y la orientación no están verificados.'
    )
    await page.screenshot({ path: `../.sdd-opportunities-evidence-${width}.png`, fullPage: true })
    let filterScope = page.locator('.opportunities__sidebar')
    if (width < 960) {
      await page.locator('#opportunity-coverage').scrollIntoViewIfNeeded()
      const trigger = page.getByTestId('opportunity-filter-trigger')
      await expect(trigger).toBeInViewport()
      const before = await page.evaluate(() => scrollY)
      await trigger.click()
      filterScope = page.getByRole('dialog', { name: 'Filtros', exact: true })
      await expect(filterScope).toBeVisible()
      const close = filterScope.getByRole('button', { name: 'Cerrar filtros', exact: true })
      expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await expect(filterScope.locator('h2')).toBeFocused()
      await page.screenshot({ path: `../.sdd-opportunities-filters-${width}.png` })
      await page.keyboard.press('Escape')
      await expect(filterScope).not.toBeVisible()
      await expect(trigger).toBeFocused()
      expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(3)
      await trigger.click()
      await expect(filterScope).toBeVisible()
    }
    const budget = filterScope.getByLabel('Máximo mensual (UYU)', { exact: true })
    if (width === 320) {
      await filterScope
        .locator('.v-select')
        .filter({ has: page.getByLabel('Tipo de propiedad', { exact: true }) })
        .locator('.v-field__input')
        .click()
      await page.getByRole('option', { name: 'Apartamento', exact: true }).click()
    }
    await budget.fill('35000')
    await filterScope.getByRole('button', { name: 'Ver resultados', exact: true }).click()
    await expect(page).toHaveURL(/maxPrice=35000/)
    if (width === 320) expect(new URL(page.url()).searchParams.get('type')).toBe('apartamento')
    await expect(card).toHaveCount(0)
    await expect(
      page.getByRole('heading', { name: 'Buscando oportunidades…', exact: true })
    ).toBeVisible()
    if (width < 960) await expect(filterScope).not.toBeVisible()
    await expect(card).toHaveCount(1)
    await page.getByRole('link', { name: 'Compra', exact: true }).click()
    await expect(page).toHaveURL(/operation=sale/)
    expect(new URL(page.url()).searchParams.has('maxPrice')).toBe(false)
    await expect(card).toContainText('USD 160.000')
    await expect(page.getByTestId('opportunity-explore-directory')).toBeVisible()
    await expect(page.getByTestId('opportunity-explore-directory')).toHaveAttribute(
      'href',
      '/venta-viviendas-uruguay'
    )
    await expect(card.getByRole('link', { name: 'Ver ficha del alquiler' })).toHaveCount(0)
    await expect(card.getByRole('link', { name: 'Ver aviso original' })).toHaveAttribute(
      'href',
      'https://www.infocasas.com.uy/fixture/1'
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
    expect(errors).toEqual([])
    if (width === 1440) {
      await page.locator('.nav-actions [data-testid="theme-toggle"]').click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      await expect(page.locator('.v-application')).toHaveCSS(
        'background-color',
        'rgb(246, 247, 249)'
      )
      await expect(page.locator('.opportunities h1')).toHaveCSS('color', 'color(srgb 0 0 0 / 0.87)')
      await page.getByRole('link', { name: 'Alquiler', exact: true }).click()
      await expect(card).toContainText('UYU 32.000')
      await checkButtonContrast(page, 'light', width)
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await page.screenshot({ path: '../.sdd-opportunities-light-1440.png' })
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true)
    }
  })
}

test('mobile first viewport shows price and evidence with readable light controls', async ({
  page,
}) => {
  test.setTimeout(120000)
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 820 })
    await setup(page, 'light')
    await expect(page.locator('.v-application')).toHaveCSS('background-color', 'rgb(246, 247, 249)')
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    const directory = page.getByTestId('opportunity-explore-directory')
    await expect(directory).toBeInViewport({ ratio: 1 })
    await expect(directory).toHaveAttribute('href', '/alquileres-uruguay')
    expect((await directory.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const card = page.getByTestId('opportunity-card')
    await expect(card.locator('.opportunity-card__asking')).toBeInViewport({ ratio: 1 })
    await expect(card.locator('.opportunity-card__comparison')).toBeInViewport({ ratio: 1 })
    await checkButtonContrast(page, 'light', width)
    await page.screenshot({ path: `../.sdd-opportunities-first-light-${width}.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
  }
})

for (const theme of ['dark', 'light'] as const) {
  test(`per-m² exploration exposes its basis, small sample and filter state on mobile in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(150000)
    await setup(page, theme)
    let dualSignal = false
    await page.route('**/api/property-opportunities?**', async route => {
      const url = new URL(route.request().url())
      const data = fixture(url.searchParams.get('operation') === 'sale' ? 'sale' : 'rent')
      const item = data.items[0]
      const areaPrice = item.subject.comparisonPrice / item.subject.area.value
      Object.assign(item.analysis, {
        signals: dualSignal ? ['total_price', 'price_per_m2'] : ['price_per_m2'],
        evidenceTier: 'exploratory',
        comparisonScope: 'wider_area',
        areaTolerancePct: 25,
        distinctN: 6,
        sellersN: 3,
        confidence: 'limited',
        gapPct: 5,
        median: item.subject.comparisonPrice / 0.95,
        perAreaMedian: areaPrice / 0.75,
        perAreaQ25: areaPrice / 0.85,
        perAreaQ75: areaPrice / 0.65,
        perAreaGapPct: 25,
        sensitivity: { minimumGapPct: -2, minimumPerAreaGapPct: 20, omittedSellersN: 3 },
      })
      item.comparables = item.comparables.slice(0, 6)
      item.comparables[0].differences.featureDifferences = [
        { feature: 'furnishing', subject: 'unknown', comparable: 'furnished' },
      ]
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
    })
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 })
      await page
        .getByRole('link', { name: width === 320 ? 'Compra' : 'Alquiler', exact: true })
        .click()
      const card = page.getByTestId('opportunity-card')
      await expect(card).toContainText('25% por debajo de la mediana por m²')
      await expect(card.locator('.opportunity-card__comparison')).toContainText(
        '6 comparables · 3 anunciantes'
      )
      await expect(card.locator('.opportunity-card__labels')).toContainText(
        'Comparación exploratoria'
      )
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await expect(card.locator('.opportunity-card__asking')).toBeInViewport({ ratio: 1 })
      await expect(card.locator('.opportunity-card__comparison')).toBeInViewport({ ratio: 1 })
      await expect(card).toContainText(width === 320 ? 'USD 160.000' : 'UYU 32.000')
      await page.screenshot({ path: `../.sdd-opportunities-signals-${theme}-${width}.png` })
      await card.locator('summary').click()
      await expect(card).toContainText('Muestra pequeña: menos de 8 comparables.')
      await expect(card).toContainText('La superficie puede diferir hasta 25%')
      await expect(card).toContainText(
        'Mobiliario: este aviso, sin confirmar; comparable, amueblado.'
      )
      await expect(card).toContainText('2% por encima de la mediana')
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true)
    }
    dualSignal = true
    await page.getByTestId('opportunity-filter-trigger').click()
    const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true })
    await dialog.locator('summary').filter({ hasText: 'Tipo de evidencia' }).click()
    await expect(dialog.locator('.opportunity-filters__advanced')).toHaveAttribute('open', '')
    for (const [label, option] of [
      ['Comparar por', 'Precio por m²'],
      ['Tipo de evidencia', 'Para explorar'],
    ]) {
      await dialog
        .locator('.v-select')
        .filter({ has: page.getByLabel(label, { exact: true }) })
        .locator('.v-field__input')
        .click()
      await page.getByRole('option', { name: option, exact: true }).click()
    }
    await dialog.getByRole('button', { name: 'Ver resultados', exact: true }).click()
    await expect(page).toHaveURL(/signal=price_per_m2/)
    expect(new URL(page.url()).searchParams.get('evidence')).toBe('exploratory')
    await expect(page.getByTestId('opportunity-card')).toHaveCount(1)
    await expect(page.locator('.opportunity-card__difference')).toHaveText(
      '25% por debajo de la mediana por m²'
    )
    await expect(
      page.getByTestId('opportunity-card').locator('.opportunity-card__labels')
    ).toContainText('Menor costo mensual')
  })
}

test('unfiltered empty snapshots distinguish insufficient evidence from no qualifying prices', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  let analyzed = 0
  await page.route('**/api/property-opportunities?**', async route => {
    const operation =
      new URL(route.request().url()).searchParams.get('operation') === 'sale' ? 'sale' : 'rent'
    const data = fixture(operation)
    data.items = []
    data.total = data.pages = 0
    data.stats = {
      ...data.stats,
      input: 10653,
      eligible: 1841,
      analyzed,
      shortlisted: 0,
      qualified: 0,
    }
    data.coverage[0].observed = 10653
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.getByRole('link', { name: 'Compra', exact: true }).click()
  const empty = page.locator('.opportunities__empty')
  await expect(
    empty.getByRole('heading', { name: 'Todavía faltan comparables independientes' })
  ).toBeVisible()
  await expect(empty).not.toContainText('Probá otra zona')
  await expect(empty.getByRole('link', { name: 'Cómo funciona', exact: true })).toHaveAttribute(
    'href',
    '#opportunity-method'
  )
  await expect(page.locator('#opportunity-coverage')).toContainText('InfoCasas · 10.653')
  await expect(page.locator('#opportunity-coverage')).toContainText(
    'Los avisos leídos no equivalen a viviendas distintas ni a comparables independientes.'
  )
  await expect(page.getByRole('heading', { name: 'Resultados no disponibles' })).toHaveCount(0)
  await page.screenshot({ path: '../.sdd-opportunities-empty-evidence-390.png' })
  analyzed = 15
  await page.getByRole('link', { name: 'Alquiler', exact: true }).click()
  await expect(
    empty.getByRole('heading', {
      name: 'Por ahora no detectamos oportunidades con estos criterios',
    })
  ).toBeVisible()
  await expect(empty).not.toContainText('Probá otra zona')
  await expect(page.getByRole('heading', { name: 'Resultados no disponibles' })).toHaveCount(0)
  await expect(page.getByTestId('opportunity-card')).toHaveCount(0)
})

test('opportunities explain empty and unavailable analyses without substitute results', async ({
  page,
}) => {
  test.setTimeout(150000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await setup(page)
  await page.getByLabel('Máximo mensual (UYU)', { exact: true }).fill('1')
  await page.getByRole('button', { name: 'Ver resultados', exact: true }).click()
  await expect(page.getByTestId('opportunity-card')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'No hay oportunidades con estos filtros' })
  ).toBeVisible()
  await page.route('**/api/property-opportunities?**', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 503, statusMessage: 'Analysis pending' }),
    })
  )
  await page.getByRole('link', { name: 'Compra', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Estamos preparando la comparación' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resultados no disponibles' })).toBeVisible()
  await expect(page.getByTestId('opportunity-card')).toHaveCount(0)
})

test('mobile navigation and results reflow when text is enlarged to 200%', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await setup(page, 'light')
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    const modes = page.getByRole('navigation', { name: 'Cómo buscar propiedades', exact: true })
    for (const link of await modes.getByRole('link').all()) {
      const box = await link.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    }
    const title = page.getByTestId('opportunity-card').locator('h3 a')
    await title.focus()
    await expect(title).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
    await modes.getByRole('link', { name: 'Compra', exact: true }).click()
    await expect(page.getByTestId('opportunity-card')).toContainText('USD 160.000')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
    await page.evaluate(() => {
      document.documentElement.style.removeProperty('font-size')
    })
  }
})

test('selection labels have visible explanations and disappear on stale analysis', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page, 'light')
  const card = page.getByTestId('opportunity-card')
  await expect(card.getByTestId('opportunity-label').first()).toHaveText('Menor costo mensual')
  expect(await card.getByTestId('opportunity-label').count()).toBeLessThanOrEqual(3)
  await card.locator('summary').click()
  await expect(card.locator('.opportunity-card__label-explanations')).toContainText(
    'Fuentes de los comparables'
  )
  await expect(card.locator('.opportunity-card__label-explanations')).toContainText(
    'Se compara alquiler más gastos comunes'
  )
  await expect(card).toContainText('Alquiler UYU 28.000 + gastos comunes UYU 4.000')
  await page.route('**/api/property-opportunities?**', route => {
    const result = fixture('sale')
    result.stale = true
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) })
  })
  await page.getByRole('link', { name: 'Compra', exact: true }).click()
  await expect(card).toContainText('USD 160.000')
  await expect(card.getByTestId('opportunity-label')).toHaveCount(0)
  await expect(card.locator('.opportunity-card__comparison')).toHaveCount(0)
  await expect(
    page.getByText('Este análisis lleva más tiempo sin actualizarse.', { exact: false })
  ).toBeVisible()
})
