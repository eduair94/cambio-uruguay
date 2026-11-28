import { describe, expect, it } from 'vitest'
import { followUpTopicForPath } from '../../utils/followUpTopic'

const PENDIENTE = { pct: null, provisorioPct: null, norma: null, fecha: null, url: null }

describe('followUpTopicForPath', () => {
  it('las páginas de jubilaciones y del BPS ofrecen el aviso del aumento', () => {
    for (const path of [
      '/guias/aumento-de-jubilaciones-uruguay',
      '/en/guias/aumento-de-jubilaciones-uruguay',
      '/cuando-me-puedo-jubilar-uruguay',
      '/fecha-de-cobro-bps-uruguay/',
    ])
      expect(followUpTopicForPath(path, PENDIENTE)).toBe('aumento-jubilaciones-2027')
  })

  it('el resto no tiene tema', () => {
    for (const path of ['/', '/alquileres-uruguay', '/guias/comprar-en-shein-desde-uruguay'])
      expect(followUpTopicForPath(path, PENDIENTE)).toBeNull()
  })

  it('con la cifra definitiva publicada ya no hay nada que avisar', () => {
    expect(followUpTopicForPath('/fecha-de-cobro-bps-uruguay', { ...PENDIENTE, pct: 6 })).toBeNull()
    expect(
      followUpTopicForPath('/fecha-de-cobro-bps-uruguay', { ...PENDIENTE, provisorioPct: 5.5 })
    ).toBe('aumento-jubilaciones-2027')
  })
})
