import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { BcuCapRow } from '../../utils/cashAdvance'
import {
  BCU_CAPS_COMUNICACION,
  BCU_CAPS_IN_FORCE_SINCE,
  BCU_CAPS_PERIOD,
  BCU_CAPS_READ_ON,
  BCU_CAPS_SOURCE_URL,
  CLEARING_CLOSED,
  CLEARING_LENDERS,
  CLEARING_REVIEWED,
  NOPAYSLIP_CAPS,
  NOPAYSLIP_DOORS,
  NOPAYSLIP_LOANS_REVIEWED,
  PAYSLIP_LABELS,
  SOLO_CEDULA_LABELS,
  SOLO_CEDULA_LENDERS,
  SOLO_CEDULA_REVIEWED,
  USURY_EXCLUDED_COSTS,
  buildNoPayslipFaq,
  clearingRatesSentence,
  isoDateEs,
  joinEs,
  mergeNoPayslipCaps,
  noPayslipLenders,
  pctEs,
  teaLabelOf,
  teaSpread,
} from '../../utils/loanNoPayslip'
import { LENDER_TIERLIST, type LenderEntity } from '../../utils/loanTierlist'

const byId = (id: string): LenderEntity => {
  const l = LENDER_TIERLIST.find(x => x.id === id)
  if (!l) throw new Error(`missing lender ${id}`)
  return l
}

/** Ids que la propia página leyó como "presta sin comprobante de ingresos". */
const readWithoutPayslip = new Set([
  ...SOLO_CEDULA_LENDERS.filter(l => l.soloCedula !== 'no').map(l => l.lenderId),
  ...CLEARING_LENDERS.filter(l => l.recibo === 'no-pide').map(l => l.lenderId),
])

describe('noPayslipLenders', () => {
  const rows = noPayslipLenders(LENDER_TIERLIST)

  it('keeps lenders that serve independents, take collateral or were read lending without proof', () => {
    for (const r of rows) {
      const l = byId(r.id)
      expect(
        l.audiences.includes('independiente') ||
          l.segment === 'prendario' ||
          readWithoutPayslip.has(r.id),
        r.id
      ).toBe(true)
    }
    const ids = rows.map(r => r.id)
    expect(ids).toContain('brou')
    expect(ids).toContain('oca')
    expect(ids).toContain('pronto')
    // Itaú only lends to employees: it must not appear on a page for people without a payslip.
    expect(ids).not.toContain('itau')
  })

  it('orders by representative TEA, lenders without a published rate last', () => {
    const rated = rows.filter(r => r.teaSort != null)
    for (let i = 1; i < rated.length; i++) {
      expect(rated[i]!.teaSort!).toBeGreaterThanOrEqual(rated[i - 1]!.teaSort!)
    }
    const firstUnrated = rows.findIndex(r => r.teaSort == null)
    if (firstUnrated !== -1) {
      expect(rows.slice(firstUnrated).every(r => r.teaSort == null)).toBe(true)
    }
  })

  it('treats a 0 % promotional rate as unrated', () => {
    const fake = { ...byId('brou'), id: 'promo', teaPct: 0, teaMaxPct: null } as LenderEntity
    expect(noPayslipLenders([fake])[0]!.teaSort).toBeNull()
  })

  // El snapshot semanal del 2026-11-08 les sacó 'independiente' a Pronto! y a Creditel, y la tabla
  // principal los perdió mientras la sección de abajo decía que prestan con la cédula sola.
  it('keeps Pronto! and Creditel when the weekly refresh retags their audiences', () => {
    const retagged = LENDER_TIERLIST.map(l =>
      l.id === 'pronto' || l.id === 'creditel'
        ? ({ ...l, audiences: ['dependiente', 'jubilado'] } as LenderEntity)
        : l
    )
    const ids = noPayslipLenders(retagged).map(r => r.id)
    expect(ids).toContain('pronto')
    expect(ids).toContain('creditel')
    // Piden recibo: estar en la tabla del clearing no las hace "sin recibo".
    expect(ids).not.toContain('itau')
    expect(ids).not.toContain('cash')
    expect(ids).not.toContain('anda')
  })
})

describe('joinEs', () => {
  it('joins names the Spanish way', () => {
    expect(joinEs([])).toBe('')
    expect(joinEs(['A'])).toBe('A')
    expect(joinEs(['A', 'B'])).toBe('A y B')
    expect(joinEs(['A', 'B', 'C'])).toBe('A, B y C')
  })
})

describe('CLEARING_LENDERS: estando en el clearing, con recibo y sin recibo', () => {
  it('every row is dated, sourced and tied to a catalogue lender that lends with marks', () => {
    expect(CLEARING_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Set(CLEARING_LENDERS.map(l => l.name)).size).toBe(CLEARING_LENDERS.length)
    for (const l of CLEARING_LENDERS) {
      expect(l.sourceUrl).toMatch(/^https:\/\//)
      expect(PAYSLIP_LABELS[l.recibo]).toBeTruthy()
      for (const text of [l.dice, l.pide, l.tasa, l.montos]) {
        expect(text.length).toBeGreaterThan(10)
        expect(text).not.toMatch(/septiembre/i)
      }
      if (l.lenderId) {
        expect(['si', 'parcial'], l.name).toContain(byId(l.lenderId).clearing)
      }
    }
  })

  it('splits by payslip: ANDA and Cash ask for it, Pronto! and Volvé do not', () => {
    const ids = (s: string) =>
      CLEARING_LENDERS.filter(l => l.recibo === s)
        .map(l => l.lenderId)
        .sort()
    expect(ids('pide')).toEqual(['anda', 'cash'])
    expect(ids('no-pide')).toEqual(['pronto', 'volve'])
  })

  it('quotes what each lender says about the clearing', () => {
    const anda = CLEARING_LENDERS.find(l => l.lenderId === 'anda')!
    expect(anda.dice).toMatch(/estando en el Clearing de Informes/)
    expect(anda.dice).toMatch(/garantía/)
    expect(anda.tasa).toMatch(/26,30 %/)
    expect(anda.tasa).toMatch(/Noviembre de 2026/)
    const cash = CLEARING_LENDERS.find(l => l.lenderId === 'cash')!
    expect(cash.dice).toMatch(/no es excluyente/)
    expect(cash.tasa).toMatch(/54,1 % a 141,7 %/)
    const volve = CLEARING_LENDERS.find(l => l.lenderId === 'volve')!
    expect(volve.dice).toMatch(/sin importar si estás en el Clearing/)
    expect(volve.tasa).toMatch(/112 % y 141,74 %/)
  })

  it('names who requires a clean record, with their own words', () => {
    expect(CLEARING_CLOSED.map(c => c.name)).toEqual(['OCA', 'BROU', 'República Microfinanzas'])
    for (const c of CLEARING_CLOSED) {
      expect(c.sourceUrl).toMatch(/^https:\/\//)
      expect(c.quote.length).toBeGreaterThan(20)
    }
  })
})

describe('teaLabelOf', () => {
  it('formats ranges, single rates, ceilings and gaps in Uruguayan notation', () => {
    expect(teaLabelOf(26, 31)).toBe('26–31 %')
    expect(teaLabelOf(49, 123.43)).toBe('49–123,43 %')
    expect(teaLabelOf(36.8, null)).toBe('36,8 %')
    expect(teaLabelOf(null, 129.92)).toBe('hasta 129,92 %')
    expect(teaLabelOf(null, null)).toBe('No la publica')
    expect(teaLabelOf(31, 31)).toBe('31 %')
  })

  it('pctEs uses a comma', () => {
    expect(pctEs(130.93)).toBe('130,93 %')
  })
})

describe('teaSpread', () => {
  it('spans the lowest "desde" to the highest ceiling of the listed lenders', () => {
    const rows = noPayslipLenders(LENDER_TIERLIST)
    const spread = teaSpread(LENDER_TIERLIST, rows)
    expect(spread.min).not.toBeNull()
    expect(spread.max!).toBeGreaterThan(spread.min!)
    expect(spread.min!).toBeLessThanOrEqual(byId('brou').teaPct!)
    expect(spread.withRate).toBeGreaterThan(0)
  })
})

describe('the doors quote what the catalogue says', () => {
  it('every quote names a real lender and an https source', () => {
    for (const door of NOPAYSLIP_DOORS) {
      for (const q of door.quotes) {
        expect(() => byId(q.lenderId)).not.toThrow()
        expect(q.sourceUrl).toMatch(/^https:\/\//)
      }
    }
    expect(new Set(NOPAYSLIP_DOORS.map(d => d.id)).size).toBe(NOPAYSLIP_DOORS.length)
  })

  it('a quote that says "clean Clearing" must match the lender stance in the ranking', () => {
    // If the weekly refresh flips OCA or BROU to lending with marks, these quotes are stale and
    // have to be re-read against the source, not edited.
    expect(byId('oca').clearing).toBe('no')
    expect(byId('brou').clearing).toBe('no')
  })

  it('the "sólo con la cédula" door now quotes Creditel with its three-bills alternative', () => {
    const door = NOPAYSLIP_DOORS.find(d => d.id === 'solo-cedula')!
    const creditel = door.quotes.find(q => q.lenderId === 'creditel')!
    expect(creditel.text).toMatch(/tres facturas/)
    // La fecha impresa en la cita es la de la relectura de las puertas: no pueden separarse.
    expect(NOPAYSLIP_LOANS_REVIEWED).toBe('2026-11-20')
    expect(creditel.text).toMatch(/20 de noviembre de 2026/)
  })
})

describe('buildNoPayslipFaq', () => {
  const rows = noPayslipLenders(LENDER_TIERLIST)
  const spread = teaSpread(LENDER_TIERLIST, rows)
  const faq = buildNoPayslipFaq({
    rows,
    spread,
    capLabel: '99,99%',
    capSince: '1 de enero de 2030',
    clearingReviewedLabel: '2 de febrero de 2030',
  })

  it('answers "en el clearing con recibo" and "sin recibo" from the clearing table', () => {
    const con = faq.find(f => f.id === 'clearing-con-recibo')!
    const sin = faq.find(f => f.id === 'clearing-sin-recibo')!
    expect(con.question).toBe('¿Quién presta estando en el clearing y con recibo de sueldo?')
    expect(sin.question).toBe('¿Y estando en el clearing y sin recibo de sueldo?')
    expect(con.answer).toMatch(/ANDA y Cash/)
    expect(con.answer).toMatch(/Las dos resuelven caso a caso/)
    expect(con.answer).toContain('2 de febrero de 2030')
    expect(sin.answer).toMatch(/Pronto! y Volvé/)
    expect(sin.answer).toContain('99,99%')
    expect(sin.answer).toMatch(/empeño/)
    const clearing = faq.find(f => f.id === 'clearing')!
    // ANDA y Cash no están en "esta lista" (piden recibo): la respuesta no puede contarlas en el N.
    expect(clearing.answer).toMatch(/lo dicen sin pedir recibo son Pronto! y Volvé/)
    expect(clearing.answer).toMatch(
      /Fuera de esta lista, porque piden recibo de sueldo, también lo dicen ANDA y Cash/
    )
    const ids = new Set(rows.map(r => r.id))
    expect(ids.has('anda') || ids.has('cash')).toBe(false)
    // Las tasas salen de las filas, sin comparativos que ninguna fuente sostiene.
    expect(sin.answer).not.toMatch(/más cara|cerca del tope/)
    expect(sin.answer).toContain('Volvé publica de 112 % a 141,74 % + IVA')
    expect(sin.answer).toContain('Cash publica de 54,1 % a 141,7 % + IVA')
    expect(clearing.link).toEqual({ label: 'Cómo salir del clearing', to: '/salir-del-clearing' })
  })

  it('no longer says Pronto! is the only one that lends with marks', () => {
    const text = faq.map(f => f.answer).join(' ')
    expect(text).not.toMatch(/la única/)
    expect(text).not.toMatch(/sólo Pronto! dice/)
    const solo = faq.find(f => f.id === 'solo-cedula')!
    expect(solo.answer).toMatch(/con recibo también lo dicen ANDA y Cash/)
  })

  it('takes the usury cap by parameter and never hand-types one', () => {
    const text = faq.map(f => f.answer).join(' ')
    expect(text).toContain('99,99%')
    expect(text).toContain('1 de enero de 2030')
    expect(text).not.toMatch(/130,93|133,49|63,58|84,47/)
  })

  it('counts lenders from the data', () => {
    const clearing = faq.find(f => f.id === 'clearing')!
    const withClearing = rows.filter(r => r.clearing === 'si').length
    expect(clearing.answer).toContain(`${withClearing} de las ${rows.length}`)
  })

  it('has unique ids and non-empty answers', () => {
    expect(new Set(faq.map(f => f.id)).size).toBe(faq.length)
    for (const f of faq) expect(f.answer.length).toBeGreaterThan(60)
  })

  it('names the literal search phrase and separates "sin comprobante" from "sin clearing"', () => {
    const q = faq.find(f => f.id === 'solo-cedula')!
    expect(q.question.toLowerCase()).toContain('préstamos solo con cédula')
    expect(q.answer).toMatch(/OCA y Pronto!/)
    expect(q.answer).toMatch(/no sin mirar el clearing/)
    expect(q.answer).not.toMatch(/septiembre/)
  })

  it('dates the "solo con cédula" answer from the rows it cites, not a hand-typed day', () => {
    const q = faq.find(f => f.id === 'solo-cedula')!
    const reads = SOLO_CEDULA_LENDERS.filter(l => l.soloCedula === 'si').map(
      l => l.readOn ?? SOLO_CEDULA_REVIEWED
    )
    for (const iso of reads) expect(q.answer).toContain(isoDateEs(iso))
    expect(q.answer).not.toMatch(/22 de setiembre de 2026/)
  })
})

describe('the clearing table and the main table agree', () => {
  const rows = noPayslipLenders(LENDER_TIERLIST)
  const rowOf = (id: string) => rows.find(r => r.id === id)

  it('a clearing row that publishes a TEA never sits next to "No la publica", and the reverse', () => {
    for (const c of CLEARING_LENDERS) {
      const main = c.lenderId ? rowOf(c.lenderId) : undefined
      if (!main) continue
      if (c.teaRange) expect(main.teaLabel, c.name).not.toBe('No la publica')
      if (c.tasa.startsWith('No publica una tasa')) expect(main.teaLabel, c.name).not.toMatch(/\d/)
    }
  })

  it('Volvé gets its read range when the catalogue has none; a catalogue rate still wins', () => {
    expect(byId('volve').teaPct).toBeNull()
    expect(rowOf('volve')!.teaLabel).toBe('112–141,74 %')
    const priced = LENDER_TIERLIST.map(l =>
      l.id === 'volve' ? ({ ...l, teaPct: 90, teaMaxPct: 100 } as LenderEntity) : l
    )
    expect(noPayslipLenders(priced).find(r => r.id === 'volve')!.teaLabel).toBe('90–100 %')
  })

  it('Pago Después: the BCU cap it prints is not labelled as its own rate', () => {
    const patched = LENDER_TIERLIST.map(l =>
      l.id === 'pago-despues' ? ({ ...l, teaMaxPct: 126 } as LenderEntity) : l
    )
    const r = noPayslipLenders(patched)
    expect(r.find(x => x.id === 'pago-despues')!.teaLabel).toBe('Imprime el tope del BCU')
    expect(r.find(x => x.id === 'pago-despues')!.teaSort).toBeNull()
    expect(teaSpread(patched, r).max).not.toBe(126)
  })

  it('every teaRange is the one its own text prints', () => {
    for (const c of CLEARING_LENDERS) {
      if (!c.teaRange) continue
      for (const n of c.teaRange) expect(c.tasa, c.name).toContain(n.toLocaleString('es-UY'))
    }
  })

  it('builds the rates sentence from the rows and the live cap', () => {
    const s = clearingRatesSentence('77,7 %')
    expect(s).toBe(
      'sin recibo, Pronto! imprime como máximo el tope del BCU (77,7 % en pesos, menos de 10.000 UI y hasta un año) y Volvé publica de 112 % a 141,74 % + IVA; con recibo, ANDA publica de 26,3 % a 31,5 % + IVA y Cash publica de 54,1 % a 141,7 % + IVA.'
    )
  })
})

describe('isoDateEs', () => {
  it('formats an ISO day the Uruguayan way', () => {
    expect(isoDateEs('2026-11-20')).toBe('20 de noviembre de 2026')
    expect(isoDateEs('2026-09-01T03:00:00Z')).toBe('1 de setiembre de 2026')
    expect(isoDateEs('no-date')).toBe('no-date')
  })
})

// ── "Sólo con cédula" + topes vigentes (leídos el 2026-09-22) ────────────────────────────────

describe('SOLO_CEDULA_LENDERS: sin comprobante no es sin clearing', () => {
  it('cada fila está fechada, con fuente https y un id del ranking cuando existe', () => {
    expect(SOLO_CEDULA_REVIEWED).toMatch(/^2026-09-\d\d$/)
    for (const l of SOLO_CEDULA_LENDERS) {
      expect(l.sourceUrl).toMatch(/^https:\/\//)
      if (l.lenderId) expect(() => byId(l.lenderId!)).not.toThrow()
      expect(SOLO_CEDULA_LABELS[l.soloCedula]).toBeTruthy()
      for (const text of [l.pide, l.clearing, l.tasa, l.montos]) {
        expect(text.length).toBeGreaterThan(10)
        expect(text).not.toMatch(/septiembre/i)
      }
    }
    expect(new Set(SOLO_CEDULA_LENDERS.map(l => l.name)).size).toBe(SOLO_CEDULA_LENDERS.length)
  })

  it('sólo OCA y Pronto! anuncian la cédula sola; Creditel pide otro papel', () => {
    const si = SOLO_CEDULA_LENDERS.filter(l => l.soloCedula === 'si').map(l => l.lenderId)
    expect(si.sort()).toEqual(['oca', 'pronto'])
    expect(SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'creditel')!.soloCedula).toBe('parcial')
  })

  it('las que exigen clearing limpio lo dicen en su fila, con la corrección de Compra Ágil', () => {
    const oca = SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'oca')!
    expect(oca.clearing).toMatch(/no figurar actualmente en el clearing/)
    // Relectura del 2026-11-20: la web dice 32 % a 78 % y el ejemplo cambió a TEA 42 %. Las
    // cifras de la cartilla del 15/9 (62 %, 86 %) ya no rigen y no pueden volver sueltas.
    expect(oca.readOn).toBe('2026-11-20')
    expect(oca.tasa).toMatch(/32 % y 78 %/)
    expect(oca.tasa).toMatch(/12\.936/)
    expect(oca.tasa).not.toMatch(/62 %|86 %|87 %/)
    expect(oca.tasa).toMatch(/40 UI/)
    expect(oca.tasa).toMatch(/80 UI/)
    expect(oca.tasa).toMatch(/0,25 %/)
    const cdlc = SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'credito-de-la-casa')!
    expect(cdlc.soloCedula).toBe('no')
    expect(cdlc.pide).toMatch(/23 a 84 años/)
    expect(cdlc.clearing).toMatch(/Infocred o Clearing/)
    expect(cdlc.clearing).toMatch(/MOCASIST/)
    const rmf = SOLO_CEDULA_LENDERS.find(l => /Microfinanzas/.test(l.name))!
    expect(rmf.soloCedula).toBe('no')
    expect(rmf.clearing).toMatch(/Sin morosidad vigente en Clearing/)
    const pronto = SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'pronto')!
    expect(pronto.clearing).toMatch(/estando en el clearing/)
    expect(pronto.clearing).not.toMatch(/la única/)
    expect(pronto.tasa).toMatch(/142,7395 %/)
    expect(pronto.tasa).not.toMatch(/133,4860/)
    const anda = SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'anda')!
    expect(anda.clearing).toMatch(/estando en el Clearing de Informes/)
    expect(anda.tasa).toMatch(/Noviembre de 2026/)
  })

  it('una fila releída lleva su fecha, posterior a la lectura global', () => {
    for (const l of SOLO_CEDULA_LENDERS) {
      if (!l.readOn) continue
      expect(l.readOn, l.name).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(l.readOn > SOLO_CEDULA_REVIEWED, l.name).toBe(true)
    }
  })

  it('la postura del ranking y la de la tabla no se contradicen', () => {
    for (const l of SOLO_CEDULA_LENDERS) {
      if (!l.lenderId) continue
      const stance = byId(l.lenderId).clearing
      if (/exige|no figurar|sin incumplimientos|sin morosidad/i.test(l.clearing)) {
        expect(stance, l.name).toBe('no')
      }
    }
  })
})

describe('NOPAYSLIP_CAPS: la tabla del BCU cierra con la Ley 18.212', () => {
  it('período y vigencia fechados, sin "septiembre"', () => {
    expect(BCU_CAPS_PERIOD).toBe('julio–setiembre de 2026')
    expect(BCU_CAPS_IN_FORCE_SINCE).toBe('2026-11-01')
  })

  // El PDF de la URL fija se pisa todos los meses (el 31/10/2026 ya traía la tabla del 1/11): una
  // cifra fechada sólo la respalda la comunicación que la publicó, que no cambia de dirección.
  it('cita la comunicación de esa tabla, no el PDF que se pisa cada mes, y fecha su lectura', () => {
    expect(BCU_CAPS_SOURCE_URL).toBe('https://www.bcu.gub.uy/Comunicados/seggco26212.pdf')
    // El número que imprime el pie sale de la misma constante que la URL: no pueden separarse.
    expect(BCU_CAPS_SOURCE_URL).toContain(
      `seggco${BCU_CAPS_COMUNICACION.replace(/^20(\d\d)\//, '$1')}.pdf`
    )
    expect(BCU_CAPS_READ_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(BCU_CAPS_READ_ON >= BCU_CAPS_IN_FORCE_SINCE).toBe(true)
  })

  // Las celdas de la Comunicación 2026/212 (22/10/2026) tal como las imprime, para que una edición
  // futura no mezcle dos vigencias bajo una sola fecha.
  it('trae las celdas de la tabla vigente desde el 1/11/2026', () => {
    const cap = (id: string) => NOPAYSLIP_CAPS.find(r => r.id === id)!
    expect(cap('sin-descuento-chico-corto').capPct).toBe(142.7395)
    expect(cap('sin-descuento-grande-largo').moraPct).toBe(93.132)
    expect(cap('con-descuento-chico-corto').capPct).toBe(31.465)
    expect(cap('retencion-chico-corto').capPct).toBe(26.39)
    expect(cap('retencion-chico-largo').capPct).toBe(31.55)
    expect(cap('nomina-chico-corto').capPct).toBe(24.36)
    expect(cap('nomina-chico-largo').capPct).toBe(29.12)
    expect(cap('usd-consumo-largo').capPct).toBe(17.7785)
  })

  it('tope = media × 1,55 / 1,30 / 1,20 y mora = media × 1,80 según la fila', () => {
    for (const row of NOPAYSLIP_CAPS) {
      const factor = /retención de haberes/.test(row.segment)
        ? 1.3
        : /nómina/.test(row.segment)
          ? 1.2
          : 1.55
      expect(row.capPct, row.id).toBeCloseTo(row.meanPct * factor, 1)
      if (row.moraPct != null) expect(row.moraPct, row.id).toBeCloseTo(row.meanPct * 1.8, 1)
    }
  })

  it('en dólares hay una sola categoría de consumo, sin tramo de UI', () => {
    const usd = NOPAYSLIP_CAPS.filter(r => r.currency === 'USD')
    expect(usd).toHaveLength(2)
    for (const r of usd) {
      expect(r.segment).toMatch(/única categoría/)
      expect(r.segment).not.toMatch(/10\.000 UI/)
    }
  })

  // /api/bcu-rates trae las filas en dólares sin parsearlas: el 2026-11-19 servía 8,26 % / 12,26 %
  // contra 7,27 % / 11,47 % de la Comunicación 2026/212, y la grilla pisaba la lectura buena.
  it('una fila viva en dólares no reemplaza la lectura de la comunicación', () => {
    const live = [
      {
        bracket: 'menor10kUI',
        cortoPlazo: true,
        currency: 'USD',
        media: 0.0826,
        tope: 0.12803,
        topeMora: 0.14868,
      },
    ] as BcuCapRow[]
    const row = mergeNoPayslipCaps(NOPAYSLIP_CAPS, live).find(r => r.id === 'usd-consumo-corto')!
    expect(row.live).toBe(false)
    expect(row.capPct).toBe(11.2685)
    expect(NOPAYSLIP_CAPS.filter(r => r.currency === 'USD').every(r => !r.grid)).toBe(true)
  })

  it('las cuatro filas de consumo en pesos se refrescan con la grilla viva; las otras quedan fechadas', () => {
    const live = [
      {
        bracket: 'menor10kUI',
        cortoPlazo: true,
        currency: 'UYU',
        media: 0.9,
        tope: 1.395,
        topeMora: 1.62,
      },
    ] as BcuCapRow[]
    const merged = mergeNoPayslipCaps(NOPAYSLIP_CAPS, live)
    const fresh = merged.find(r => r.id === 'sin-descuento-chico-corto')!
    expect(fresh.live).toBe(true)
    expect(fresh.meanPct).toBeCloseTo(90, 6)
    expect(fresh.capPct).toBeCloseTo(139.5, 6)
    expect(fresh.moraPct).toBeCloseTo(162, 6)
    const manual = merged.find(r => r.id === 'retencion-chico-corto')!
    expect(manual.live).toBe(false)
    expect(manual.capPct).toBe(26.39)
    expect(NOPAYSLIP_CAPS.filter(r => r.grid).length).toBe(4)
  })

  it('una fila viva con error de unidad no reemplaza la lectura del PDF', () => {
    const bad = [
      {
        bracket: 'menor10kUI',
        cortoPlazo: true,
        currency: 'UYU',
        media: 86.12,
        tope: 133.486,
        topeMora: 155,
      },
    ] as BcuCapRow[]
    const merged = mergeNoPayslipCaps(NOPAYSLIP_CAPS, bad)
    const row = merged.find(r => r.id === 'sin-descuento-chico-corto')!
    expect(row.live).toBe(false)
    expect(row.capPct).toBe(142.7395)
  })

  it('sin grilla viva devuelve la lectura fechada entera', () => {
    const merged = mergeNoPayslipCaps(NOPAYSLIP_CAPS, null)
    expect(merged).toHaveLength(NOPAYSLIP_CAPS.length)
    expect(merged.every(r => r.live === false)).toBe(true)
  })
})

describe('gastos excluidos del cálculo de usura (art. 14)', () => {
  it('trae el literal D de 120 UI, que es el del préstamo sin retención, y no sólo los 30 UI', () => {
    const d = USURY_EXCLUDED_COSTS.find(c => c.id === 'd')!
    expect(d.text).toMatch(/120 UI/)
    expect(d.text).toMatch(/40 UI/)
    expect(d.text).toMatch(/8 UI/)
    expect(d.text).toMatch(/60 días/)
    const b = USURY_EXCLUDED_COSTS.find(c => c.id === 'b')!
    expect(b.text).toMatch(/30 UI/)
    expect(b.text).toMatch(/retención de sueldo o débito automático/)
  })
})

describe('la página lee la tabla y los topes del util, no a mano', () => {
  const page = readFileSync(
    join(__dirname, '..', '..', 'pages', 'prestamo-sin-recibo-de-sueldo-uruguay.vue'),
    'utf8'
  )

  it('monta la sección "Sólo con cédula" con la tabla y los topes, sin cifras sueltas', () => {
    expect(page).toContain('Sólo con cédula: quién presta y a qué tasa')
    expect(page).toContain('SOLO_CEDULA_LENDERS')
    expect(page).toContain('mergeNoPayslipCaps(NOPAYSLIP_CAPS')
    expect(page).toContain('BCU_CAPS_SOURCE_URL')
    expect(page).not.toMatch(/septiembre/)
    // La corrección del BROU viaja con la frase, no suelta: sin comisión de concesión ni seguro,
    // PERO con comisión por cancelación anticipada.
    expect(page).toMatch(
      /No cobra comisión de concesión ni seguro[\s\S]{0,200}cancelación anticipada/
    )
    // Y el BCU republica mensualmente, no "cada trimestre".
    expect(page).not.toMatch(/cada trimestre/)
  })

  it('monta la tabla del clearing y deja las respuestas del FAQ en el HTML del servidor', () => {
    expect(page).toContain('id="clearing"')
    expect(page).toContain('CLEARING_LENDERS')
    expect(page).toContain('CLEARING_CLOSED')
    expect(page).toContain("hash: '#con-clearing'")
    expect(page).toContain('/prestamos-para-jubilados-uruguay')
    expect(page).toMatch(/<FaqSection[^>]* expanded\s*\/>/)
    expect(page).not.toMatch(/la única que dice/)
    expect(page).not.toMatch(/no publicó fechas de la edición 2026/)
    expect(page).not.toMatch(/UI de agosto de 2026/)
    // La tasa del BROU para pasivos y su fecha salen de retireeLoans.ts, no a mano.
    expect(page).toContain('BROU_RATES_IN_FORCE_SINCE')
    expect(page).not.toMatch(/1 de setiembre de 2026/)
  })
})
