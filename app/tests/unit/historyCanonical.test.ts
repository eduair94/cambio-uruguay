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

  // /historico/brou/usd/ebrou earns 10,717 impressions: a distinct product with
  // its own rate. Folding it away would throw those away.
  it('keeps eBROU self-canonical', () => {
    expect(historyDetailCanonicalPath('brou', 'usd', 'ebrou')).toBe('/historico/brou/usd/ebrou')
  })

  it('preserves the original case of a self-canonical type', () => {
    // The canonical must equal the URL actually visited, not a re-cased variant.
    expect(historyDetailCanonicalPath('brou', 'usd', 'EBROU')).toBe('/historico/brou/usd/EBROU')
    expect(historyDetailCanonicalPath('brou', 'usd', 'eBrou')).toBe('/historico/brou/usd/eBrou')
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

  it('exposes the self-canonical set, lowercased', () => {
    for (const t of SELF_CANONICAL_HISTORY_TYPES) {
      expect(t).toBe(t.toLowerCase())
    }
  })
})
