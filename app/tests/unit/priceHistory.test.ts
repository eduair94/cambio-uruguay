import { describe, expect, it } from 'vitest'
import {
  seriesFromCarListing as rootCar,
  seriesFromMarketLog as rootMarket,
  seriesFromPricewatch as rootPricewatch,
} from '../../../classes/pricehistory/normalize'
import {
  priceChangeLabel,
  seriesFromCarListing,
  seriesFromMarketLog,
  seriesFromPricewatch,
} from '../../utils/priceHistory'

// El espejo del app y el lector de la raíz tienen que contestar lo mismo sobre los mismos documentos:
// la raíz alimenta la página de últimos cambios y el app alimenta las fichas, y si se separan, dos
// pantallas del sitio dicen cosas distintas del mismo aviso.
const same = (mine: any, theirs: any) => {
  expect(mine === null).toBe(theirs === null)
  if (!mine || !theirs) return
  expect(mine.points).toEqual(theirs.points)
  expect(mine.currency).toBe(theirs.currency)
  expect(mine.changePct).toBe(theirs.changePct)
  expect(mine.lastChange).toEqual(theirs.lastChange)
  expect(mine.currencySwitched).toBe(theirs.currencySwitched)
  expect(mine.firstSeen).toBe(theirs.firstSeen)
}

const pricewatchDocs = [
  {
    listingId: 'ml:MLU1',
    vertical: 'equipar',
    title: 'Heladera',
    url: 'https://x/y',
    sellerKey: 's',
    sellerName: 'S',
    source: 'mercadolibre',
    currency: 'UYU',
    firstSeen: '2026-09-17',
    lastSeen: '2026-09-22',
    history: [
      { d: '2026-09-17', p: 30000, lp: null, c: 'UYU' },
      { d: '2026-09-20', p: 30000, lp: null, c: 'UYU' },
      { d: '2026-09-22', p: 27000, lp: null, c: 'UYU' },
    ],
  },
  {
    listingId: 'ml:MLU2',
    vertical: 'celulares',
    title: 'Teléfono',
    url: 'https://x/z',
    sellerKey: 's',
    sellerName: 'S',
    source: 'mercadolibre',
    currency: 'UYU',
    firstSeen: '2026-09-01',
    lastSeen: '2026-09-20',
    history: [
      { d: '2026-09-01', p: 300, lp: null, c: 'USD' },
      { d: '2026-09-20', p: 12000, lp: null, c: 'UYU' },
    ],
  },
  {
    listingId: 'ml:MLU3',
    vertical: 'sillas',
    title: 'Silla',
    url: 'https://x/w',
    sellerKey: 's',
    sellerName: 'S',
    source: 'mercadolibre',
    currency: 'UYU',
    firstSeen: '2026-09-10',
    lastSeen: '2026-09-12',
    history: [
      { d: '2026-09-10', p: 5000, lp: null },
      { d: '2026-09-12', p: 4500, lp: null, c: 'UYU' },
    ],
  },
  {
    listingId: 'ml:MLU4',
    vertical: 'equipar',
    title: 'Sin historia',
    url: 'https://x/v',
    sellerKey: 's',
    sellerName: 'S',
    source: 'mercadolibre',
    currency: 'UYU',
    firstSeen: '2026-09-10',
    lastSeen: '2026-09-12',
    history: [],
  },
]

describe('espejo del historial por aviso', () => {
  it('pricewatch contesta igual que la raíz', () => {
    for (const doc of pricewatchDocs) same(seriesFromPricewatch(doc), rootPricewatch(doc))
  })

  it('carlistings contesta igual que la raíz', () => {
    const doc = {
      key: 'ml-MLU9',
      firstSeen: '2026-09-17',
      lastSeen: '2026-09-22T08:08:51.040Z',
      listing: { currency: 'USD', title: 'Onix', url: 'https://x' },
      priceHistory: [
        { price: 12490, currency: 'USD', observedAt: '2026-09-17T06:35:09.109Z' },
        { price: 11900, currency: 'USD', observedAt: '2026-09-17T20:33:48.260Z' },
      ],
    }
    same(seriesFromCarListing(doc), rootCar(doc))
  })

  it('marketpricelogs contesta igual que la raíz', () => {
    const doc = {
      key: 'alquiler:infocasas:1',
      vertical: 'alquiler',
      advertId: 'infocasas:1',
      firstSeen: '2026-09-08',
      lastSeen: '2026-09-22',
      points: [
        { d: '2026-09-08', p: 15500, c: 'UYU' },
        { d: '2026-09-19', p: 14500, c: 'UYU' },
      ],
    }
    same(seriesFromMarketLog(doc), rootMarket(doc))
  })
})

describe('priceChangeLabel', () => {
  it('dice bajó o subió, sin depender del color', () => {
    expect(priceChangeLabel(-10)).toBe('bajó 10 %')
    expect(priceChangeLabel(4.25)).toBe('subió 4,3 %')
    expect(priceChangeLabel(0)).toBeNull()
    expect(priceChangeLabel(null)).toBeNull()
  })
})
