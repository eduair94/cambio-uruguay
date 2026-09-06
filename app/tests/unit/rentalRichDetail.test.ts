import { describe, expect, it } from 'vitest'
import { rentalPhotos } from '../../utils/rentalPresentation'
import {
  rentalExpandedPropertyProjection,
  rentalPublicPropertyProjection,
} from '../../server/utils/rentalDetail'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

describe('rental source details stay attributed and off the result payload', () => {
  it('opens only the public fields on an opened property, excluding private metadata', () => {
    const expected = [
      'description',
      'images',
      'builtArea',
      'totalArea',
      'landArea',
      'terraceArea',
      'amenities',
      'guaranteeText',
    ]
    const compact = Object.keys(rentalPublicPropertyProjection)
    const expanded = Object.keys(rentalExpandedPropertyProjection)
    expect(compact.some(field => field.includes('.details'))).toBe(false)
    for (const parent of ['offers', 'matchingOffer']) {
      expect(expanded.filter(field => field.startsWith(`${parent}.details.`)).sort()).toEqual(
        expected.map(field => `${parent}.details.${field}`).sort()
      )
      expect(expanded).not.toContain(`${parent}.details`)
    }
    for (const field of expanded)
      expect(field).not.toMatch(/identity|contact|phone|email|addressKey/)
  })

  it('keeps cover and gallery photos with the owning advert, removes repeats and unsafe URLs', () => {
    const offers = [
      {
        source: 'infocasas',
        title: 'Unidad 301',
        url: 'https://www.infocasas.com.uy/unidad/301',
        image: 'https://images.example.com/cover.jpg',
        details: {
          images: [
            'https://images.example.com/cover.jpg',
            'https://images.example.com/kitchen.jpg',
            'javascript:alert(1)',
          ],
        },
      },
      {
        source: 'elpais',
        title: 'Unidad 301',
        url: 'https://inmuebles.elpais.com.uy/301',
        image: 'https://images.example.com/kitchen.jpg',
        details: { images: ['https://images.example.com/balcony.jpg'] },
      },
    ] as RentalOffer[]
    expect(rentalPhotos({ offers } as RentalPublicProperty)).toEqual([
      {
        url: offers[0]!.image,
        sourceUrl: offers[0]!.url,
        source: 'infocasas',
        title: 'Unidad 301',
      },
      {
        url: 'https://images.example.com/kitchen.jpg',
        sourceUrl: offers[0]!.url,
        source: 'infocasas',
        title: 'Unidad 301',
      },
      {
        url: 'https://images.example.com/balcony.jpg',
        sourceUrl: offers[1]!.url,
        source: 'elpais',
        title: 'Unidad 301',
      },
    ])
    const many = {
      ...offers[0],
      details: {
        images: Array.from({ length: 80 }, (_, n) => `https://images.example.com/${n}.jpg`),
      },
    } as RentalOffer
    expect(rentalPhotos({ offers: [many] } as RentalPublicProperty)).toHaveLength(24)
    expect(
      rentalPhotos({ offers: [{ ...many, url: 'javascript:alert(1)' }] } as RentalPublicProperty)
    ).toEqual([])
  })
})
