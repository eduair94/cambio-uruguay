import { describe, expect, it } from 'vitest'
import { isBareRoute } from '../../utils/bareRoutes'

describe('isBareRoute', () => {
  it('matches the chrome-free routes', () => {
    expect(isBareRoute('/widget')).toBe(true)
    expect(isBareRoute('/pizarra')).toBe(true)
  })

  it('matches their locale-prefixed variants', () => {
    for (const p of ['/en/widget', '/pt/widget', '/en/pizarra', '/pt/pizarra']) {
      expect(isBareRoute(p)).toBe(true)
    }
  })

  it('tolerates a trailing slash and a query string', () => {
    expect(isBareRoute('/pizarra/')).toBe(true)
    expect(isBareRoute('/pizarra?c=100')).toBe(true)
    expect(isBareRoute('/en/widget/?theme=light')).toBe(true)
  })

  it('leaves every normal page alone, so the site keeps its chat and analytics', () => {
    for (const p of ['/', '/dolar-hoy', '/casas-de-cambio', '/en/', '/avanzado']) {
      expect(isBareRoute(p)).toBe(false)
    }
  })

  it('does not match a lookalike path', () => {
    // A future /pizarra-historica must not silently inherit the exemption.
    expect(isBareRoute('/pizarra-historica')).toBe(false)
    expect(isBareRoute('/widgets')).toBe(false)
    expect(isBareRoute('/blog/pizarra')).toBe(false)
  })
})
