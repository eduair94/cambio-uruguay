import { describe, expect, it } from 'vitest'
import { ENGAGEMENT_DISMISS_DAYS, followUpForPath, mayShowFollowUp } from '../../utils/engagement'

describe('contextual invitations', () => {
  it('offers accounts on rate pages and newsletters after long reads', () => {
    for (const path of [
      '/',
      '/dolar-hoy',
      '/cotizacion/dolar',
      '/historico/brou',
      '/en/casa/abitab',
    ])
      expect(followUpForPath(path), path).toBe('account')
    expect(followUpForPath('/tarjetas-de-credito-uruguay')).toBe('newsletter')
    expect(followUpForPath('/pt/tarjetas-de-credito-uruguay?utm_source=test')).toBe('newsletter')
  })
  it('leaves account, signup, legal, private and embedded flows alone', () => {
    for (const path of [
      '/cuenta',
      '/en/cuenta',
      '/newsletter',
      '/newsletter/archivo',
      '/privacidad',
      '/terminos',
      '/contacto',
      '/pizarra',
      '/widget',
      '/estadisticas-de-busqueda',
      '/herramientas/aguinaldo',
    ])
      expect(followUpForPath(path), path).toBeNull()
  })
  it('shares a one-per-session budget across prompt types', () => {
    expect(mayShowFollowUp({ seen: true, dismissedAt: null, now: 1_800_000_000_000 })).toBe(false)
    expect(mayShowFollowUp({ seen: false, dismissedAt: null, now: 1_800_000_000_000 })).toBe(true)
  })
  it('honours refusal for 60 days, including clock changes', () => {
    const dismissed = 1_800_000_000_000
    const delay = ENGAGEMENT_DISMISS_DAYS * 86_400_000
    const allowed = (now: number) =>
      mayShowFollowUp({ seen: false, dismissedAt: String(dismissed), now })
    expect(allowed(dismissed - 1000)).toBe(false)
    expect(allowed(dismissed + delay - 1)).toBe(false)
    expect(allowed(dismissed + delay)).toBe(true)
    expect(mayShowFollowUp({ seen: false, dismissedAt: 'broken', now: dismissed })).toBe(true)
  })
})
