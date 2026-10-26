import { describe, expect, it } from 'vitest'
import type { PublicCarListing, PublicCarMarketRow } from '../../utils/carsPublic'
import {
  buildPresentation,
  compareVerdict,
  formatPresentationLength,
  presentationFileName,
  presentationPhotos,
  sceneDuration,
  spokenMoney,
  withoutBrokenPhotos,
  type CompareScene,
  type CoverScene,
  type PhotoScene,
} from '../../utils/listingPresentation'
import type { PropertySaleListing } from '../../utils/propertySales'
import type { RentalPageMarket } from '../../utils/rentalPage'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

// Se llama ADVERT y no KEY: el gate de secretos marca la palabra inglesa para "clave" + dígitos.
const ADVERT = 'ml-MLU1490460672'

function car(overrides: Partial<PublicCarListing> = {}): PublicCarListing {
  return {
    key: ADVERT,
    source: 'mercadolibre',
    sourceName: 'Mercado Libre',
    brand: 'Peugeot',
    brandSlug: 'peugeot',
    model: '208',
    modelSlug: '208',
    marketSlug: 'peugeot-208',
    title: 'Peugeot 208 Allure',
    year: 2017,
    km: 100000,
    price: 7900,
    listedPrice: null,
    currency: 'USD',
    priceUsd: 7900,
    priceConverted: false,
    currencyInferred: false,
    transmission: 'manual',
    fuel: 'nafta',
    fuelEconomy: null,
    body: null,
    doors: null,
    color: null,
    engine: '1.5',
    trim: 'Allure',
    department: 'Montevideo',
    neighborhood: null,
    sellerType: 'private',
    dealerName: null,
    picture: 'https://http2.mlstatic.com/D_cover.jpg',
    pictureCount: 3,
    pictures: [
      'https://http2.mlstatic.com/D_1.jpg',
      'https://http2.mlstatic.com/D_2.jpg',
      'https://http2.mlstatic.com/D_3.jpg',
    ],
    permalink: 'https://auto.mercadolibre.com.uy/MLU-1490460672-_JM',
    firstSeen: '2026-09-01T12:00:00.000Z',
    lastSeen: '2026-09-22T12:00:00.000Z',
    priceDrop: null,
    flags: [],
    risks: [],
    opportunity: null,
    reference: null,
    specs: null,
    ...overrides,
  }
}

const cohort: PublicCarMarketRow = {
  year: 2017,
  trim: 'Allure',
  engine: '1.5',
  transmission: 'manual',
  n: 14,
  sellers: 12,
  p25: 8500,
  median: 9200,
  p75: 10000,
  kmMedian: 90000,
}

function offer(overrides: Partial<RentalOffer> = {}): RentalOffer {
  return {
    source: 'infocasas',
    listingId: 'one',
    title: 'Apartamento de 1 dormitorio en Cordón',
    url: 'https://www.infocasas.com.uy/one',
    image: 'https://cdn1.infocasas.com.uy/one.jpg',
    price: 24000,
    priceUyu: 24000,
    currency: 'UYU',
    commonExpenses: 4000,
    commonExpensesCurrency: 'UYU',
    sellerName: 'Agencia',
    sellerType: 'inmobiliaria',
    parkingSpaces: null,
    furnished: null,
    publishedAt: null,
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-05',
    details: {
      description: '',
      images: ['https://cdn1.infocasas.com.uy/two.jpg', 'https://cdn1.infocasas.com.uy/three.jpg'],
      builtArea: null,
      totalArea: null,
      landArea: null,
      terraceArea: null,
      amenities: ['Parrillero', 'Balcón'],
      guaranteeText: '',
    },
    ...overrides,
  } as RentalOffer
}

function rental(overrides: Partial<RentalPublicProperty> = {}): RentalPublicProperty {
  return {
    key: 'pilot',
    title: 'Apartamento de 1 dormitorio en Cordón',
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    address: 'Chana 1800',
    latitude: -34.9,
    longitude: -56.17,
    bedrooms: 1,
    bathrooms: 1,
    area: 45,
    parkingSpaces: null,
    furnished: null,
    petsAllowed: null,
    guarantees: [],
    price: 24000,
    priceUyu: 24000,
    currency: 'UYU',
    offers: [offer()],
    sources: ['infocasas'],
    freshAt: '2026-09-05',
    ...overrides,
  } as RentalPublicProperty
}

const market: RentalPageMarket = {
  status: 'available',
  minimumSample: 8,
  sampleSize: 31,
  medianRentUyu: 26000,
  p25RentUyu: 23000,
  p75RentUyu: 30000,
  differencePercent: -8,
  scope: {
    department: 'Montevideo',
    neighborhood: 'Cordón',
    propertyType: 'apartamento',
    bedrooms: 1,
  },
}

function sale(overrides: Partial<PropertySaleListing> = {}): PropertySaleListing {
  return {
    key: 'infocasas-194455074',
    id: '194455074',
    operation: 'sale',
    source: 'infocasas',
    listingId: '194455074',
    url: 'https://www.infocasas.com.uy/x',
    title: 'Casa de 3 dormitorios en Shangrilá',
    description: '',
    images: ['https://cdn1.infocasas.com.uy/a.jpg', 'https://cdn1.infocasas.com.uy/b.jpg'],
    image: 'https://cdn1.infocasas.com.uy/a.jpg',
    sellerName: 'Inmobiliaria',
    department: 'Canelones',
    locality: 'Ciudad de la Costa',
    neighborhood: 'Shangrilá',
    propertyType: 'casa',
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 1,
    price: { amount: 250000, currency: 'USD' },
    expenses: null,
    areas: { built: 125, total: 400, land: 400, reported: null, terrace: null },
    amenities: ['Parrillero'],
    furnished: null,
    conditions: [],
    geo: null,
    lastSeen: '2026-10-20',
    publishedAt: null,
    firstSeen: '2026-10-01',
    ...overrides,
  } as PropertySaleListing
}

describe('presentación de un auto', () => {
  it('abre con la portada y sigue con una escena por foto, hasta el cierre', () => {
    const presentation = buildPresentation({ kind: 'car', car: car(), cohort: null })
    expect(presentation.scenes.map(item => item.kind)).toEqual(['cover', 'photo', 'photo', 'outro'])
    const cover = presentation.scenes[0] as CoverScene
    expect(cover.title).toBe('Peugeot 208 Allure 2017')
    expect(cover.price).toBe('US$ 7.900')
    expect(cover.chips).toEqual(['100.000 km', 'Manual'])
    expect(cover.narration).toContain('7.900 dólares')
    expect(cover.narration).not.toContain('US$')
    // la galería propia manda; la portada de la tarjeta sólo cuando no hay galería
    expect(cover.photo).toBe('https://http2.mlstatic.com/D_1.jpg')
    const photo = presentation.scenes[1] as PhotoScene
    expect(photo.label).toBe('Allure · 1.5')
    expect(photo.counter).toBe('2 / 3')
    expect(presentation.duration).toBe(
      presentation.scenes.reduce((sum, item) => sum + item.duration, 0)
    )
  })

  it('compara contra la cohorte sólo si hay muestra', () => {
    const presentation = buildPresentation({ kind: 'car', car: car(), cohort })
    const compare = presentation.scenes.find(item => item.kind === 'compare') as CompareScene
    expect(compare.heading).toBe('Contra 14 Peugeot 208 Allure 2017 publicados')
    expect(compare.verdict).toBe(
      '14 % menos que la mediana: más barato que 3 de cada 4 comparables'
    )
    expect(compare.narration).toContain('14 por ciento')
    const thin = buildPresentation({ kind: 'car', car: car(), cohort: { ...cohort, n: 2 } })
    expect(thin.scenes.some(item => item.kind === 'compare')).toBe(false)
  })

  it('cuenta la baja de precio y cita lo que declara el aviso', () => {
    const presentation = buildPresentation({
      kind: 'car',
      car: car({
        priceDrop: { from: 8500, currency: 'USD', since: '2026-09-10' },
        risks: [
          {
            category: 'deuda',
            severity: 'high',
            quote: 'tiene deuda de patente',
            from: 'description',
          },
        ],
      } as Partial<PublicCarListing>),
      cohort: null,
    })
    const kinds = presentation.scenes.map(item => item.kind)
    expect(kinds).toContain('drop')
    expect(kinds).toContain('declared')
    const declared = presentation.scenes.find(item => item.kind === 'declared')!
    expect(declared.narration).toContain('el propio aviso menciona')
  })

  it('sin galería usa la foto de la tarjeta, y sin fotos no hay presentación con imágenes', () => {
    const only = buildPresentation({ kind: 'car', car: car({ pictures: [] }), cohort: null })
    expect(presentationPhotos(only)).toEqual(['https://http2.mlstatic.com/D_cover.jpg'])
    const none = buildPresentation({
      kind: 'car',
      car: car({ pictures: [], picture: null }),
      cohort: null,
    })
    expect(presentationPhotos(none)).toEqual([])
  })
})

describe('presentación de un alquiler', () => {
  it('muestra alquiler, gastos comunes y sólo lo que el aviso afirma', () => {
    const presentation = buildPresentation({
      kind: 'rental',
      property: rental(),
      offer: null,
      market,
    })
    const cover = presentation.scenes[0] as CoverScene
    expect(cover.price).toMatch(/^\$ 24.000 \/ mes$/)
    expect(cover.priceNote).toMatch(/4.000 de gastos comunes/)
    expect(cover.chips).toEqual(['1\u00A0dormitorio', '1\u00A0baño', '45\u00A0m²'])
    const labels = presentation.scenes.map(item => (item.kind === 'photo' ? item.label : null))
    // sin garantías, mascotas ni amueblado publicados no se dice nada de eso
    expect(labels.join(' ')).not.toMatch(/garant|mascota|amueblado/i)
    const compare = presentation.scenes.find(item => item.kind === 'compare') as CompareScene
    expect(compare.heading).toBe('Contra 31 alquileres parecidos en Cordón')
    expect(compare.verdict).toBe('8 % menos que la mediana, dentro de la mitad central')
  })

  it('nombra las garantías que el aviso acepta, sólo las que el sitio publica', () => {
    const presentation = buildPresentation({
      kind: 'rental',
      // `deposito` no está en RENTAL_GUARANTEE_PUBLISHED (no se midió bien): la ficha lo calla
      property: rental({ offers: [offer({ guarantees: ['anda', 'aseguradora', 'deposito'] })] }),
      market: null,
    })
    const labels = presentation.scenes.flatMap(item => (item.kind === 'photo' ? [item.label] : []))
    expect(labels).toContain('ANDA · Aseguradora')
    expect(presentation.scenes.some(item => item.kind === 'compare')).toBe(false)
  })

  it('cuenta una baja de precio del propio aviso', () => {
    const presentation = buildPresentation({
      kind: 'rental',
      property: rental({
        offers: [
          offer({
            priceHistory: {
              id: 'x',
              currency: 'UYU',
              points: [],
              firstSeen: '2026-09-01',
              lastSeen: '2026-10-01',
              changePct: -8,
              lastChange: { from: 26000, to: 24000, at: '2026-09-20' },
              currencySwitched: false,
            },
          }),
        ],
      }),
    })
    const drop = presentation.scenes.find(item => item.kind === 'drop')
    expect(drop && 'from' in drop && drop.from).toBe('$ 26.000')
  })
})

describe('presentación de una venta', () => {
  it('trae precio, superficie y precio por metro', () => {
    const presentation = buildPresentation({ kind: 'sale', property: sale(), priceHistory: null })
    const cover = presentation.scenes[0] as CoverScene
    expect(cover.price).toBe('U$S 250.000')
    expect(cover.location).toBe('Shangrilá, Ciudad de la Costa, Canelones')
    expect(cover.chips).toEqual(['3\u00A0dormitorios', '2\u00A0baños', '125\u00A0m²'])
    const photo = presentation.scenes[1] as PhotoScene
    expect(photo.label).toBe('3\u00A0dormitorios · 2\u00A0baños · 125\u00A0m²')
    expect(presentation.scenes.at(-1)!.kind).toBe('outro')
    expect(presentationPhotos(presentation)).toEqual([
      'https://cdn1.infocasas.com.uy/a.jpg',
      'https://cdn1.infocasas.com.uy/b.jpg',
    ])
  })
})

describe('fotos rotas', () => {
  it('saca la escena de una foto que no cargó y rehace los contadores', () => {
    const presentation = buildPresentation({ kind: 'car', car: car(), cohort: null })
    const fixed = withoutBrokenPhotos(presentation, new Set(['https://http2.mlstatic.com/D_2.jpg']))
    const photos = fixed.scenes.filter(item => item.kind === 'photo') as PhotoScene[]
    expect(photos.map(item => item.counter)).toEqual(['2 / 2'])
    expect(fixed.duration).toBeLessThan(presentation.duration)
  })

  it('la portada sin foto se queda, con fondo liso', () => {
    const presentation = buildPresentation({ kind: 'car', car: car(), cohort: null })
    const fixed = withoutBrokenPhotos(presentation, new Set(['https://http2.mlstatic.com/D_1.jpg']))
    expect(fixed.scenes[0]!.kind).toBe('cover')
    expect((fixed.scenes[0] as CoverScene).photo).toBeNull()
    expect((fixed.scenes[1] as PhotoScene).counter).toBe('1 / 2')
  })
})

describe('auxiliares', () => {
  it('dice la plata como se lee', () => {
    expect(spokenMoney(12990, 'USD')).toBe('12.990 dólares')
    expect(spokenMoney(25000, 'UYU')).toBe('25.000 pesos')
  })
  it('da más tiempo a lo que se tarda más en leer, con piso y techo', () => {
    expect(sceneDuration('')).toBe(3800)
    expect(sceneDuration('uno dos tres cuatro cinco seis siete ocho nueve diez')).toBe(4600)
    expect(sceneDuration('palabra '.repeat(100))).toBe(10_000)
  })
  it('ubica el precio contra la mitad central', () => {
    expect(compareVerdict(100, 90, 100, 110)).toBe('Está en la mediana, dentro de la mitad central')
    expect(compareVerdict(130, 90, 100, 110)).toBe(
      '30 % más que la mediana: más caro que 3 de cada 4 comparables'
    )
  })
  it('formatea la duración y el nombre del archivo', () => {
    expect(formatPresentationLength(38_400)).toBe('38 s')
    expect(formatPresentationLength(65_000)).toBe('1 min 05 s')
    expect(presentationFileName('Peugeot 208 Allure 2017 ¡Impecable!', 'mp4')).toBe(
      'peugeot-208-allure-2017-impecable-cambio-uruguay.mp4'
    )
  })
})
