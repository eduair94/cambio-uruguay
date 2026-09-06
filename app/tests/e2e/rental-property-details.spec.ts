import { expect, test, type Page } from '@playwright/test'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

// The normal result link opens a synthetic dossier. No catalogue or remote advert is changed.
test.use({ serviceWorkers: 'block', extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })

async function openDossier(page: Page) {
  const date = new Date().toISOString().slice(0, 10)
  const first: RentalOffer = {
    source: 'infocasas',
    listingId: 'infocasas:fixture301',
    url: 'https://www.infocasas.com.uy/fixture/301',
    title: 'Apartamento 301 con terraza',
    price: 28000,
    currency: 'UYU',
    priceUyu: 28000,
    commonExpenses: 0,
    commonExpensesCurrency: null,
    sellerName: 'Inmobiliaria de prueba',
    sellerType: 'inmobiliaria',
    image: 'https://rental-test.example/cover.png',
    parkingSpaces: 1,
    furnished: null,
    petsAllowed: true,
    guarantees: ['anda'],
    publishedAt: date,
    firstSeen: date,
    lastSeen: date,
    details: {
      description:
        'Apartamento luminoso con terraza propia y cocina independiente. Texto del primer anunciante.',
      images: [
        'https://rental-test.example/kitchen.png',
        'https://rental-test.example/balcony.png',
      ],
      builtArea: 45,
      totalArea: 55,
      landArea: null,
      terraceArea: 10,
      amenities: ['Ascensor', 'Terraza'],
      guaranteeText: 'Acepta ANDA.',
    },
  }
  const second: RentalOffer = {
    ...first,
    source: 'elpais',
    listingId: 'elpais:fixture301',
    url: 'https://inmuebles.elpais.com.uy/fixture301',
    title: 'Unidad 301 en alquiler',
    price: 27000,
    priceUyu: 27000,
    commonExpenses: 1500,
    commonExpensesCurrency: 'UYU',
    details: {
      ...first.details!,
      description: 'Texto del segundo anunciante: consultar disponibilidad para ingresar.',
      guaranteeText: 'Consultar garantías aceptadas.',
    },
  }
  await page.route('https://rental-test.example/**', route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#67899a"/></svg>',
    })
  )
  function propertyFor(key: string): RentalPublicProperty {
    return {
      key,
      title: first.title,
      propertyType: 'apartamento',
      department: 'Montevideo',
      neighborhood: 'Cordón',
      address: 'Chana 1800 unidad 301',
      latitude: null,
      longitude: null,
      bedrooms: 1,
      bathrooms: 1,
      area: 55,
      parkingSpaces: 1,
      furnished: null,
      petsAllowed: true,
      guarantees: ['anda'],
      price: first.price,
      priceUyu: first.price,
      currency: 'UYU',
      offers: [first, second],
      matchingOffer: first,
      sources: ['infocasas', 'elpais'],
      freshAt: date,
      firstSeen: date,
      lastSeen: date,
    }
  }
  await page.route(/\/api\/rentals(?:\?|$)/, async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        meta: null,
        coverage: null,
        items: [propertyFor('fixture301')],
        total: 1,
        page: 1,
        perPage: 24,
        medianUyu: 28000,
        facets: {
          departments: [{ value: 'Montevideo', count: 1 }],
          neighborhoods: [{ value: 'Cordón', count: 1 }],
          types: [{ value: 'apartamento', count: 1 }],
          sources: [{ value: 'infocasas', count: 1 }],
          priceMaxUyu: 28000,
        },
      }),
    })
  })
  await page.route(/\/api\/rentals\/ficha\/[^/?]+(?:\?|$)/, async route => {
    const key = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1)!)
    const property = propertyFor(key)
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        property,
        usdUyu: 41.5,
        canonicalPath: `/alquileres/${key}`,
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
      }),
    })
  })
  await page.goto('/alquileres-uruguay?page=2', { waitUntil: 'domcontentloaded' })
  await expect(async () => {
    if (new URL(page.url()).searchParams.has('page')) {
      if ((page.viewportSize()?.width ?? 1440) < 960) {
        const trigger = page.getByTestId('rental-mobile-filters-trigger')
        if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click()
        await expect(page.getByTestId('rental-mobile-filters-dialog')).toBeVisible({
          timeout: 1000,
        })
      }
      await page.getByTestId('rental-filters-apply').click()
    }
    await expect(page.locator('.rental-card')).toHaveCount(1, { timeout: 1500 })
  }).toPass({ timeout: 90000, intervals: [500, 1000] })
  await expect(async () => {
    const link = page.locator('.rental-card h3 a').first()
    if (!/\/alquileres\//.test(new URL(page.url()).pathname)) await link.click()
    await expect(page.getByTestId('rental-property-page').locator('h1')).toHaveText(first.title, {
      timeout: 1500,
    })
  }).toPass({ timeout: 90000, intervals: [500, 1000] })
}

for (const width of [320, 390, 1440]) {
  test(`rental dossier source details and accessible photo viewer at ${width}px`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: 820 })
    const domain = new URL(test.info().project.use.baseURL || 'http://localhost:3311').hostname
    await context.addCookies([
      { name: 'lang', value: 'es', domain, path: '/' },
      { name: 'cu_consent', value: 'denied', domain, path: '/' },
    ])
    await page.addInitScript(() => localStorage.setItem('not_show_twitter', 'true'))
    await openDossier(page)
    const detail = page.getByTestId('rental-property-page')
    await expect(detail.getByTestId('rental-source-description')).toContainText('primer anunciante')
    await expect(detail).toContainText('Superficie construida')
    await expect(detail).toContainText('45 m²')
    await expect(detail).toContainText('Superficie de terrazas')
    await expect(detail).toContainText('10 m²')
    await expect(detail.locator('.rental-page__monthly-total')).toContainText('$ 28.000')
    const expand = page.getByRole('button', { name: 'Ampliar foto', exact: true })
    await expand.click()
    const viewer = page.getByRole('dialog', { name: 'Fotos del alquiler', exact: true })
    await expect(viewer).toBeVisible()
    await expect(viewer.getByRole('status')).toHaveText('Foto 1 de 3')
    const next = viewer.getByRole('button', { name: 'Foto siguiente', exact: true })
    await next.click()
    await expect(viewer.getByRole('status')).toHaveText('Foto 2 de 3')
    await page.keyboard.press('ArrowRight')
    await expect(viewer.getByRole('status')).toHaveText('Foto 3 de 3')
    const close = viewer.getByRole('button', { name: 'Cerrar galería', exact: true })
    expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const box = (await close.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
    await page.keyboard.press('Escape')
    await expect(viewer).not.toBeVisible()
    await expect(expand).toBeFocused()
    await detail
      .getByRole('button', { name: 'Usar este aviso para calcular', exact: true })
      .nth(1)
      .click()
    await expect(detail.getByTestId('rental-source-description')).toContainText(
      'segundo anunciante'
    )
    await expect(detail.getByTestId('rental-source-description')).not.toContainText(
      'primer anunciante'
    )
    await expect(detail.locator('.rental-page__monthly-total')).toContainText('$ 28.500')
    await expect(detail.getByTestId('rental-page-contact')).toHaveAttribute(
      'href',
      'https://inmuebles.elpais.com.uy/fixture301'
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
  })
}
