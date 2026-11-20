import { describe, expect, it } from 'vitest'
import {
  RENTAL_DESCRIPTION_MAX,
  RENTAL_TITLE_MAX,
  rentalPageCrumb,
  rentalPageDescription,
  rentalPageTitle,
  rentalSnippetAddress,
  rentalSnippetStreet,
  type RentalSnippetInput,
} from '../../utils/rentalPageSnippet'

const USD_UYU = 41.55
/** The measured fichas of 2026-11-07, as the page hands them to the builders. */
const ficha = (over: Partial<RentalSnippetInput> = {}): RentalSnippetInput => ({
  propertyType: 'apartamento',
  bedrooms: 2,
  bathrooms: 3,
  area: 84,
  uncertain: false,
  street: 'Bulevar España 2600',
  place: 'Pocitos',
  department: 'Montevideo',
  offer: {
    price: 60000,
    currency: 'UYU',
    priceUyu: 60000,
    commonExpenses: 11000,
    commonExpensesCurrency: 'UYU',
  },
  usdUyu: USD_UYU,
  ...over,
})
const offer = (over: Partial<RentalSnippetInput['offer']>) => ({ ...ficha().offer, ...over })

describe('rentalPageTitle', () => {
  it('puts the street, the door number and the price in 60 characters (address searches)', () => {
    // /alquileres/montevideo-tres-cruces-cufre-rms485: "Apartamento Monoambiente en alquiler
    // en Tres Cruces, Montevideo: $ 14.500 | Cambio Uruguay" (91), no street.
    const title = rentalPageTitle(
      ficha({
        bedrooms: 0,
        bathrooms: 1,
        area: 30,
        street: 'Cufré 1773',
        place: 'Tres Cruces',
        offer: offer({ price: 14500, priceUyu: 14500, commonExpenses: null }),
      })
    )
    expect(title).toBe('Monoambiente en Cufré 1773, Tres Cruces: $ 14.500')
    expect(title.length).toBeLessThanOrEqual(RENTAL_TITLE_MAX)
    expect(
      rentalPageTitle(ficha({ street: 'Guana 2200', place: 'Parque Rodó', bedrooms: 3 }))
    ).toBe('Apartamento 3 dorm. en Guana 2200, Parque Rodó: $ 60.000')
  })

  it('never trades the barrio for the street: without room for both it names the barrio', () => {
    // nh6byn-10rlmiq: "…en Bulevar España 2600, Pocitos: $ 60.000" is 61 characters. Type and
    // zone stay in the title (they are what type-and-barrio searches match); the street moves to
    // the description, which still names it.
    const title = rentalPageTitle(ficha())
    expect(title).toBe('Apartamento 2 dorm. en alquiler en Pocitos: $ 60.000')
    expect(title).not.toContain('España')
    expect(rentalPageDescription(ficha())).toMatch(
      /^Apartamento en Pocitos: .*Bulevar España 2600$/
    )
    for (const locale of ['en', 'pt']) {
      const localized = rentalPageTitle(
        ficha({ place: 'Aeropuerto Internacional de Carrasco' }),
        locale
      )
      expect(localized).toContain('Aeropuerto Internacional de Carrasco')
      expect(localized).not.toContain('España')
    }
  })

  it('says "en alquiler" while it fits', () => {
    expect(
      rentalPageTitle(
        ficha({ propertyType: 'casa', street: 'Guana 2200', place: 'Cordón', bedrooms: 1 })
      )
    ).toBe('Casa 1 dorm. en alquiler en Guana 2200, Cordón: $ 60.000')
  })

  it('falls back to the barrio, and to the shortest candidate when nothing fits', () => {
    // /alquileres/canelones-aeropuerto-internacional-de-carrasco-avenida-de-las-americas-17w5jn0,
    // 109 characters with the brand. Its street has no door number.
    const long = ficha({
      bedrooms: 1,
      street: 'Avenida De Las Américas',
      place: 'Aeropuerto Internacional de Carrasco',
      department: 'Canelones',
      offer: offer({ price: 36500, priceUyu: 36500 }),
    })
    expect(rentalPageTitle(long)).toBe(
      'Apartamento 1 dorm. en Aeropuerto Internacional de Carrasco: $ 36.500'
    )
    // A barrio's name is never cut: the last candidate is published anyway.
    expect(rentalPageTitle({ ...long, propertyType: 'casa' })).toBe(
      'Casa 1 dorm. en Aeropuerto Internacional de Carrasco: $ 36.500'
    )
    expect(rentalPageTitle(ficha({ propertyType: 'casa', street: '', place: 'Malvín' }))).toBe(
      'Casa 2 dorm. en alquiler en Malvín, Montevideo: $ 60.000'
    )
    expect(rentalPageTitle(ficha({ street: '', place: 'Tres Cruces' }))).toBe(
      'Apartamento 2 dorm. en alquiler en Tres Cruces: $ 60.000'
    )
  })

  it('ignores a Plus Code and a street without a door number', () => {
    // 9fedu4: El País publishes "Av, Brasil Libertad" (a corner, no door).
    expect(
      rentalPageTitle(ficha({ street: 'Av, Brasil Libertad', offer: offer({ price: 42000 }) }))
    ).toBe('Apartamento 2 dorm. en alquiler en Pocitos: $ 42.000')
    const plusCode = rentalPageTitle(ficha({ street: '4XVJ+R84, Av. Carlos Racine 1234' }))
    expect(plusCode).not.toMatch(/4XVJ|Racine/)
    expect(plusCode).toBe('Apartamento 2 dorm. en alquiler en Pocitos: $ 60.000')
  })

  it('writes dollars as "US$" and names the department only once', () => {
    const title = rentalPageTitle(
      ficha({
        street: '',
        place: 'Carrasco',
        offer: offer({ price: 1700, currency: 'USD', priceUyu: 1700 * USD_UYU }),
      })
    )
    expect(title).toBe('Apartamento 2 dorm. en alquiler en Carrasco: US$ 1.700')
    expect(title).not.toContain('U$S')
    expect(rentalPageTitle(ficha({ street: '', place: 'Montevideo', bedrooms: 1 }))).toBe(
      'Apartamento 1 dorm. en alquiler en Montevideo: $ 60.000'
    )
  })

  it('counts bedrooms only for a dwelling', () => {
    // A portal's 0 bedrooms on an office is not a studio.
    expect(rentalPageTitle(ficha({ propertyType: 'oficina', bedrooms: 0, street: '' }))).toBe(
      'Oficina en alquiler en Pocitos, Montevideo: $ 60.000'
    )
    expect(rentalPageDescription(ficha({ propertyType: 'habitacion', bedrooms: 1 }))).not.toMatch(
      /dorm\./
    )
  })

  it('leaves the bedrooms out when the adverts disagree, as before', () => {
    expect(rentalPageTitle(ficha({ uncertain: true, street: '' }))).toBe(
      'Apartamento en alquiler en Pocitos, Montevideo: $ 60.000'
    )
  })

  it('renders the en and pt templates', () => {
    expect(rentalPageTitle(ficha({ street: 'Guana 2200', place: 'Cordón' }), 'en')).toBe(
      '2-bed apartment for rent at Guana 2200, Cordón: $ 60,000'
    )
    expect(rentalPageTitle(ficha({ street: 'Guana 2200', place: 'Cordón' }), 'pt')).toBe(
      'Apartamento 2 quartos em Guana 2200, Cordón: $ 60.000'
    )
  })
})

describe('rentalSnippetStreet (the street a title may carry)', () => {
  it.each([
    ['Cufré 1773', 'Cufré 1773'],
    ['ELLAURI 1084', 'Ellauri 1084'],
    ['Avenida 8 De Octubre 2300', 'Avenida 8 de Octubre 2300'],
    ['26 De Marzo 1220', '26 de Marzo 1220'],
    ['José L.Osorio 1275, Uruguay', 'José L.Osorio 1275'],
    ['Benito Blanco 1000 apto 302', 'Benito Blanco 1000'],
    ['Ellauri 350 esq. Ellauri', 'Ellauri 350'],
    ['Calle Alejandro Fleming 1700', 'Alejandro Fleming 1700'],
    ['Rambla Gandhi nº 450', 'Rambla Gandhi 450'],
  ])('%s → %s', (street, expected) => {
    expect(rentalSnippetStreet(street)).toBe(expected)
  })

  it.each([
    'Av, Brasil Libertad',
    'Galarza',
    '4XVJ+R84, Av. Carlos Racine 1234',
    'Av. 18 de Julio',
    'Ref 4885 Marindia',
    'Ruta 8 km 22',
    'Paralela Sur Giannattasio Km. 0',
    'Avenida Carlos Racine 15000 Ciudad de la Costa',
    'Las Pitangas 4, 20000 Punta Del Este, Uruguay',
    'Calle 25 1234',
    // The block, not the door: the advert hid the number.
    'Francisco Soca al 1300',
    '11300, Uruguay',
    '2582',
    'Casasweb',
    '',
  ])('%s carries no door number', street => {
    expect(rentalSnippetStreet(street)).toBeNull()
  })
})

describe('rentalPageDescription', () => {
  it('says rent + gastos comunes = total, then the facts, in 155 characters', () => {
    // 9fedu4: the page showed $ 13.400 of gastos comunes and a $ 55.400 total; the description
    // repeated the title and named neither.
    const description = rentalPageDescription(
      ficha({
        bathrooms: 2,
        area: 69,
        street: 'Av, Brasil Libertad',
        offer: offer({ price: 42000, priceUyu: 42000, commonExpenses: 13400 }),
      })
    )
    expect(description).toBe(
      'Apartamento en Pocitos: $ 42.000 + $ 13.400 de gastos comunes ($ 55.400 por mes) · 2 dorm. · 2 baños · 69 m² · Av, Brasil Libertad'
    )
    expect(description).toContain('+ $ 13.400 de gastos comunes ($ 55.400 por mes)')
    expect(description.length).toBeLessThanOrEqual(RENTAL_DESCRIPTION_MAX)
  })

  it('never assumes gastos comunes the advert does not state', () => {
    // tkufq2-r8jimc (InfoCasas): no gastos comunes, and its adverts disagree on the rooms.
    expect(
      rentalPageDescription(
        ficha({ uncertain: true, area: 90, offer: offer({ commonExpenses: null }) })
      )
    ).toBe(
      'Apartamento en Pocitos: $ 60.000 por mes, gastos comunes no informados · 90 m² · Bulevar España 2600'
    )
    // A currency is part of the amount: without it the amount is not known either.
    expect(
      rentalPageDescription(ficha({ offer: offer({ commonExpensesCurrency: null }) }))
    ).toContain('$ 60.000 por mes, gastos comunes no informados')
    // Zero only when the advert publishes it.
    expect(
      rentalPageDescription(
        ficha({ offer: offer({ commonExpenses: 0, commonExpensesCurrency: null }) })
      )
    ).toContain('$ 60.000 por mes, sin gastos comunes')
  })

  it('marks a total that needed a dollar conversion, and drops it without a rate', () => {
    const dollars = offer({
      price: 1200,
      currency: 'USD',
      priceUyu: 1200 * USD_UYU,
      commonExpenses: 8000,
    })
    expect(rentalPageDescription(ficha({ place: 'Carrasco', offer: dollars }))).toContain(
      'US$ 1.200 + $ 8.000 de gastos comunes (≈ $ 57.860 por mes)'
    )
    expect(
      rentalPageDescription(
        ficha({
          place: 'Carrasco',
          usdUyu: 0,
          offer: { ...dollars, commonExpensesCurrency: 'USD', commonExpenses: 150 },
        })
      )
    ).toContain('US$ 1.200 + US$ 150 de gastos comunes por mes')
  })

  it('leaves out a fact that does not fit whole, and stays within the budget', () => {
    const description = rentalPageDescription(
      ficha({
        place: 'Aeropuerto Internacional de Carrasco',
        street: 'Gral. José Esteban Brito Del Pino 1277 entre Avenida Rivera y Bulevar Artigas',
      })
    )
    expect(description.length).toBeLessThanOrEqual(RENTAL_DESCRIPTION_MAX)
    expect(description).toContain('· 84 m²')
    expect(description).not.toContain('Brito')
  })

  it('keeps the address the advert publishes, without what a geocoder or a portal wrote there', () => {
    expect(rentalSnippetAddress('Casasweb', 'Pocitos', 'Montevideo')).toBe('')
    expect(rentalSnippetAddress('11300, Uruguay', 'Pocitos', 'Montevideo')).toBe('')
    expect(rentalSnippetAddress('Pocitos', 'Pocitos', 'Montevideo')).toBe('')
    expect(rentalSnippetAddress('4XVJ+R84, Av. Carlos Racine', 'Roosevelt', 'Canelones')).toBe(
      'Av. Carlos Racine'
    )
    expect(
      rentalSnippetAddress(
        'Las Pitangas 4, 20000 Punta Del Este, Uruguay',
        'Punta del Este',
        'Maldonado'
      )
    ).toBe('Las Pitangas 4')
    expect(rentalSnippetAddress('PABLO PEREZ SEBASTIAN ELCANO', 'Pocitos', 'Montevideo')).toBe(
      'Pablo Perez Sebastian Elcano'
    )
  })

  it('renders the en and pt templates', () => {
    expect(rentalPageDescription(ficha(), 'en')).toBe(
      'Apartment in Pocitos: $ 60,000 + $ 11,000 common charges ($ 71,000 a month) · 2 bed · 3 bathrooms · 84 m² · Bulevar España 2600'
    )
    expect(rentalPageDescription(ficha({ bedrooms: 1, bathrooms: 1 }), 'pt')).toBe(
      'Apartamento em Pocitos: $ 60.000 + $ 11.000 de condomínio ($ 71.000 por mês) · 1 quarto · 1 banheiro · 84 m² · Bulevar España 2600'
    )
    expect(
      rentalPageDescription(ficha({ offer: offer({ commonExpenses: null }) }), 'en')
    ).toContain('$ 60,000 a month, common charges not stated')
  })
})

describe('rentalPageCrumb', () => {
  it('names the dwelling the way the title does', () => {
    expect(rentalPageCrumb(ficha())).toBe('Apartamento 2 dorm.')
    expect(rentalPageCrumb(ficha({ bedrooms: 0 }))).toBe('Monoambiente')
    expect(rentalPageCrumb(ficha({ propertyType: 'casa', bedrooms: 0 }))).toBe('Casa monoambiente')
    expect(rentalPageCrumb(ficha({ uncertain: true }))).toBe('Apartamento')
    expect(rentalPageCrumb(ficha({ propertyType: 'otro', bedrooms: null }))).toBe('Propiedad')
  })
})
