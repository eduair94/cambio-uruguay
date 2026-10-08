import { describe, expect, it } from 'vitest'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  rentalExcludedWordsPattern,
  rentalOfferMatchesQuery,
  rentalOfferStages,
  rentalQueryToParams,
  type RentalOffer,
} from '../../utils/rentals'
import {
  RENTAL_SHARED_LIVING_STRONG_MAX_UYU,
  RENTAL_SHARED_LIVING_WEAK_MAX_UYU,
  rentalIsSharedLiving,
  rentalSharedLivingBranches,
  rentalSharedLivingCondition,
} from '../../utils/rentalSharedLiving'
import { normalizeRentalAlertFilters } from '../../utils/rentalAlerts'
import { rentalDirectoryCacheKey } from '../../server/utils/rentalDirectoryWarm'

const offer = (overrides: Partial<RentalOffer> = {}): RentalOffer => ({
  source: 'infocasas',
  listingId: 'infocasas:1',
  url: 'https://www.infocasas.com.uy/1',
  title: 'Apartamento',
  price: 30_000,
  currency: 'UYU',
  priceUyu: 30_000,
  commonExpenses: null,
  commonExpensesCurrency: null,
  sellerName: '',
  sellerType: 'inmobiliaria',
  image: null,
  publishedAt: null,
  firstSeen: '2026-10-07',
  lastSeen: '2026-10-07',
  parkingSpaces: null,
  furnished: null,
  ...overrides,
})

const and = (filter: Record<string, unknown>) => (filter.$and ?? []) as Record<string, unknown>[]

describe('the exclusions of the rental directory are read once, from the URL', () => {
  it('reads every exclusion under its Spanish URL name and writes it back unchanged', () => {
    const query = normalizeRentalQuery({
      department: 'Montevideo',
      sinBarrios: 'Centro,Cordón',
      sinTipos: 'local,habitacion',
      sinPortales: 'facebook,tiktok',
      sinPalabras: 'pensión, temporario',
      residencias: 'ocultar',
    })
    expect(query).toMatchObject({
      excludeNeighborhoods: ['Centro', 'Cordón'],
      excludeTypes: ['habitacion', 'local'],
      excludeSources: ['facebook', 'tiktok'],
      excludeWords: ['pensión', 'temporario'],
      sharedLiving: 'ocultar',
    })
    expect(rentalQueryToParams(query)).toMatchObject({
      sinBarrios: 'Centro,Cordón',
      sinTipos: 'habitacion,local',
      sinPortales: 'facebook,tiktok',
      sinPalabras: 'pensión,temporario',
      residencias: 'ocultar',
    })
    expect(normalizeRentalQuery(rentalQueryToParams(query))).toEqual(query)
  })

  it('leaves the URL clean without exclusions and ignores what it cannot honour', () => {
    expect(rentalQueryToParams(normalizeRentalQuery({}))).toEqual({})
    const query = normalizeRentalQuery({
      sinTipos: 'mansion',
      sinPortales: 'gallito',
      residencias: 'todas',
      sinPalabras: 'a, ,b',
    })
    expect(query).toMatchObject({
      excludeTypes: [],
      excludeSources: [],
      sharedLiving: '',
      excludeWords: [],
    })
  })

  it('keeps what was asked for: an included barrio or portal is never also excluded', () => {
    const query = normalizeRentalQuery({
      neighborhoods: 'Pocitos,Centro',
      sinBarrios: 'centro,Cordón',
      source: 'infocasas',
      sinPortales: 'infocasas,facebook',
    })
    expect(query.excludeNeighborhoods).toEqual(['Cordón'])
    expect(query.excludeSources).toEqual(['facebook'])
  })

  it('caps the words at ten, two to forty letters, without repeating a word by its accent', () => {
    const words = normalizeRentalQuery({
      sinPalabras: ['Pensión', 'pension', ...Array.from({ length: 12 }, (_, i) => `palabra${i}`)],
    }).excludeWords
    expect(words).toHaveLength(10)
    expect(words[0]).toBe('Pensión')
    expect(words).not.toContain('pension')
  })

  it('gives each exclusion its own memo entry in the directory cache', () => {
    expect(rentalDirectoryCacheKey({ residencias: 'ocultar' })).not.toBe(
      rentalDirectoryCacheKey({})
    )
    expect(rentalDirectoryCacheKey({ sinBarrios: 'Centro' })).toBe('sinBarrios=Centro')
  })
})

describe('the Mongo filter honours each exclusion', () => {
  it('subtracts excluded types from the chosen group, or excludes them from everything', () => {
    const homes = buildRentalFilter(
      normalizeRentalQuery({ types: 'vivienda', sinTipos: 'habitacion' }),
      10
    ).filter
    expect(homes.propertyType).toEqual({ $in: ['apartamento', 'casa'] })
    const all = buildRentalFilter(normalizeRentalQuery({ sinTipos: 'local,oficina' }), 10).filter
    expect(all.propertyType).toEqual({ $nin: ['local', 'oficina'] })
    // Excluding everything that was chosen leaves nothing, not the whole catalogue.
    const none = buildRentalFilter(normalizeRentalQuery({ type: 'casa', sinTipos: 'casa' }), 10)
    expect(none.filter.propertyType).toEqual({ $in: [] })
  })

  it('excludes barrios in the full filter but not in the facets that offer them back', () => {
    const { filter, withoutNeighborhood, nonLocation } = buildRentalFilter(
      normalizeRentalQuery({ department: 'Montevideo', sinBarrios: 'Centro' }),
      10
    )
    expect(filter.neighborhood).toEqual({ $nin: ['Centro'] })
    expect(withoutNeighborhood.neighborhood).toBeUndefined()
    expect(nonLocation.neighborhood).toBeUndefined()
    const both = buildRentalFilter(
      normalizeRentalQuery({ neighborhoods: 'Pocitos,Buceo', sinBarrios: 'Centro' }),
      10
    ).filter
    expect(both.neighborhood).toEqual({ $in: ['Pocitos', 'Buceo'], $nin: ['Centro'] })
  })

  it('hides a portal per advert: the home stays when another portal publishes it', () => {
    const query = normalizeRentalQuery({ sinPortales: 'facebook' })
    const { filter } = buildRentalFilter(query, 10)
    expect(filter.sources).toBeUndefined()
    expect(filter.offers).toEqual({ $elemMatch: { source: { $nin: ['facebook'] } } })
    expect(rentalOfferMatchesQuery(offer({ source: 'facebook' }), query, 40)).toBe(false)
    expect(rentalOfferMatchesQuery(offer(), query, 40)).toBe(true)
    // The headline price must come from an advert of a portal that is still shown.
    expect(rentalOfferStages(query, 40)).not.toHaveLength(0)
  })

  it('adds the residences rule and the excluded words to `$and`', () => {
    const { filter } = buildRentalFilter(
      normalizeRentalQuery({ residencias: 'solo', sinPalabras: 'temporario' }),
      10
    )
    expect(and(filter)).toContainEqual({ $or: rentalSharedLivingBranches() })
    const words = and(filter).find(condition => 'title' in condition) as {
      title: { $not: RegExp }
    }
    expect(words.title.$not).toBeInstanceOf(RegExp)
    expect(words.title.$not.test('Alquiler TEMPORARIO en Punta del Este')).toBe(true)
    expect(rentalSharedLivingCondition('ocultar')).toEqual({ $nor: rentalSharedLivingBranches() })
    expect(rentalSharedLivingCondition('')).toBeNull()
  })
})

describe('excluded words', () => {
  const matches = (words: string[], title: string) =>
    new RegExp(rentalExcludedWordsPattern(words)!, 'i').test(title)

  it('ignores accents and case in both directions', () => {
    expect(matches(['pension'], 'Pensión en el Centro')).toBe(true)
    expect(matches(['Pensión'], 'PENSION FAMILIAR')).toBe(true)
    expect(matches(['unico'], 'Único dueño')).toBe(true)
  })

  it('matches where a word starts, so plurals go too but a word inside another does not', () => {
    expect(matches(['residencia'], 'Residencias estudiantiles')).toBe(true)
    expect(matches(['sol'], 'Casa en Girasol')).toBe(false)
    expect(matches(['sol'], 'Apartamento al sol')).toBe(true)
    expect(matches(['dueño directo'], 'Dueño   directo alquila')).toBe(true)
  })

  it('escapes what a person pastes', () => {
    expect(() => matches(['(oferta'], 'x')).not.toThrow()
    expect(matches(['a.m'], 'aXm')).toBe(false)
    expect(rentalExcludedWordsPattern([])).toBeNull()
  })
})

// Real public titles, 2026-10-07.
describe('rooms and residences', () => {
  const home = (title: string, propertyType = 'casa', priceUyu = 9_350) =>
    rentalIsSharedLiving({ title, propertyType, priceUyu })

  it('takes every advert the portal itself types as a room', () => {
    expect(home('Residencia Amoblada En Belvedere', 'habitacion', 8_000)).toBe(true)
  })

  it.each([
    ['Residencia Estudiantil En El Centro', 'casa', 9_350],
    ['Residencia Estudiantes Femenina Tres Cruces Montevideo', 'casa', 8_200],
    ['Hogar estudiantil individual (zona centro)', 'otro', 13_500],
    ['Alquilo Apartamento compartido , CENTRO. Para 2 muchachos', 'apartamento', 8_000],
    [
      'en Salto. Residencia Femenina Apartamento Amueblado Y Compartido Para 4 Estudiantes',
      'apartamento',
      8_000,
    ],
    ['Alquiler Habitaciones Individuales En Casa De 8 Personas Pension', 'apartamento', 11_000],
    ['Habitación Individual En El Centro', 'apartamento', 19_000],
    ['Alquilo cuartos', 'otro', 10_000],
    ['Residencia Montevideo', 'otro', 7_750],
    ['Residencia para deportistas', 'otro', 10_000],
  ])('%s is a bed or a room', (title, type, price) => {
    expect(home(title, type, price)).toBe(true)
  })

  it.each([
    // "Residencia" alone, at the price of a whole home.
    ['Exclusiva Residencia en Alquiler en Los Olivos, Carrasco', 'casa', 159_198],
    ['RESIDENCIA EXCLUSIVA DE 1 DORMITORIO CON BALCÓN PRIVADO.', 'apartamento', 23_800],
    // A whole house offered to set up a residence.
    [
      'Alquiler Casa De 5 Dormitorios, 3 Baños Y Cochera En Reducto | Cowork | Residencia Estudiantil.',
      'casa',
      60_000,
    ],
    // Counts of a home's rooms, and the shared parts every building has.
    ['Se alquila casa, 2 cuartos, cocina comedor y baño, con patio', 'casa', 11_500],
    ['Alquiler 2 Habitaciones 1 Baño - Batlle Y Ordóñez', 'apartamento', 14_000],
    ['Apartamento 1 Dormitorio con Cochera Compartida', 'apartamento', 24_000],
    ['Casa En Alquiler Ideal Para Residencial', 'casa', 14_000],
    ['Monoambiente Ideal Para Estudiante Del Interior', 'apartamento', 13_300],
    // Other markets.
    ['Alquilo consultorio compartido', 'oficina', 8_000],
    ['ALQUILER DE COCHERA EN OPTA COLIVING', 'garaje', 5_000],
  ])('%s is not', (title, type, price) => {
    expect(home(title, type, price)).toBe(false)
  })

  it('applies the same ceilings in Mongo as in JavaScript', () => {
    const [room, strong, weak] = rentalSharedLivingBranches() as Array<{
      priceUyu?: { $lte: number }
    }>
    expect(room).toEqual({ propertyType: 'habitacion' })
    expect(strong!.priceUyu!.$lte).toBe(RENTAL_SHARED_LIVING_STRONG_MAX_UYU)
    expect(weak!.priceUyu!.$lte).toBe(RENTAL_SHARED_LIVING_WEAK_MAX_UYU)
    expect(home('Residencia en Cordón', 'otro', RENTAL_SHARED_LIVING_WEAK_MAX_UYU)).toBe(true)
    expect(home('Residencia en Cordón', 'otro', RENTAL_SHARED_LIVING_WEAK_MAX_UYU + 1)).toBe(false)
  })
})

describe('saved-search alerts keep every exclusion', () => {
  it('accepts the exclusions and stores them under their URL names', () => {
    expect(
      normalizeRentalAlertFilters('rental-search', {
        department: 'Montevideo',
        sinBarrios: 'Cordón,Centro',
        sinTipos: 'habitacion',
        sinPortales: 'facebook',
        sinPalabras: 'pension',
        residencias: 'ocultar',
      })
    ).toEqual({
      department: 'Montevideo',
      residencias: 'ocultar',
      sinBarrios: 'Centro,Cordón',
      sinPalabras: 'pension',
      sinPortales: 'facebook',
      sinTipos: 'habitacion',
    })
  })

  it.each([
    { sinTipos: 'mansion' },
    { sinPortales: 'gallito' },
    { residencias: 'todas' },
    { sinPalabras: 'x' },
  ])('refuses %o instead of saving a wider alert', filters => {
    expect(() => normalizeRentalAlertFilters('rental-search', filters)).toThrow(
      'unsupported_filter'
    )
  })
})
