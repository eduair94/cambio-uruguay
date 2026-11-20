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
  BROKER_TARIFFS,
  BROU_MIN_COMMISSION,
  DEPOSIT_MIN_UYU,
  LRM_BASELINE,
  LRM_BID_STEP,
  LRM_GRID_AMOUNTS,
  LRM_MIN_BID,
  LRM_SOURCES,
  LRM_STATIC_TITLE,
  LRM_TARIFFS_VERIFIED_AT,
  LRM_VERIFIED_AT,
  LRM_WHERE_TO_BUY,
  brouCommission,
  breakEvenAmount,
  breakEvenLabel,
  breakEvenSentence,
  buildAmountGrid,
  buildBreakEvenRows,
  buildLrmFaq,
  latestAuctions,
  noComparableDepositSentence,
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

/**
 * La foto con la letra «de 30 días» a 28 días, que es lo normal: 29 de las 57 licitaciones de ese
 * plazo entre octubre de 2025 y noviembre de 2026 duraron menos de 30, y la pizarra e-BROU empieza
 * en 30. No hay plazo fijo con qué comparar.
 */
function withShortThirty(): LrmSnapshotDoc {
  return {
    ...LRM_BASELINE,
    latest: LRM_BASELINE.latest.map(a =>
      a.termRef === 30 ? { ...a, days: 28, maturity: '2026-11-10' } : a
    ),
  }
}

describe('punto de equilibrio por plazo', () => {
  it('una letra más corta que el plazo fijo más corto no se compara con nada', () => {
    const rows = buildBreakEvenRows(withShortThirty())
    const thirty = rows.find(r => r.termRef === 30)!
    expect(thirty.comparable).toBe(false)
    expect(thirty.deposit).toBeNull()
    expect(thirty.amount).toBeNull()
    expect(breakEvenLabel(thirty)).toMatch(/sin plazo fijo/)
    expect(breakEvenLabel(thirty)).not.toMatch(/más de/)
    expect(noComparableDepositSentence(28)).toBe(
      'El plazo fijo e-BROU más corto es de 30 días: una letra a 28 días no tiene con qué compararse.'
    )
  })

  it('con plazo fijo comparable dice el monto, o «más de» el tope si no gana nunca', () => {
    expect(breakEvenLabel({ amount: 850_000, comparable: true })).toMatch(/850\.000/)
    expect(breakEvenLabel({ amount: null, comparable: true })).toBe('más de $ 50 millones')
    expect(BREAK_EVEN_CAP).toBe(50_000_000)
  })

  it('la frase lista los montos de menor a mayor, con el plazo de cada uno', () => {
    const rows = buildBreakEvenRows(LRM_BASELINE)
    const year = linearBreakEven(latestFor(LRM_BASELINE, 360)!, 'brou')!
    const half = linearBreakEven(latestFor(LRM_BASELINE, 180)!, 'brou')!
    const sentence = breakEvenSentence(rows)
    const fmt = (n: number) => n.toLocaleString('es-UY')
    const order = [850_000, 1_760_000, year, half].sort((a, b) => a - b)
    const positions = order.map(n => sentence.indexOf(fmt(n)))
    for (const p of positions) expect(p).toBeGreaterThanOrEqual(0)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(sentence).toMatch(/^desde \$/)
    expect(sentence).toMatch(/850\.000 a 90 días/)
    expect(sentence).toMatch(/ y desde /)
    expect(breakEvenSentence([])).toBe('')
    expect(breakEvenSentence([{ termRef: 30, amount: null }])).toBe('')
  })
})

describe('cuánto queda según el monto', () => {
  const grid = buildAmountGrid(LRM_BASELINE)
  const cellAt = (amount: number, termRef: number) =>
    grid.find(r => r.amount === amount)!.cells.find(c => c.termRef === termRef)!

  it('siete montos por cuatro plazos, de menor a mayor', () => {
    expect(grid.map(r => r.amount)).toEqual([...LRM_GRID_AMOUNTS])
    for (const r of grid) expect(r.cells.map(c => c.termRef)).toEqual([30, 90, 180, 360])
  })

  it('debajo del mínimo de la letra queda sólo el plazo fijo y no hay ganador', () => {
    const row = grid.find(r => r.amount === 50_000)!
    expect(row.belowMinimum).toBe(true)
    for (const c of row.cells) {
      expect(c.letter).toBeNull()
      expect(c.deposit).not.toBeNull()
      expect(c.winner).toBeNull()
    }
  })

  it('con $ 100.000 a 30 días la mejor letra es la de Itaú y gana el plazo fijo', () => {
    const c = cellAt(100_000, 30)
    expect(lrmOutcome(100_000, latestFor(LRM_BASELINE, 30)!, 'brou').netGain).toBeLessThan(0)
    expect(c.letter?.broker).toBe('itau')
    expect(c.winner).toBe('deposit')
  })

  it('con $ 5.000.000 a 30 días la letra por el BROU le gana al plazo fijo', () => {
    const c = cellAt(5_000_000, 30)
    expect(c.letter?.broker).toBe('brou')
    expect(c.winner).toBe('letter')
  })

  it('el ganador es siempre el que deja más', () => {
    for (const r of grid) {
      for (const c of r.cells) {
        if (!c.letter || !c.deposit) continue
        expect(c.winner).toBe(c.letter.netGain >= c.deposit.netGain ? 'letter' : 'deposit')
      }
    }
  })

  it('una letra a 28 días no tiene plazo fijo al lado ni ganador', () => {
    const short = buildAmountGrid(withShortThirty())
    for (const r of short) {
      const c = r.cells.find(x => x.termRef === 30)!
      expect(c.days).toBe(28)
      expect(c.deposit).toBeNull()
      expect(c.winner).toBeNull()
    }
  })

  it('el plazo fijo e-BROU arranca en el mínimo que imprime la pizarra', () => {
    expect(DEPOSIT_MIN_UYU).toBe(5_000)
    expect(BROU_DEPOSIT_BOARD.series.UYU.minimum).toBe('$ 5.000')
  })
})

describe('últimas licitaciones', () => {
  it('las doce más nuevas, de la más nueva a la más vieja, sin confiar en el orden de la foto', () => {
    const shuffled = { ...LRM_BASELINE, recent: [...LRM_BASELINE.recent].reverse() }
    const rows = latestAuctions(shuffled, 12)
    expect(rows).toHaveLength(12)
    expect(rows[0]!.date).toBe('2026-10-15')
    const dates = rows.map(a => a.date)
    expect([...dates].sort().reverse()).toEqual(dates)
    expect(latestAuctions({ ...LRM_BASELINE, recent: [] })).toEqual([])
  })
})

describe('dónde comprar', () => {
  it('cinco bancos, cada uno con fuente https, y sólo dos con comisión calculable', () => {
    const ids = LRM_WHERE_TO_BUY.map(s => s.id)
    expect(new Set(ids).size).toBe(5)
    expect(ids).toEqual(['brou', 'itau', 'bbva', 'santander', 'scotiabank'])
    for (const s of LRM_WHERE_TO_BUY) {
      expect(s.sources.length, s.id).toBeGreaterThan(0)
      for (const src of s.sources) expect(src.url, s.id).toMatch(/^https:\/\//)
    }
    expect(LRM_WHERE_TO_BUY.filter(s => s.computable).map(s => s.id)).toEqual(['brou', 'itau'])
  })

  it('la comisión del BROU y la de Itaú son las mismas reglas que usa el simulador', () => {
    const rule = (id: string) => BROKER_TARIFFS.find(t => t.id === id)!.rule
    expect(LRM_WHERE_TO_BUY.find(s => s.id === 'brou')!.commission).toBe(rule('brou'))
    expect(LRM_WHERE_TO_BUY.find(s => s.id === 'itau')!.commission).toBe(rule('itau'))
  })

  it('las custodias de BBVA y Santander dicen lo que su manual no precisa', () => {
    const custody = (id: string) => LRM_WHERE_TO_BUY.find(s => s.id === id)!.custody
    expect(custody('bbva')).toMatch(/renglón general de custodia/)
    expect(custody('bbva')).toMatch(/no dice sobre qué base ni por qué período/)
    expect(custody('santander')).toMatch(/segmento y el volumen invertido/)
  })

  it('el tarifario de Itaú está fechado en la versión que se leyó', () => {
    expect(BROKER_TARIFFS.find(t => t.id === 'itau')!.sourceLabel).toMatch(/1\/11\/2026/)
    expect(LRM_TARIFFS_VERIFIED_AT >= LRM_VERIFIED_AT).toBe(true)
  })
})

describe('preguntas frecuentes', () => {
  const next = LRM_BASELINE.calendar!.items[0]!
  const faq = buildLrmFaq(LRM_BASELINE, next, buildBreakEvenRows(LRM_BASELINE))
  const answer = (id: string) => faq.find(f => f.id === id)!.answer

  it('no imprime huecos', () => {
    expect(new Set(faq.map(f => f.id)).size).toBe(faq.length)
    for (const f of faq) expect(f.answer, f.id).not.toMatch(/undefined|NaN|null|—/)
  })

  it('dice la próxima licitación, el IRPF del plazo fijo y el punto de equilibrio', () => {
    expect(answer('lrm-proxima')).toMatch(/lunes 19 de octubre a las 14:00/)
    expect(answer('lrm-irpf')).toMatch(/5,5 %/)
    expect(answer('lrm-conviene')).toMatch(/1\.760\.000/)
    expect(answer('lrm-conviene')).toMatch(/850\.000/)
    expect(answer('lrm-ui')).toMatch(/3,00 % real anual a 12 años/)
    expect(answer('lrm-ui')).toMatch(/dólares/)
  })

  it('las preguntas no dependen de los datos: sólo las respuestas', () => {
    const other = buildLrmFaq(withShortThirty(), null, buildBreakEvenRows(withShortThirty()))
    expect(other.map(f => f.question)).toEqual(faq.map(f => f.question))
    for (const f of other) expect(f.answer, f.id).not.toMatch(/undefined|NaN|null|—/)
  })

  it('sin plazo fijo a 30 días, la respuesta de si conviene sigue con los otros plazos', () => {
    const short = buildLrmFaq(withShortThirty(), next, buildBreakEvenRows(withShortThirty()))
    const conviene = short.find(f => f.id === 'lrm-conviene')!.answer
    expect(conviene).toMatch(/90 días/)
    expect(conviene).not.toMatch(/a 30 días/)
  })

  it('monto máximo: el tramo no competitivo, con el de la próxima licitación si hay calendario', () => {
    expect(answer('lrm-maximo')).toMatch(/art\. 8/)
    expect(answer('lrm-maximo')).toMatch(/2\.660/)
    const noNext = buildLrmFaq(LRM_BASELINE, null, buildBreakEvenRows(LRM_BASELINE))
    expect(noNext.find(f => f.id === 'lrm-maximo')!.answer).not.toMatch(/próxima/)
  })

  it('con menos del mínimo: el plazo fijo y las cuentas remuneradas', () => {
    const a = faq.find(f => f.id === 'lrm-menos-del-minimo')!
    expect(a.answer).toMatch(/\$ 5\.000/)
    expect(a.answer).toMatch(/100\.000/)
    expect(a.answer).toMatch(/83 días/)
    expect(a.link?.to).toBe('/cuenta-remunerada-uruguay')
  })

  it('monto máximo: el tope del art. 8 es del tramo no competitivo, no de toda compra', () => {
    const a = answer('lrm-maximo')
    expect(a).toMatch(/no es Operador Primario/)
    expect(a).toMatch(/tramo competitivo, que no tiene ese tope/)
    expect(a).toMatch(/mercado secundario/)
    expect(a).not.toMatch(/^Los documentos del BCU/)
  })

  it('la letra a dos años: el documento la prevé, la foto dice si se licitó', () => {
    const plazos = answer('lrm-plazos')
    expect(LRM_BASELINE.recent.some(a => a.termRef === 720)).toBe(false)
    const n = LRM_BASELINE.recent.length
    const longest = Math.max(...LRM_BASELINE.recent.map(a => a.days))
    expect(plazos).toMatch(/prevé además una letra a dos años, una vez por mes, pero en las/)
    expect(plazos).toContain(`en las ${n} licitaciones desde el`)
    expect(plazos).toContain(`no se licitó ninguna: la más larga duró ${longest} días`)
    expect(plazos).toMatch(/Tampoco hubo ninguna a 60 días/)
    expect(plazos).not.toMatch(/720 días, una vez por mes,/)

    const twoYear: LrmAuction = {
      ...LRM_BASELINE.recent[0]!,
      series: 'TEST-720',
      date: '2026-09-15',
      days: 714,
      termRef: 720,
    }
    const withTwoYear = { ...LRM_BASELINE, recent: [...LRM_BASELINE.recent, twoYear] }
    const t = buildLrmFaq(withTwoYear, null, []).find(f => f.id === 'lrm-plazos')!.answer
    expect(t).toMatch(/prevé además una letra a dos años, una vez por mes: la última se licitó el/)
    expect(t).toContain('714 días')
    expect(t).toMatch(/En las \d+ licitaciones desde el .* no hubo ninguna a 60 días/)
    expect(t).not.toMatch(/no se licitó ninguna/)

    const inLatest = { ...withTwoYear, latest: [...LRM_BASELINE.latest, twoYear] }
    const l = buildLrmFaq(inLatest, null, []).find(f => f.id === 'lrm-plazos')!.answer
    expect(l).toMatch(/BCU prevé una letra a dos años/)
    expect(l).not.toMatch(/prevé además/)

    const sixty: LrmAuction = { ...twoYear, series: 'TEST-60', days: 61, termRef: 90 }
    const withSixty = { ...LRM_BASELINE, recent: [...LRM_BASELINE.recent, sixty] }
    const s = buildLrmFaq(withSixty, null, []).find(f => f.id === 'lrm-plazos')!.answer
    expect(s).toMatch(/A unos 60 días hubo una el .*, de 61 días/)

    const empty = buildLrmFaq({ ...LRM_BASELINE, recent: [] }, null, [])
    for (const f of empty) expect(f.answer, f.id).not.toMatch(/undefined|NaN|null|—|Infinity/)
  })

  it('plazos, BROU y garantía de depósitos', () => {
    expect(answer('lrm-plazos')).toMatch(/34, 83, 175 y 364 días/)
    expect(answer('lrm-brou')).toMatch(/2 1996 000/)
    expect(answer('lrm-segura')).toMatch(/NO constituyen un depósito/)
  })
})
