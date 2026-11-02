import { describe, expect, it } from 'vitest'
import {
  COPOM_DECISIONS_2026,
  DECISION_CONTEXT,
  LAST_DECISION,
  POLICY_RATE_REVIEWED,
  POLICY_RATE_SOURCES,
  RATE_CONFUSIONS,
  describeChange,
  movesIn2026,
} from '../../utils/monetaryPolicyRate'
import { politicaMonetariaGuides } from '../../utils/guidesPoliticaMonetaria'
import { COPOM_MEETINGS_2026, TPM_CONFIRMED, TPM_PCT } from '../../utils/yieldAccounts'

describe('monetaryPolicyRate - el calendario de decisiones', () => {
  it('está ordenado por fecha y cada fecha es de 2026', () => {
    const dates = COPOM_DECISIONS_2026.map(d => d.date)
    expect(dates).toEqual([...dates].sort())
    for (const date of dates) expect(date).toMatch(/^2026-\d{2}-\d{2}$/)
  })

  it('no repite una reunión', () => {
    const dates = COPOM_DECISIONS_2026.map(d => d.date)
    expect(new Set(dates).size).toBe(dates.length)
  })

  it('cada nivel es una tasa plausible y cada titular nombra su nivel', () => {
    for (const decision of COPOM_DECISIONS_2026) {
      expect(decision.levelPct).toBeGreaterThan(0)
      expect(decision.levelPct).toBeLessThan(25)
      expect(decision.headline.trim().length).toBeGreaterThan(20)
      // El titular del BCU dice el nivel; si el nivel de la fila no aparece en él, una de las dos
      // cosas está mal copiada. `6,5` en el titular, `6.5` en el campo: se compara con coma.
      const level = String(decision.levelPct).replace('.', ',')
      expect(decision.headline, decision.date).toContain(level)
    }
  })

  it('el cambio declarado explica el salto entre un nivel y el anterior', () => {
    // La guarda que importa: `changeBp` no es una etiqueta decorativa, es la diferencia. Si
    // alguien corrige un nivel y se olvida del cambio (o al revés), la tabla publica una
    // aritmética que no cierra.
    for (let i = 1; i < COPOM_DECISIONS_2026.length; i++) {
      const previous = COPOM_DECISIONS_2026[i - 1]!
      const current = COPOM_DECISIONS_2026[i]!
      const deltaBp = Math.round((current.levelPct - previous.levelPct) * 100)
      expect(deltaBp, current.date).toBe(current.changeBp)
    }
  })

  it('la última decisión leída es la del 8/10/2026 y deja la tasa en 6 %', () => {
    expect(LAST_DECISION.date).toBe('2026-10-08')
    expect(LAST_DECISION.levelPct).toBe(6)
    expect(LAST_DECISION.changeBp).toBe(25)
  })

  it('cuenta los movimientos del año y no las reuniones', () => {
    // Tres de las siete movieron la tasa: enero (−100), marzo (−75) y octubre (+25).
    expect(movesIn2026()).toBe(3)
    expect(COPOM_DECISIONS_2026.length).toBe(7)
  })
})

describe('monetaryPolicyRate - paridad con el ancla que ya usaban las calculadoras', () => {
  // ESTA es la razón de ser del archivo. La TPM vive en `utils/yieldAccounts.ts` desde antes,
  // porque es la tasa por defecto de la calculadora de cuentas remuneradas, y tres páginas la
  // leen de ahí. Publicarla además en una página propia crea un segundo lugar donde la misma
  // cifra puede quedar vieja — que es justo el defecto que esta página vino a arreglar: el COPOM
  // la subió el 8/10/2026 y el sitio publicó 5,75 % hasta el 2/11. Una sola fuente, y un test
  // que se pone rojo si se separan.
  it('el nivel vigente es el mismo que `TPM_PCT`', () => {
    expect(LAST_DECISION.levelPct).toBe(TPM_PCT)
  })

  it('la fecha de la última decisión es la misma que `TPM_CONFIRMED`', () => {
    expect(LAST_DECISION.date).toBe(TPM_CONFIRMED)
  })

  it('las dos listas de reuniones de 2026 son la misma', () => {
    expect(COPOM_DECISIONS_2026.map(d => d.date)).toEqual([...COPOM_MEETINGS_2026])
  })
})

describe('monetaryPolicyRate - el contexto del comunicado', () => {
  it('la meta, el IPC y las expectativas son porcentajes plausibles', () => {
    expect(DECISION_CONTEXT.metaPct).toBe(4.5)
    expect(DECISION_CONTEXT.horizonteAnios).toBe(2)
    expect(DECISION_CONTEXT.ipcInteranualPct).toBeGreaterThan(0)
    expect(DECISION_CONTEXT.ipcInteranualPct).toBeLessThan(20)
    expect(DECISION_CONTEXT.expectativas.length).toBe(3)
    for (const row of DECISION_CONTEXT.expectativas) {
      expect(row.quien.trim().length).toBeGreaterThan(0)
      expect(row.pct).toBeGreaterThan(0)
      expect(row.pct).toBeLessThan(20)
    }
  })

  it('el promedio publicado está entre la expectativa más baja y la más alta', () => {
    // No se recalcula: el comunicado publica 4,71 % como promedio de SUS encuestas, que no son
    // sólo estas tres. Lo que se puede exigir sin inventar nada es que caiga dentro del rango.
    const values = DECISION_CONTEXT.expectativas.map(row => row.pct)
    expect(DECISION_CONTEXT.promedioEncuestasPct).toBeGreaterThanOrEqual(Math.min(...values))
    expect(DECISION_CONTEXT.promedioEncuestasPct).toBeLessThanOrEqual(Math.max(...values))
  })

  it('el IPC citado está por encima de la meta, que es el motivo de la suba', () => {
    expect(DECISION_CONTEXT.ipcInteranualPct).toBeGreaterThan(DECISION_CONTEXT.metaPct)
  })
})

describe('monetaryPolicyRate - lo que la TPM no es', () => {
  it('cada confusión manda a una página del sitio y no a una externa', () => {
    expect(RATE_CONFUSIONS.length).toBe(4)
    for (const row of RATE_CONFUSIONS) {
      expect(row.donde).toMatch(/^\/[a-z0-9/-]+$/)
      expect(row.dondeLabel.trim().length).toBeGreaterThan(0)
      expect(row.porQue.trim().length).toBeGreaterThan(40)
    }
  })

  it('no manda dos veces a la misma página', () => {
    const routes = RATE_CONFUSIONS.map(row => row.donde)
    expect(new Set(routes).size).toBe(routes.length)
  })
})

describe('monetaryPolicyRate - fuentes y fechas', () => {
  it('toda fuente es del BCU y sobre https', () => {
    expect(POLICY_RATE_SOURCES.length).toBeGreaterThanOrEqual(2)
    for (const source of POLICY_RATE_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.bcu\.gub\.uy\//)
      expect(source.publisher).toBe('Banco Central del Uruguay')
      expect(source.label.trim().length).toBeGreaterThan(0)
    }
  })

  it('la fecha de revisión es posterior a la última decisión leída', () => {
    expect(POLICY_RATE_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(POLICY_RATE_REVIEWED >= LAST_DECISION.date).toBe(true)
  })
})

describe('la guía publica el nivel vigente y no un literal viejo', () => {
  // El cuerpo de la guía se arma con plantillas sobre este módulo, que es el punto entero: el
  // 8/10/2026 el COPOM subió la TPM y tres páginas del sitio siguieron publicando 5,75 % durante
  // casi un mes porque cada una llevaba el número escrito a mano. Estos asertos son los que
  // delatarían una plantilla que se vuelve literal.
  const guia = politicaMonetariaGuides[0]!
  const nivel = `${LAST_DECISION.levelPct.toLocaleString('es-UY', { maximumFractionDigits: 2 })} %`

  it('es la única guía del módulo y tiene el slug esperado', () => {
    expect(politicaMonetariaGuides.length).toBe(1)
    expect(guia.slug).toBe('tasa-de-politica-monetaria-uruguay')
  })

  it('el título y la descripción traen el nivel vigente', () => {
    expect(guia.title).toContain(nivel)
    expect(guia.description).toContain(nivel)
  })

  it('el snippet entra en el SERP', () => {
    // El mismo presupuesto que `guideSnippetBudget.test.ts` aplica a todo el catálogo, repetido
    // acá porque este título se CALCULA: un nivel de dos decimales lo alarga solo.
    expect(`${guia.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guia.description.length).toBeLessThanOrEqual(155)
  })

  it('ninguna sección quedó con una plantilla sin resolver', () => {
    const texto = [
      guia.title,
      guia.description,
      ...guia.sections.map(section => section.body),
      ...(guia.faqs ?? []).map(faq => `${faq.q} ${faq.a}`),
    ].join(' ')
    expect(texto).not.toContain('undefined')
    expect(texto).not.toContain('NaN')
    expect(texto).not.toMatch(/\$\{/)
  })

  it('la tabla de reuniones tiene una fila por reunión leída', () => {
    const tabla = guia.sections.find(section => section.table?.headers[0] === 'Reunión')?.table
    expect(tabla).toBeDefined()
    expect(tabla!.rows.length).toBe(COPOM_DECISIONS_2026.length)
    for (const row of tabla!.rows) expect(row.length).toBe(tabla!.headers.length)
  })

  it('cita sus fuentes del BCU', () => {
    expect(guia.sources?.length).toBe(POLICY_RATE_SOURCES.length)
    for (const source of guia.sources ?? [])
      expect(source.url).toMatch(/^https:\/\/www\.bcu\.gub\.uy\//)
  })
})

describe('monetaryPolicyRate - describeChange', () => {
  it('distingue subir, bajar y mantener', () => {
    expect(describeChange(25)).toBe('Subió 25 puntos básicos')
    expect(describeChange(-100)).toBe('Bajó 100 puntos básicos')
    expect(describeChange(0)).toBe('La mantuvo')
  })
})
