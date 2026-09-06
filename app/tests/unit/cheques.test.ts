// Guardas de `utils/cheques.ts`.
//
// Lo que se vigila acá no es aritmética —no hay una sola cuenta en el catálogo— sino que cada
// número que la página publica siga siendo el que dice el Decreto-Ley 14.412, y que cada afirmación
// siga teniendo su artículo al lado. Los plazos del cheque son exactamente el tipo de dato que se
// «recuerda mal» en una edición futura: los cuatro del artículo 29 se parecen entre sí, circulan
// versiones equivocadas por todos lados, y un 30 escrito donde va un 15 le cuesta a alguien el
// cobro. Por eso los números van fijados uno por uno, con el artículo que los respalda.

import { describe, expect, it } from 'vitest'

import {
  BOUNCE_STEPS,
  CHEQUE_CLAUSES,
  CHEQUE_FAQ,
  CHEQUE_KIND_TRAITS,
  CHEQUE_LAW,
  CHEQUE_NOT_PUBLISHED,
  CHEQUE_OFFENCES,
  CHEQUE_SOURCES,
  CHEQUE_VERIFIED_AT,
  DEFERRED_MAX_DAYS,
  DRAWER_CURE_BUSINESS_DAYS,
  HOLDER_NOTICE_BUSINESS_DAYS,
  OFFENCE_EXTINCTION,
  PRESCRIPTION_MONTHS,
  PRESENTATION_DEADLINES,
  SUSPENSION_MONTHS,
  articleUrl,
} from '../../utils/cheques'

describe('la norma que se cita es la vigente', () => {
  it('es el Decreto-Ley 14.412 de 1975', () => {
    expect(CHEQUE_LAW.number).toBe('14.412')
    expect(CHEQUE_LAW.enacted).toBe('1975-08-08')
    // Art. 78: la ley entró en vigencia el 1.º de octubre de 1975.
    expect(CHEQUE_LAW.inForceSince).toBe('1975-10-01')
  })

  it('apunta al buscador oficial de IMPO', () => {
    expect(CHEQUE_LAW.url).toBe('https://www.impo.com.uy/bases/decretos-ley/14412-1975')
    expect(articleUrl(29)).toBe('https://www.impo.com.uy/bases/decretos-ley/14412-1975/29')
  })
})

describe('los cuatro plazos del artículo 29', () => {
  it('son 15, 30, 60 y 120 días, en ese orden', () => {
    expect(PRESENTATION_DEADLINES.map(d => d.days)).toEqual([15, 30, 60, 120])
  })

  it('no repite un caso ni una clave', () => {
    expect(new Set(PRESENTATION_DEADLINES.map(d => d.key)).size).toBe(PRESENTATION_DEADLINES.length)
    expect(new Set(PRESENTATION_DEADLINES.map(d => d.caseLabel)).size).toBe(
      PRESENTATION_DEADLINES.length
    )
  })

  // El plazo largo es el del cheque en dólares y el corto el del cheque en pesos de la misma
  // plaza: si alguien los invierte, el sitio estaría diciendo que un cheque en moneda extranjera
  // caduca antes que uno en pesos.
  it('deja el plazo de la moneda extranjera como el más largo', () => {
    const foreign = PRESENTATION_DEADLINES.find(d => d.key === 'foreign-currency')
    expect(foreign?.days).toBe(120)
    expect(foreign?.days).toBe(Math.max(...PRESENTATION_DEADLINES.map(d => d.days)))
  })

  it('explica cada caso con algo más que la etiqueta', () => {
    for (const d of PRESENTATION_DEADLINES) expect(d.detail.length).toBeGreaterThan(60)
  })
})

describe('los demás números del régimen', () => {
  it('el diferido no pasa de 180 días (art. 73)', () => {
    expect(DEFERRED_MAX_DAYS).toBe(180)
  })

  it('los dos plazos de cinco días son hábiles y distintos entre sí (arts. 40 y 61)', () => {
    expect(HOLDER_NOTICE_BUSINESS_DAYS).toBe(5)
    expect(DRAWER_CURE_BUSINESS_DAYS).toBe(5)
  })

  it('la suspensión y la prescripción son de seis meses (arts. 62 y 68)', () => {
    expect(SUSPENSION_MONTHS).toBe(6)
    expect(PRESCRIPTION_MONTHS).toBe(6)
  })
})

describe('la diferencia entre común y diferido no se borronea', () => {
  it('dice que el común es pagadero a la vista y remite al artículo 28', () => {
    const payable = CHEQUE_KIND_TRAITS.find(t => t.key === 'when-payable')
    expect(payable?.article).toBe(28)
    expect(payable?.common).toMatch(/a la vista/i)
    expect(payable?.deferred).toMatch(/fecha/i)
  })

  it('el tope de 180 días cuelga del artículo 73 y sólo del diferido', () => {
    const term = CHEQUE_KIND_TRAITS.find(t => t.key === 'max-term')
    expect(term?.article).toBe(73)
    expect(term?.deferred).toContain('ciento ochenta')
  })
})

describe('el capítulo penal se cuenta completo', () => {
  it('lista los dos delitos con su pena y su artículo', () => {
    expect(CHEQUE_OFFENCES.map(o => o.article).sort()).toEqual([58, 60])
    for (const o of CHEQUE_OFFENCES) expect(o.penalty.length).toBeGreaterThan(10)
  })

  // El artículo 60 es el dato por el que la página existe: se cae del catálogo y la página pasa a
  // ser una más sobre plazos de cheques.
  it('mantiene que aceptar o exigir un cheque en garantía es delito', () => {
    const guarantee = CHEQUE_OFFENCES.find(o => o.key === 'garantia')
    expect(guarantee?.article).toBe(60)
    expect(guarantee?.label).toMatch(/garant/i)
    expect(guarantee?.detail).toMatch(/usura/i)
  })

  // La salida del art. 59 no alcanza al literal B, y contarla entera es la diferencia entre
  // informar y dar una falsa tranquilidad.
  it('aclara que la extinción por pago no vale para el literal B', () => {
    expect(OFFENCE_EXTINCTION.article).toBe(59)
    expect(OFFENCE_EXTINCTION.text).toMatch(/literal B/)
    expect(OFFENCE_EXTINCTION.text).toMatch(/Ministerio Público/)
  })
})

describe('la secuencia del rechazo separa los dos lados del mostrador', () => {
  it('tiene pasos para el tenedor y para el librador', () => {
    const sides = new Set(BOUNCE_STEPS.map(s => s.side))
    expect(sides).toEqual(new Set(['tenedor', 'librador']))
    expect(BOUNCE_STEPS.filter(s => s.side === 'tenedor').length).toBeGreaterThanOrEqual(3)
    expect(BOUNCE_STEPS.filter(s => s.side === 'librador').length).toBeGreaterThanOrEqual(4)
  })

  it('escala de la suspensión en un banco a la clausura por el Banco Central', () => {
    const suspension = BOUNCE_STEPS.find(s => s.key === 'suspension')
    const closure = BOUNCE_STEPS.find(s => s.key === 'clausura')
    expect(suspension?.article).toBe(62)
    expect(closure?.article).toBe(63)
    expect(closure?.detail).toMatch(/Banco Central del Uruguay/)
  })
})

describe('cada afirmación tiene su artículo y cada artículo su fuente', () => {
  const cited = new Set<number>([
    ...CHEQUE_KIND_TRAITS.map(t => t.article),
    ...CHEQUE_CLAUSES.map(c => c.article),
    ...BOUNCE_STEPS.map(s => s.article),
    ...CHEQUE_OFFENCES.map(o => o.article),
    OFFENCE_EXTINCTION.article,
  ])

  it('no cita un artículo fuera del rango del decreto-ley', () => {
    for (const article of cited) {
      expect(article).toBeGreaterThanOrEqual(1)
      // El decreto-ley termina en el artículo 79 («Comuníquese, etc.»).
      expect(article).toBeLessThanOrEqual(79)
    }
  })

  it('todas las fuentes apuntan a impo.com.uy y ninguna se repite', () => {
    expect(CHEQUE_SOURCES.length).toBeGreaterThanOrEqual(10)
    for (const s of CHEQUE_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(s.label.length).toBeGreaterThan(15)
    }
    expect(new Set(CHEQUE_SOURCES.map(s => s.url)).size).toBe(CHEQUE_SOURCES.length)
  })

  // La guarda que importa: que la lista de fuentes cubra los artículos que la página realmente
  // usa. Sin esto, agregar un dato nuevo con su artículo pasa el resto de los tests y publica una
  // afirmación cuya fuente no está enlazada en ningún lado.
  it('enlaza una fuente para cada artículo citado, salvo los cubiertos por un rango', () => {
    const RANGES: ReadonlyArray<readonly [number, number]> = [
      [47, 50],
      [51, 52],
      [61, 64],
      [71, 75],
    ]
    const linked = new Set(
      CHEQUE_SOURCES.map(s => Number(s.url.split('/').pop())).filter(n => Number.isFinite(n))
    )
    for (const article of cited) {
      const covered =
        linked.has(article) || RANGES.some(([from, to]) => article >= from && article <= to)
      expect(covered, `el artículo ${article} no tiene fuente enlazada`).toBe(true)
    }
  })
})

describe('la página no publica lo que no puede sostener', () => {
  const prose = [
    ...PRESENTATION_DEADLINES.map(d => `${d.caseLabel} ${d.detail}`),
    ...CHEQUE_KIND_TRAITS.map(t => `${t.label} ${t.common} ${t.deferred}`),
    ...CHEQUE_CLAUSES.map(c => `${c.label} ${c.what}`),
    ...BOUNCE_STEPS.map(s => `${s.label} ${s.detail}`),
    ...CHEQUE_OFFENCES.map(o => `${o.label} ${o.penalty} ${o.detail}`),
    ...CHEQUE_FAQ.map(f => `${f.question} ${f.answer}`),
  ].join('\n')

  // La trampa concreta de este tema: «el banco te cobra $ X por el cheque rechazado». La ley no
  // fija ningún arancel y cada institución pone el suyo, así que cualquier importe en pesos o
  // dólares escrito acá sería inventado.
  it('no publica ningún importe de dinero', () => {
    expect(prose).not.toMatch(/(\$|US\$|UYU|USD)\s?\d/)
  })

  it('declara lo que se niega a publicar, con el motivo', () => {
    expect(CHEQUE_NOT_PUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of CHEQUE_NOT_PUBLISHED) {
      expect(item.claim.length).toBeGreaterThan(20)
      expect(item.why.length).toBeGreaterThan(60)
    }
  })

  it('el primer no-publicado es el arancel bancario', () => {
    expect(CHEQUE_NOT_PUBLISHED[0]?.claim).toMatch(/arancel|cobra/i)
  })
})

describe('las preguntas frecuentes contestan lo que se busca', () => {
  it('abre por el mito del cheque posdatado', () => {
    expect(CHEQUE_FAQ[0]?.question).toMatch(/fecha futura/i)
    expect(CHEQUE_FAQ[0]?.answer).toMatch(/^No\./)
  })

  it('contesta el plazo con los cuatro números', () => {
    const answer = CHEQUE_FAQ.find(f => /cu[áa]nto tiempo tengo/i.test(f.question))?.answer ?? ''
    for (const word of ['quince', 'treinta', 'sesenta', 'ciento veinte']) {
      expect(answer).toContain(word)
    }
  })

  it('no repite una pregunta y todas terminan en signo de cierre', () => {
    expect(new Set(CHEQUE_FAQ.map(f => f.question)).size).toBe(CHEQUE_FAQ.length)
    for (const f of CHEQUE_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(80)
    }
  })
})

describe('la fecha de verificación es real', () => {
  it('tiene forma ISO y no está en el futuro', () => {
    expect(CHEQUE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${CHEQUE_VERIFIED_AT}T00:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now())
  })
})
