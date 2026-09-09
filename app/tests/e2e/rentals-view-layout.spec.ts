import { expect, test, type Page } from '@playwright/test'
import type { RentalOffer, RentalProperty, RentalsResponse } from '../../utils/rentals'

test.use({
  serviceWorkers: 'block',
  extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
})
test.setTimeout(120000)

// Fixtures de navegador: acá se mira cómo se dibuja la lista, no qué trae Mongo.
const observedAt = new Date().toISOString()
const imageUrl = 'https://example.invalid/rental-layout-fixture.png'

function advert(id: string): RentalOffer {
  return {
    source: 'infocasas',
    listingId: id,
    title: 'Apartamento de prueba con luz natural',
    url: `https://www.infocasas.com.uy/fixture/${id}`,
    price: 21000,
    priceUyu: 21000,
    currency: 'UYU',
    commonExpenses: 3000,
    commonExpensesCurrency: 'UYU',
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

function property(index: number): RentalProperty {
  const offer = advert(`layout-fixture-${index}`)
  return {
    key: `layout-fixture-${index}`,
    title: `Apartamento luminoso de prueba ${index + 1}`,
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: 'Calle de prueba 1234',
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
    price: offer.price,
    priceUyu: offer.priceUyu,
    currency: 'UYU',
    offers: [offer],
    matchingOffer: offer,
    sources: ['infocasas'],
    freshAt: observedAt,
    firstSeen: observedAt,
    lastSeen: observedAt,
  }
}

function response(): RentalsResponse {
  const items = Array.from({ length: 6 }, (_, index) => property(index))
  return {
    meta: {
      key: 'uy-rentals',
      generatedAt: observedAt,
      mode: 'full',
      durationMs: 1,
      usdUyu: 40,
      properties: items.length,
      offers: items.length,
      merged: items.length,
      sources: [{ key: 'infocasas', ok: true, listings: 6, note: 'Synthetic browser fixture' }],
    },
    coverage: {
      computedAt: observedAt,
      properties: items.length,
      sources: [{ key: 'infocasas', properties: items.length }],
    },
    items,
    total: items.length,
    page: 1,
    perPage: 24,
    medianUyu: 21000,
    facets: {
      departments: [{ value: 'Montevideo', count: items.length }],
      neighborhoods: [{ value: 'Cordón', count: items.length }],
      types: [{ value: 'apartamento', count: items.length }],
      sources: [{ value: 'infocasas', count: items.length }],
      priceMaxUyu: 21000,
    },
  }
}

async function setup(page: Page) {
  // Sin suscripciones, contactos, analítica ni escrituras de producción.
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
  await page.route(/\/api\/rentals(?:\/mapa)?(?:\?|$)/, route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/mapa'))
      return route.fulfill({ json: { points: [], total: 6, located: 0, shown: 0, limit: 3000 } })
    return route.fulfill({ json: response() })
  })
  // Un gesto real de consentimiento prueba que hidrató. Se navega después, para
  // que la intercepción del API del navegador valga sin sustituir el payload del
  // servidor: la Mongo de pruebas no tiene avisos.
  await page.goto('/acerca', { waitUntil: 'domcontentloaded' })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible()
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 60000 })
  await gotoDirectory(page)
}

async function gotoDirectory(page: Page) {
  await page.evaluate(async target => {
    const element = document.getElementById('__nuxt') as HTMLElement & {
      __vue_app__: {
        config: { globalProperties: { $router: { push: (path: string) => unknown } } }
      }
    }
    await element.__vue_app__.config.globalProperties.$router.push(target)
  }, '/alquileres-uruguay')
  await expect(page.locator('.rental-card')).toHaveCount(6)
}

const grid = (page: Page) => page.getByTestId('rental-results-grid')
const columns = async (page: Page, selector: string) =>
  (
    await page
      .locator(selector)
      .first()
      .evaluate(element => getComputedStyle(element).gridTemplateColumns)
  )
    .split(' ')
    .filter(Boolean).length
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('cu_rentals_layout'))
const alignments = (page: Page) =>
  page
    .locator('.rental-card')
    .first()
    .evaluate(card =>
      ['.rental-card__where', '.rental-card__price', 'h3', '.rental-card__specs'].map(selector => {
        const element = card.querySelector(selector)
        return element ? getComputedStyle(element).textAlign : 'ausente'
      })
    )

test('el mosaico es lo que se sirve y la elección de vista sobrevive a la recarga', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 950 })
  await setup(page)

  // Por defecto: mosaico en varias columnas y ninguna preferencia guardada.
  await expect(grid(page)).toHaveClass(/rentals-grid--mosaico/)
  expect(await columns(page, '.rentals-grid')).toBeGreaterThan(1)
  expect(await stored(page)).toBeNull()
  // Zona, precio, titulo y ficha arrancan en el mismo borde, como en Mercado
  // Libre. Centrado se reporto dos veces y ninguna prueba lo habria visto.
  expect(await alignments(page)).toEqual(['start', 'start', 'start', 'start'])

  // Filas: una sola columna de tarjetas y tres zonas dentro de cada una.
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(grid(page)).toHaveClass(/rentals-grid--lista/)
  expect(await columns(page, '.rentals-grid')).toBe(1)
  expect(await columns(page, '.rental-card')).toBe(3)
  await expect(page.locator('.rental-card__rail').first()).toBeVisible()
  expect(await alignments(page)).toEqual(['start', 'start', 'start', 'start'])
  expect(await stored(page)).toBe('lista')

  // Recarga completa: el servidor sigue mandando mosaico y el cliente aplica lo guardado.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(grid(page)).toHaveClass(/rentals-grid--lista/)
  expect(await stored(page)).toBe('lista')

  // Volver al mosaico también se recuerda.
  await page.getByRole('button', { name: 'Mosaico', exact: true }).click()
  await expect(grid(page)).toHaveClass(/rentals-grid--mosaico/)
  expect(await columns(page, '.rentals-grid')).toBeGreaterThan(1)
  expect(await stored(page)).toBe('mosaico')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(grid(page)).toHaveClass(/rentals-grid--mosaico/)
})

test('un contenedor de auto ads no puede centrar la ficha', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 950 })
  await setup(page)

  // Auto ads envuelve contenido nuestro en un div con text-align:center en el
  // atributo style, y todo lo de adentro lo hereda. No aparece en una medicion
  // comun porque sin consentimiento no se cargan anuncios: se reproduce a mano.
  await page.evaluate(() => {
    const target =
      document.querySelector('.rentals-workspace') ?? document.querySelector('.rentals')
    if (!target?.parentNode) throw new Error('sin contenedor donde envolver')
    const wrapper = document.createElement('div')
    wrapper.className = 'google-auto-placed'
    wrapper.setAttribute('style', 'width:100%;height:auto;clear:both;text-align:center')
    target.parentNode.insertBefore(wrapper, target)
    wrapper.appendChild(target)
  })

  expect(await alignments(page)).toEqual(['start', 'start', 'start', 'start'])
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(grid(page)).toHaveClass(/rentals-grid--lista/)
  expect(await alignments(page)).toEqual(['start', 'start', 'start', 'start'])
})

test('la vista elegida no viaja en la URL y sobrevive a ir y volver del mapa', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 950 })
  await setup(page)

  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(grid(page)).toHaveClass(/rentals-grid--lista/)
  expect(new URL(page.url()).search).toBe('')

  await page.getByRole('button', { name: 'Mapa', exact: true }).click()
  await expect(page).toHaveURL(/view=mapa/)
  await expect(grid(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(grid(page)).toHaveClass(/rentals-grid--lista/)
  expect(new URL(page.url()).search).toBe('')
})

test('entre 960 y 1280 la fila deja los portales y el enlace al pie', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 950 })
  await setup(page)
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(grid(page)).toHaveClass(/rentals-grid--lista/)

  // Dos zonas: la foto a la izquierda, y el riel bajo la ficha, no como tercera columna.
  expect(await columns(page, '.rental-card')).toBe(2)
  const card = page.locator('.rental-card').first()
  const main = await card.locator('.rental-card__main').boundingBox()
  const rail = await card.locator('.rental-card__rail').boundingBox()
  expect(rail!.y).toBeGreaterThan(main!.y)
  expect(Math.round(rail!.x)).toBe(Math.round(main!.x))
})
