// El catálogo de la cédula publica aranceles de un organismo del Estado y dos exoneraciones
// legales, así que lo que se custodia acá no es la lógica —hay una división y una resta— sino
// que ningún número quede huérfano de fuente, que las exoneraciones no se estiren más allá de lo
// que dice la norma, y que el cuadro no se contradiga con el texto que lo rodea.
import { describe, expect, it } from 'vitest'

import {
  ID_CARD_BY_KEY,
  ID_CARD_DEADLINES,
  ID_CARD_DISCREPANCIES,
  ID_CARD_FAQ,
  ID_CARD_FEES,
  ID_CARD_PATH,
  ID_CARD_SAME_AS_RENEWAL,
  ID_CARD_SOURCES,
  ID_CARD_UNPUBLISHED,
  ID_CARD_VERIFIED_AT,
  ID_CARD_WAIVERS,
  recargoUrgente,
  sobreprecioPrimeraVez,
} from '../../utils/idCard'

describe('los aranceles', () => {
  it('son los tres que publican las fichas, y ninguno más', () => {
    expect(ID_CARD_FEES.map(f => f.key)).toEqual([
      'renovacion-comun',
      'renovacion-urgente',
      'primera-comun',
    ])
    for (const fee of ID_CARD_FEES) {
      expect(Number.isInteger(fee.arancel), fee.key).toBe(true)
      expect(fee.arancel, fee.key).toBeGreaterThan(0)
      expect(fee.desde, fee.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('valen lo que dicen las fichas de gub.uy', () => {
    expect(ID_CARD_BY_KEY['renovacion-comun']!.arancel).toBe(443)
    expect(ID_CARD_BY_KEY['renovacion-urgente']!.arancel).toBe(886)
    expect(ID_CARD_BY_KEY['primera-comun']!.arancel).toBe(456)
  })

  it('indexa por key sin perder ninguna fila', () => {
    expect(Object.keys(ID_CARD_BY_KEY)).toHaveLength(ID_CARD_FEES.length)
  })

  // Los dos hallazgos de la página, calculados y no escritos a mano: si mañana se actualiza un
  // arancel, el titular se mueve solo o el test avisa que dejó de ser cierto.
  it('mide el urgente contra el común en vez de afirmar «el doble»', () => {
    expect(recargoUrgente()).toBeCloseTo(2, 10)
  })

  it('mide el sobreprecio de la primera vez, que es de $13 y no de un 45 % como el pasaporte', () => {
    expect(sobreprecioPrimeraVez()).toBe(13)
  })

  // El orden que hace verosímil el cuadro. Ojo: acá la primera vez es apenas MÁS cara que la
  // renovación, al revés de lo intuitivo, así que el test fija ese sentido a propósito.
  it('mantiene el orden de los tres importes', () => {
    expect(ID_CARD_BY_KEY['renovacion-urgente']!.arancel).toBeGreaterThan(
      ID_CARD_BY_KEY['renovacion-comun']!.arancel
    )
    expect(sobreprecioPrimeraVez()).toBeGreaterThan(0)
    expect(ID_CARD_BY_KEY['primera-comun']!.arancel).toBeLessThan(
      ID_CARD_BY_KEY['renovacion-urgente']!.arancel
    )
  })
})

describe('lo que no es un trámite aparte', () => {
  it('lista las situaciones que la ficha resuelve con la misma renovación', () => {
    expect(ID_CARD_SAME_AS_RENEWAL.length).toBeGreaterThanOrEqual(4)
    // Ninguna puede traer un importe propio: el punto es justamente que no tienen arancel propio.
    for (const caso of ID_CARD_SAME_AS_RENEWAL) expect(caso).not.toMatch(/\$\s?\d/)
  })
})

describe('las exoneraciones', () => {
  it('son las dos que publica el Estado, cada una con su norma y su URL oficial', () => {
    expect(ID_CARD_WAIVERS.map(w => w.key)).toEqual(['hurto-rapina', 'mides'])
    for (const waiver of ID_CARD_WAIVERS) {
      expect(waiver.url, waiver.key).toMatch(/^https:\/\/www\.(gub\.uy|impo\.com\.uy)\//)
      expect(waiver.norma.length, waiver.key).toBeGreaterThan(20)
      expect(waiver.como.length, waiver.key).toBeGreaterThan(40)
    }
  })

  // El error que este test existe para impedir: contar la exoneración por hurto o rapiña como si
  // cubriera todo el trámite. El decreto exonera la renovación COMÚN, y una página que diga otra
  // cosa manda a alguien a un mostrador a discutir un derecho que no tiene.
  it('no estira la exoneración por hurto o rapiña más allá de la renovación común', () => {
    const hurto = ID_CARD_WAIVERS.find(w => w.key === 'hurto-rapina')!
    expect(hurto.alcance).toMatch(/renovaci[óo]n com[úu]n/i)
    expect(hurto.norma).toContain('19.355')
    expect(hurto.norma).toContain('69/2016')
  })
})

describe('los plazos', () => {
  it('publica sólo los que traen las fichas', () => {
    expect(ID_CARD_DEADLINES.map(d => d.key)).toEqual([
      'menores-9',
      'mayores-10',
      'devolucion',
      'menores-14',
    ])
    for (const d of ID_CARD_DEADLINES) expect(d.plazo.length, d.key).toBeGreaterThan(30)
  })
})

describe('las discrepancias entre fichas', () => {
  it('quedan publicadas con la ficha que las tiene y una lectura', () => {
    expect(ID_CARD_DISCREPANCIES.length).toBeGreaterThanOrEqual(2)
    for (const d of ID_CARD_DISCREPANCIES) {
      expect(d.url, d.key).toMatch(/^https:\/\/www\.gub\.uy\/tramites\//)
      expect(d.dice.length, d.key).toBeGreaterThan(10)
      expect(d.lectura.length, d.key).toBeGreaterThan(40)
    }
  })
})

describe('lo que la fuente no publica', () => {
  it('se dice en vez de completarse de memoria', () => {
    expect(ID_CARD_UNPUBLISHED.map(u => u.key)).toEqual(['vigencia', 'redes-de-cobranza', 'espera'])
  })

  // El bloque existe justamente para NO contestar estos números. Un importe en pesos o una
  // cantidad de años metidos acá serían alguien contestando lo que la ficha calla.
  it('no cuela una cifra en pesos ni una vigencia en años', () => {
    for (const u of ID_CARD_UNPUBLISHED) expect(u.porQue, u.key).not.toMatch(/\$\s?\d/)
    const vigencia = ID_CARD_UNPUBLISHED.find(u => u.key === 'vigencia')
    expect(vigencia?.porQue).not.toMatch(/\b\d+\s*años\b/)
  })
})

describe('las preguntas frecuentes', () => {
  // Se emiten como FAQPage: una respuesta con un importe que no salga del catálogo es una cifra
  // publicada en el buscador sin nadie que la mantenga.
  it('sólo citan importes que están en el catálogo', () => {
    const catalogados = new Set(
      ID_CARD_FEES.map(f => f.arancel)
        .concat(sobreprecioPrimeraVez())
        .map(n => n.toLocaleString('es-UY'))
    )
    for (const faq of ID_CARD_FAQ) {
      for (const match of faq.answer.matchAll(/\$\s?([\d.]*\d)/g)) {
        expect(catalogados, `${faq.question} → $${match[1]}`).toContain(match[1])
      }
    }
  })

  it('contesta la pregunta del título en la primera', () => {
    expect(ID_CARD_FAQ[0]!.question).toMatch(/cu[áa]nto sale renovar/i)
    expect(ID_CARD_FAQ[0]!.answer).toContain('443')
  })

  it('deja cada respuesta lo bastante larga para servir de snippet', () => {
    for (const faq of ID_CARD_FAQ) expect(faq.answer.length, faq.question).toBeGreaterThan(80)
  })
})

describe('fuentes y verificación', () => {
  it('apunta sólo a fuentes primarias del Estado uruguayo', () => {
    expect(ID_CARD_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const s of ID_CARD_SOURCES) {
      expect(s.url, s.label).toMatch(/^https:\/\/www\.(gub\.uy|impo\.com\.uy)\//)
      expect(s.label.length, s.url).toBeGreaterThan(30)
    }
  })

  it('cita la ficha de renovación y la de primera vez, que son las que traen los importes', () => {
    const urls = ID_CARD_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('documento-nacional-identidad-renovacion-personas-ciudadanas-naturales')
    expect(urls).toContain('documento-nacional-identidad-primera-vez-personas-ciudadanas-naturales')
  })

  it('deja la fecha de verificación en formato ISO y la ruta sin barra final', () => {
    expect(ID_CARD_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(ID_CARD_PATH).toBe('/cuanto-sale-la-cedula-de-identidad-uruguaya')
  })
})
