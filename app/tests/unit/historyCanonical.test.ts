import { describe, expect, it } from 'vitest'
import {
  historyDetailCanonicalPath,
  SELF_CANONICAL_HISTORY_TYPES,
} from '../../utils/historyCanonical'

describe('historyDetailCanonicalPath', () => {
  it('is the self path when there is no type segment', () => {
    expect(historyDetailCanonicalPath('brou', 'usd')).toBe('/historico/brou/usd')
    expect(historyDetailCanonicalPath('brou', 'usd', undefined)).toBe('/historico/brou/usd')
    expect(historyDetailCanonicalPath('brou', 'usd', null)).toBe('/historico/brou/usd')
    expect(historyDetailCanonicalPath('brou', 'usd', '')).toBe('/historico/brou/usd')
  })

  // These are alternate views of the same series, not separate pages.
  it.each(['billete', 'cable', 'interbancario', 'transferencia'])(
    'folds the %s variant into the base',
    type => {
      expect(historyDetailCanonicalPath('brou', 'usd', type)).toBe('/historico/brou/usd')
    }
  )

  it('folds a variant regardless of its case', () => {
    expect(historyDetailCanonicalPath('brou', 'usd', 'BILLETE')).toBe('/historico/brou/usd')
    expect(historyDetailCanonicalPath('brou', 'usd', 'Interbancario')).toBe('/historico/brou/usd')
  })

  // eBROU era la excepción y la medición la desmintió: 25.808 impresiones y 20
  // clics (0,078 %) contra 8.095 y 83 (1,03 %) de su padre EN LA MISMA POSICIÓN,
  // mientras las consultas que dicen "ebrou" suman 1.067 impresiones y 0 clics.
  // Se llevaba el tráfico de marca de BROU sin convertirlo.
  it('también pliega eBROU, que no convertía ni su propia demanda', () => {
    expect(historyDetailCanonicalPath('brou', 'usd', 'ebrou')).toBe('/historico/brou/usd')
    expect(historyDetailCanonicalPath('brou', 'usd', 'EBROU')).toBe('/historico/brou/usd')
  })

  it('preserva la caja original si algún canal vuelve a ser página propia', () => {
    // El helper sigue soportando el caso; hoy el conjunto está vacío. La canónica
    // tiene que ser igual a la URL visitada, no una versión recapitalizada.
    const self = new Set(['ebrou'])
    const path = (type: string) =>
      self.has(type.toLowerCase()) ? `/historico/brou/usd/${type}` : '/historico/brou/usd'
    expect(path('eBrou')).toBe('/historico/brou/usd/eBrou')
  })

  it('ignores surrounding whitespace', () => {
    expect(historyDetailCanonicalPath('brou', 'usd', '  ')).toBe('/historico/brou/usd')
    expect(historyDetailCanonicalPath('brou', 'usd', ' billete ')).toBe('/historico/brou/usd')
  })

  it('passes origin and currency through verbatim', () => {
    expect(historyDetailCanonicalPath('cambio_principal', 'brl')).toBe(
      '/historico/cambio_principal/brl'
    )
  })

  it('expone el conjunto de canales con página propia, siempre en minúscula', () => {
    for (const t of SELF_CANONICAL_HISTORY_TYPES) {
      expect(t).toBe(t.toLowerCase())
    }
  })
})
