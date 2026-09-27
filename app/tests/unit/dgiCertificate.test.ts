import { describe, expect, it } from 'vitest'

import {
  DGI_ALSO_ELIGIBLE_IF,
  DGI_BLOCKED_ACTS,
  DGI_BUYER_TAKEOVER_DAYS,
  DGI_CERTIFICATE_FAQ,
  DGI_CERTIFICATE_SOURCES,
  DGI_FINE_PERCENT,
  DGI_NOT_ISSUED_TO,
  DGI_SPECIAL_OPERATIONS,
  DGI_SUSPENSION_GROUNDS,
  DGI_TIMBRE_UYU,
  DGI_TIMBRE_VALID_UNTIL,
  dgiIssuesCertificate,
  type TaxSituation,
} from '../../utils/dgiCertificate'

describe('el catálogo del certificado único de DGI', () => {
  it('publica las cifras que verificamos y ninguna otra', () => {
    expect(DGI_TIMBRE_UYU).toBe(270)
    expect(DGI_TIMBRE_VALID_UNTIL).toBe('2026-12-31')
    expect(DGI_BUYER_TAKEOVER_DAYS).toBe(15)
    expect(DGI_FINE_PERCENT).toBe(50)
  })

  it('lista los cinco actos que el art. 80 bloquea, sin repetir clave', () => {
    expect(DGI_BLOCKED_ACTS).toHaveLength(5)
    expect(new Set(DGI_BLOCKED_ACTS.map(act => act.key)).size).toBe(5)
    for (const act of DGI_BLOCKED_ACTS) expect(act.detail.length).toBeGreaterThan(30)
  })

  // Los diez literales de la Res. 4127/015, en el orden de la norma. El orden es parte del dato:
  // es lo que permite verificar la tabla fila por fila contra el texto publicado.
  it('tiene los diez literales de la resolución, de la a) a la j)', () => {
    expect(DGI_NOT_ISSUED_TO.map(party => party.literal)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
    ])
  })

  it('nombra al asalariado y al monotributista, que son los dos casos que traen la consulta', () => {
    const everyone = DGI_NOT_ISSUED_TO.map(party => party.who).join(' ')
    expect(everyone).toMatch(/trabajo dependiente/)
    expect(everyone).toMatch(/Monotributo/)
    expect(everyone).toMatch(/Transmisiones Patrimoniales/)
  })

  it('no publica la exclusión sin la salvedad que la limita', () => {
    // Sin esta lista, la tabla se leería como «a estos no les corresponde nunca», que es falso:
    // basta ser contribuyente de IRAE para que sí se emita.
    expect(DGI_ALSO_ELIGIBLE_IF.length).toBeGreaterThanOrEqual(4)
    expect(DGI_ALSO_ELIGIBLE_IF.join(' ')).toMatch(/IRAE/)
  })

  it('lista los tres motivos de suspensión, con el de primaria incluido', () => {
    expect(DGI_SUSPENSION_GROUNDS).toHaveLength(3)
    expect(DGI_SUSPENSION_GROUNDS.join(' ')).toMatch(/enseñanza primaria/)
  })

  it('separa los actos societarios del certificado especial', () => {
    expect(DGI_SPECIAL_OPERATIONS.length).toBeGreaterThanOrEqual(6)
    expect(new Set(DGI_SPECIAL_OPERATIONS).size).toBe(DGI_SPECIAL_OPERATIONS.length)
  })

  // La regla del sitio: toda fuente es oficial uruguaya. Un enlace a un blog o a una gestoría no
  // sostiene una cifra legal, y es el error fácil de cometer editando esto dentro de seis meses.
  it('sólo cita fuentes oficiales uruguayas', () => {
    expect(DGI_CERTIFICATE_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const source of DGI_CERTIFICATE_SOURCES) {
      expect(source.url).toMatch(
        /^https:\/\/(www\.impo\.com\.uy|www\.gub\.uy|servicios\.dgi\.gub\.uy)\//
      )
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('cita la norma que crea el régimen y la que dice a quién no se le emite', () => {
    const urls = DGI_CERTIFICATE_SOURCES.map(source => source.url).join(' ')
    expect(urls).toContain('todgi1996/338-1996/80_T1')
    expect(urls).toContain('4127-2015')
    expect(urls).toContain('750-2008')
  })

  it('tiene preguntas con respuesta y sin duplicados', () => {
    expect(DGI_CERTIFICATE_FAQ.length).toBeGreaterThanOrEqual(5)
    expect(new Set(DGI_CERTIFICATE_FAQ.map(item => item.question)).size).toBe(
      DGI_CERTIFICATE_FAQ.length
    )
    for (const item of DGI_CERTIFICATE_FAQ) expect(item.answer.length).toBeGreaterThan(60)
  })
})

describe('dgiIssuesCertificate', () => {
  it('no le emite al que sólo tiene sueldo', () => {
    expect(dgiIssuesCertificate(['trabajo-dependiente'])).toBe(false)
  })

  it('no le emite al monotributista ni al del Monotributo social MIDES', () => {
    expect(dgiIssuesCertificate(['monotributo'])).toBe(false)
    expect(dgiIssuesCertificate(['monotributo-mides'])).toBe(false)
  })

  // El punto de la función: la salvedad de la Res. 4127/015 manda sobre la exclusión, así que una
  // sola situación de la salvedad alcanza por más excluidas que sean las demás. Leerlo al revés
  // —«está en la lista, entonces no»— es el error que la resolución habilita a cometer.
  it('sí le emite al excluido que además es contribuyente de IRAE', () => {
    expect(dgiIssuesCertificate(['trabajo-dependiente', 'irae'])).toBe(true)
    expect(dgiIssuesCertificate(['itp', 'irpf-cat-ii'])).toBe(true)
    expect(dgiIssuesCertificate(['monotributo', 'itp-agropecuario'])).toBe(true)
  })

  it('con varias situaciones todas excluidas sigue siendo no', () => {
    const excluded: TaxSituation[] = ['trabajo-dependiente', 'ippf', 'iass', 'itp']
    expect(dgiIssuesCertificate(excluded)).toBe(false)
  })

  // «No sé» y «no te lo emiten» son respuestas distintas, y la segunda manda a alguien a la DGI.
  it('sin situación declarada no afirma nada', () => {
    expect(dgiIssuesCertificate([])).toBeNull()
  })
})
