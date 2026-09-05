import { describe, expect, it } from 'vitest'
import { normalizeRentalQuery, type RentalProperty } from '../../utils/rentals'
import {
  createRentalFavorite,
  emptyRentalSaved,
  parseRentalSaved,
  readRentalSaved,
  removeRentalFavorite,
  removeRentalSearch,
  rentalSavedSafeUrl,
  RENTAL_SAVED_FAVORITE_LIMIT,
  RENTAL_SAVED_SEARCH_LIMIT,
  RENTAL_SAVED_STORAGE_KEY,
  saveRentalSearch,
  toggleRentalFavorite,
  writeRentalSaved,
  type RentalSavedStorage,
} from '../../utils/rentalSaved'

const savedAt = '2026-09-04T12:00:00.000Z'

function property(key = 'property-a'): RentalProperty {
  return {
    key,
    title: 'Apartamento en Cordón',
    department: 'Montevideo',
    neighborhood: 'Cordón',
    bedrooms: 1,
    bathrooms: 1,
    area: 45,
    parkingSpaces: 1,
    petsAllowed: true,
    guarantees: ['anda'],
    offers: [
      {
        source: 'mercadolibre',
        url: 'https://apartamento.mercadolibre.com.uy/MLU-123',
        image: 'https://http2.mlstatic.com/photo.webp',
        price: 20_000,
        currency: 'UYU',
        priceUyu: 20_000,
        commonExpenses: 8_000,
        commonExpensesCurrency: 'UYU',
      },
      {
        source: 'infocasas',
        url: 'https://www.infocasas.com.uy/apartamento/123',
        image: null,
        price: 22_000,
        currency: 'UYU',
        priceUyu: 22_000,
        commonExpenses: 1_000,
        commonExpensesCurrency: 'UYU',
      },
    ],
  } as RentalProperty
}

function memoryStorage(): RentalSavedStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

describe('rental search library', () => {
  it('reopens a complete filter on page one and ignores unrecognised input', () => {
    const query = normalizeRentalQuery({
      q: 'cocina definida',
      department: 'Montevideo',
      neighborhood: 'Cordón',
      bedrooms: '0',
      pets: '1',
      gc: '1',
      dueno: '1',
      garantia: 'anda',
      sedes: '123',
      radio: '2',
      page: '8',
    })
    const state = saveRentalSearch(emptyRentalSaved(), 'Mi búsqueda', query, savedAt)
    const stored = parseRentalSaved(JSON.stringify(state))
    expect(normalizeRentalQuery(stored.searches[0].params)).toEqual({ ...query, page: 1 })
    expect(stored.searches[0].label).toBe('Mi búsqueda')
    const modified = JSON.parse(JSON.stringify(state))
    modified.searches[0].params.evil = 'javascript:alert(1)'
    expect(parseRentalSaved(JSON.stringify(modified)).searches[0].params).not.toHaveProperty('evil')
  })

  it('deduplicates the same search even on a different result page and updates its name', () => {
    const state = saveRentalSearch(
      emptyRentalSaved(),
      'Primera',
      normalizeRentalQuery({ bedrooms: 2, department: 'Montevideo', page: 2 }),
      savedAt
    )
    const updated = saveRentalSearch(
      state,
      'Renombrada',
      normalizeRentalQuery({ department: 'Montevideo', bedrooms: 2, page: 4 }),
      savedAt
    )
    expect(updated.searches).toHaveLength(1)
    expect(updated.searches[0].label).toBe('Renombrada')
    expect(state.searches[0].label).toBe('Primera')
    expect(removeRentalSearch(updated, updated.searches[0].id).searches).toEqual([])
  })

  it('caps history and preserves the most recently saved searches', () => {
    let state = emptyRentalSaved()
    for (let i = 0; i < RENTAL_SAVED_SEARCH_LIMIT + 5; i++) {
      state = saveRentalSearch(state, `Búsqueda ${i}`, normalizeRentalQuery({ q: `${i}` }), savedAt)
    }
    expect(state.searches).toHaveLength(RENTAL_SAVED_SEARCH_LIMIT)
    expect(state.searches[0].label).toBe(`Búsqueda ${RENTAL_SAVED_SEARCH_LIMIT + 4}`)
    expect(saveRentalSearch(state, ' ', normalizeRentalQuery(), savedAt)).toBe(state)
  })
})

describe('rental favorite snapshots', () => {
  it('compares rent and expenses from the same offer and retains its exchange rate', () => {
    const favorite = createRentalFavorite(property(), 40, savedAt)!
    expect(favorite.priceUyu).toBe(20_000)
    expect(favorite.monthlyTotalUyu).toBe(23_000)
    expect(favorite.usdUyu).toBe(40)
    expect(favorite.savedAt).toBe(savedAt)
    expect(favorite.petsAllowed).toBe(true)
    expect(favorite.parkingSpaces).toBe(1)
    expect(favorite.guarantees).toEqual(['anda'])
    expect(favorite.offers).toHaveLength(2)
  })

  it('does not treat unpublished expenses as zero, but accepts explicit zero expenses', () => {
    const input = property()
    input.offers = [input.offers[0]]
    input.offers[0].commonExpenses = null
    expect(createRentalFavorite(input, 40, savedAt)?.monthlyTotalUyu).toBeNull()
    input.offers[0].commonExpenses = 0
    expect(createRentalFavorite(input, 40, savedAt)?.monthlyTotalUyu).toBe(20_000)
  })

  it('recomputes amounts on read and strips invalid URLs without losing safe offers', () => {
    const favorite = createRentalFavorite(property(), 40, savedAt)!
    const raw = JSON.stringify({
      version: 1,
      favorites: [
        {
          ...favorite,
          monthlyTotalUyu: 1,
          priceUyu: 1,
          image: 'javascript:alert(1)',
          offers: [
            { ...favorite.offers[0], url: 'javascript:alert(1)' },
            favorite.offers[1],
            favorite.offers[1],
          ],
        },
      ],
    })
    const result = parseRentalSaved(raw).favorites[0]
    expect(result.priceUyu).toBe(22_000)
    expect(result.monthlyTotalUyu).toBe(23_000)
    expect(result.image).toBeNull()
    expect(result.offers).toHaveLength(1)
  })

  it('preserves snapshots when a result disappears and removes a favorite by its stable key', () => {
    const state = toggleRentalFavorite(emptyRentalSaved(), property(), 40, savedAt)
    const snapshot = parseRentalSaved(JSON.stringify(state))
    expect(snapshot.favorites[0].title).toBe('Apartamento en Cordón')
    expect(toggleRentalFavorite(snapshot, property(), 40, savedAt).favorites).toEqual([])
    expect(removeRentalFavorite(snapshot, 'property-a').favorites).toEqual([])
    expect(snapshot.favorites).toHaveLength(1)
  })

  it('caps favorites, ignores nonfinite prices and rejects a favorite without a valid offer', () => {
    let state = emptyRentalSaved()
    for (let i = 0; i < RENTAL_SAVED_FAVORITE_LIMIT + 3; i++) {
      state = toggleRentalFavorite(state, property(`property-${i}`), 40, savedAt)
    }
    expect(state.favorites).toHaveLength(RENTAL_SAVED_FAVORITE_LIMIT)
    const input = property()
    input.offers[0].price = Infinity
    input.offers[1].url = 'data:text/html,evil'
    expect(createRentalFavorite(input, 40, savedAt)).toBeNull()
  })
})

describe('rental browser persistence', () => {
  it('round-trips through an explicitly supplied storage without Nuxt or a browser', () => {
    const storage = memoryStorage()
    const state = toggleRentalFavorite(emptyRentalSaved(), property(), 40, savedAt)
    expect(writeRentalSaved(state, storage)).toBe(true)
    expect(storage.values.has(RENTAL_SAVED_STORAGE_KEY)).toBe(true)
    expect(readRentalSaved(storage)).toEqual(state)
  })

  it('handles denied storage, quota errors and malformed or obsolete data', () => {
    const denied: RentalSavedStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(readRentalSaved(denied)).toEqual(emptyRentalSaved())
    expect(writeRentalSaved(emptyRentalSaved(), denied)).toBe(false)
    for (const raw of [null, '{', 'null', '[]', '{"version":99}', ' '.repeat(750_001)]) {
      expect(parseRentalSaved(raw)).toEqual(emptyRentalSaved())
    }
    expect(parseRentalSaved('{"version":1,"searches":[null,1,{}],"favorites":[false,{}]}')).toEqual(
      emptyRentalSaved()
    )
  })

  it('only permits absolute http and https destinations without embedded credentials', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,x',
      '//example.com',
      '/local-path',
      'https://user:password@example.com/',
      'https://example.com/' + 'x'.repeat(2_048),
    ]) {
      expect(rentalSavedSafeUrl(url)).toBeNull()
    }
    expect(rentalSavedSafeUrl('https://www.infocasas.com.uy/aviso')).toBe(
      'https://www.infocasas.com.uy/aviso'
    )
    expect(rentalSavedSafeUrl('http://example.com/')).toBe('http://example.com/')
  })
})
