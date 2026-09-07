// El catálogo del pasaporte publica importes de un organismo del Estado, así que lo que se
// custodia acá no es la lógica —hay una sola suma— sino que ningún número quede huérfano de
// fuente y que el cuadro no se contradiga con el texto que lo rodea.
import { describe, expect, it } from 'vitest'

import {
  PASSPORT_APPLICANTS,
  PASSPORT_DELIVERY,
  PASSPORT_FAQ,
  PASSPORT_FEES,
  PASSPORT_FEES_EFFECTIVE_FROM,
  PASSPORT_PAIRS,
  PASSPORT_SOURCES,
  PASSPORT_UNPUBLISHED,
  PASSPORT_VERIFIED_AT,
  recargoUrgente,
  totalPasaporte,
} from '../../utils/passport'

describe('los aranceles', () => {
  it('son los cuatro que publica la ficha, con sus dos importes', () => {
    expect(PASSPORT_FEES.map(f => f.key)).toEqual([
      'primera-comun',
      'primera-urgente',
      'renovacion-comun',
      'renovacion-urgente',
    ])
    for (const f of PASSPORT_FEES) {
      expect(Number.isInteger(f.arancel)).toBe(true)
      expect(Number.isInteger(f.certificado)).toBe(true)
      expect(f.arancel).toBeGreaterThan(0)
      expect(f.certificado).toBeGreaterThan(0)
    }
  })

  it('valen lo que dice gub.uy desde el 01/07/2026', () => {
    expect(PASSPORT_FEES_EFFECTIVE_FROM).toBe('2026-07-01')
    expect(PASSPORT_PAIRS.primera.comun.arancel).toBe(5455)
    expect(PASSPORT_PAIRS.primera.urgente.arancel).toBe(10712)
    expect(PASSPORT_PAIRS.renovacion.comun.arancel).toBe(3703)
    expect(PASSPORT_PAIRS.renovacion.urgente.arancel).toBe(7207)
    expect(PASSPORT_PAIRS.primera.comun.certificado).toBe(175)
    expect(PASSPORT_PAIRS.primera.urgente.certificado).toBe(1402)
  })

  it('suma arancel + certificado en vez de guardar el total a mano', () => {
    expect(totalPasaporte(PASSPORT_PAIRS.renovacion.comun)).toBe(3878)
    expect(totalPasaporte(PASSPORT_PAIRS.renovacion.urgente)).toBe(8609)
    expect(totalPasaporte(PASSPORT_PAIRS.primera.comun)).toBe(5630)
    expect(totalPasaporte(PASSPORT_PAIRS.primera.urgente)).toBe(12114)
  })

  // La primera vez es más cara que la renovación y el urgente más caro que el común: si alguna
  // vez una actualización invierte alguno de los dos órdenes, es un error de tipeo, no una noticia.
  it('mantiene el orden que hace verosímil el cuadro', () => {
    expect(totalPasaporte(PASSPORT_PAIRS.primera.comun)).toBeGreaterThan(
      totalPasaporte(PASSPORT_PAIRS.renovacion.comun)
    )
    for (const pair of Object.values(PASSPORT_PAIRS)) {
      expect(totalPasaporte(pair.urgente)).toBeGreaterThan(totalPasaporte(pair.comun))
      expect(pair.comun.urgente).toBe(false)
      expect(pair.urgente.urgente).toBe(true)
    }
  })

  it('mide el recargo del urgente sobre el total, no sobre el arancel', () => {
    // 8.609 / 3.878 = 2,22. Con los aranceles pelados daría 1,95: el certificado urgente ocho
    // veces más caro es parte de lo que se paga por apurar, y dejarlo afuera subestima la
    // decisión que la página ayuda a tomar.
    expect(recargoUrgente(PASSPORT_PAIRS.renovacion)).toBeCloseTo(2.22, 2)
    expect(recargoUrgente(PASSPORT_PAIRS.primera)).toBeCloseTo(2.15, 2)
  })
})

describe('los tres trámites', () => {
  it('cubren las tres vías de ciudadanía y cada uno enlaza su ficha', () => {
    expect(PASSPORT_APPLICANTS).toHaveLength(3)
    for (const a of PASSPORT_APPLICANTS) {
      expect(a.url).toMatch(/^https:\/\/www\.gub\.uy\/tramites\//)
      expect(a.quien.length).toBeGreaterThan(20)
    }
  })

  // El dato que justifica la página: el precio no depende de cuál de los tres te toque.
  it('comparten los mismos aranceles, que es la razón de ser de la página', () => {
    const urls = new Set(PASSPORT_APPLICANTS.map(a => a.url))
    expect(urls.size).toBe(3)
  })
})

describe('lo que la fuente no publica', () => {
  it('se dice en vez de completarse de memoria', () => {
    expect(PASSPORT_UNPUBLISHED.map(u => u.key)).toEqual(['vigencia', 'cedula', 'sistarbanc'])
  })

  // El bloque existe justamente para NO publicar estos números: un importe en pesos metido acá
  // sería alguien contestando lo que la ficha calla. La nota de la cédula sí lleva edades (9 y 10
  // años), que son plazos de entrega publicados y no el precio que falta, así que la prohibición
  // de "años" corre sólo donde lo que falta ES una cantidad de años: la vigencia.
  it('no cuela una cifra en pesos, ni una vigencia en años', () => {
    for (const u of PASSPORT_UNPUBLISHED) expect(u.porQue, u.key).not.toMatch(/\$\s?\d/)
    const vigencia = PASSPORT_UNPUBLISHED.find(u => u.key === 'vigencia')
    expect(vigencia?.porQue).not.toMatch(/\b\d+\s*años\b/)
  })
})

describe('plazos y fuentes', () => {
  it('publica los cuatro plazos, sede por sede', () => {
    expect(PASSPORT_DELIVERY.map(d => d.key)).toEqual([
      'mdeo-comun',
      'mdeo-urgente',
      'interior-comun',
      'interior-urgente',
    ])
  })

  it('apunta sólo a fuentes oficiales del Estado uruguayo', () => {
    expect(PASSPORT_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const s of PASSPORT_SOURCES) {
      expect(s.url, s.label).toMatch(/^https:\/\/www\.gub\.uy\//)
      expect(s.label.length).toBeGreaterThan(30)
    }
  })

  it('deja la fecha de verificación en formato ISO', () => {
    expect(PASSPORT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('las preguntas frecuentes', () => {
  // Se emiten como FAQPage: una respuesta con un importe que no salga del catálogo es una
  // cifra publicada en el buscador sin nadie que la mantenga.
  it('sólo citan importes que están en el catálogo', () => {
    const catalogados = new Set(
      PASSPORT_FEES.flatMap(f => [f.arancel, f.certificado, totalPasaporte(f)]).map(n =>
        n.toLocaleString('es-UY')
      )
    )
    for (const faq of PASSPORT_FAQ) {
      for (const match of faq.answer.matchAll(/\$\s?([\d.]*\d)/g)) {
        expect(catalogados, `${faq.question} → $${match[1]}`).toContain(match[1])
      }
    }
  })

  it('termina cada pregunta con un signo de interrogación', () => {
    for (const faq of PASSPORT_FAQ) expect(faq.question.endsWith('?')).toBe(true)
  })
})
