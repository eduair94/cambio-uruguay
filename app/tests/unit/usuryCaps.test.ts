import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { USURY_CAPS } from '~/utils/p2pLending'
import {
  consumoShortTermCap,
  mergeUsuryCaps,
  usuryCapOf,
  usuryGridKey,
  usuryPct,
} from '~/utils/usuryCaps'
import { BCU_CAPS, BCU_IN_FORCE_SINCE, BCU_PERIOD, type BcuCapRow } from '~/utils/cashAdvance'

// El 2026-09-03 el sitio publicaba DOS topes de usura a la vez y los dos decian "vigente":
// /ley-de-usura-uruguay mostraba 133,49 % leido del PDF del BCU esa manana, y /prestamos-p2p-uruguay
// mostraba 130,93 %, el trimestre anterior congelado en el codigo. Estos tests fijan la regla que
// lo arregla: el numero sale de la grilla viva, y lo que la grilla no trae se dice que es viejo.

const row = (over: Partial<BcuCapRow> = {}): BcuCapRow => ({
  bracket: 'menor10kUI',
  cortoPlazo: true,
  currency: 'UYU',
  media: 0.8612,
  tope: 1.3349,
  topeMora: 1.5502,
  ...over,
})

describe('mergeUsuryCaps', () => {
  it('reemplaza la fila publicada por la del BCU de hoy', () => {
    const merged = mergeUsuryCaps(USURY_CAPS, [row()])
    const chico = merged.find(r => r.grid === 'menor10kUI|corto|UYU')
    expect(chico?.capPct).toBeCloseTo(133.49, 2)
    expect(chico?.meanPct).toBeCloseTo(86.12, 2)
    expect(chico?.live).toBe(true)
  })

  it('deja la lectura vieja, marcada como tal, cuando la grilla no trae esa fila', () => {
    const merged = mergeUsuryCaps(USURY_CAPS, [row()])
    const descuento = merged.filter(r => !r.grid)
    expect(descuento.length).toBe(2)
    for (const r of descuento) expect(r.live).toBe(false)
  })

  it('sin grilla no cambia nada y nada queda marcado como vivo', () => {
    for (const live of [null, undefined, []]) {
      const merged = mergeUsuryCaps(USURY_CAPS, live)
      expect(merged.map(r => r.capPct)).toEqual(USURY_CAPS.map(r => r.capPct))
      expect(merged.some(r => r.live)).toBe(false)
    }
  })

  // La prueba aritmetica de la ley (tope = media x 1,55) se cumple igual en fraccion que en
  // porcentaje, asi que un error de unidad la pasa entera y llega a la pantalla como "8447 %".
  // Esta banda es lo unico que lo ataja.
  it('descarta una fila fuera de la banda de magnitud en vez de publicarla', () => {
    const merged = mergeUsuryCaps(USURY_CAPS, [row({ media: 86.12, tope: 133.49 })])
    const chico = merged.find(r => r.grid === 'menor10kUI|corto|UYU')
    expect(chico?.live).toBe(false)
    expect(chico?.capPct).toBeCloseTo(130.9285, 3)
  })

  it('cada fila de la grilla tiene una clave propia', () => {
    expect(usuryGridKey(row())).toBe('menor10kUI|corto|UYU')
    expect(usuryGridKey(row({ cortoPlazo: false }))).toBe('menor10kUI|largo|UYU')
    expect(usuryGridKey(row({ bracket: 'mayor10kUI' }))).toBe('mayor10kUI|corto|UYU')
    expect(usuryGridKey(row({ currency: 'USD' }))).toBe('menor10kUI|corto|USD')
  })
})

describe('usuryCapOf y usuryPct', () => {
  it('encuentra el tope de una fila y contesta null si no esta', () => {
    const merged = mergeUsuryCaps(USURY_CAPS, [row()])
    expect(usuryCapOf(merged, 'menor10kUI|corto|UYU')).toBeCloseTo(133.49, 2)
    expect(usuryCapOf([], 'menor10kUI|corto|UYU')).toBeNull()
  })

  it('imprime dos decimales con coma, como el BCU', () => {
    expect(usuryPct(133.4915)).toBe('133,49%')
    expect(usuryPct(66.3245)).toBe('66,32%')
  })
})

// 2026-11-22: /saldar-deudas-uruguay decia "topes vigentes: marzo-mayo 2026 ... sin descuento,
// tope 125,12 %" mientras el BCU publicaba 142,74 % vigente desde el 1/11. Leia el tope de
// /api/debt-relief, que lo saca de una busqueda mensual y no del PDF.
describe('consumoShortTermCap', () => {
  it('toma el tope de la grilla viva con la fecha desde la que rige', () => {
    const cap = consumoShortTermCap({
      periodo: 'julio–setiembre de 2026',
      vigenteDesde: '2026-11-01',
      rows: [
        row({ bracket: 'mayor10kUI', media: 0.3557, tope: 0.551335 }),
        row({ media: 0.9209, tope: 1.427395 }),
      ],
    })
    expect(cap.live).toBe(true)
    expect(cap.capPct).toBeCloseTo(142.74, 2)
    expect(cap.since).toBe('2026-11-01')
    expect(cap.periodo).toBe('julio–setiembre de 2026')
  })

  it('sin grilla publica la lectura fechada con SU fecha, nunca con la de hoy', () => {
    const base = BCU_CAPS.find(r => usuryGridKey(r) === 'menor10kUI|corto|UYU')!
    for (const grid of [null, undefined, { rows: [] }]) {
      const cap = consumoShortTermCap(grid)
      expect(cap.live).toBe(false)
      expect(cap.capPct).toBeCloseTo(base.tope * 100, 4)
      expect(cap.since).toBe(BCU_IN_FORCE_SINCE)
      expect(cap.periodo).toBe(BCU_PERIOD)
    }
  })

  it('una fila fuera de banda o sin fecha de vigencia no se publica como vigente', () => {
    expect(
      consumoShortTermCap({ vigenteDesde: '2026-11-01', rows: [row({ tope: 84.47 })] }).live
    ).toBe(false)
    expect(consumoShortTermCap({ rows: [row()] }).live).toBe(false)
  })
})

describe('ninguna pagina publica el tope de /api/debt-relief', () => {
  it('el campo usuryCaps de ese endpoint no se imprime', () => {
    const pagesDir = resolve(__dirname, '../../pages')
    const offenders = readdirSync(pagesDir, { recursive: true })
      .map(String)
      .filter(file => file.endsWith('.vue'))
      .filter(file => /\busuryCaps\s*(?:\[|\?\.)/.test(readFileSync(join(pagesDir, file), 'utf8')))
    expect(offenders).toEqual([])
  }, 60_000)
})
