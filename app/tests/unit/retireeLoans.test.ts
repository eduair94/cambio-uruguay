import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BPC_2026 } from '../../utils/irpfCasos'
import { BCU_CAPS_PERIOD } from '../../utils/loanNoPayslip'
import {
  BCU_SCAM_SIGNALS,
  BPS_ANTIFRAUD,
  BPS_CUOTA_CAP_FICHA_PCT,
  BPS_CUOTA_CAP_REGLAMENTO_PCT,
  BPS_MAX_AMOUNT,
  BPS_PROTESIS,
  BPS_RATES,
  BROU_PASIVOS,
  BROU_TRAMOS,
  OTHER_LENDERS,
  RETIREE_DESCRIPTION,
  RETIREE_EVENTS,
  RETIREE_FAQ,
  RETIREE_MISTAKES,
  RETIREE_PATH,
  RETIREE_SOURCES,
  RETIREE_TITLE,
  RETIREE_UNPUBLISHED,
  RETIREE_VERIFIED_AT,
  addDaysIso,
  bpsCuota,
  bpsMaxAmount,
  bpsMaxForPlazo,
  brouCuotaPublicada,
  brouCuotaSinDiferir,
  cuotaComparison,
  cuotaShareOfHaber,
  retireeEventStatus,
  retireeSource,
  retireeUsuryRows,
  uruguayTodayIso,
  type BpsPlazo,
} from '../../utils/retireeLoans'

/**
 * El catálogo de `/prestamos-para-jubilados-uruguay`.
 *
 * Lo que se vigila no es que el archivo compile: es que los números que la página AFIRMA sigan
 * reproduciendo las tablas que publican el BPS y el BROU. Si el BPS cambia su tabla de cuotas o el
 * BROU sus tasas, estos tests tienen que fallar y obligar a volver a leer la fuente, no dejar pasar
 * el cambio en silencio.
 */
const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'prestamos-para-jubilados-uruguay.vue'),
  'utf8'
)

/** La tabla de ejemplo del préstamo social, transcripta de la ficha del BPS (6/8/2026). */
const BPS_TABLE: Record<number, Record<BpsPlazo, number>> = {
  1_000: { 6: 177, 12: 94, 18: 67, 24: 53 },
  2_000: { 6: 353, 12: 188, 18: 133, 24: 105 },
  5_000: { 6: 882, 12: 469, 18: 331, 24: 262 },
  10_000: { 6: 1_764, 12: 937, 18: 661, 24: 523 },
  15_000: { 6: 2_646, 12: 1_405, 18: 992, 24: 784 },
  20_000: { 6: 3_527, 12: 1_873, 18: 1_322, 24: 1_045 },
  50_000: { 6: 8_817, 12: 4_683, 18: 3_305, 24: 2_612 },
  100_000: { 6: 17_634, 12: 9_365, 18: 6_609, 24: 5_224 },
}

describe('la cuota del préstamo social reproduce la tabla del BPS', () => {
  const cells = Object.entries(BPS_TABLE).flatMap(([amount, row]) =>
    (Object.entries(row) as [string, number][]).map(
      ([cuotas, cuota]) => [Number(amount), Number(cuotas) as BpsPlazo, cuota] as const
    )
  )

  it('son las 32 celdas de la ficha', () => {
    expect(cells).toHaveLength(32)
  })

  it.each(cells)('$ %i en %i cuotas da $ %i', (amount, cuotas, cuota) => {
    expect(bpsCuota(amount, cuotas)).toBe(cuota)
  })

  it('las cuatro tasas son las del comunicado del 4/8/2026', () => {
    expect(BPS_RATES.map(rate => rate.teaPct)).toEqual([21.25, 24.25, 25.25, 25.25])
    expect(BPS_RATES.map(rate => rate.previousPct)).toEqual([23.5, 26.5, 28, 28])
    // La diferencial es cinco puntos abajo de la vigente, en los cuatro plazos.
    for (const rate of BPS_RATES) expect(rate.teaPct - rate.differentialPct).toBeCloseTo(5, 10)
  })

  it('no inventa una cuota sin monto', () => {
    expect(bpsCuota(null, 12)).toBeNull()
    expect(bpsCuota(0, 12)).toBeNull()
    expect(bpsCuota(Number.NaN, 12)).toBeNull()
    expect(bpsCuota(10_000, 9 as BpsPlazo)).toBeNull()
  })
})

describe('el monto máximo', () => {
  it('son seis haberes con el tope en pesos de la ficha', () => {
    expect(bpsMaxAmount(30_000)).toBe(180_000)
    expect(bpsMaxAmount(100_000)).toBe(BPS_MAX_AMOUNT)
    expect(BPS_MAX_AMOUNT).toBe(474_500)
  })

  it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'no imprime un monto con un haber de %s',
    value => {
      expect(bpsMaxAmount(value as number | null)).toBeNull()
      expect(bpsMaxForPlazo(value as number | null, 24)).toBeNull()
    }
  )

  // La afirmación de la página: en 6 y 12 cuotas lo que limita es la cuota, no los seis haberes.
  it('en 6 y 12 cuotas limita la cuota; en 18 y 24, los seis haberes', () => {
    expect(bpsMaxForPlazo(30_000, 6)).toEqual({ amount: 76_500, limit: 'cuota' })
    expect(bpsMaxForPlazo(30_000, 12)).toEqual({ amount: 144_100, limit: 'cuota' })
    expect(bpsMaxForPlazo(30_000, 18)).toEqual({ amount: 180_000, limit: 'haberes' })
    expect(bpsMaxForPlazo(30_000, 24)).toEqual({ amount: 180_000, limit: 'haberes' })
    for (const cuotas of [6, 12] as const) {
      const share = cuotaShareOfHaber(bpsCuota(6 * 30_000, cuotas), 30_000)!
      expect(share).toBeGreaterThan(BPS_CUOTA_CAP_FICHA_PCT)
    }
  })

  it('con una pasividad alta manda el tope en pesos', () => {
    expect(bpsMaxForPlazo(100_000, 24)).toEqual({ amount: BPS_MAX_AMOUNT, limit: 'tope' })
  })

  it('el monto máximo nunca deja una cuota por encima del tope', () => {
    for (const haber of [12_345, 18_000, 25_500, 41_000, 63_210, 99_999])
      for (const rate of BPS_RATES)
        for (const cap of [BPS_CUOTA_CAP_FICHA_PCT, BPS_CUOTA_CAP_REGLAMENTO_PCT]) {
          const max = bpsMaxForPlazo(haber, rate.cuotas, cap)!
          expect(bpsCuota(max.amount, rate.cuotas)!).toBeLessThanOrEqual((cap / 100) * haber)
        }
  })

  it('el reglamento (40 %) nunca da más que la ficha (45 %)', () => {
    for (const rate of BPS_RATES) {
      const ficha = bpsMaxForPlazo(30_000, rate.cuotas, BPS_CUOTA_CAP_FICHA_PCT)!
      const reglamento = bpsMaxForPlazo(30_000, rate.cuotas, BPS_CUOTA_CAP_REGLAMENTO_PCT)!
      expect(reglamento.amount).toBeLessThanOrEqual(ficha.amount)
    }
  })
})

describe('los préstamos para prótesis', () => {
  // Los pesos que imprime la ficha son 15 y 40 BPC de 2026: si cambia la BPC sin cambiar acá, o al
  // revés, este test lo dice.
  it('los pesos de la ficha son 15 y 40 BPC de 2026', () => {
    expect(BPS_PROTESIS.maxHaberBpc * BPC_2026).toBe(BPS_PROTESIS.maxHaberPesos)
    expect(BPS_PROTESIS.maxAmountBpc * BPC_2026).toBe(BPS_PROTESIS.maxAmountPesos)
  })

  // La prueba de que la tabla de ejemplo ya está a la tasa nueva del 12 %: una anualidad al 12 %
  // efectivo anual, redondeada hacia arriba al peso, da las cuatro cuotas de la fila de $ 10.000.
  it('su fila de $ 10.000 es una anualidad al 12 %', () => {
    const cuotas = BPS_PROTESIS.plazos.map(n => {
      const i = Math.pow(1 + BPS_PROTESIS.teaPct / 100, 1 / 12) - 1
      return Math.ceil((10_000 * i) / (1 - Math.pow(1 + i, -n)))
    })
    expect(cuotas).toEqual([...BPS_PROTESIS.cuotaPor10k])
  })
})

describe('la tabla del BROU ya trae el IVA y un mes de diferimiento', () => {
  it('cuatro canales por seis tramos', () => {
    expect(BROU_PASIVOS).toHaveLength(4)
    for (const channel of BROU_PASIVOS) {
      expect(channel.teaPct).toHaveLength(BROU_TRAMOS.length)
      expect(channel.cuotaPor10k).toHaveLength(BROU_TRAMOS.length)
    }
  })

  // El hallazgo que sostiene la comparación: con la tasa más el 22 % de IVA y el primer descuento
  // 31 días más tarde, las 24 cuotas de ejemplo del PDF cierran dentro del peso.
  it('las 24 cuotas de ejemplo cierran dentro del peso', () => {
    for (const channel of BROU_PASIVOS)
      BROU_TRAMOS.forEach((tramo, index) => {
        const computed = brouCuotaPublicada(channel.teaPct[index]!, tramo.maxCuotas)
        expect(
          Math.abs(computed - channel.cuotaPor10k[index]!),
          `${channel.id} ${tramo.label}`
        ).toBeLessThanOrEqual(1)
      })
  })

  // La frase de la página: el BPS queda entre el BROU más barato y el más caro.
  it('el BPS queda entre el BROU por eBROU preferencial y el de sucursal estándar', () => {
    const rows = cuotaComparison()
    expect(rows.map(row => row.cuotas)).toEqual([6, 12, 24])
    for (const row of rows) {
      expect(row.brouMin).toBeLessThan(row.bps)
      expect(row.bps).toBeLessThan(row.brouMax)
    }
  })

  // La nota al pie: si a la tasa del BPS se le sumara IVA, su cuota pasaría a las cuatro del BROU.
  it('con IVA, la cuota del BPS quedaría por encima de la más cara del BROU', () => {
    for (const row of cuotaComparison()) {
      const bpsTea = BPS_RATES.find(rate => rate.cuotas === row.cuotas)!.teaPct
      expect(brouCuotaSinDiferir(bpsTea, row.cuotas)).toBeGreaterThan(row.brouMax)
    }
  })
})

describe('el calendario dice el estado del día', () => {
  const byId = (id: string) => RETIREE_EVENTS.find(event => event.id === id)!

  it('la tasa diferencial dura 90 días desde el 1 de noviembre', () => {
    expect(addDaysIso('2026-11-01', 89)).toBe('2027-01-29')
    expect(byId('tasa-diferencial').to).toBe('2027-01-29')
  })

  it('el día que se publicó la página', () => {
    expect(retireeEventStatus(byId('renovacion-anticipada'), '2026-10-20')).toBe('vigente')
    expect(retireeEventStatus(byId('tasa-diferencial'), '2026-10-20')).toBe('proximo')
    expect(retireeEventStatus(byId('refinanciacion'), '2026-10-20')).toBe('proximo')
    expect(retireeEventStatus(byId('brou-campana'), '2026-10-20')).toBe('sin-fecha')
  })

  it('en noviembre cierra la renovación y abre la diferencial', () => {
    expect(retireeEventStatus(byId('renovacion-anticipada'), '2026-11-02')).toBe('cerrado')
    expect(retireeEventStatus(byId('tasa-diferencial'), '2026-11-02')).toBe('vigente')
    // Un anuncio no se da por operativo: queda rotulado como anuncio.
    expect(retireeEventStatus(byId('refinanciacion'), '2026-11-02')).toBe('anunciado')
  })

  it('la diferencial cierra después del día 90', () => {
    expect(retireeEventStatus(byId('tasa-diferencial'), '2027-01-29')).toBe('vigente')
    expect(retireeEventStatus(byId('tasa-diferencial'), '2027-01-30')).toBe('cerrado')
  })

  it('el día es el de Uruguay, no el del servidor', () => {
    // 22:30 del 19 en Montevideo.
    expect(uruguayTodayIso(new Date('2026-10-20T01:30:00Z'))).toBe('2026-10-19')
    expect(uruguayTodayIso(new Date('2026-10-20T03:30:00Z'))).toBe('2026-10-20')
  })
})

describe('los topes de usura salen de la grilla y de la lectura fechada, no de este archivo', () => {
  it('sin grilla viva, las cinco filas son la lectura fechada', () => {
    const rows = retireeUsuryRows(null)
    expect(rows.map(row => row.id)).toEqual([
      'sin-descuento-chico-corto',
      'retencion-chico-corto',
      'retencion-chico-largo',
      'nomina-chico-corto',
      'nomina-chico-largo',
    ])
    for (const row of rows) {
      expect(row.live).toBe(false)
      expect(row.periodo).toBe(BCU_CAPS_PERIOD)
    }
  })

  it('con grilla viva, la fila sin retención toma el número y el período de hoy', () => {
    const rows = retireeUsuryRows({
      periodo: 'junio–agosto de 2026',
      vigenteDesde: '2026-10-01',
      rows: [
        {
          bracket: 'menor10kUI',
          cortoPlazo: true,
          currency: 'UYU',
          media: 0.8887,
          tope: 1.377485,
          topeMora: 1.59966,
        },
      ],
    })
    const live = rows[0]!
    expect(live.live).toBe(true)
    expect(live.capPct).toBeCloseTo(137.7485, 4)
    expect(live.periodo).toBe('junio–agosto de 2026')
    expect(live.vigenteDesde).toBe('2026-10-01')
    // Las de retención no se refrescan solas: siguen diciendo de qué período son.
    for (const row of rows.slice(1)) expect(row.periodo).toBe(BCU_CAPS_PERIOD)
    // Y la frase de la página: con retención el techo es una fracción del de sin retención.
    for (const row of rows.slice(1)) expect(row.capPct).toBeLessThan(live.capPct / 3)
  })
})

describe('título y descripción entran en el SERP', () => {
  it('el título entra en los 60 caracteres con la marca', () => {
    expect(`${RETIREE_TITLE} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
  })

  it('la descripción entra en 155 caracteres y lleva las cifras', () => {
    expect(RETIREE_DESCRIPTION.length).toBeLessThanOrEqual(155)
    expect(RETIREE_DESCRIPTION).toContain('$ 474.500')
    expect(RETIREE_DESCRIPTION).toContain('21,25 %')
    expect(RETIREE_DESCRIPTION).toContain('BROU')
  })
})

describe('cada afirmación tiene su fuente', () => {
  it('las fuentes tienen identificador único y URL https', () => {
    const ids = RETIREE_SOURCES.map(source => source.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const source of RETIREE_SOURCES) expect(source.url).toMatch(/^https:\/\//)
  })

  it('todo lo que cita una fuente cita una que existe', () => {
    const cited = [
      ...RETIREE_EVENTS.map(item => item.sourceId),
      ...RETIREE_MISTAKES.map(item => item.sourceId),
      ...BPS_ANTIFRAUD.map(item => item.sourceId),
      ...OTHER_LENDERS.map(item => item.sourceId),
    ]
    for (const id of cited) expect(retireeSource(id), id).toBeTruthy()
  })

  it('la fecha de lectura es una fecha ISO', () => {
    expect(RETIREE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const source of RETIREE_SOURCES)
      if (source.shownAt) expect(source.shownAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('las cinco señales del BCU', () => {
    expect(BCU_SCAM_SIGNALS).toHaveLength(5)
  })

  it('las preguntas frecuentes contestan la consulta que pidió la página', () => {
    expect(RETIREE_FAQ.length).toBeGreaterThanOrEqual(6)
    expect(RETIREE_FAQ.some(faq => /BROU/.test(faq.question))).toBe(true)
    for (const faq of RETIREE_FAQ) expect(faq.answer.length).toBeGreaterThan(80)
  })

  it('dice lo que no publica, con el motivo', () => {
    expect(RETIREE_UNPUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of RETIREE_UNPUBLISHED) expect(item.why.length).toBeGreaterThan(40)
  })
})

describe('la página publica lo que el catálogo declara', () => {
  it('declara su propia ruta como canonical absoluto', () => {
    expect(RETIREE_PATH).toBe('/prestamos-para-jubilados-uruguay')
    expect(PAGE).toContain('https://cambio-uruguay.com${RETIREE_PATH}')
    expect(PAGE).toContain("rel: 'canonical'")
  })

  it('lleva un único h1', () => {
    expect(PAGE.match(/<h1\b/g) ?? []).toHaveLength(1)
  })

  it('emite BreadcrumbList y FAQPage', () => {
    expect(PAGE).toContain('BreadcrumbList')
    expect(PAGE).toContain('FAQPage')
  })

  it('lee el tope de usura de la grilla viva', () => {
    expect(PAGE).toContain("'/api/bcu-rates'")
  })

  it.each([
    '/herramientas/calculadora-prestamo',
    '/mejores-prestamos-uruguay',
    '/ley-de-usura-uruguay',
    '/embargo-de-sueldo-uruguay',
    '/jubilacion-por-incapacidad-uruguay',
    '/advertencias-bcu',
  ])('enlaza %s', route => {
    expect(PAGE).toContain(`localePath('${route}')`)
  })
})
