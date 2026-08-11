// app/tests/unit/investments.test.ts
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEPOSIT_RULES } from '../../utils/capitalTax'
import { INSTRUMENTOS } from '../../utils/financingData'
import {
  BCU_DEPOSIT_RATES,
  BROU_DEPOSIT_BOARD,
  CUSTODY_INSOLVENCY,
  CUSTODY_VERIFIED_AT,
  DEPOSIT_IRPF_LAW,
  DEPOSIT_REFERENCE_ABSENCES,
  DEPOSIT_REFERENCE_SOURCES,
  DEPOSIT_REFERENCE_VERIFIED_AT,
  GLETIR_SAFETY_ANALYSIS,
  INVESTMENTS,
  INVESTMENT_CATEGORIES,
  brouTrancheFor,
  daysForMonths,
  getInvestment,
  investmentsByCategory,
  irpfDepositMatrix,
  irpfMatrixText,
  irpfRowText,
  marketBucketFor,
  netOfIrpf,
  pfNotBelowTotal,
  riskLabel,
  minInvestmentLabel,
  type DepositCurrency,
  type InvestmentOption,
} from '../../utils/investments'

const here = dirname(fileURLToPath(import.meta.url))
const readApp = (rel: string) => readFileSync(resolve(here, '../..', rel), 'utf8')
/** Redondeo a los dos decimales que se publican. */
const round2 = (v: number) => Math.round(v * 100) / 100

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

// Invariantes de los valores de referencia del plazo fijo. Existen porque esta sección publica
// NÚMEROS con fecha de caducidad (una media mensual del BCU y una pizarra comercial de un banco) y
// además publica AUSENCIAS. Las dos cosas son exactamente las que un futuro editor "mejora": el
// número, redondeando un tramo que no existe; la ausencia, rellenándola con un consuelo.
describe('valores de referencia del plazo fijo', () => {
  const CURRENCIES: DepositCurrency[] = ['UYU', 'UI', 'USD']

  it('declara en ISO cuándo se contrastaron las tasas', () => {
    expect(DEPOSIT_REFERENCE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(DEPOSIT_REFERENCE_VERIFIED_AT).getTime())).toBe(false)
  })

  it('la serie del BCU dice de qué mes es y de dónde sale', () => {
    expect(BCU_DEPOSIT_RATES.periodIso).toMatch(/^\d{4}-\d{2}$/)
    expect(BCU_DEPOSIT_RATES.period.trim()).not.toBe('')
    expect(BCU_DEPOSIT_RATES.seriesUrl).toMatch(/^https:\/\/www\.bcu\.gub\.uy\//)
    expect(BCU_DEPOSIT_RATES.pageUrl).toMatch(/^https:\/\/www\.bcu\.gub\.uy\//)
  })

  // El punto de la tarea: la serie NO abre por tipo de banca. Si alguien inventa una fila
  // "banca privada", este guard la caza.
  it('no atribuye la media del BCU a un tipo de banca ni a un banco: es el total del sistema', () => {
    expect(BCU_DEPOSIT_RATES.scope).toMatch(/[Tt]otal sistema bancario/)
    expect(BCU_DEPOSIT_RATES.scope).toMatch(/No hay apertura por banca pública \/ privada/)
    for (const c of CURRENCIES) {
      expect(BCU_DEPOSIT_RATES.series[c].cuadro).toMatch(/Total sistema bancario/)
    }
  })

  it('cada tramo del BCU tiene rango coherente y tasas nulas o positivas', () => {
    for (const c of CURRENCIES) {
      const buckets = BCU_DEPOSIT_RATES.series[c].buckets
      expect(buckets.length).toBeGreaterThan(0)
      let prevMax = -1
      for (const b of buckets) {
        expect(b.label.trim(), `${c}: tramo sin etiqueta`).not.toBe('')
        expect(b.minDays, `${c}/${b.label}: los tramos no son contiguos`).toBe(
          prevMax < 0 ? 0 : prevMax
        )
        if (b.maxDays != null) {
          expect(b.maxDays, `${c}/${b.label}: rango invertido`).toBeGreaterThan(b.minDays)
          prevMax = b.maxDays
        }
        for (const v of [b.personaFisica, b.totalSistema]) {
          if (v != null) expect(v, `${c}/${b.label}: tasa no positiva`).toBeGreaterThan(0)
        }
      }
    }
  })

  // "sin operaciones" NO es cero. Si alguien lo convierte en 0, la calculadora ofrecería
  // "usar 0%" como si fuera una tasa de mercado.
  it('en UI, los tramos de menos de 91 días van como null, no como 0', () => {
    const cortos = BCU_DEPOSIT_RATES.series.UI.buckets.filter(b => (b.maxDays ?? 9999) <= 91)
    expect(cortos.length).toBe(3)
    for (const b of cortos) {
      expect(b.personaFisica, `${b.label}: "sin operaciones" convertido en número`).toBeNull()
      expect(b.totalSistema, `${b.label}: "sin operaciones" convertido en número`).toBeNull()
    }
  })

  // El BCU no abre tramo de 367 días o más en pesos ni en dólares. Estirar el de 181–366 para
  // tapar el agujero sería publicar una media que la fuente no publica.
  it('no inventa un tramo de más de un año en pesos ni en dólares', () => {
    for (const c of ['UYU', 'USD'] as DepositCurrency[]) {
      const buckets = BCU_DEPOSIT_RATES.series[c].buckets
      const ultimo = buckets[buckets.length - 1]
      expect(ultimo?.maxDays, `${c}: apareció un tramo abierto que el BCU no publica`).toBe(367)
      expect(marketBucketFor(c, 24), `${c}: 24 meses cae en un tramo inexistente`).toBeNull()
    }
    // En UI sí existe, y el helper lo encuentra.
    expect(marketBucketFor('UI', 24)?.maxDays).toBeNull()
    expect(marketBucketFor('UI', 24)?.minDays).toBe(367)
  })

  it('la pizarra del BROU va con su vigencia, su PDF y su tope de plazo', () => {
    expect(BROU_DEPOSIT_BOARD.vigencia).toMatch(/2026/)
    expect(BROU_DEPOSIT_BOARD.pdfUrl).toMatch(/^https:\/\/www\.brou\.com\.uy\/.*\.pdf$/)
    for (const c of CURRENCIES) {
      const s = BROU_DEPOSIT_BOARD.series[c]
      expect(s.minimum.trim(), `${c}: pizarra sin mínimo`).not.toBe('')
      expect(s.vigenciaMoneda).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      let prev = 0
      for (const t of s.tranches) {
        expect(t.maxDays, `${c}/${t.label}: rango invertido`).toBeGreaterThanOrEqual(t.minDays)
        expect(t.minDays, `${c}/${t.label}: tramos desordenados`).toBeGreaterThan(prev)
        prev = t.maxDays
        expect(t.online, `${c}/${t.label}: tasa online no positiva`).toBeGreaterThan(0)
        expect(t.branch, `${c}/${t.label}: tasa de sucursal no positiva`).toBeGreaterThan(0)
      }
      expect(prev, `${c}: la pizarra llega más allá de 1096 días`).toBe(1096)
    }
  })

  // El hallazgo que justifica la sección: el canal cambia la tasa dentro del mismo banco.
  // Si alguien "corrige" la pizarra igualando las dos columnas, borra el dato accionable.
  it('la pizarra e-BROU nunca paga menos que la de sucursal, y en pesos largo paga más', () => {
    for (const c of CURRENCIES) {
      for (const t of BROU_DEPOSIT_BOARD.series[c].tranches) {
        expect(t.online, `${c}/${t.label}: e-BROU por debajo de sucursal`).toBeGreaterThanOrEqual(
          t.branch
        )
        if (t.onlinePeriodic != null) {
          expect(
            t.onlinePeriodic,
            `${c}/${t.label}: el pago periódico no puede rendir más que al vencimiento`
          ).toBeLessThan(t.online)
        }
      }
    }
    const largo = BROU_DEPOSIT_BOARD.series.UYU.tranches.at(-1)
    expect(largo?.online).toBeGreaterThan((largo?.branch ?? 0) + 1)
  })

  // El euro a 0% es un dato verificado, no un placeholder sin cargar.
  it('publica el 0% del euro como dato, con su vigencia', () => {
    expect(BROU_DEPOSIT_BOARD.eur.rate).toBe(0)
    expect(BROU_DEPOSIT_BOARD.eur.vigencia).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(BROU_DEPOSIT_BOARD.eur.note).toMatch(/0%|no rinde/)
  })

  // Meses → días. Redondear a 30 días por mes metería un depósito a 12 meses en el tramo de
  // "más de un año" y le cambiaría la tasa Y la alícuota de IRPF.
  it('12 meses son 365 días y caen en el tramo de 181 a 366, no en el de más de un año', () => {
    expect(daysForMonths(12)).toBe(365)
    expect(daysForMonths(24)).toBe(731)
    expect(daysForMonths(0)).toBe(0)
    expect(daysForMonths(-3)).toBe(0)
    expect(marketBucketFor('UYU', 12)?.label).toBe('181 a 366 días')
    expect(brouTrancheFor('UYU', 12)?.label).toBe('181 – 366')
    expect(brouTrancheFor('UYU', 24)?.label).toBe('547 – 731')
  })

  it('los helpers devuelven null fuera de rango en vez del tramo más cercano', () => {
    expect(brouTrancheFor('UYU', 0)).toBeNull()
    expect(brouTrancheFor('UYU', 48)).toBeNull() // 1461 días: la pizarra corta en 1096
    // La pizarra en UI arranca en 181 días: a 3 meses no hay producto.
    expect(brouTrancheFor('UI', 3)).toBeNull()
    expect(marketBucketFor('UYU', 0)).toBeNull()
  })

  // El error que esta función viene a matar: /conviene-comprar-en-cuotas publica "5,50% bruto,
  // 5,37% neto", que sale de dividir por 1,025. El IRPF se cobra SOBRE el interés ganado, así
  // que el neto es bruto × (1 − alícuota) = 5,3625.
  it('el neto de IRPF multiplica por (1 − alícuota), no divide', () => {
    const r = netOfIrpf(5.5, 'UYU', 24)
    expect(r.taxPct).toBe(2.5)
    expect(r.netPct).toBeCloseTo(5.3625, 4)
    expect(r.netPct).not.toBeCloseTo(5.5 / 1.025, 4)
    expect(r.law).toMatch(/art\. 37 lit\. A/)
  })

  it('la alícuota sigue la moneda y el plazo, no un 12% plano', () => {
    expect(netOfIrpf(5, 'UYU', 12).taxPct).toBe(5.5)
    expect(netOfIrpf(5, 'UYU', 24).taxPct).toBe(2.5)
    expect(netOfIrpf(5, 'UYU', 48).taxPct).toBe(0.5)
    expect(netOfIrpf(2, 'UI', 12).taxPct).toBe(10)
    expect(netOfIrpf(2, 'UI', 48).taxPct).toBe(5)
    expect(netOfIrpf(3, 'USD', 12).taxPct).toBe(12)
    expect(netOfIrpf(3, 'USD', 24).taxPct).toBe(12)
    expect(netOfIrpf(3, 'USD', 48).taxPct).toBe(7)
  })

  it('toda ausencia dice qué hay en su lugar y de qué fuente sale', () => {
    expect(DEPOSIT_REFERENCE_ABSENCES.length).toBeGreaterThanOrEqual(4)
    for (const gap of DEPOSIT_REFERENCE_ABSENCES) {
      expect(gap.missing.trim(), 'ausencia sin enunciado').not.toBe('')
      expect(gap.instead.trim(), `${gap.missing} sin contrapartida`).not.toBe('')
      expect(gap.source, `${gap.missing} sin fuente`).toMatch(/BCU|BROU|DGI/)
    }
    const texto = DEPOSIT_REFERENCE_ABSENCES.map(a => `${a.missing} ${a.instead}`).join(' ')
    expect(texto, 'ya no publica que no hay apertura pública/privada').toMatch(/banca privada/)
    expect(texto, 'ya no publica que no hay tasas pasivas por institución').toMatch(
      /por institución/
    )
  })

  // ── Auditoría 2026-08-10 ──────────────────────────────────────────────────
  //
  // Cinco correcciones, cada una con su pin. Todas FALLAN contra la versión que shippeó esa
  // mañana, que es el único motivo por el que valen la pena.

  // GRAVE: el sitio publicaba DOS netos distintos para el MISMO depósito (BROU e-BROU pesos, 24
  // meses). /herramientas/calculadora-plazo-fijo calculaba 5,36% con `netOfIrpf`;
  // /conviene-comprar-en-cuotas publicaba 5,37%, que es 5,50/1,025 — dividir en vez de
  // multiplicar. Este test cruza las dos publicaciones contra la misma regla de la DGI.
  it('el plazo fijo del BROU tiene UN solo neto en todo el sitio, y sale de la alícuota', () => {
    const pf = INSTRUMENTOS.find(i => i.id === 'brou-pf-ebrou')
    expect(pf, 'desapareció el plazo fijo del BROU de la tabla de instrumentos').toBeDefined()
    const esperado = netOfIrpf(pf!.bruto, 'UYU', 24)
    expect(pf!.irpf, 'la alícuota de la tabla no es la del Título 7 art. 37 lit. A').toBe(
      esperado.taxPct
    )
    expect(round2(pf!.neto), 'el neto publicado no es bruto × (1 − alícuota)').toBe(
      round2(esperado.netPct)
    )
    // Y el error concreto que había: 5,50 / 1,025 = 5,3659 → 5,37.
    expect(pf!.neto, 'volvió el neto calculado dividiendo por (1 + alícuota)').not.toBe(
      round2(pf!.bruto / (1 + pf!.irpf / 100))
    )
  })

  it('ninguna página vuelve a tipear ese neto a mano', () => {
    const cuotas = readApp('pages/conviene-comprar-en-cuotas.vue')
    expect(cuotas, 'sigue publicando el 5,37% que nadie puede reproducir').not.toMatch(/5,37\s*%/)
    // El FAQ tiene que interpolar el dato, no repetirlo: cualquier "X,XX% neto de IRPF" literal
    // es una segunda fuente de verdad esperando a divergir de nuevo.
    expect(cuotas, 'un neto literal volvió al FAQ en vez de salir de INSTRUMENTOS').not.toMatch(
      /\d+,\d+%\s+neto de IRPF/
    )
  })

  // LEVE: "en todos los tramos la persona física paga menos" era universal y la propia tabla de
  // la página lo desmentía en UI a 367 días o más (1,73% contra 1,73%). El alcance ahora se
  // deriva de los datos; estos dos tests fijan de qué lado cae cada moneda.
  it('detecta los tramos donde el redondeo publicado empata', () => {
    for (const c of ['UYU', 'USD'] as DepositCurrency[]) {
      expect(
        pfNotBelowTotal(c),
        `${c}: la persona física dejó de quedar por debajo del total en algún tramo`
      ).toEqual([])
    }
    const empates = pfNotBelowTotal('UI')
    expect(empates.length, 'UI: se perdió el empate del tramo largo').toBe(1)
    expect(empates[0]!.minDays).toBe(367)
    expect(empates[0]!.personaFisica).toBe(empates[0]!.totalSistema)
  })

  it('la página acota la frase en vez de afirmarla para todos los tramos', () => {
    const page = readApp('pages/herramientas/calculadora-plazo-fijo.vue')
    expect(page, 'volvió la afirmación universal que la tabla desmiente').not.toMatch(
      /En todos los tramos, la media/
    )
    expect(page, 'el alcance de la frase dejó de derivarse de los datos').toMatch(
      /pfBelowCurrenciesText/
    )
    expect(page, 'ya no publica el tramo donde las dos cifras empatan').toMatch(/pfTies/)
  })

  // LEVE: la matriz de IRPF estaba reescrita a mano en la prosa y en dos preguntas frecuentes.
  // Ahora sale de DEPOSIT_RULES; si el legislador toca la escala, el texto se mueve con ella.
  it('la matriz en prosa se lee de DEPOSIT_RULES y no de tres copias a mano', () => {
    const [uyu, ui, usd] = irpfDepositMatrix()
    expect(uyu!.hasta1a).toBe(DEPOSIT_RULES.UYU.hasta_1a.rate)
    expect(uyu!.de1a3a).toBe(DEPOSIT_RULES.UYU.de_1a_3a.rate)
    expect(uyu!.mas3a).toBe(DEPOSIT_RULES.UYU.mas_3a.rate)
    expect(ui!.hasta1a).toBe(DEPOSIT_RULES.UYU_UI.hasta_1a.rate)
    expect(usd!.mas3a).toBe(DEPOSIT_RULES.USD.mas_3a.rate)
    // Moneda extranjera: los dos primeros tramos son 12%, así que se dice "hasta tres años".
    expect(irpfRowText(usd!)).toBe('12% hasta tres años y 7% después')
    expect(irpfRowText(uyu!)).toBe(
      '5,5% hasta un año, 2,5% de uno a tres años y 0,5% de más de tres'
    )
    const texto = irpfMatrixText()
    for (const row of irpfDepositMatrix()) {
      for (const rate of [row.hasta1a, row.de1a3a, row.mas3a]) {
        expect(texto, `falta la alícuota ${rate} de ${row.label}`).toContain(
          rate.toLocaleString('es-UY')
        )
      }
    }
    expect(DEPOSIT_IRPF_LAW).toBe(DEPOSIT_RULES.UYU.hasta_1a.law)
    // Las nueve celdas tienen alícuota resuelta. El día que alguna no la tenga, la matriz revienta
    // en vez de imprimir "0% de IRPF" — que es la mentira que capitalTax.ts existe para impedir.
    for (const currency of ['UYU', 'UYU_UI', 'USD'] as const) {
      for (const term of ['hasta_1a', 'de_1a_3a', 'mas_3a'] as const) {
        expect(
          DEPOSIT_RULES[currency][term].rate,
          `${currency}/${term} sin alícuota`
        ).not.toBeNull()
      }
    }
  })

  it('la página no vuelve a escribir ninguna alícuota de IRPF a mano', () => {
    const page = readApp('pages/herramientas/calculadora-plazo-fijo.vue')
    expect(page, 'volvió la matriz de UI escrita a mano').not.toMatch(/10%,\s*7%\s*y\s*5%/)
    expect(page, 'volvió la alícuota de moneda extranjera escrita a mano').not.toMatch(
      /12%\s+hasta\s+tres\s+años/
    )
    expect(page, 'volvió la escala de pesos escrita a mano').not.toMatch(/5,5%\s+de\s+IRPF/)
    expect(page, 'la prosa dejó de derivar la matriz').toMatch(/irpfRowText/)
    expect(page, 'el FAQ dejó de derivar la matriz').toMatch(/irpfMatrixText\(\)/)
    expect(page, 'el artículo volvió a estar hardcodeado').toMatch(/DEPOSIT_IRPF_LAW/)
  })

  // LEVE: la vigencia se publicaba una sola vez, la del documento, para las TRES monedas. La
  // nota iv. del PDF la abre por moneda: pesos y dólares rigen desde el 26/03/2026 y lo que
  // cambió el 01/07/2026 fue la pizarra de unidades indexadas.
  it('cada moneda lleva su vigencia y no la del documento', () => {
    expect(BROU_DEPOSIT_BOARD.series.UYU.vigenciaMoneda).toBe('26/03/2026')
    expect(BROU_DEPOSIT_BOARD.series.USD.vigenciaMoneda).toBe('26/03/2026')
    expect(BROU_DEPOSIT_BOARD.series.UI.vigenciaMoneda).toBe('01/07/2026')
    // Que dos monedas NO se hayan movido con el documento es el dato: si alguien las iguala a la
    // fecha del PDF, vuelve a sugerir un cambio de precio que no existió.
    expect(BROU_DEPOSIT_BOARD.series.UYU.vigenciaMoneda).not.toBe(
      BROU_DEPOSIT_BOARD.series.UI.vigenciaMoneda
    )
  })

  // El dato se cargaba, se testeaba y no se mostraba. Un campo verificado que ninguna página lee
  // es indistinguible de un campo inventado: nadie lo ve nunca.
  it('la página muestra todos los campos que el módulo publica', () => {
    const page = readApp('pages/herramientas/calculadora-plazo-fijo.vue')
    for (const field of [
      'vigenciaMoneda',
      'minimumPeriodic',
      'periodicity',
      'branchPeriodic',
      'notes',
      'scope',
      'weighting',
      'hoja',
      'cuadro',
      'periodIso',
      'eur.rate',
      'ahorroEnSueldo',
    ]) {
      expect(page, `${field} se publica en el módulo y no lo lee nadie`).toContain(field)
    }
  })

  // LEVE: el mismo PDF, bajo el mismo título, publica un producto en pesos que la página
  // ignoraba mientras afirmaba que 5,50% era el techo contratable en pesos.
  it('publica Ahorro en Sueldo con la prima por permanencia que el PDF define', () => {
    const a = BROU_DEPOSIT_BOARD.ahorroEnSueldo
    const largo = BROU_DEPOSIT_BOARD.series.UYU.tranches.at(-1)!
    expect(a.year1, 'el 1er año no es la tasa de pizarra del tramo largo').toBe(largo.online)
    // La prima es un % SOBRE la tasa, no puntos: 5,50 × 1,15 = 6,325 → 6,33.
    expect(Math.abs(a.year2 - a.year1 * (1 + a.primaPct2 / 100))).toBeLessThanOrEqual(0.005 + 1e-9)
    expect(Math.abs(a.year3 - a.year1 * (1 + a.primaPct3 / 100))).toBeLessThanOrEqual(0.005 + 1e-9)
    expect(a.year3, 'la tasa del 3er año dejó de superar el techo del plazo fijo').toBeGreaterThan(
      largo.online
    )
    expect(a.currency).toBe('UYU')
    expect(a.maxMonthly).toBeGreaterThan(a.minMonthly)
    expect(a.productUrl).toMatch(/^https:\/\/www\.brou\.com\.uy\//)
    // La condición de acceso se publica como lo que es: el BROU NO exige domiciliar el sueldo.
    expect(a.requirement).toMatch(/no publica/i)
    expect(a.requirement).toMatch(/cuenta vista/i)
  })

  it('la página deja de afirmar que el techo en pesos es el de la tabla', () => {
    const page = readApp('pages/herramientas/calculadora-plazo-fijo.vue')
    expect(page, 'Ahorro en Sueldo sigue sin aparecer').toMatch(/ahorro\.year3/)
    expect(page, 'no dice que la pizarra tiene otro producto con tasa mayor').toMatch(
      /el techo de la tabla no\s+es el techo del banco/
    )
  })

  it('cita como fuentes primarias al BCU, al BROU y a la DGI', () => {
    const urls = DEPOSIT_REFERENCE_SOURCES.map(s => s.url)
    for (const s of DEPOSIT_REFERENCE_SOURCES) {
      expect(s.label.trim()).not.toBe('')
      expect(s.url).toMatch(/^https:\/\//)
    }
    expect(urls.some(u => u.includes('bcu.gub.uy') && u.includes('tasas.xls'))).toBe(true)
    expect(urls.some(u => u.includes('brou.com.uy'))).toBe(true)
    expect(urls.some(u => u.includes('gub.uy/direccion-general-impositiva'))).toBe(true)
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
