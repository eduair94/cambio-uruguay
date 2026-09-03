// La aritmética de "estoy parado acá".
//
// Los casos vienen de lo medido sobre el catálogo: el descuento es de la marca y no del local, el
// radio útil son ~40 m (a 1 km la mediana es 50 marcas), y en un shopping decenas de locales
// comparten prácticamente la misma coordenada — Punta Carretas tiene 78 dentro de 30 m.
import { describe, expect, it } from 'vitest'
import {
  distanceLabel,
  distanceMeters,
  nearbyBrands,
  verdictFor,
  NEARBY_RADII,
  type NearbyPoint,
} from '../../utils/bankosNearby'

const HERE = { lat: -34.9059, lng: -56.1913 } // Punta Carretas

/** Desplaza una coordenada ~`m` metros al norte. 1 grado de latitud ≈ 111.320 m. */
const north = (lat: number, m: number) => lat + m / 111320

const point = (
  brandId: string,
  name: string,
  lat: number,
  lng: number,
  banks: NearbyPoint['banks'] = [],
  otherBanks: NearbyPoint['otherBanks'] = []
): NearbyPoint => ({
  locationId: `${brandId}-${lat}`,
  brandId,
  brandName: name,
  categories: ['Mercados'],
  lat,
  lng,
  banks,
  otherBanks,
})

const bank = (
  bankId: string,
  bankName: string,
  kinds: Array<'credit' | 'debit'>,
  credit = '15% con crédito',
  debit = '5% con débito'
): NearbyPoint['banks'][number] => ({
  bankId,
  bankName,
  color: '#000000',
  creditDescription: credit,
  debitDescription: debit,
  hasCredit: true,
  hasDebit: true,
  availableDays: null,
  matchedKinds: kinds,
})

describe('distanceMeters', () => {
  it('mide de verdad', () => {
    expect(distanceMeters(HERE.lat, HERE.lng, HERE.lat, HERE.lng)).toBe(0)
    expect(distanceMeters(HERE.lat, HERE.lng, north(HERE.lat, 100), HERE.lng)).toBeCloseTo(100, 0)
  })
})

describe('nearbyBrands', () => {
  it('respeta el radio', () => {
    const points = [
      point('cerca', 'Cerca', north(HERE.lat, 20), HERE.lng, [bank('itau', 'Itaú', ['debit'])]),
      point('lejos', 'Lejos', north(HERE.lat, 300), HERE.lng, [bank('itau', 'Itaú', ['debit'])]),
    ]
    expect(nearbyBrands(points, HERE.lat, HERE.lng, 40).map(b => b.name)).toEqual(['Cerca'])
    expect(nearbyBrands(points, HERE.lat, HERE.lng, 500).map(b => b.name)).toEqual([
      'Cerca',
      'Lejos',
    ])
  })

  it('agrupa por MARCA, no por local: tres Farmashop de la cuadra son una fila', () => {
    const points = [
      point('fs', 'Farmashop', north(HERE.lat, 10), HERE.lng, [bank('itau', 'Itaú', ['debit'])]),
      point('fs', 'Farmashop', north(HERE.lat, 20), HERE.lng, [bank('itau', 'Itaú', ['debit'])]),
      point('fs', 'Farmashop', north(HERE.lat, 30), HERE.lng, [bank('itau', 'Itaú', ['debit'])]),
    ]
    const out = nearbyBrands(points, HERE.lat, HERE.lng, 40)
    expect(out).toHaveLength(1)
    expect(out[0].locations).toBe(3)
    // Se queda con la distancia del más cercano.
    expect(out[0].distanceM).toBe(10)
  })

  it('ordena por distancia y desempata por nombre — en un shopping todo está a la misma', () => {
    // Punta Carretas: decenas de locales geocodificados prácticamente al mismo punto. Sin un
    // criterio estable, la lista se reordenaría sola entre dos lecturas del GPS.
    const same = north(HERE.lat, 5)
    const points = [
      point('z', 'Zara', same, HERE.lng, [bank('itau', 'Itaú', ['credit'])]),
      point('a', 'Adidas', same, HERE.lng, [bank('itau', 'Itaú', ['credit'])]),
      point('m', 'Movie', same, HERE.lng, [bank('itau', 'Itaú', ['credit'])]),
    ]
    expect(nearbyBrands(points, HERE.lat, HERE.lng, 40).map(b => b.name)).toEqual([
      'Adidas',
      'Movie',
      'Zara',
    ])
  })

  it('sólo muestra el texto del medio de pago que el visitante tiene', () => {
    const points = [
      point('x', 'X', north(HERE.lat, 5), HERE.lng, [bank('brou', 'BROU', ['debit'])]),
    ]
    const [b] = nearbyBrands(points, HERE.lat, HERE.lng, 40)
    expect(b.yours[0].debit).toBe('5% con débito')
    // El de crédito existe en el catálogo, pero él no tiene esa tarjeta.
    expect(b.yours[0].credit).toBeNull()
  })

  it('ignora coordenadas rotas en vez de ponerlas a distancia NaN', () => {
    const points = [
      point('roto', 'Roto', Number.NaN, HERE.lng, [bank('itau', 'Itaú', ['debit'])]),
      point('ok', 'OK', north(HERE.lat, 5), HERE.lng, [bank('itau', 'Itaú', ['debit'])]),
    ]
    expect(nearbyBrands(points, HERE.lat, HERE.lng, 40).map(b => b.name)).toEqual(['OK'])
  })
})

describe('verdictFor', () => {
  const at = (banks: NearbyPoint['banks'], others: NearbyPoint['otherBanks'] = []) =>
    nearbyBrands(
      [point('x', 'X', north(HERE.lat, 5), HERE.lng, banks, others)],
      HERE.lat,
      HERE.lng,
      40
    )[0]

  it('dice que sí y con cuál', () => {
    expect(verdictFor(at([bank('itau', 'Itaú', ['debit'])]))).toBe('Sí, con tu Itaú débito')
    expect(verdictFor(at([bank('itau', 'Itaú', ['credit'])]))).toBe('Sí, con tu Itaú crédito')
  })

  it('cuando no, dice con cuál sí — que es la mitad útil de la respuesta', () => {
    const brand = at([], [{ bankId: 'brou', bankName: 'BROU', color: '#000' }])
    expect(verdictFor(brand)).toBe('Con tus tarjetas no. Acá descuenta BROU')
  })

  it('enumera bien cuando hay varios', () => {
    const brand = at(
      [],
      [
        { bankId: 'brou', bankName: 'BROU', color: '#000' },
        { bankId: 'oca', bankName: 'OCA', color: '#000' },
      ]
    )
    expect(verdictFor(brand)).toBe('Con tus tarjetas no. Acá descuenta BROU o OCA')
  })

  it('no inventa nada cuando no hay marca', () => {
    expect(verdictFor(null)).toBeNull()
    expect(verdictFor(undefined)).toBeNull()
  })
})

describe('distanceLabel', () => {
  it('nunca muestra decimales de metro: el GPS de un teléfono no los sostiene', () => {
    expect(distanceLabel(12.4)).toBe('a 12 m')
    expect(distanceLabel(150)).toBe('a 150 m')
    expect(distanceLabel(1500)).toBe('a 1,5 km')
  })
})

describe('NEARBY_RADII', () => {
  it('arranca en 40 m, que es lo medido, y no en un kilómetro', () => {
    expect(NEARBY_RADII[0]).toBe(40)
  })
})
