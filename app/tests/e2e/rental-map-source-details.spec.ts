import { expect, test } from '@playwright/test'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

test.use({ serviceWorkers: 'block' })

for (const sample of [
  {
    locale: 'es',
    width: 320,
    heading: 'Más sobre este alquiler',
    area: 'Superficie construida',
    detail: 'Ver ficha completa',
  },
  {
    locale: 'en',
    width: 390,
    heading: 'More about this rental',
    area: 'Built area',
    detail: 'View full property details',
  },
  {
    locale: 'pt',
    width: 1440,
    heading: 'Mais sobre este aluguel',
    area: 'Área construída',
    detail: 'Ver ficha completa',
  },
]) {
  test(`map opens source-specific detail on demand at ${sample.width}px (${sample.locale})`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: sample.width, height: 820 })
    const domain = new URL(test.info().project.use.baseURL || 'http://127.0.0.1:3311').hostname
    await context.addCookies([
      { name: 'lang', value: sample.locale, domain, path: '/' },
      { name: 'cu_consent', value: 'denied', domain, path: '/' },
    ])
    await page.addInitScript(() => localStorage.setItem('not_show_twitter', 'true'))
    const today = new Date().toISOString().slice(0, 10)
    const first: RentalOffer = {
      source: 'infocasas',
      listingId: 'infocasas:map301',
      title: 'Unidad 301 con terraza',
      url: 'https://www.infocasas.com.uy/fixture/301',
      price: 24000,
      currency: 'UYU',
      priceUyu: 24000,
      commonExpenses: 0,
      commonExpensesCurrency: null,
      sellerName: 'Agencia de prueba',
      sellerType: 'inmobiliaria',
      image: null,
      parkingSpaces: null,
      furnished: null,
      petsAllowed: null,
      guarantees: [],
      publishedAt: today,
      firstSeen: today,
      lastSeen: today,
      details: {
        description: 'NO MOSTRAR: detalle de otro aviso.',
        images: [],
        builtArea: 99,
        totalArea: 99,
        landArea: null,
        terraceArea: null,
        amenities: ['NO MOSTRAR'],
        guaranteeText: '',
      },
    }
    const matching: RentalOffer = {
      ...first,
      source: 'elpais',
      listingId: 'elpais:map301',
      url: 'https://inmuebles.elpais.com.uy/fixture301',
      details: {
        description: `Apartamento con terraza propia y cocina independiente. ${'Dato publicado por el anunciante. '.repeat(30)}`,
        images: [],
        builtArea: 45,
        totalArea: 55,
        landArea: null,
        terraceArea: 10,
        amenities: ['Ascensor', 'Terraza privada'],
        guaranteeText: '',
      },
    }
    const property: RentalPublicProperty = {
      key: 'fixture-map301',
      title: first.title,
      propertyType: 'apartamento',
      department: 'Montevideo',
      neighborhood: 'Cordón',
      address: '',
      latitude: -34.9,
      longitude: -56.18,
      bedrooms: 1,
      bathrooms: 1,
      area: 55,
      parkingSpaces: null,
      furnished: null,
      petsAllowed: null,
      guarantees: [],
      price: 24000,
      priceUyu: 24000,
      currency: 'UYU',
      offers: [first, matching],
      matchingOffer: matching,
      sources: ['infocasas', 'elpais'],
      freshAt: today,
      firstSeen: today,
      lastSeen: today,
    }
    let detailRequests = 0
    await page.route(/\/api\/rentals\/mapa(?:\?|$)/, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          points: [
            {
              key: property.key,
              lat: property.latitude,
              lng: property.longitude,
              price: 24000,
              currency: 'UYU',
              bedrooms: 1,
              area: 55,
              neighborhood: 'Cordón',
              offers: 2,
              url: matching.url,
            },
          ],
          total: 1,
          located: 1,
          shown: 1,
          limit: 3000,
        }),
      })
    )
    await page.route(/\/api\/rentals\/propiedad\/fixture-map301(?:\?|$)/, route => {
      detailRequests++
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ property, usdUyu: 41.5 }),
      })
    })
    const prefix = sample.locale === 'es' ? '' : `/${sample.locale}`
    await page.goto(`${prefix}/alquileres-uruguay?view=mapa`, { waitUntil: 'domcontentloaded' })
    const marker = page.locator('.casa-pin[title="Cordón"]')
    await expect(marker).toBeVisible({ timeout: 90000 })
    expect(detailRequests).toBe(0)
    await expect(async () => {
      if (!(await page.getByTestId('rental-map-detail').isVisible())) await marker.click()
      await expect(page.getByTestId('rental-map-source-details')).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 30000 })
    const panel = page.getByTestId('rental-map-detail')
    const source = panel.getByTestId('rental-map-source-details')
    await expect(source.getByRole('heading', { name: sample.heading })).toBeVisible()
    await expect(source).toContainText('Inmuebles El País')
    await expect(source).toContainText(sample.area)
    await expect(source).toContainText('45 m²')
    await expect(source).toContainText('10 m²')
    await expect(source).toContainText('Ascensor')
    await expect(source).not.toContainText('NO MOSTRAR')
    await expect(source).not.toContainText('99 m²')
    const excerpt = (await source.locator('.rental-map-detail__description').textContent()) || ''
    expect(excerpt.length).toBeLessThanOrEqual(601)
    expect(excerpt.endsWith('…')).toBe(true)
    await expect(panel.getByRole('link', { name: sample.detail, exact: true })).toHaveAttribute(
      'href',
      `${prefix}/alquileres/fixture-map301`
    )
    const footer = panel.locator('.rental-map-detail__footer')
    await expect(footer).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
    expect(detailRequests).toBe(1)
  })
}
