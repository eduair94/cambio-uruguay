import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  rentalBudget,
  rentalCardPhotoRefs,
  rentalDate,
  rentalHasLocation,
  rentalPhotos,
  rentalPropertyPath,
  rentalReturnPath,
  rentalStreet,
} from '../../utils/rentalPresentation'
import { rentalPageMessages } from '../../utils/rentalPageMessages'
import type { RentalListItem, RentalOffer, RentalPublicProperty } from '../../utils/rentals'

afterEach(() => {
  vi.useRealTimers()
})

const offer = {
  source: 'infocasas',
  listingId: '123',
  title: 'Apartamento en alquiler',
  url: 'https://www.infocasas.com.uy/123',
  image: 'https://example.com/photo.jpg',
  price: 600,
  currency: 'USD',
  priceUyu: 24600,
  commonExpenses: 1000,
  commonExpensesCurrency: 'UYU',
} as RentalOffer
const property = {
  key: 'pocitos-one',
  title: offer.title,
  address: 'APARTAMENTO  EN ALQUILER!',
  offers: [offer],
  latitude: -34.9,
  longitude: -56.15,
} as RentalPublicProperty
const extras = { expenses: null, services: null, entry: null, budget: null }

describe('rental decision details', () => {
  it('adds only amounts from the selected offer and the user, using one exchange rate', () => {
    expect(
      rentalBudget(offer, 41, { ...extras, services: 2500, entry: 40000, budget: 30000 })
    ).toEqual({ monthly: 28100, firstMonth: 68100, remaining: 1900, estimatedExpenses: false })
    expect(
      rentalBudget({ ...offer, commonExpenses: 20, commonExpensesCurrency: 'USD' }, 41, extras)
        .monthly
    ).toBe(25420)
  })
  it('unknown expenses are never treated as zero; an explicit user estimate or published zero is different', () => {
    expect(rentalBudget({ ...offer, commonExpenses: null }, 41, extras).monthly).toBeNull()
    expect(
      rentalBudget({ ...offer, commonExpenses: null }, 41, { ...extras, expenses: 0 })
    ).toMatchObject({ monthly: 24600, estimatedExpenses: true })
    expect(
      rentalBudget({ ...offer, commonExpenses: 0, commonExpensesCurrency: null }, 41, extras)
    ).toMatchObject({ monthly: 24600, estimatedExpenses: false })
    expect(rentalBudget(offer, 41, { ...extras, expenses: 6000 }).monthly).toBe(25600)
  })
  it('refuses to invent a conversion and ignores invalid user amounts', () => {
    expect(rentalBudget(offer, 0, { ...extras, expenses: 1000 }).monthly).toBeNull()
    expect(
      rentalBudget({ ...offer, commonExpenses: null }, 41, { ...extras, expenses: Number.NaN })
        .monthly
    ).toBeNull()
    expect(
      rentalBudget(offer, 41, { ...extras, services: -1000, entry: Infinity, budget: -1 })
    ).toMatchObject({ monthly: 25600, firstMonth: null, remaining: null })
  })
  it('preserves useful search context and strips executable or foreign return destinations', () => {
    const url = rentalReturnPath(
      '/en/alquileres-uruguay?department=Montevideo&neighborhoods=Pocitos,Cord%C3%B3n&monthlyMax=40000&page=3&view=mapa&evil=yes'
    )!
    expect(url).toContain('monthlyMax=40000')
    expect(url).toContain('page=3')
    expect(url).toContain('view=mapa')
    expect(url).toContain('neighborhoods=')
    expect(url.endsWith('#rental-results')).toBe(true)
    expect(url).not.toContain('evil')
    for (const input of [
      '//evil.example/alquileres-uruguay',
      '/\\evil.example/alquileres-uruguay',
      'javascript:alert(1)',
      '/cuenta',
      'https://cambio-uruguay.com/alquileres-uruguay',
    ])
      expect(rentalReturnPath(input)).toBeNull()
  })
  it('keeps the distance order on the way back, though the path has no point', () => {
    expect(rentalReturnPath('/alquileres-uruguay?type=vivienda&sort=distancia&page=2')).toBe(
      '/alquileres-uruguay?type=vivienda&page=2&sort=distancia#rental-results'
    )
    expect(rentalReturnPath('/alquileres-uruguay?sort=distancia&view=mapa')).toBe(
      '/alquileres-uruguay?sort=distancia&view=mapa#rental-results'
    )
    // Any other sort still goes through normalisation: an unknown one is dropped.
    expect(rentalReturnPath('/alquileres-uruguay?sort=precio')).toBe(
      '/alquileres-uruguay?sort=precio#rental-results'
    )
    expect(rentalReturnPath('/alquileres-uruguay?sort=evil')).toBe(
      '/alquileres-uruguay#rental-results'
    )
  })
  it('does not relabel a headline as a street, render unsafe photos or move date-only readings to yesterday', () => {
    expect(rentalStreet(property)).toBe('')
    expect(rentalStreet({ ...property, address: 'Gestido 2450' })).toBe('Gestido 2450')
    expect(
      rentalPhotos({
        ...property,
        offers: [offer, offer, { ...offer, image: 'javascript:alert(1)' }],
      })
    ).toHaveLength(1)
    expect(rentalDate('2026-09-05')).toMatch(/5.*2026/)
    expect(rentalDate('not-a-date')).toBeNull()
    expect(rentalPropertyPath('property#one')).toBe('/alquileres/property%23one')
    expect(rentalHasLocation(property)).toBe(true)
    expect(rentalHasLocation({ ...property, latitude: 0 })).toBe(false)
    expect(rentalHasLocation({ ...property, longitude: NaN })).toBe(false)
  })
  it('drops photos whose signature already ran out and keeps the rest in their order', () => {
    // x-expires=1793419200 is 2026-10-31; oe=6AF5B93B is 2026-11-12.
    const tiktok =
      'https://p16-common-sign.tiktokcdn.com/tos-alisg-i/a~tplv.jpeg?dr=14555&x-expires=1793419200&x-signature=x'
    const facebook = 'https://scontent-yyz1-1.xx.fbcdn.net/v/t39/1_n.jpg?stp=dst-jpg&oe=6AF5B93B'
    const first = 'https://cdn2.infocasas.com.uy/repo/img/one.jpg'
    const last = 'https://cdn2.infocasas.com.uy/repo/img/two.jpg'
    const signed = {
      ...property,
      offers: [
        { ...offer, image: first, details: { images: [tiktok, facebook, last] } },
      ] as RentalOffer[],
    }
    const urls = (now: number, keepExpired = false) =>
      rentalPhotos(signed, { now, keepExpired }).map(photo => photo.url)
    const on8November = Date.UTC(2026, 10, 8)
    expect(urls(on8November)).toEqual([first, facebook, last])
    expect(urls(Date.UTC(2026, 10, 13))).toEqual([first, last])
    expect(urls(Date.UTC(2026, 9, 30))).toEqual([first, tiktok, facebook, last])
    // Whether the advert published photos is a different question (the page's quality gate).
    expect(urls(Date.UTC(2026, 10, 13), true)).toEqual([first, tiktok, facebook, last])
    // A property whose only photo expired shows none, instead of a broken image.
    expect(
      rentalPhotos(
        { ...property, offers: [{ ...offer, image: tiktok }] as RentalOffer[] },
        { now: on8November }
      )
    ).toEqual([])
  })
  it("keeps the search's empty preview instead of measuring signatures against this clock", () => {
    // The search dropped the expired cover (2026-10-31) and sent an empty preview; a phone whose
    // clock says 30 October would read the cover as valid and hydrate a photo the server never drew.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 9, 30))
    const tiktok =
      'https://p16-common-sign.tiktokcdn.com/tos-alisg-i/a~tplv.jpeg?x-expires=1793419200&x-signature=x'
    const item = {
      ...property,
      offers: [{ ...offer, source: 'tiktok', image: tiktok }],
      galleryPreview: [],
    } as unknown as RentalListItem
    expect(rentalCardPhotoRefs(item)).toEqual([])
    // A list that sends no preview at all still shows each advert's cover.
    expect(rentalCardPhotoRefs({ ...item, galleryPreview: undefined }).map(ref => ref.url)).toEqual(
      [tiktok]
    )
  })
  it('measures the ficha gallery against the instant the page was rendered, as the page does', () => {
    // The same `useState` key on both: the server's instant travels in the payload, so the gallery
    // the server drew and the one the browser hydrates leave out the same expired photos.
    const app = resolve(__dirname, '../..')
    const gallery = readFileSync(resolve(app, 'components/rentals/PropertyGallery.vue'), 'utf8')
    const page = readFileSync(resolve(app, 'pages/alquileres/[key].vue'), 'utf8')
    expect(gallery).toContain("useState('rental-rendered-at', () => Date.now())")
    expect(page).toContain("useState('rental-rendered-at', () => Date.now())")
    expect(gallery).toMatch(/rentalPhotos\(props\.property, \{ now: renderedAt\.value \}\)/)
  })
  it('translates the complete page and interpolation names in all supported languages', () => {
    const keys = Object.keys(rentalPageMessages.es).sort()
    for (const lang of ['en', 'pt'] as const) {
      expect(Object.keys(rentalPageMessages[lang]).sort()).toEqual(keys)
      for (const key of keys) {
        const a = rentalPageMessages.es[key as keyof typeof rentalPageMessages.es]
        const b = rentalPageMessages[lang][key as keyof typeof rentalPageMessages.es]
        expect(
          [...b.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(),
          `${lang}:${key}`
        ).toEqual([...a.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort())
      }
    }
  })
})
