import { describe, expect, it } from 'vitest'
import { resolvePropertySaleZone } from '../../utils/propertySaleZones'

describe('public neighborhood navigation anchors', () => {
  it('recognizes a named Montevideo neighborhood without requiring its accents', () => {
    const zone = resolvePropertySaleZone('Montevideo', 'Cordón')
    expect(zone).toEqual(resolvePropertySaleZone('MONTEVIDEO', 'cordon'))
    expect(zone?.lat).toBeGreaterThan(-34.92)
    expect(zone?.lat).toBeLessThan(-34.87)
    expect(zone?.lng).toBeGreaterThan(-56.2)
    expect(zone?.lng).toBeLessThan(-56.16)
  })
  it('does not place other departments or unrecognized sub-neighborhoods at a guessed center', () => {
    expect(resolvePropertySaleZone('Maldonado', 'Centro')).toBeNull()
    expect(resolvePropertySaleZone('Montevideo', 'Pocitos Nuevo')).toBeNull()
    expect(resolvePropertySaleZone('Montevideo', '')).toBeNull()
    expect(resolvePropertySaleZone('Montevideo', 'Parque Batlle')).toBeNull()
  })
  it('keeps distinct named areas apart and contains no advert identity or address', () => {
    const pocitos = resolvePropertySaleZone('Montevideo', 'Pocitos')!
    const buceo = resolvePropertySaleZone('Montevideo', 'Buceo')!
    expect(pocitos.lng).not.toBe(buceo.lng)
    expect(Object.keys(pocitos).sort()).toEqual(['lat', 'lng', 'name'])
  })
})
