// app/tests/unit/investments.test.ts
import { describe, expect, it } from 'vitest'
import {
  CUSTODY_INSOLVENCY,
  CUSTODY_VERIFIED_AT,
  GLETIR_SAFETY_ANALYSIS,
  INVESTMENTS,
  INVESTMENT_CATEGORIES,
  getInvestment,
  investmentsByCategory,
  riskLabel,
  minInvestmentLabel,
  type InvestmentOption,
} from '../../utils/investments'

describe('investments catalog', () => {
  it('has unique ids', () => {
    const ids = INVESTMENTS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every option has a source URL', () => {
    for (const i of INVESTMENTS) expect(i.source).toMatch(/^https?:\/\//)
  })
  it('rating is null or within 0..5', () => {
    for (const i of INVESTMENTS) {
      if (i.rating != null) {
        expect(i.rating).toBeGreaterThanOrEqual(0)
        expect(i.rating).toBeLessThanOrEqual(5)
      }
    }
  })
  it('every rated option cites at least one review source', () => {
    for (const i of INVESTMENTS) {
      if (i.rating != null) expect(i.reviewSources.length).toBeGreaterThan(0)
    }
  })
  it('covers all six tabular categories', () => {
    const cats = new Set(INVESTMENTS.map(i => i.category))
    expect([...cats].sort()).toEqual(
      [
        'banco_broker',
        'broker_internacional',
        'cripto',
        'fintech',
        'fondo_inversion',
        'renta_fija_local',
      ].sort()
    )
  })
  it('minInvestment is null or has a positive amount', () => {
    for (const i of INVESTMENTS) {
      if (i.minInvestment != null) expect(i.minInvestment.amount).toBeGreaterThan(0)
    }
  })
  it('covers Gletir as an active locally regulated broker', () => {
    const gletir = getInvestment('gletir-global')
    expect(gletir?.regulation).toBe('bcu')
    expect(gletir?.regulationNote).toContain('2317')
    expect(gletir?.feesNote).toContain('0,75%')
    expect(gletir?.feesNote).toContain('USD 10')
  })
})

describe('Gletir safety analysis', () => {
  it('separates regulation, custody, compliance, and investment risk', () => {
    expect(GLETIR_SAFETY_ANALYSIS.dimensions.map(item => item.label)).toEqual([
      'Regulación local',
      'Custodia',
      'Cumplimiento',
      'Riesgo de inversión',
    ])
  })

  it('discloses the material BCU sanction without presenting insolvency as a fact', () => {
    expect(GLETIR_SAFETY_ANALYSIS.cautions.join(' ')).toContain('RR-SSF-2025-303')
    expect(GLETIR_SAFETY_ANALYSIS.cautions.join(' ')).toContain('No prueban insolvencia')
  })

  it('backs the assessment with primary sources', () => {
    expect(GLETIR_SAFETY_ANALYSIS.sources.length).toBeGreaterThanOrEqual(6)
    for (const source of GLETIR_SAFETY_ANALYSIS.sources) {
      expect(source.url).toMatch(/^https?:\/\//)
    }
  })
})

// Invariants over `taxNote`. These exist because three tax errors lived in this field
// unguarded: the 8% presented as a rate available whenever "un agente residente" withholds,
// a crypto percentage we have no norm for, and a step-up stated without its statutory
// condition. Source of truth: docs/superpowers/specs/2026-07-12-impuestos-inversiones-design.md.
describe('investments taxNote invariants', () => {
  it('every option has a non-empty taxNote', () => {
    for (const i of INVESTMENTS) {
      expect(i.taxNote.trim(), `${i.id} has an empty taxNote`).not.toBe('')
    }
  })

  it('no crypto row publishes a percentage (the treatment is unresolved)', () => {
    for (const i of INVESTMENTS.filter(i => i.category === 'cripto')) {
      expect(i.taxNote, `${i.id} publishes a crypto percentage: no norm settles it`).not.toMatch(
        /%/
      )
    }
  })

  it('never presents the 8% as a rate: it is a withholding, and only a custodian may apply it', () => {
    for (const i of INVESTMENTS.filter(i => i.taxNote.includes('8%'))) {
      expect(i.taxNote, `${i.id} mentions 8% without calling it a retención`).toMatch(/retención/)
      // T7 art. 52 lit. A + Dec. 148/007: only a resident entity that intermediates AND holds
      // custody may withhold the 8%. Without the custody condition the note reads as "any
      // resident agent", which is the error this guard exists to kill.
      expect(i.taxNote, `${i.id} mentions 8% without the custody condition`).toMatch(/custodi/)
    }
  })

  it('never states the 2025 step-up without its "bolsas de reconocido prestigio" condition', () => {
    for (const i of INVESTMENTS.filter(i => i.taxNote.includes('31/12/2025'))) {
      expect(i.taxNote, `${i.id} states the step-up unconditionally`).toMatch(
        /bolsas de reconocido prestigio/
      )
    }
  })
})

// Invariantes de la sección de custodia/insolvencia. Existen porque esta sección publica la
// ausencia de una protección (no hay fondo de compensación al inversor) y esa es exactamente la
// clase de afirmación que un futuro editor "arregla" agregando un consuelo inventado.
describe('custodia e insolvencia del intermediario', () => {
  it('declara cuándo se contrastaron las normas, en ISO', () => {
    expect(CUSTODY_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(CUSTODY_VERIFIED_AT).getTime())).toBe(false)
  })

  it('ninguna regla se publica sin la norma que la sostiene', () => {
    const rules = [...CUSTODY_INSOLVENCY.protections, ...CUSTODY_INSOLVENCY.limits]
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.title.trim(), 'regla sin título').not.toBe('')
      expect(rule.detail.trim(), `${rule.title} sin detalle`).not.toBe('')
      expect(rule.source.trim(), `${rule.title} sin norma citada`).not.toBe('')
      expect(rule.source, `${rule.title} cita algo que no es una norma`).toMatch(
        /Ley 1[68]\.\d{3}|RNMV|COPAB|BROU/
      )
    }
  })

  it('toda ausencia dice qué hay en su lugar y de dónde sale', () => {
    expect(CUSTODY_INSOLVENCY.absences.length).toBeGreaterThan(0)
    for (const absence of CUSTODY_INSOLVENCY.absences) {
      expect(absence.missing.trim(), 'ausencia sin enunciado').not.toBe('')
      expect(absence.instead.trim(), `${absence.missing} sin contrapartida`).not.toBe('')
      expect(absence.source, `${absence.missing} sin fuente`).toMatch(
        /Ley 1[68]\.\d{3}|RNMV|COPAB|BROU/
      )
    }
  })

  it('publica el hecho negativo: no hay fondo de compensación al inversor tipo SIPC', () => {
    const text = CUSTODY_INSOLVENCY.absences.map(a => `${a.missing} ${a.instead}`).join(' ')
    expect(text).toMatch(/SIPC/)
    expect(text).toMatch(/no consta/i)
  })

  // SIPC es homónimo de dos cosas distintas en este repo: el regulador estadounidense que cita la
  // fila prex-us-stocks-etfs y el "Sistema de Información de Precios al Consumidor" del MEF que
  // lista utils/moneyApps.ts. Acá sólo puede aparecer como el fondo estadounidense que Uruguay
  // NO tiene.
  it('sólo menciona SIPC para decir que Uruguay no tiene un equivalente', () => {
    const mentions = [
      ...CUSTODY_INSOLVENCY.protections,
      ...CUSTODY_INSOLVENCY.limits,
      ...CUSTODY_INSOLVENCY.absences.map(a => ({ detail: `${a.missing} ${a.instead}` })),
      { detail: CUSTODY_INSOLVENCY.thesis },
    ].filter(item => item.detail.includes('SIPC'))
    expect(mentions.length).toBeGreaterThan(0)
    for (const mention of mentions) {
      expect(mention.detail, 'SIPC mencionado sin decir que en Uruguay no existe').toMatch(
        /no consta|no existe|Estados Unidos/i
      )
    }
  })

  // El error que esta sección viene a evitar: que alguien lea "COPAB" y crea que cubre su cartera.
  it('nunca dice que la COPAB o el FGDB cubran valores o fondos de inversión', () => {
    const text = [
      CUSTODY_INSOLVENCY.thesis,
      ...CUSTODY_INSOLVENCY.protections.map(r => r.detail),
      ...CUSTODY_INSOLVENCY.limits.map(r => r.detail),
      ...CUSTODY_INSOLVENCY.absences.map(a => a.instead),
    ].join(' ')
    expect(text).not.toMatch(
      /(COPAB|FGDB)[^.]{0,80}(cubre|garantiza)[^.]{0,40}(valores|cuotapartes)/i
    )
    // Y la única cobertura que sí nombra es la de depósitos, con sus dos topes.
    expect(text).toMatch(/USD 10\.000/)
    expect(text).toMatch(/UI 250\.000/)
  })

  it('no confunde la garantía del art. 149 con una cobertura por inversor', () => {
    const garantia = [...CUSTODY_INSOLVENCY.protections, ...CUSTODY_INSOLVENCY.limits].filter(r =>
      r.detail.includes('UI 2.000.000')
    )
    expect(garantia.length).toBeGreaterThan(0)
    const limitText = CUSTODY_INSOLVENCY.limits.map(r => `${r.title} ${r.detail}`).join(' ')
    expect(limitText).toMatch(/no es una cobertura por inversor|piso fijo/i)
  })

  it('cita como fuentes primarias la Ley 18.627, la RNMV del BCU y la COPAB', () => {
    const urls = CUSTODY_INSOLVENCY.sources.map(s => s.url)
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
    expect(urls.some(u => u.includes('impo.com.uy/bases/leyes/18627-2009'))).toBe(true)
    expect(urls.some(u => u.includes('bcu.gub.uy') && u.includes('RNMV'))).toBe(true)
    expect(urls.some(u => u.includes('copab.org.uy'))).toBe(true)
    expect(urls.some(u => u.includes('impo.com.uy/bases/leyes/16774-1996'))).toBe(true)
  })

  // GRAVE corregido: el checklist afirmaba que no estar inscripto "te deja sin ninguna de las
  // protecciones de esta sección". Ninguna norma dice eso: el art. 94 define al intermediario por
  // su actividad ("en forma profesional y habitual") y el art. 109 le da la separación patrimonial
  // a la categoría, no al inscripto. Tampoco "estar en el registro no garantiza nada": la
  // inscripción es la que dispara la garantía del art. 101 / RNMV art. 149 que esta misma sección
  // publica como protección.
  it('nunca afirma que la falta de inscripción haga caer las protecciones', () => {
    const text = [
      CUSTODY_INSOLVENCY.thesis,
      ...CUSTODY_INSOLVENCY.protections.map(r => `${r.title} ${r.detail}`),
      ...CUSTODY_INSOLVENCY.limits.map(r => `${r.title} ${r.detail}`),
      ...CUSTODY_INSOLVENCY.absences.map(a => `${a.missing} ${a.instead}`),
      ...CUSTODY_INSOLVENCY.checklist,
    ].join(' ')
    expect(text, 'inventa que no estar inscripto te saca las protecciones').not.toMatch(
      /sin ninguna de las protecciones|te deja sin (las )?protecci/i
    )
    expect(
      text,
      'dice que el registro "no garantiza nada", contradiciendo el art. 149'
    ).not.toMatch(/registro no garantiza nada|inscripción no garantiza nada/i)
  })

  // Y lo que sí se puede afirmar, se afirma con artículo: la autorización y la fiscalización de la
  // SSF (arts. 95 y 96) son lo único que se pierde operando con alguien no autorizado.
  it('el ítem del registro se apoya en los artículos que sí leímos', () => {
    const item = CUSTODY_INSOLVENCY.checklist.find(i =>
      /Superintendencia de Servicios Financieros/.test(i)
    )
    expect(item, 'el checklist ya no verifica la inscripción').toBeDefined()
    expect(item!, 'afirma sobre el registro sin citar los arts. 95/96').toMatch(/arts?\. 95 y 96/)
    expect(
      item!,
      'no publica la ausencia: que la ley define al intermediario por su actividad'
    ).toMatch(/art\. 94/)
  })

  // MEDIO corregido: los deberes que la Circular 2504 CREÓ (arts. 209.2/209.3/209.4, el literal g.
  // del art. 210 y la nueva periodicidad del art. 212) están en plazo de adecuación de 180 días
  // desde el 24/06/2026. Publicarlos como "pedilo, es obligatorio hoy" sin la vigencia es convertir
  // en accionable un deber que todavía no lo es.
  it('todo deber NUEVO de la Circular 2504 se publica con su plazo de adecuación', () => {
    const citas = [
      ...CUSTODY_INSOLVENCY.protections.map(r => `${r.detail} ${r.source}`),
      ...CUSTODY_INSOLVENCY.limits.map(r => `${r.detail} ${r.source}`),
      ...CUSTODY_INSOLVENCY.checklist,
      ...GLETIR_SAFETY_ANALYSIS.checklist,
    ].filter(t =>
      /art(?:s|ículo)?\.? ?209\.[234]\b|art(?:s|ículo)?\.? ?212\b|210 lits?\.[^,.)]*\bg\b/.test(t)
    )
    expect(citas.length).toBeGreaterThanOrEqual(6)
    for (const cita of citas) {
      expect(cita, 'cita un deber nuevo de la 2504 sin la vigencia del 24/06/2026').toMatch(
        /24\/06\/2026/
      )
      expect(cita, 'cita un deber nuevo de la 2504 sin los 180 días de adecuación').toMatch(
        /180 días/
      )
    }
  })

  // MEDIO corregido (2ª ronda): el guard anterior filtraba por número de artículo pelado y exigía
  // el plazo de adecuación sobre TODA cita del art. 210. Pero el art. 210 mezcla lo que la 2504
  // creó (el literal g., cuentas globales) con deberes que el mismo artículo ya traía y que la
  // resolución se limitó a retranscribir al sustituirlo entero. La transitoria da 180 días "para
  // adecuarse a las disposiciones contenidas en la presente resolución": no resucita un plazo para
  // lo viejo. El párrafo segundo (certificado de la Bolsa + Comunicación de inscripción en el
  // Registro del Mercado de Valores) y el literal f. (institución del exterior referenciada) están
  // palabra por palabra en la redacción anterior —Circular 2320, vigencia 22/01/2019— y ya estaban
  // en la RNMV de enero de 2015. Prueba concluyente: el art. 211 le impone hoy a los asesores de
  // inversión el mismo deber de la Comunicación de inscripción y cierra con Circular 2320, sin
  // plazo. Decirle al lector "si te dicen que lo están implementando, están en plazo" sobre esos
  // deberes es el error espejo del que esta sección vino a corregir: le suspende un derecho que ya
  // tiene.
  it('los deberes del art. 210 anteriores a la Circular 2504 no se publican como si estuvieran en plazo', () => {
    const item = CUSTODY_INSOLVENCY.checklist.find(i => i.includes('Comunicación de inscripción'))
    expect(item, 'el checklist ya no pide la Comunicación de inscripción').toBeDefined()
    expect(
      item!,
      'le cuelga a la Comunicación de inscripción un plazo de adecuación que no le corresponde: el deber rige sin plazo desde antes de la Circular 2504'
    ).not.toMatch(/180 días|24\/06\/2026/)
    expect(item!, 'no dice desde cuándo es exigible el deber').toMatch(/2320|22\/01\/2019/)

    const litF = [...CUSTODY_INSOLVENCY.protections, ...CUSTODY_INSOLVENCY.limits]
      .map(r => r.source)
      .filter(s => /210 lits?\. f/.test(s))
    expect(litF.length, 'desapareció la cita del art. 210 lit. f').toBeGreaterThan(0)
    for (const source of litF) {
      expect(
        source,
        'publica el lit. f del art. 210 sin decir que ya regía antes de la Circular 2504'
      ).toMatch(/2320|22\/01\/2019/)
      expect(
        source,
        'el plazo de 180 días cuelga del lit. f, que no es disposición nueva de la Circular 2504'
      ).not.toMatch(/lits?\. f[^)]*(?:180 días|adecuación)/)
    }
  })

  // MEDIO corregido: las dos garantías adicionales del art. 149 no son exigibles hoy. La propia
  // disposición transitoria da hasta el 31/03/2027, y hasta el 30/09/2026 para la adicional por
  // personas vinculadas en cuentas globales. Y LEVE corregido: la norma dice "por el exceso a este
  // monto - una garantía adicional equivalente al 0,05% ... del portafolio gestionado"; la página
  // había resuelto la ambigüedad en silencio a favor de "sobre el exceso".
  it('las garantías adicionales del art. 149 van con sus fechas y con la base tal cual la norma', () => {
    const regla = [...CUSTODY_INSOLVENCY.protections, ...CUSTODY_INSOLVENCY.limits].find(r =>
      r.detail.includes('UI 1.000.000.000')
    )
    expect(regla, 'desapareció la garantía adicional por gestión de portafolios').toBeDefined()
    expect(regla!.detail, 'elige una base de cálculo que la norma no aclara').toMatch(
      /del portafolio gestionado/
    )
    const conFechas = `${regla!.detail} ${regla!.source}`
    expect(conFechas, 'publica la adicional por personas vinculadas sin el 30/09/2026').toMatch(
      /30\/09\/2026/
    )
    expect(conFechas, 'publica las adicionales sin el 31/03/2027').toMatch(/31\/03\/2027/)
  })

  // MEDIO corregido: la fórmula del "juicio de valor" es texto de inserción obligatoria en
  // PROSPECTOS de emisores (RNMV art. 13) y en el reglamento/prospecto de fondos (art. 82).
  // Ninguna se refiere a la inscripción de un intermediario en el Registro, y los arts. 96 y 97 de
  // la Ley 18.627 no dicen una palabra sobre juicios de valor.
  it('atribuye la fórmula del juicio de valor al artículo que la impone, no al registro', () => {
    const tarjeta = CUSTODY_INSOLVENCY.absences.find(a => a.instead.includes('juicio de valor'))
    expect(tarjeta, 'desapareció la ausencia sobre el registro del BCU').toBeDefined()
    expect(tarjeta!.source, 'cita la fórmula sin el artículo de la RNMV que la impone').toMatch(
      /RNMV, arts?\. (13|82)/
    )
    expect(tarjeta!.instead, 'no aclara a quién se la impone la norma').toMatch(
      /prospecto|fondos de inversión/i
    )
  })

  // LEVE corregido: el art. 110 va inmediatamente después del 109 y es el recorte legal más
  // directo a la separación patrimonial. La sección declara haber barrido la ley: no puede faltar.
  it('el bloque de límites incluye el art. 110, pegado al artículo que sostiene la tesis', () => {
    const art110 = CUSTODY_INSOLVENCY.limits.find(r => /art\. 110/.test(r.source))
    expect(art110, 'falta el art. 110 entre los límites').toBeDefined()
    expect(art110!.detail).toMatch(/caja de valores/i)
    expect(art110!.detail).toMatch(/compensación y liquidación/i)
    expect(art110!.detail, 'omite que pueden realizarse los bienes afectados en garantía').toMatch(
      /afectado en garantía/i
    )
  })

  it('el checklist responde la pregunta que el análisis de Gletir dejaba abierta', () => {
    const checklist = CUSTODY_INSOLVENCY.checklist.join(' ')
    expect(CUSTODY_INSOLVENCY.checklist.length).toBeGreaterThanOrEqual(4)
    expect(checklist).toMatch(/estado(s)? de cuenta/i)
    expect(checklist).toMatch(/custodi/i)
    // El pedido del custodio dejó de ser un favor: es información mínima obligatoria.
    expect(GLETIR_SAFETY_ANALYSIS.checklist.join(' ')).toMatch(/210/)
  })
})

describe('investments helpers', () => {
  it('riskLabel maps every level to a capitalized Spanish label', () => {
    expect(riskLabel('bajo')).toBe('Bajo')
    expect(riskLabel('medio')).toBe('Medio')
    expect(riskLabel('alto')).toBe('Alto')
    expect(riskLabel('variable')).toBe('Variable')
  })
  it('minInvestmentLabel formats amount+currency or falls back to Sin mínimo', () => {
    const withAmount: InvestmentOption = {
      ...INVESTMENTS[0]!,
      minInvestment: { amount: 1000, currency: 'USD' },
    }
    expect(minInvestmentLabel(withAmount)).toBe('US$ 1.000')
    const noMin: InvestmentOption = { ...INVESTMENTS[0]!, minInvestment: null }
    expect(minInvestmentLabel(noMin)).toBe('Sin mínimo')
  })
  it('investmentsByCategory groups in INVESTMENT_CATEGORIES order with all options', () => {
    const groups = investmentsByCategory()
    expect(groups.map(g => g.category)).toEqual(Object.keys(INVESTMENT_CATEGORIES))
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(INVESTMENTS.length)
  })
  it('getInvestment finds by id', () => {
    expect(getInvestment(INVESTMENTS[0]!.id)?.id).toBe(INVESTMENTS[0]!.id)
    expect(getInvestment('nope')).toBeUndefined()
  })
})
