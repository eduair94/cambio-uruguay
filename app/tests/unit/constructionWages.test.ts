import { describe, expect, it } from 'vitest'

import {
  AUC_COMPONENTS,
  AUC_TOTAL_RATE,
  AUC_WAGE_CHARGES_RATE,
  CONSTRUCTION_FAQ,
  CONSTRUCTION_PATH,
  CONSTRUCTION_PAYOUTS,
  CONSTRUCTION_SOURCES,
  CONSTRUCTION_UNPUBLISHED,
  DECEMBER_LICENCIA_CAP_DAYS,
  POSTPONEMENT_RULES,
  aguinaldoTrancheFor,
  licenciaSplit,
} from '../../utils/constructionWages'

describe('el aporte unificado de la construcción', () => {
  // La tabla del BPS publica el total Y sus cinco componentes, así que son dos datos que tienen que
  // cerrar entre sí. Una fila mal transcripta deja de sumar: sin este test, publicar «29,9 %» donde
  // la fuente dice otra cosa no rompe nada y queda en la página para siempre.
  it('los cinco componentes suman el total que publica el BPS', () => {
    const sum = AUC_COMPONENTS.reduce((total, component) => total + component.rate, 0)
    expect(Number(sum.toFixed(1))).toBe(AUC_TOTAL_RATE)
  })

  it('la cuota parte de cargas salariales es la que figura en la tabla de componentes', () => {
    const wages = AUC_COMPONENTS.find(component => component.id === 'cargas-salariales')
    expect(wages?.rate).toBe(AUC_WAGE_CHARGES_RATE)
  })
})

describe('el reparto de los días de licencia entre los dos pagos', () => {
  // El borde es el punto del test y la razón por la que la función existe: la ficha del BPS manda a
  // Semana de Turismo a quien generó MÁS de 16 días, así que 16 justos se cobran enteros en
  // diciembre. Una implementación con `>=` abriría un segundo pago de cero días.
  it('paga en diciembre todo lo que no pasa de los 16 días', () => {
    expect(licenciaSplit(10)).toEqual({ december: 10, turismo: 0 })
    expect(licenciaSplit(DECEMBER_LICENCIA_CAP_DAYS)).toEqual({ december: 16, turismo: 0 })
  })

  it('manda a Semana de Turismo sólo los días que pasan de 16', () => {
    expect(licenciaSplit(20)).toEqual({ december: 16, turismo: 4 })
    expect(licenciaSplit(25)).toEqual({ december: 16, turismo: 9 })
  })

  it('no inventa un reparto sin dato', () => {
    expect(licenciaSplit(null)).toBeNull()
    expect(licenciaSplit(-1)).toBeNull()
    expect(licenciaSplit(Number.NaN)).toBeNull()
  })

  it('trunca los días fraccionados en vez de redondear para arriba', () => {
    // Medio día no se cobra como un día: el reparto es de días enteros.
    expect(licenciaSplit(16.8)).toEqual({ december: 16, turismo: 0 })
    expect(licenciaSplit(17.9)).toEqual({ december: 16, turismo: 1 })
  })
})

describe('en qué pago cae el aguinaldo del mes trabajado', () => {
  // Los dos tramos, cada uno por su lado. Un solo caso no alcanza: la construcción corre los
  // semestres un mes contra el régimen general (diciembre-mayo / junio-noviembre), así que una
  // implementación que copiara el régimen general acierta la mitad de los meses.
  it('paga en diciembre del mismo año lo trabajado de mayo a octubre', () => {
    for (const month of [5, 6, 7, 8, 9, 10]) {
      expect(aguinaldoTrancheFor(month, 2026), `mes ${month}`).toEqual({
        payoutId: 'diciembre',
        when: 'Diciembre',
        year: 2026,
      })
    }
  })

  it('paga en junio lo trabajado de enero a abril', () => {
    for (const month of [1, 2, 3, 4]) {
      expect(aguinaldoTrancheFor(month, 2026), `mes ${month}`).toEqual({
        payoutId: 'junio',
        when: 'Junio',
        year: 2026,
      })
    }
  })

  // El salto de año, que es lo único que se equivoca solo: el tramo arranca en noviembre y cierra
  // en abril, así que noviembre y diciembre se cobran en junio del año SIGUIENTE.
  it('cobra en junio del año siguiente lo trabajado en noviembre y diciembre', () => {
    expect(aguinaldoTrancheFor(11, 2026)).toEqual({
      payoutId: 'junio',
      when: 'Junio',
      year: 2027,
    })
    expect(aguinaldoTrancheFor(12, 2026)).toEqual({
      payoutId: 'junio',
      when: 'Junio',
      year: 2027,
    })
  })

  it('cubre los doce meses sin dejar ninguno sin pago', () => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    expect(months.every(month => aguinaldoTrancheFor(month, 2026) !== null)).toBe(true)
  })

  it('no adivina un mes que no existe', () => {
    for (const month of [0, 13, -1, 1.5, Number.NaN]) {
      expect(aguinaldoTrancheFor(month, 2026), `mes ${month}`).toBeNull()
    }
    expect(aguinaldoTrancheFor(6, 2026.5)).toBeNull()
  })

  it('apunta a un pago que existe en el calendario', () => {
    const ids = new Set(CONSTRUCTION_PAYOUTS.map(payout => payout.id))
    for (const month of Array.from({ length: 12 }, (_, i) => i + 1)) {
      expect(ids.has(aguinaldoTrancheFor(month, 2026)!.payoutId)).toBe(true)
    }
  })
})

describe('el contrato de contenido de la página', () => {
  it('declara su propia ruta', () => {
    expect(CONSTRUCTION_PATH).toBe('/licencia-de-la-construccion-uruguay')
  })

  it('tiene los tres pagos del año, cada uno con sus partidas', () => {
    expect(CONSTRUCTION_PAYOUTS.map(payout => payout.id)).toEqual(['junio', 'diciembre', 'turismo'])
    for (const payout of CONSTRUCTION_PAYOUTS) {
      expect(payout.items.length, payout.id).toBeGreaterThan(0)
      expect(payout.covers.length, payout.id).toBeGreaterThan(0)
    }
  })

  it('tiene las tres ventanas de postergación', () => {
    expect(POSTPONEMENT_RULES).toHaveLength(3)
    for (const rule of POSTPONEMENT_RULES) {
      expect(rule.deadline.length).toBeGreaterThan(0)
      expect(rule.paidAt.length).toBeGreaterThan(0)
    }
  })

  // La regla del repo: ninguna cifra sin una fuente real que la sostenga, y todas las fuentes son
  // oficiales. Si alguien agrega una fuente de prensa o un blog, esto se pone rojo.
  it('cita sólo fuentes oficiales, con URL', () => {
    expect(CONSTRUCTION_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const source of CONSTRUCTION_SOURCES) {
      expect(source.url, source.label).toMatch(
        /^https:\/\/(www\.bps\.gub\.uy|www\.impo\.com\.uy)\//
      )
      expect(source.label.length).toBeGreaterThan(0)
    }
  })

  it('deja escrito lo que no publica y por qué', () => {
    expect(CONSTRUCTION_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of CONSTRUCTION_UNPUBLISHED) {
      expect(item.question.endsWith('?'), item.id).toBe(true)
      expect(item.why.length, item.id).toBeGreaterThan(40)
    }
  })

  it('no repite una pregunta del FAQ', () => {
    const questions = CONSTRUCTION_FAQ.map(faq => faq.question)
    expect(new Set(questions).size).toBe(questions.length)
  })
})
