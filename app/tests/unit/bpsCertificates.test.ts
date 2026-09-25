import { describe, expect, it } from 'vitest'

import {
  BPS_BUYER_TAKEOVER_DAYS,
  BPS_CERTIFICATES,
  BPS_CERTIFICATE_FAQ,
  BPS_CERTIFICATE_SOURCES,
  BPS_CERTIFICATE_VALIDITY_DAYS,
  BPS_OBSERVATION_DAYS,
  BPS_RENEWAL_WINDOW_DAYS,
  BPS_SPECIAL_OPERATIONS,
  certificateExpiry,
} from '../../utils/bpsCertificates'

describe('el catálogo de certificados del BPS', () => {
  it('publica las cifras que verificamos y ninguna otra', () => {
    expect(BPS_CERTIFICATE_VALIDITY_DAYS).toBe(180)
    expect(BPS_OBSERVATION_DAYS).toBe(60)
    expect(BPS_RENEWAL_WINDOW_DAYS).toBe(10)
    expect(BPS_BUYER_TAKEOVER_DAYS).toBe(15)
  })

  it('tiene los dos certificados, cada uno con su cita y su fuente', () => {
    expect(BPS_CERTIFICATES.map(c => c.key)).toEqual(['comun', 'especial'])
    for (const cert of BPS_CERTIFICATES) {
      expect(cert.quote.length).toBeGreaterThan(40)
      expect(cert.quoteSource).toMatch(/^https:\/\/www\.bps\.gub\.uy\//)
    }
  })

  it('lista los seis actos que exigen el certificado especial', () => {
    expect(BPS_SPECIAL_OPERATIONS).toHaveLength(6)
    expect(new Set(BPS_SPECIAL_OPERATIONS).size).toBe(6)
  })

  // La regla del sitio: toda fuente es oficial uruguaya. Un enlace a un blog o a una
  // gestoría no sostiene una cifra legal, y es el error fácil de cometer editando esto
  // dentro de seis meses.
  it('sólo cita fuentes oficiales uruguayas', () => {
    expect(BPS_CERTIFICATE_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of BPS_CERTIFICATE_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.bps\.gub\.uy|www\.gub\.uy|www\.impo\.com\.uy)\//)
      expect(source.label.trim()).not.toBe('')
    }
  })

  // El importe del timbre NO se publica: el que figura en el trámite tiene vigencia
  // acotada a un semestre y ya venció. Si alguien lo agrega sin verificarlo, este test
  // lo frena — es la misma decisión que ya tomó `companyTypes.ts`.
  it('no publica el importe del timbre profesional', () => {
    const text = [
      ...BPS_CERTIFICATE_FAQ.map(f => `${f.question} ${f.answer}`),
      ...BPS_CERTIFICATES.map(c => `${c.quote} ${c.useFor}`),
    ].join(' ')
    const amounts = text.match(/\$\s?\d+/g) ?? []
    expect(amounts).toEqual([])
  })

  it('responde la vigencia en el FAQ', () => {
    const answer = BPS_CERTIFICATE_FAQ.find(f => /cuánto dura/i.test(f.question))?.answer ?? ''
    expect(answer).toContain('180 días corridos')
    expect(answer).toContain('día siguiente')
  })
})

describe('certificateExpiry', () => {
  // El plazo corre «a partir del día siguiente a su expedición», así que un certificado
  // expedido el 1 de enero está vigente hasta el 30 de junio y no hasta el 29: el día de
  // expedición no cuenta. Ese corrimiento de un día es el que hace que alguien llegue
  // tarde por un día a una escritura, y es justamente lo que el test fija.
  it('cuenta desde el día siguiente a la expedición', () => {
    expect(certificateExpiry('2026-01-01')?.toISOString().slice(0, 10)).toBe('2026-06-30')
  })

  it('atraviesa un año bisiesto sin perder el día', () => {
    // 2028 es bisiesto: el 29 de febrero existe y tiene que contarse.
    expect(certificateExpiry('2028-01-01')?.toISOString().slice(0, 10)).toBe('2028-06-29')
  })

  it('acepta una vigencia distinta a la general', () => {
    expect(certificateExpiry('2026-01-01', 30)?.toISOString().slice(0, 10)).toBe('2026-01-31')
  })

  it('devuelve null ante una fecha inválida en vez de un Invalid Date', () => {
    expect(certificateExpiry('')).toBeNull()
    expect(certificateExpiry('01/01/2026')).toBeNull()
    expect(certificateExpiry('2026-13-45')).toBeNull()
  })
})
