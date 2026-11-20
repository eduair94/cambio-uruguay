import { describe, expect, it } from 'vitest'
import { currentSharePath } from '../../utils/shareTarget'
import { wrapCardText } from '../../utils/shareCard'
import { publicShareSummary } from '../../utils/shareSummary'

describe('current public selection', () => {
  it('keeps filters when an old caller supplies the canonical URL', () => {
    expect(
      currentSharePath(
        '/autos-usados-uruguay?brand=Toyota&priceMax=20000&utm_source=test',
        'https://cambio-uruguay.com/autos-usados-uruguay'
      )
    ).toBe('/autos-usados-uruguay?brand=Toyota&priceMax=20000')
  })
  it('follows client navigation rather than a stale request URL', () => {
    expect(currentSharePath('/en/comparar?casas=brou,prex&moneda=USD')).toBe(
      '/en/comparar?casas=brou%2Cprex&moneda=USD'
    )
  })
  it('respects an explicit selection and excludes private and external destinations', () => {
    expect(currentSharePath('/comparar', '/comparar?casas=brou,prex')).toContain('casas=')
    expect(currentSharePath('/cuenta')).toBeNull()
    expect(currentSharePath('/', 'https://example.com/')).toBeNull()
    expect(currentSharePath('/alquileres-uruguay?refLat=-34&refLng=-56&priceMax=30000')).toBe(
      '/alquileres-uruguay?priceMax=30000'
    )
  })
})

describe('share card text layout', () => {
  it('describes public filters without inventing results or including unknown parameters', () => {
    expect(
      publicShareSummary('/autos-usados-uruguay?brand=Toyota&priceMax=20000&token=hidden', 'es')
    ).toBe('Precio hasta: 20000')
    expect(
      publicShareSummary('/alquileres-uruguay?department=san-jose&bedrooms=2&currency=usd', 'es')
    ).toBe('Departamento: San José · Dormitorios: 2 · Moneda: USD')
    expect(publicShareSummary('/equipar-casa-uruguay/productos?condicion=usado', 'en')).toBe(
      'Condition: used'
    )
  })

  // Free text in the URL (search box, brand, model, neighbourhood, category) is never printed: a
  // card under the site's name must not carry words whoever built the link typed.
  it('never prints free text or values outside a closed vocabulary', () => {
    expect(publicShareSummary('/buscar?q=autos', 'en')).toBe('')
    expect(
      publicShareSummary(
        '/alquileres-uruguay?q=llamá al 099&neighborhood=Estafa&department=Atlántida',
        'es'
      )
    ).toBe('')
    expect(
      publicShareSummary('/autos-usados-uruguay?priceMax=20.000&yearMin=2018x&kmMax=50000', 'es')
    ).toBe('Kilometraje hasta: 50000')
  })
  const measure = (text: string) => text.length * 10
  it('wraps public copy without overflowing or dropping ordinary words', () => {
    const lines = wrapCardText('Comparar autos usados en Uruguay', measure, 160, 4)
    expect(lines.join(' ')).toBe('Comparar autos usados en Uruguay')
    expect(lines.every(line => measure(line) <= 160)).toBe(true)
  })
  it('caps long descriptions, including a single unbroken word', () => {
    const lines = wrapCardText('x'.repeat(80), measure, 100, 3)
    expect(lines).toHaveLength(3)
    expect(lines[2]).toMatch(/…$/)
    expect(lines.every(line => measure(line) <= 100)).toBe(true)
  })
})
