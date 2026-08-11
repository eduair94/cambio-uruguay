import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  AFAP_FAQ,
  AFAP_PATHS,
  AFAP_SOURCES,
  AFAP_AGE_MAX,
  AFAP_AGE_MIN,
  AFAP_CAUSAL_BEFORE_YEAR,
  AFAP_CONDITIONS,
  AFAP_DECISION_DAYS,
  AFAP_IRREVERSIBLE_WARNING,
  AFAP_NOT_THE_SAME,
  AFAP_STEPS,
  checkRevocation,
  AFAP_ASSET_CLASSES,
  AFAP_COHORTS,
  AFAP_COHORT_RULE,
  AFAP_D_FUND_CAP,
  AFAP_D_FUND_CAP_RULE,
  AFAP_D_FUND_NOTE,
  AFAP_D_FUND_USED,
  AFAP_D_PORTFOLIO_LABELS,
  AFAP_FEES,
  AFAP_FEE_BASE_RULE,
  AFAP_FEE_BASE_RULE_2,
  AFAP_FEE_CAP,
  AFAP_INDEX_BAN_RULE,
  AFAP_INSURANCE_PREMIUM,
  AFAP_INSURERS,
  AFAP_ME_MAX,
  AFAP_ME_USED,
  AFAP_PORTFOLIO,
  AFAP_PORTFOLIO_TOTALS,
  AFAP_SUBFONDOS,
  AFAP_TOPE_A,
  AFAP_TOPE_ANSWER,
  AFAP_TOPE_B,
  AFAP_TOPE_C,
  AFAP_WHY_NOT_ABROAD,
  APORTE_JUBILATORIO_RATE,
  SPC_NIVEL_1,
  SPC_NIVEL_2,
  splitAporte,
} from '../../utils/afapRevocation'

const here = dirname(fileURLToPath(import.meta.url))
const utilSource = readFileSync(resolve(here, '../../utils/afapRevocation.ts'), 'utf8')
const pageSource = readFileSync(
  resolve(here, '../../pages/desvincularme-de-la-afap-uruguay.vue'),
  'utf8'
)

/** Todo lo que la página muestra como texto corrido, para auditarlo de una sola pasada. */
const publishedProse = [
  AFAP_NOT_THE_SAME,
  AFAP_IRREVERSIBLE_WARNING,
  AFAP_TOPE_ANSWER,
  AFAP_WHY_NOT_ABROAD,
  AFAP_D_FUND_NOTE,
  AFAP_FEE_CAP,
  AFAP_INSURANCE_PREMIUM,
  ...AFAP_COHORTS.map(c => `${c.label} ${c.who}`),
  ...AFAP_ASSET_CLASSES.map(a => `${a.label} ${a.detail}`),
  ...AFAP_FAQ.map(f => `${f.question} ${f.short} ${f.answer}`),
].join('\n')

describe('la distinción que la página existe para hacer', () => {
  it('separa revocar el artículo 8 de desafiliarse', () => {
    expect(AFAP_PATHS).toHaveLength(2)
    const rev = AFAP_PATHS.find(p => p.id === 'revocacion')!
    const des = AFAP_PATHS.find(p => p.id === 'desafiliacion')!
    expect(rev.effect).toMatch(/no te vas de la afap/i)
    expect(des.effect).toMatch(/no es lo mismo/i)
  })

  it('lo dice explícito y citable', () => {
    expect(AFAP_NOT_THE_SAME).toMatch(/NO es desafiliarse/i)
    expect(AFAP_NOT_THE_SAME.length).toBeGreaterThan(120)
  })
})

describe('condiciones', () => {
  it('la franja de edad es 40 a 49', () => {
    expect(AFAP_AGE_MIN).toBe(40)
    expect(AFAP_AGE_MAX).toBe(49)
    expect(AFAP_AGE_MIN).toBeLessThan(AFAP_AGE_MAX)
  })

  it('acepta dentro de la franja y rechaza fuera, en los bordes', () => {
    expect(checkRevocation({ age: 40, mixedRegime: true }).possible).toBe(true)
    expect(checkRevocation({ age: 49, mixedRegime: true }).possible).toBe(true)
    expect(checkRevocation({ age: 39, mixedRegime: true }).possible).toBe(false)
    expect(checkRevocation({ age: 50, mixedRegime: true }).possible).toBe(false)
  })

  it('exige Régimen Mixto', () => {
    const r = checkRevocation({ age: 45, mixedRegime: false })
    expect(r.possible).toBe(false)
    expect(r.blockers.join(' ')).toMatch(/Mixto/i)
  })

  it('acumula los dos bloqueos cuando fallan los dos', () => {
    expect(checkRevocation({ age: 60, mixedRegime: false }).blockers).toHaveLength(2)
  })

  it('no rompe con una edad inválida', () => {
    const r = checkRevocation({ age: NaN, mixedRegime: true })
    expect(r.possible).toBe(false)
    expect(r.blockers[0]).not.toMatch(/NaN/)
  })

  // Honestidad: hay condiciones que sólo BPS puede verificar, y la página no finge un veredicto.
  it('nunca promete el trámite: siempre deja lo que BPS tiene que confirmar', () => {
    const r = checkRevocation({ age: 45, mixedRegime: true })
    expect(r.possible).toBe(true)
    expect(r.toConfirm.length).toBeGreaterThanOrEqual(4)
    expect(r.toConfirm.join(' ')).toMatch(/sin estar obligado/i)
    expect(r.toConfirm.join(' ')).toMatch(new RegExp(String(AFAP_CAUSAL_BEFORE_YEAR)))
  })

  it('las seis condiciones están documentadas', () => {
    expect(AFAP_CONDITIONS).toHaveLength(6)
    for (const c of AFAP_CONDITIONS) expect(c.detail.length).toBeGreaterThan(30)
  })
})

describe('el trámite', () => {
  it('tiene los cuatro pasos numerados en orden', () => {
    expect(AFAP_STEPS).toHaveLength(4)
    expect(AFAP_STEPS.map(s => s.n)).toEqual([1, 2, 3, 4])
  })

  // El dato que más se pasa por alto y por el que se pierde la instancia.
  it('publica el plazo de 90 días corridos desde la descarga del asesoramiento', () => {
    expect(AFAP_DECISION_DAYS).toBe(90)
    const paso = AFAP_STEPS.find(s => s.title.includes(String(AFAP_DECISION_DAYS)))!
    expect(paso).toBeDefined()
    expect(paso.detail).toMatch(/descarg/i)
  })

  it('deja claro que el asesoramiento es obligatorio', () => {
    expect(AFAP_STEPS.some(s => /obligatorio/i.test(s.title + s.detail))).toBe(true)
  })

  it('advierte antes de decidir', () => {
    expect(AFAP_IRREVERSIBLE_WARNING).toMatch(/asesoramiento/i)
    expect(AFAP_IRREVERSIBLE_WARNING.length).toBeGreaterThan(100)
  })
})

describe('integridad', () => {
  it('el FAQ arranca por la pregunta tal como la hace la gente', () => {
    expect(AFAP_FAQ[0].question).toMatch(/desvinculo/i)
  })

  it('cada pregunta tiene respuesta corta y desarrollo', () => {
    expect(AFAP_FAQ.length).toBeGreaterThanOrEqual(6)
    for (const f of AFAP_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(120)
    }
  })

  it('toda regla publicada tiene fuente oficial', () => {
    expect(AFAP_SOURCES.length).toBeGreaterThanOrEqual(4)
    // Sólo organismos uruguayos: BPS, IMPO, BCU y gub.uy. Nada de blogs ni de las propias AFAP.
    for (const s of AFAP_SOURCES) {
      expect(s.url).toMatch(
        /^https:\/\/(www\.)?(bps|impo|bcu)\.(gub\.uy|com\.uy)|^https:\/\/www\.gub\.uy\//
      )
    }
    const urls = AFAP_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('12913') // condiciones
    expect(urls).toContain('12912') // plazo de 90 días
    expect(urls).toContain('/16713-1995/123') // las seis categorías
    expect(urls).toContain('/16713-1995/123_BIS') // LOS MÁXIMOS: la norma que manda en la sección
    expect(urls).toContain('/16713-1995/123_TER') // condiciones para adquirirlos
    expect(urls).toContain('/16713-1995/103') // base de la comisión
    expect(urls).toContain('/16713-1995/57') // seguro colectivo
    expect(urls).toContain('/5478/') // topes del BPS
    expect(urls).toContain('AFAPMemoriaTrimestral') // datos del BCU
  })

  // El artículo 123 vive en dos versiones en IMPO y la vieja dice otros porcentajes.
  it('no cita la versión original y derogada del articulado', () => {
    for (const s of AFAP_SOURCES) expect(s.url).not.toContain('leyes-originales')
  })

  // La AUSENCIA FALSA que originó los tres errores graves: leer que el art. 123 vigente no trae
  // porcentajes y concluir que el régimen ya no tiene máximos legales. No desaparecieron, se
  // mudaron al 123-BIS. La página no puede volver a decir que los máximos los fija el BCU.
  it('no atribuye los máximos legales al regulador', () => {
    expect(publishedProse).not.toMatch(/los máximos los publica el BCU/i)
    expect(publishedProse).not.toMatch(/máximos.{0,40}salen del BCU/i)
    expect(pageSource).not.toMatch(/Máximos y uso efectivo al .{0,30}del cuadro/i)
    // Y el pie de la tabla dice de quién son los máximos.
    expect(pageSource).toMatch(/123-BIS/)
  })
})

describe('desde qué sueldo va plata a la AFAP', () => {
  it('publica los tres topes de la Ley 16.713 y los dos niveles del art. 22, ordenados', () => {
    expect(AFAP_TOPE_A).toBe(96279)
    expect(AFAP_TOPE_B).toBe(144418)
    expect(AFAP_TOPE_C).toBe(288836)
    expect(AFAP_TOPE_A).toBeLessThan(AFAP_TOPE_B)
    expect(AFAP_TOPE_B).toBeLessThan(AFAP_TOPE_C)
    // El BPS los publica aparte porque rigen para otra cohorte.
    expect(SPC_NIVEL_1).toBe(144418)
    expect(SPC_NIVEL_2).toBe(288836)
  })

  // El agujero que esta tanda vino a tapar: la página decía "el tope" sin decir cuál ni cuánto.
  it('la respuesta nombra el tope y su valor', () => {
    expect(AFAP_TOPE_ANSWER).toMatch(/tope A/)
    expect(AFAP_TOPE_ANSWER).toContain('96.279')
    expect(AFAP_TOPE_ANSWER).toMatch(/artículo 8/)
  })

  it('sin artículo 8, por debajo del tope A no entra un peso a la AFAP', () => {
    const r = splitAporte({ nominal: AFAP_TOPE_A - 1, art8: false })
    expect(r.aAfap).toBe(0)
    expect(r.aBps).toBeCloseTo((AFAP_TOPE_A - 1) * 0.15, 1)
    expect(r.desde).toBe(AFAP_TOPE_A)
  })

  it('sin artículo 8, lo que supera el tope A va todo a la AFAP', () => {
    const r = splitAporte({ nominal: AFAP_TOPE_A + 10000, art8: false })
    expect(r.aAfap).toBeCloseTo(10000 * 0.15, 2)
    expect(r.aBps).toBeCloseTo(AFAP_TOPE_A * 0.15, 2)
  })

  it('con artículo 8 entra desde el primer peso, mitad y mitad hasta el tope A', () => {
    const r = splitAporte({ nominal: 50000, art8: true })
    expect(r.desde).toBe(0)
    expect(r.aAfap).toBeCloseTo(50000 * 0.15 * 0.5, 2)
    expect(r.aBps).toBeCloseTo(50000 * 0.15 * 0.5, 2)
  })

  it('con artículo 8, entre el tope A y el tope B va todo al BPS', () => {
    const a = splitAporte({ nominal: AFAP_TOPE_A, art8: true })
    const b = splitAporte({ nominal: AFAP_TOPE_B, art8: true })
    expect(b.aAfap).toBeCloseTo(a.aAfap, 2)
    expect(b.aBps - a.aBps).toBeCloseTo((AFAP_TOPE_B - AFAP_TOPE_A) * 0.15, 2)
  })

  it('el aporte obligatorio se corta en el tope C y el resto queda como voluntario', () => {
    const r = splitAporte({ nominal: AFAP_TOPE_C + 100000, art8: false })
    expect(r.base).toBe(AFAP_TOPE_C)
    expect(r.excedente).toBe(100000)
    expect(r.aporte).toBeCloseTo(AFAP_TOPE_C * 0.15, 2)
  })

  // El corte por cohorte: el art. 22 no le rige a quien ya aportaba.
  it('la cohorte del Sistema Previsional Común aporta 10 y 5 puntos desde el primer peso', () => {
    const r = splitAporte({ nominal: 50000, cohort: 'spc' })
    expect(r.aBps).toBeCloseTo(50000 * 0.1, 2)
    expect(r.aAfap).toBeCloseTo(50000 * 0.05, 2)
    expect(r.desde).toBe(0)
  })

  it('en el Sistema Previsional Común el artículo 8 no cambia nada', () => {
    const sin = splitAporte({ nominal: 200000, cohort: 'spc' })
    const con = splitAporte({ nominal: 200000, cohort: 'spc', art8: true })
    expect(con).toEqual(sin)
    // Entre el nivel 1 y el 2 van los 15 puntos enteros al ahorro individual.
    const base = splitAporte({ nominal: SPC_NIVEL_1, cohort: 'spc' })
    expect(sin.aAfap - base.aAfap).toBeCloseTo((200000 - SPC_NIVEL_1) * 0.15, 2)
  })

  it('la tasa del aporte es 15% y siempre cierra: BPS + AFAP = aporte', () => {
    expect(APORTE_JUBILATORIO_RATE).toBe(15)
    for (const n of [0, 1, 50000, 96279, 144418, 288836, 400000]) {
      for (const cohort of ['ley16713', 'spc'] as const) {
        for (const art8 of [false, true]) {
          const r = splitAporte({ nominal: n, art8, cohort })
          expect(r.aBps + r.aAfap).toBeCloseTo(r.aporte, 2)
          expect(r.aporte).toBeCloseTo(r.base * 0.15, 1)
        }
      }
    }
  })

  it('no rompe con un sueldo inválido', () => {
    for (const n of [NaN, -1000]) {
      const r = splitAporte({ nominal: n })
      expect(r.aporte).toBe(0)
      expect(r.aAfap).toBe(0)
      expect(r.excedente).toBe(0)
    }
  })

  it('distingue las dos cohortes y cita el inciso que las separa', () => {
    expect(AFAP_COHORTS).toHaveLength(2)
    expect(AFAP_COHORTS.map(c => c.id)).toEqual(['ley16713', 'spc'])
    expect(AFAP_COHORT_RULE).toMatch(/aplicables exclusivamente/i)
    expect(AFAP_COHORT_RULE).toMatch(/16\.713/)
  })

  // La calculadora ofrece dos escenarios, pero las cohortes NO son excluyentes de por vida: el
  // numeral 6 del art. 22 manda al régimen del 22 a quien, ya afiliado antes, empieza después una
  // actividad amparada por otra caja. El sitio ya lo decía en guidesReddit.ts («el corte no es de
  // por vida, ojo») y esta página lo contradecía por omisión.
  it('avisa que el corte por cohorte no es de por vida (art. 22 numeral 6)', () => {
    const vieja = AFAP_COHORTS.find(c => c.id === 'ley16713')!
    expect(vieja.who).toMatch(/numeral 6/i)
    expect(vieja.who).toMatch(/no es de por vida/i)
    expect(vieja.who).toMatch(/otra caja|Fuerzas Armadas/i)
  })

  // El numeral 4 del art. 22 se abre acotado a FFAA, Policial, Bancaria, Notarial y Profesionales.
  // El BPS no está en esa enumeración (está en el numeral 1), así que la regla de que lo que excede
  // el segundo nivel es voluntario no se le puede colgar a ese numeral para el afiliado al BPS.
  it('no le atribuye al numeral 4 del art. 22 el aporte voluntario del afiliado al BPS', () => {
    const cita =
      /la aportación (por la materia gravada que exceda la suma indicada, )?ser[áa] voluntaria/i
    expect(utilSource).not.toMatch(cita)
    expect(pageSource).not.toMatch(/la aportación del dependiente es voluntaria/i)
    // Lo que sí se publica: el corte lo publica el BPS y el art. 22 deja de asignar por encima.
    expect(pageSource).toMatch(/Niveles Art\. 22 - B/)
  })
})

describe('dónde está la plata y por qué no se va afuera', () => {
  it('publica las seis categorías del artículo 123, en orden', () => {
    expect(AFAP_ASSET_CLASSES).toHaveLength(6)
    expect(AFAP_ASSET_CLASSES.map(a => a.literal)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })

  it('cada categoría trae su máximo legal para los tres subfondos', () => {
    expect(AFAP_SUBFONDOS.map(s => s.id)).toEqual(['crecimiento', 'acumulacion', 'retiro'])
    for (const a of AFAP_ASSET_CLASSES) {
      for (const s of AFAP_SUBFONDOS) {
        expect(a.max[s.id]).toBeGreaterThan(0)
        expect(a.max[s.id]).toBeLessThanOrEqual(100)
        const [lo, hi] = a.used[s.id]
        expect(lo).toBeLessThanOrEqual(hi)
      }
    }
  })

  // EL CUADRO DE LA LEY, CASILLERO POR CASILLERO. Ley 16.713 art. 123-BIS, texto vigente
  // (agregado por el art. 119 de la Ley 20.130), copiado del articulado y no de ningún cuadro
  // secundario. Fue exactamente acá donde nos equivocamos: publicábamos 15% en D-Acumulación
  // porque lo tomamos de la columna «MÁXIMO LEGAL» de un cuadro del BCU que en ese casillero no
  // coincide con la ley. Si un cuadro de un organismo y el articulado discrepan, manda la ley.
  it('el cuadro de máximos es el del art. 123-BIS, literal por literal y subfondo por subfondo', () => {
    const cuadro123BIS: Record<
      string,
      { crecimiento: number; acumulacion: number; retiro: number }
    > = {
      A: { crecimiento: 75, acumulacion: 75, retiro: 90 },
      B: { crecimiento: 50, acumulacion: 50, retiro: 15 },
      C: { crecimiento: 30, acumulacion: 30, retiro: 30 },
      D: { crecimiento: 30, acumulacion: 25, retiro: 20 },
      E: { crecimiento: 10, acumulacion: 10, retiro: 10 },
      F: { crecimiento: 20, acumulacion: 15, retiro: 5 },
    }
    for (const a of AFAP_ASSET_CLASSES) expect(a.max).toEqual(cuadro123BIS[a.literal])
  })

  // El dato que la pregunta pide: el tope al exterior, que es el literal D.
  it('el tope a emisores del exterior es el del literal D: 30, 25 y 20', () => {
    const d = AFAP_ASSET_CLASSES.find(a => a.literal === 'D')!
    expect(d.exterior).toBe(true)
    expect(d.max).toEqual({ crecimiento: 30, acumulacion: 25, retiro: 20 })
    expect(d.max.acumulacion).not.toBe(15) // el número del cuadro del BCU, que la ley desmiente
    expect(d.label).toMatch(/organismos internacionales|gobiernos extranjeros/i)
  })

  // EL INVARIANTE QUE HABRÍA CAZADO EL ERROR SOLO: ninguna AFAP puede estar usando más que el
  // máximo. Cuando `used` supera a `max`, el sospechoso es `max`, no las AFAP. Publicamos un aviso
  // de «anomalía sin explicación» que le imputaba a las cuatro un incumplimiento inexistente.
  it('ningún uso efectivo supera su máximo legal', () => {
    for (const a of AFAP_ASSET_CLASSES) {
      for (const s of AFAP_SUBFONDOS) {
        const [, hi] = a.used[s.id]
        expect(
          hi,
          `literal ${a.literal} en ${s.label}: usan hasta ${hi}% contra un máximo de ${a.max[s.id]}%`
        ).toBeLessThanOrEqual(a.max[s.id])
      }
    }
  })

  it('no queda rastro del aviso que denunciaba un incumplimiento que no existió', () => {
    expect(publishedProse).not.toMatch(/contra un máximo publicado/i)
    expect(publishedProse).not.toMatch(/no aclara el desvío|explique el desvío/i)
    expect(pageSource).not.toContain('AFAP_D_OVER_CAP_NOTE')
  })

  // El tope que reemplazó al aviso, y que es el dato bueno de la sección.
  it('publica el techo del literal D sobre el fondo entero y cuánto se usaba', () => {
    expect(AFAP_D_FUND_CAP).toBe(15)
    expect(AFAP_D_FUND_CAP_RULE).toMatch(/categoría D\)/)
    expect(AFAP_D_FUND_CAP_RULE).toMatch(/Fondo de Ahorro Previsional/)
    // La suma es nuestra, con las líneas del literal D del cuadro consolidado del BCU.
    expect(AFAP_D_PORTFOLIO_LABELS.length).toBeGreaterThan(0)
    const esperado = AFAP_PORTFOLIO.filter(l => AFAP_D_PORTFOLIO_LABELS.includes(l.label))
    expect(esperado.length).toBe(3) // multilaterales en dos monedas + gobierno extranjero
    expect(AFAP_D_FUND_USED).toBeCloseTo(14.4, 2)
    // Lo que importa: se cumplía. Si esto se rompe, es noticia y hay que verificarla, no publicarla.
    expect(AFAP_D_FUND_USED).toBeLessThanOrEqual(AFAP_D_FUND_CAP)
    expect(AFAP_D_FUND_NOTE).toContain('14,40%')
    // Y decimos que la suma es nuestra, porque el BCU no publica ese total.
    expect(AFAP_D_FUND_NOTE).toMatch(/suma la hacemos nosotros|el BCU no publica ese total/i)
  })

  // La prohibición nominada del régimen, que además es la que impide el absoluto del fix 5.
  it('cita textual la única prohibición nominada del art. 123-BIS', () => {
    expect(AFAP_INDEX_BAN_RULE).toMatch(/índices financieros/i)
    expect(AFAP_INDEX_BAN_RULE).toMatch(/Subfondo de Retiro/)
  })

  it('sólo los literales D y E admiten emisores del exterior', () => {
    expect(AFAP_ASSET_CLASSES.filter(a => a.exterior).map(a => a.literal)).toEqual(['D', 'E'])
  })

  it('publica además el tope a la suma colocada en moneda extranjera', () => {
    expect(AFAP_ME_MAX).toEqual({ crecimiento: 45, acumulacion: 40, retiro: 15 })
    for (const s of AFAP_SUBFONDOS) {
      const [lo, hi] = AFAP_ME_USED[s.id]
      expect(lo).toBeLessThanOrEqual(hi)
      expect(hi).toBeLessThanOrEqual(AFAP_ME_MAX[s.id])
    }
  })

  it('la respuesta es normativa, no ideológica', () => {
    expect(AFAP_WHY_NOT_ABROAD).toMatch(/art[íi]culo 123/i)
    expect(AFAP_WHY_NOT_ABROAD).toMatch(/lista/i)
    // Los máximos son de la LEY. Atribuírselos al regulador fue la premisa que produjo todo el
    // resto: si el 123-BIS no está citado, el número de al lado no tiene de dónde salir.
    expect(AFAP_WHY_NOT_ABROAD).toMatch(/123-BIS/)
    expect(AFAP_WHY_NOT_ABROAD).toContain('25%')
    expect(AFAP_WHY_NOT_ABROAD).not.toMatch(/15% en el de Acumulación/i)
  })

  // El absoluto legal que el articulado no sostiene. El art. 123-BIS prohíbe los títulos
  // representativos de índices financieros SÓLO en el Subfondo de Retiro, y el art. 123-TER nombra
  // fondos «uruguayos o del exterior» para prohibir los de objeto vedado: la ley los contempla y
  // los limita, no los borra. Lo afirmable es que la lista afirmativa pide emisores uruguayos.
  it('no afirma que ninguna categoría habilite acciones ni fondos del exterior', () => {
    expect(publishedProse).not.toMatch(/no existe una categor[íi]a que habilite/i)
    expect(publishedProse).not.toMatch(/no hay (ninguna )?categor[íi]a (para|que habilite)/i)
    // En su lugar dice lo que sí se sostiene: el literal B pide emisores uruguayos.
    expect(AFAP_WHY_NOT_ABROAD).toMatch(/literal B/)
    expect(AFAP_WHY_NOT_ABROAD).toMatch(/uruguayos/i)
  })

  it('la composición está fechada y suma menos que el total', () => {
    expect(AFAP_PORTFOLIO.length).toBeGreaterThanOrEqual(15)
    const sum = AFAP_PORTFOLIO.reduce((acc, l) => acc + l.pct, 0)
    expect(sum).toBeGreaterThan(80)
    expect(sum).toBeLessThan(100)
    for (const l of AFAP_PORTFOLIO) expect(l.pct).toBeGreaterThan(0)
    expect(
      AFAP_PORTFOLIO_TOTALS.monedaNacional + AFAP_PORTFOLIO_TOTALS.monedaExtranjera
    ).toBeCloseTo(99.64, 1)
  })

  // La punchline: acciones y deuda de gobiernos extranjeros son residuales.
  it('deja ver que en acciones y en gobiernos extranjeros no hay casi nada', () => {
    const acciones = AFAP_PORTFOLIO.find(l => l.label === 'Acciones')!
    const extranjero = AFAP_PORTFOLIO.find(l => l.label === 'Bonos de gobierno extranjero')!
    expect(acciones.pct).toBeLessThan(1)
    expect(extranjero.pct).toBeLessThan(1)
  })
})

describe('sobre qué te cobra la AFAP', () => {
  it('cita textual la regla: se cobra sobre el aporte, no sobre el saldo', () => {
    expect(AFAP_FEE_BASE_RULE).toMatch(/acreditación de los aportes obligatorios/i)
    expect(AFAP_FEE_BASE_RULE_2).toMatch(/porcentaje del aporte que le dio origen/i)
  })

  it('las cuatro AFAP están, y comisión más prima da el total', () => {
    expect(AFAP_FEES).toHaveLength(4)
    for (const f of AFAP_FEES) {
      expect(f.comisionSobreIngreso + f.primaSobreIngreso).toBeCloseTo(f.totalSobreIngreso, 3)
      expect(f.comisionSobreAporte + f.primaSobreAporte).toBeCloseTo(f.totalSobreAporte, 3)
      // El aporte es el 15% del ingreso: es la misma plata mirada de dos maneras.
      expect(f.comisionSobreAporte * 0.15).toBeCloseTo(f.comisionSobreIngreso, 2)
      expect(f.primaSobreAporte * 0.15).toBeCloseTo(f.primaSobreIngreso, 2)
    }
  })

  // El malentendido de los comentarios ("se comieron un 15% de lo que aportaste") es casi cierto,
  // pero es sobre el aporte del mes y más de la mitad es la prima del seguro.
  it('el descuento sobre el aporte es de dos dígitos y la prima pesa más que la comisión', () => {
    for (const f of AFAP_FEES) {
      expect(f.totalSobreAporte).toBeGreaterThan(10)
      expect(f.totalSobreIngreso).toBeLessThan(3)
      expect(f.primaSobreAporte).toBeGreaterThan(f.comisionSobreAporte)
    }
  })

  // El guard de arriba ya aseguraba que la prima gana en LAS CUATRO, pero el texto seguía diciendo
  // «en tres de las cuatro» —un cruce con «tres AFAP cobran la misma comisión»— y ningún assert
  // miraba la prosa. La tabla de la propia página lo desmentía.
  it('el texto dice que la prima gana en las cuatro, que es lo que dicen los números', () => {
    const cuatro = AFAP_FEES.filter(f => f.primaSobreAporte > f.comisionSobreAporte).length
    expect(cuatro).toBe(AFAP_FEES.length)
    expect(publishedProse).not.toMatch(/tres de (las )?cuatro AFAP el seguro/i)
    expect(publishedProse).not.toMatch(/en tres de cuatro AFAP cuesta más/i)
    expect(utilSource).not.toMatch(/En tres de las cuatro AFAP la prima es más cara/i)
    const faq = AFAP_FAQ.find(f => /prima del seguro/i.test(f.question))!
    expect(`${faq.short} ${faq.answer}`).toMatch(/las cuatro/i)
  })

  // El tope del art. 102 está bien citado, pero unirlo a la coincidencia de las tres comisiones con
  // un «por eso» era inferencia nuestra: con el promedio ponderado que publica el BCU (≈0,75%) el
  // 20% de margen da ≈0,90%, no el 0,864% que cobran. El hecho y la norma van separados.
  it('no afirma que el tope del art. 102 sea la causa de que tres AFAP coincidan', () => {
    expect(AFAP_FEE_CAP).toMatch(/20%/)
    expect(AFAP_FEE_CAP).toMatch(/31 de diciembre de 2021/)
    expect(AFAP_FEE_CAP).not.toMatch(/y por eso/i)
    expect(AFAP_FEE_CAP).toMatch(/no lo afirmamos|no publica cuál/i)
    // Y el hecho sigue publicado, con su número.
    expect(AFAP_FEE_CAP).toContain('0,864%')
    const clavadas = AFAP_FEES.filter(f => f.comisionSobreIngreso === 0.864).length
    expect(clavadas).toBe(3)
  })

  it('República es la más barata de las cuatro', () => {
    const rep = AFAP_FEES.find(f => /rep[úu]blica/i.test(f.afap))!
    for (const f of AFAP_FEES) expect(rep.totalSobreAporte).toBeLessThanOrEqual(f.totalSobreAporte)
  })

  it('explica la prima del seguro colectivo, que antes no aparecía en ningún lado', () => {
    expect(AFAP_INSURANCE_PREMIUM).toMatch(/invalidez y fallecimiento/i)
    expect(AFAP_INSURANCE_PREMIUM).toMatch(/no se la queda la AFAP|no se acumula/i)
    expect(AFAP_INSURERS.length).toBeGreaterThanOrEqual(6)
    expect(AFAP_INSURERS).toContain('Banco de Seguros del Estado')
  })
})
