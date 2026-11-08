import type { RentalOffer, RentalPublicProperty, RentalSource } from '../../../utils/rentals'

// El caso medido el 8/11/2026 en /api/rentals/ficha/montevideo-pocitos-bulevar-espana-nh6byn-10rlmiq:
// la vivienda de RE/MAX en Bulevar España publicada cuatro veces más (Mercado Libre, El País y dos
// claves de InfoCasas), otra vivienda publicada dos veces (Mercado Libre e InfoCasas) y, para
// completar la lista, seis viviendas distintas del mismo barrio a precios cercanos.
// Las claves van sin dígitos a propósito: el escáner de secretos marca `key: '<texto con dígitos>'`.

let serial = 0
function offer(source: RentalSource, overrides: Partial<RentalOffer> = {}): RentalOffer {
  serial += 1
  return {
    source,
    listingId: `${source}:listing-${serial}`,
    url: `https://www.${source}.com.uy/aviso-${serial}`,
    title: '',
    price: 60000,
    currency: 'UYU',
    priceUyu: 60000,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: '',
    sellerType: 'desconocido',
    image: null,
    parkingSpaces: null,
    furnished: null,
    publishedAt: null,
    firstSeen: '2026-10-08',
    lastSeen: '2026-11-07',
    ...overrides,
  }
}

export function rentalHome(
  key: string,
  source: RentalSource,
  overrides: Partial<RentalPublicProperty> & { advert?: Partial<RentalOffer> } = {}
): RentalPublicProperty {
  const { advert = {}, ...rest } = overrides
  const title = rest.title ?? 'Alquiler 2 Dormitorios Y Servicio, Cochera, Balcón'
  const price = rest.price ?? 60000
  const first = offer(source, { title, price, priceUyu: price, ...advert })
  return {
    key,
    title,
    propertyType: 'apartamento',
    department: 'Montevideo',
    neighborhood: 'Pocitos',
    address: 'Bulevar España 2600',
    latitude: -34.9130046,
    longitude: -56.1558734,
    bedrooms: 2,
    bathrooms: 3,
    area: 84,
    parkingSpaces: 1,
    furnished: null,
    petsAllowed: null,
    guarantees: [],
    price,
    priceUyu: price,
    currency: 'UYU',
    offers: [first],
    matchingOffer: first,
    sources: [source],
    freshAt: '2026-10-08',
    firstSeen: '2026-10-08',
    lastSeen: '2026-11-07',
    ...rest,
  }
}

const photo = (name: string) => ({ image: `https://images.example.com/${name}.jpg` })

/** La vivienda de la ficha y sus cuatro copias (la de InfoCasas con foto y gastos es la mejor). */
export function bulevarEspanaCopies() {
  return {
    subject: rentalHome('bulevar-espana-subject', 'mercadolibre', {
      advert: { sellerName: 'Mercado Libre', commonExpenses: 11000, commonExpensesCurrency: 'UYU' },
    }),
    copies: [
      rentalHome('bulevar-espana-mercadolibre', 'mercadolibre', {
        advert: { sellerName: 'Mercado Libre' },
      }),
      rentalHome('bulevar-espana-elpais', 'elpais', {
        title: 'Alquiler 2 dormitorios y servicio, cochera, balcón',
        neighborhood: 'POCITOS',
        latitude: -34.913005,
        longitude: -56.155873,
        advert: { sellerName: 'REMAX UNICO', ...photo('elpais') },
      }),
      rentalHome('bulevar-espana-infocasas', 'infocasas', {
        title: 'Alquiler 2 dormitorios y servicio, cochera, balcón',
        area: 90,
        latitude: -34.913004570033,
        longitude: -56.15587335598,
        advert: {
          sellerName: 'RE/MAX',
          sellerType: 'inmobiliaria',
          commonExpenses: 11000,
          commonExpensesCurrency: 'UYU',
          ...photo('infocasas'),
        },
      }),
      rentalHome('bulevar-espana-infocasas-relist', 'infocasas', {
        title: 'Alquiler 2 dormitorios y servicio, cochera, balcón',
        area: 90,
        latitude: -34.913004570033,
        longitude: -56.15587335598,
        advert: { sellerName: 'RE/MAX', sellerType: 'inmobiliaria' },
      }),
    ],
  }
}

/** Otra vivienda publicada dos veces y seis viviendas distintas a precios cercanos. */
export function pocitosAlternatives() {
  const other = {
    title: 'Alquila Apartamento Pocitos 2 Dormitorios 2 Baños Garaje',
    bathrooms: 2,
    area: 75,
    latitude: -34.908581,
    longitude: -56.142025,
  }
  return {
    twice: [
      rentalHome('pocitos-garaje-mercadolibre', 'mercadolibre', {
        ...other,
        advert: {
          sellerName: 'Mercado Libre',
          commonExpenses: 11000,
          commonExpensesCurrency: 'UYU',
        },
      }),
      rentalHome('pocitos-garaje-infocasas', 'infocasas', {
        ...other,
        latitude: null,
        longitude: null,
        advert: {
          sellerName: 'Ortiz y Asociados',
          sellerType: 'inmobiliaria',
          commonExpenses: 12000,
          commonExpensesCurrency: 'UYU',
          ...photo('garaje'),
        },
      }),
    ],
    distinct: [
      ['pocitos-rambla', 'Frente a la rambla con terraza', 58000],
      ['pocitos-ellauri', 'Ellauri y Benito Blanco con parrillero', 62000],
      ['pocitos-masini', 'Luminoso sobre Masini con balcón', 55000],
      ['pocitos-chucarro', 'Chucarro esquina Brasil, piso alto', 65000],
      ['pocitos-libertad', 'Libertad y Rambla, vista lateral al mar', 52000],
      ['pocitos-villa-biarritz', 'Frente a Villa Biarritz con garaje doble', 70000],
    ].map(([key, title, price], index) =>
      rentalHome(String(key), index % 2 ? 'infocasas' : 'elpais', {
        title: String(title),
        price: Number(price),
        area: 70 + index,
        latitude: -34.91 + index / 1000,
        longitude: -56.15 - index / 1000,
        advert: { sellerName: `Inmobiliaria ${String(key).slice(8)}`, ...photo(String(key)) },
      })
    ),
  }
}
