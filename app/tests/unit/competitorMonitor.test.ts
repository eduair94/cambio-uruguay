import { describe, expect, it } from 'vitest'
import { monitorAccess, sanitizeMonitor } from '../../utils/competitorMonitor'

const houses = new Set(['propia', 'gales', 'varlix', 'aeromar'])
const good = {
  ownOrigin: 'propia',
  competitors: ['gales', 'varlix'],
  currencies: ['USD', 'EUR'],
  alerts: { moves: true, position: true, quiet: false, daily: true },
  channels: { telegram: true, email: 'all' },
  active: true,
}

describe('validación del monitor', () => {
  it('acepta un monitor completo', () => {
    expect(sanitizeMonitor(good, houses)).toEqual({ ok: true, value: good })
  })

  it('saca repetidos y la casa propia de los competidores', () => {
    const r = sanitizeMonitor(
      { ...good, competitors: ['gales', 'gales', 'propia', 'varlix'] },
      houses
    )
    expect(r).toMatchObject({ ok: true, value: { competitors: ['gales', 'varlix'] } })
  })

  it('rechaza casas que no existen, el BCU, más de 12 competidores o ninguno', () => {
    expect(sanitizeMonitor({ ...good, competitors: ['inventada'] }, houses)).toMatchObject({
      ok: false,
    })
    expect(
      sanitizeMonitor({ ...good, ownOrigin: 'bcu' }, new Set([...houses, 'bcu']))
    ).toMatchObject({ ok: false })
    expect(sanitizeMonitor({ ...good, competitors: [] }, houses)).toMatchObject({ ok: false })
    const many = new Set(Array.from({ length: 14 }, (_, i) => `c${i}`))
    expect(
      sanitizeMonitor({ ...good, ownOrigin: null, competitors: [...many] }, many)
    ).toMatchObject({ ok: false, error: 'Elegí entre 1 y 12 competidores.' })
  })

  it('sin casa propia apaga posición y quieta', () => {
    const r = sanitizeMonitor(
      {
        ...good,
        ownOrigin: null,
        alerts: { moves: true, position: true, quiet: true, daily: true },
      },
      houses
    )
    expect(r).toMatchObject({
      ok: true,
      value: { ownOrigin: null, alerts: { position: false, quiet: false } },
    })
  })

  it('monedas: sólo las cuatro y al menos una', () => {
    expect(sanitizeMonitor({ ...good, currencies: ['USD', 'JPY'] }, houses)).toMatchObject({
      ok: true,
      value: { currencies: ['USD'] },
    })
    expect(sanitizeMonitor({ ...good, currencies: ['JPY'] }, houses)).toMatchObject({ ok: false })
  })

  it('canal de correo desconocido cae en el resumen diario', () => {
    expect(
      sanitizeMonitor({ ...good, channels: { telegram: false, email: 'spam' } }, houses)
    ).toMatchObject({
      ok: true,
      value: { channels: { telegram: false, email: 'daily' } },
    })
  })
})

describe('acceso al monitor (espejo del backend)', () => {
  it('prueba, Empresa y vencido', () => {
    const start = new Date('2026-09-01T12:00:00Z')
    expect(monitorAccess(start, false, new Date('2026-09-04T12:00:00Z'))).toMatchObject({
      status: 'trial',
      daysLeft: 11,
    })
    expect(monitorAccess(start, false, new Date('2026-09-15T12:00:00Z'))).toMatchObject({
      status: 'expired',
    })
    expect(monitorAccess(start, true, new Date('2026-12-01T12:00:00Z'))).toEqual({
      status: 'business',
    })
  })
})
