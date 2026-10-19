import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCalendarText } from '../../../classes/lrm/calendar'
import {
  LRM_CALENDAR_URL,
  LRM_OPERATIONS_URL,
  LRM_SOURCE_PAGE_URL,
} from '../../../classes/lrm/types'
import { BROU_DEPOSIT_BOARD } from '../../utils/investments'
import {
  BREAK_EVEN_CAP,
  BROU_MIN_COMMISSION,
  LRM_BASELINE,
  LRM_BID_STEP,
  LRM_MIN_BID,
  LRM_SOURCES,
  LRM_STATIC_TITLE,
  brouCommission,
  breakEvenAmount,
  buildLrmFaq,
  daysBetween,
  depositOutcome,
  latestFor,
  longDay,
  lrmDescription,
  lrmOutcome,
  lrmTitle,
  maturityValue,
  presentValue,
  shortDay,
  termRefOfDays,
  upcomingFrom,
  usableSnapshot,
  yearAgoOf,
  type BrokerId,
  type LrmAuction,
  type LrmSnapshotDoc,
} from '../../utils/lrm'

const withBrand = (title: string): string => `${title} | Cambio Uruguay`

/** La foto con todas las tasas de corte cambiadas: para medir textos con el peor caso de largo. */
function withRates(rate: number): LrmSnapshotDoc {
  return { ...LRM_BASELINE, latest: LRM_BASELINE.latest.map(a => ({ ...a, cutRate: rate })) }
}

describe('la foto horneada es la planilla del BCU leída a mano', () => {
  it('trae los cuatro plazos que se licitaron en el último año', () => {
    expect(LRM_BASELINE.latest.map(a => a.termRef)).toEqual([30, 90, 180, 360])
  })

  it('cada licitación cierra: el plazo es exactamente la distancia entre liquidación y vencimiento', () => {
    for (const a of [...LRM_BASELINE.latest, ...LRM_BASELINE.recent]) {
      expect(daysBetween(a.settlement, a.maturity), a.series).toBe(a.days)
      expect(a.cutRate).toBeGreaterThan(0.25)
      expect(a.cutRate).toBeLessThan(40)
      expect(a.date <= a.settlement).toBe(true)
    }
    for (const i of LRM_BASELINE.calendar!.items) {
      expect(daysBetween(i.settlement, i.maturity), i.series).toBe(i.days)
    }
  })

  it('cada «última» está también en `recent`, que va de la más nueva a la más vieja', () => {
    const series = new Set(LRM_BASELINE.recent.map(a => a.series))
    for (const a of LRM_BASELINE.latest) expect(series.has(a.series), a.series).toBe(true)
    const dates = LRM_BASELINE.recent.map(a => a.date)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('el calendario horneado es exactamente lo que el job lee del PDF del 16/10/2026', () => {
    const text = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        '..',
        'tests',
        'lrm',
        'fixtures',
        'calendario-deuda-2026-10-16.txt'
      ),
      'utf8'
    )
    expect(parseCalendarText(text)).toEqual(LRM_BASELINE.calendar)
  })

  it('las URL de las fuentes son las mismas que usa el job', () => {
    expect(LRM_SOURCES.operationsUrl).toBe(LRM_OPERATIONS_URL)
    expect(LRM_SOURCES.calendarUrl).toBe(LRM_CALENDAR_URL)
    expect(LRM_SOURCES.pageUrl).toBe(LRM_SOURCE_PAGE_URL)
  })
})

describe('usableSnapshot', () => {
  it('rechaza lo que no sirve y la página cae a la foto horneada', () => {
    expect(usableSnapshot(null)).toBeNull()
    expect(usableSnapshot({})).toBeNull()
    expect(usableSnapshot({ latest: [] })).toBeNull()
    expect(usableSnapshot({ latest: [{ date: '2026-10-13', days: 34, cutRate: 'x' }] })).toBeNull()
  })

  it('acepta una foto del job y completa lo que falte con vacíos, no con datos inventados', () => {
    const out = usableSnapshot({ latest: LRM_BASELINE.latest, capturedAt: '2026-10-19T23:31:00Z' })
    expect(out?.latest).toEqual(LRM_BASELINE.latest)
    expect(out?.recent).toEqual([])
    expect(out?.treasury).toEqual([])
    expect(out?.calendar).toBeNull()
  })
})

describe('fechas sin zona horaria', () => {
  it('escribe el día que dice el dato, en uruguayo', () => {
    expect(shortDay('2026-10-15')).toBe('15/10/2026')
    expect(longDay('2026-10-15')).toBe('jueves 15 de octubre')
    expect(longDay('2026-10-19', true)).toBe('lunes 19 de octubre de 2026')
    expect(longDay('2026-09-07')).toBe('lunes 7 de setiembre')
    expect(shortDay('no')).toBe('')
  })
})

describe('la fórmula del BCU', () => {
  it('VA = VN / (1 + i)^(t/365) y su vuelta', () => {
    // La última letra a un año: 364 días al 6,20 %.
    expect(presentValue(100_000, 6.2, 364)).toBeCloseTo(94_177, 0)
    expect(maturityValue(presentValue(100_000, 6.2, 364), 6.2, 364)).toBeCloseTo(100_000, 6)
  })
})

describe('comisiones publicadas', () => {
  it('BROU: mínimo de $ 2.500, tramos por valor nominal, ponderado por el plazo y topeado en un año', () => {
    expect(brouCommission(100_000, 34)).toBe(BROU_MIN_COMMISSION)
    expect(brouCommission(1_000_000, 364)).toBeCloseTo((1_000_000 * 0.01 * 364) / 365, 6)
    expect(brouCommission(20_000_000, 90)).toBeCloseTo((20_000_000 * 0.005 * 90) / 365, 6)
    expect(brouCommission(200_000, 365)).toBe(3000)
    expect(brouCommission(1_000_000, 378)).toBe(brouCommission(1_000_000, 365))
  })

  it('Itaú descuenta 2 puntos de la tasa; sin comisión queda la tasa de corte entera', () => {
    const a = latestFor(LRM_BASELINE, 360)!
    const itau = lrmOutcome(1_000_000, a, 'itau')
    expect(itau.netAnnualPct).toBeCloseTo(a.cutRate - 2, 6)
    const none = lrmOutcome(1_000_000, a, 'none')
    expect(none.commission).toBe(0)
    expect(none.netAnnualPct).toBeCloseTo(a.cutRate, 6)
  })
})

describe('el plazo fijo de al lado', () => {
  it('usa la pizarra e-BROU del plazo de la letra, menos el IRPF sobre el interés', () => {
    const d = depositOutcome(1_000_000, 83)!
    expect(d.tranche.label).toBe('60 – 90')
    expect(d.grossPct).toBe(BROU_DEPOSIT_BOARD.series.UYU.tranches[1]!.online)
    expect(d.irpfPct).toBe(5.5)
    expect(d.irpf).toBeCloseTo(d.grossGain * 0.055, 6)
    expect(depositOutcome(1_000_000, 20)).toBeNull()
  })
})

/** El mismo punto de equilibrio, buscado de a un paso: la búsqueda binaria tiene que coincidir. */
function linearBreakEven(a: LrmAuction, broker: BrokerId): number | null {
  for (let amount = LRM_MIN_BID; amount <= BREAK_EVEN_CAP; amount += LRM_BID_STEP) {
    const d = depositOutcome(amount, a.days)
    if (d && lrmOutcome(amount, a, broker).netGain >= d.netGain) return amount
  }
  return null
}

describe('breakEvenAmount', () => {
  it('coincide con la búsqueda paso a paso en todos los plazos y tarifas', () => {
    for (const a of LRM_BASELINE.latest) {
      for (const broker of ['brou', 'itau', 'none'] as BrokerId[]) {
        expect(breakEvenAmount(a, broker), `${a.termRef}/${broker}`).toBe(
          linearBreakEven(a, broker)
        )
      }
    }
  })

  it('con las tasas del 13–15/10/2026: la letra por el BROU gana a 30 días recién desde $ 1.760.000', () => {
    expect(breakEvenAmount(latestFor(LRM_BASELINE, 30)!, 'brou')).toBe(1_760_000)
    expect(breakEvenAmount(latestFor(LRM_BASELINE, 90)!, 'brou')).toBe(850_000)
    // Sin comisión, la tasa de corte le gana al plazo fijo desde el mínimo: la comisión es todo.
    for (const a of LRM_BASELINE.latest) expect(breakEvenAmount(a, 'none')).toBe(LRM_MIN_BID)
    // Con 2 puntos menos, a estas tasas, no gana nunca.
    for (const a of LRM_BASELINE.latest) expect(breakEvenAmount(a, 'itau')).toBeNull()
  })
})

describe('título y descripción entran en el SERP', () => {
  it('el título lleva la tasa a 30 días y cabe con la marca, aun con dos dígitos enteros', () => {
    expect(lrmTitle(LRM_BASELINE)).toBe('Tasas LRM del BCU: 6,04 % a 30 días')
    expect(withBrand(lrmTitle(withRates(12.34))).length).toBeLessThanOrEqual(60)
    expect(withBrand(LRM_STATIC_TITLE).length).toBeLessThanOrEqual(60)
    const without30 = { ...LRM_BASELINE, latest: LRM_BASELINE.latest.filter(a => a.termRef !== 30) }
    expect(lrmTitle(without30)).toBe(LRM_STATIC_TITLE)
  })

  it('la descripción nombra las cuatro tasas con su fecha y no pasa de 155 caracteres', () => {
    const d = lrmDescription(LRM_BASELINE)
    expect(d).toBe(
      'Letras de Regulación Monetaria al 15/10/2026: 6,04 % a 30 días, 6,26 % a 90, 6,12 % a 180 y 6,20 % a un año. Cómo comprarlas, comisión e IRPF.'
    )
    expect(d.length).toBeLessThanOrEqual(155)
    expect(lrmDescription(withRates(12.34)).length).toBeLessThanOrEqual(155)
  })
})

describe('calendario', () => {
  it('cada licitación anunciada cae en su plazo de referencia', () => {
    expect(LRM_BASELINE.calendar!.items.map(i => termRefOfDays(i.days))).toEqual([
      30, 90, 180, 30, 90, 360,
    ])
  })

  it('sólo muestra como próximas las que no pasaron', () => {
    expect(upcomingFrom(LRM_BASELINE.calendar, '2026-10-22').map(i => i.date)).toEqual([
      '2026-10-23',
      '2026-10-26',
      '2026-10-28',
      '2026-10-29',
    ])
    expect(upcomingFrom(LRM_BASELINE.calendar, '2026-11-02')).toEqual([])
    expect(upcomingFrom(null, '2026-10-22')).toEqual([])
  })

  it('compara cada plazo con la licitación de hace un año', () => {
    const thirty = latestFor(LRM_BASELINE, 30)!
    expect(yearAgoOf(LRM_BASELINE.recent, thirty)?.cutRate).toBe(8.24)
    expect(yearAgoOf([], thirty)).toBeNull()
  })
})

describe('preguntas frecuentes', () => {
  const faq = buildLrmFaq(LRM_BASELINE, LRM_BASELINE.calendar!.items[0]!, 1_760_000)

  it('no imprime huecos', () => {
    expect(new Set(faq.map(f => f.id)).size).toBe(faq.length)
    for (const f of faq) expect(f.answer, f.id).not.toMatch(/undefined|NaN|null|—/)
  })

  it('dice la próxima licitación, el IRPF del plazo fijo y el punto de equilibrio', () => {
    const answer = (id: string) => faq.find(f => f.id === id)!.answer
    expect(answer('lrm-proxima')).toMatch(/lunes 19 de octubre a las 14:00/)
    expect(answer('lrm-irpf')).toMatch(/5,5 %/)
    expect(answer('lrm-conviene')).toMatch(/1\.760\.000/)
    expect(answer('lrm-ui')).toMatch(/3,00 % real anual a 12 años/)
  })
})
