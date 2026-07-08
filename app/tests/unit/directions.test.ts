import { describe, it, expect } from 'vitest'
import { googleMapsDirectionsUrl, wazeUrl } from '../../utils/directions'

describe('googleMapsDirectionsUrl', () => {
  it('builds a directions URL from coordinates', () => {
    expect(googleMapsDirectionsUrl(-34.9011, -56.1645)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-34.9011,-56.1645'
    )
  })
})

describe('wazeUrl', () => {
  it('builds a Waze navigation URL from coordinates', () => {
    expect(wazeUrl(-34.9011, -56.1645)).toBe(
      'https://waze.com/ul?ll=-34.9011,-56.1645&navigate=yes'
    )
  })
})
