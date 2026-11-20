import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { addIva, removeIva } from '../../utils/calculators'
import { IVA_REGIMES, IVA_TASA_BASICA, IVA_TASA_MINIMA } from '../../utils/ivaTarjeta'
import {
  IVA_ADD_AMOUNTS,
  IVA_EXONERADOS,
  IVA_INTEREST_NOTE,
  IVA_MINIMA_ITEMS,
  IVA_REMOVE_AMOUNTS,
  IVA_TABLE_SOURCES,
  IVA_TABLE_VERIFIED_AT,
  ivaAddRows,
  ivaFactor,
  ivaLegalRef,
  ivaMoney,
  ivaPct,
  ivaRemoveRows,
  ivaShareOfGross,
  ivaVerifiedLabel,
  wrongStrip,
} from '../../utils/ivaTable'

const PAGE = readFileSync(
  resolve(__dirname, '../../pages/herramientas/calculadora-iva.vue'),
  'utf8'
)
const plain = (s: string) => s.replace(/\s/g, ' ')

describe('las tablas de la calculadora de IVA', () => {
  it('cada fila es lo que da la calculadora', () => {
    const add = ivaAddRows()
    expect(add).toHaveLength(IVA_ADD_AMOUNTS.length)
    add.forEach((row, i) => {
      const n = IVA_ADD_AMOUNTS[i]!
      const b = addIva(n, IVA_TASA_BASICA)
      const m = addIva(n, IVA_TASA_MINIMA)
      expect(row).toEqual({
        net: n,
        ivaBasica: b.iva,
        grossBasica: b.gross,
        ivaMinima: m.iva,
        grossMinima: m.gross,
      })
    })
    const rem = ivaRemoveRows()
    expect(rem).toHaveLength(IVA_REMOVE_AMOUNTS.length)
    rem.forEach((row, i) => {
      const n = IVA_REMOVE_AMOUNTS[i]!
      const b = removeIva(n, IVA_TASA_BASICA)
      const m = removeIva(n, IVA_TASA_MINIMA)
      expect(row).toEqual({
        gross: n,
        netBasica: b.net,
        ivaBasica: b.iva,
        netMinima: m.net,
        ivaMinima: m.iva,
      })
    })
  })

  it('las cuentas a mano coinciden', () => {
    const [r2300] = ivaAddRows([2300])
    expect([r2300!.ivaBasica, r2300!.grossBasica, r2300!.grossMinima]).toEqual([506, 2806, 2530])
    const [r1500] = ivaAddRows([1500])
    expect([r1500!.ivaBasica, r1500!.grossBasica, r1500!.grossMinima]).toEqual([330, 1830, 1650])
    const [r180] = ivaAddRows([180])
    expect([r180!.ivaBasica, r180!.grossBasica, r180!.grossMinima]).toEqual([39.6, 219.6, 198])
    const [q3000] = ivaRemoveRows([3000])
    expect([q3000!.netBasica, q3000!.ivaBasica, q3000!.netMinima]).toEqual([
      2459.02, 540.98, 2727.27,
    ])
    const [q250] = ivaRemoveRows([250])
    expect([q250!.netBasica, q250!.ivaBasica]).toEqual([204.92, 45.08])
  })

  it('el IVA es 18,03 % del precio final, y restarle el 22 % da mal', () => {
    expect(ivaShareOfGross(22)).toBeCloseTo(18.03, 2)
    expect(ivaShareOfGross(10)).toBeCloseTo(9.09, 2)
    expect(ivaPct(ivaShareOfGross(22))).toBe('18,03')
    expect(wrongStrip(1220, 22)).toBe(951.6)
    expect(wrongStrip(1220, 22)).not.toBe(removeIva(1220, 22).net)
    expect(removeIva(1220, 22).net).toBe(1000)
  })

  it('los montos se escriben como en Uruguay', () => {
    expect(plain(ivaMoney(2806))).toBe('$ 2.806')
    expect(plain(ivaMoney(39.6))).toBe('$ 39,60')
    expect(ivaVerifiedLabel()).toBe('20/11/2026')
    expect(IVA_TABLE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('las listas de montos van en orden y sin repetidos', () => {
    for (const list of [IVA_ADD_AMOUNTS, IVA_REMOVE_AMOUNTS]) {
      expect([...list].sort((a, b) => a - b)).toEqual([...list])
      expect(new Set(list).size).toBe(list.length)
    }
  })

  it('la tabla «más IVA» trae todo monto buscado con 3 impresiones o más', () => {
    // Search Console 2026-10-21..11-17, consultas de la página con un monto.
    const searched = [
      150, 180, 200, 250, 300, 400, 500, 550, 600, 700, 800, 900, 1000, 1200, 1300, 1500, 1600,
      1800, 2000, 2200, 2300, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 7000, 7500, 8000,
      9000, 10000, 12000, 15000, 18000, 20000, 25000, 30000, 35000, 40000, 60000, 100000,
    ]
    expect(searched).toHaveLength(44)
    for (const n of searched) expect(IVA_ADD_AMOUNTS).toContain(n)
  })

  it('cada fuente es oficial y cada renglón de las listas cita su literal', () => {
    for (const s of IVA_TABLE_SOURCES)
      expect(s.url).toMatch(/^https:\/\/www\.(impo\.com\.uy|gub\.uy)\//)
    for (const item of [...IVA_MINIMA_ITEMS, ...IVA_EXONERADOS]) {
      expect(item.ref.trim()).not.toBe('')
      expect(item.text.trim()).not.toBe('')
    }
    expect(ivaLegalRef('A')).toBe('Lit. A')
    expect(ivaLegalRef('E, F, I')).toBe('Lit. E, F, I')
    expect(ivaLegalRef('2-C')).toBe('Num. 2, lit. C')
    // Lo que espera al Poder Ejecutivo no se publica como exonerado.
    for (const item of IVA_EXONERADOS) expect(item.text).not.toMatch(/regirá cuando/i)
    // Ni como tasa mínima: el lit. J del art. 36 (seguros) «regirá cuando lo disponga el Poder
    // Ejecutivo».
    for (const item of IVA_MINIMA_ITEMS) expect(item.ref).not.toMatch(/\bJ\b/)
  })

  it('las listas conservan el calificativo de la ley', () => {
    const byRef = (ref: string) => IVA_MINIMA_ITEMS.find(i => i.ref === ref)!.text
    // Art. 36 lit. A y L: sólo fresca, congelada o enfriada; un fiambre paga la básica.
    expect(byRef('A')).toMatch(/carne y menudencias frescos, congelados o enfriados/)
    expect(byRef('L')).toMatch(/frescas, congeladas o enfriadas/)
    const exo = (ref: string) => IVA_EXONERADOS.find(i => i.ref === ref)!.text
    // Art. 38 num. 1 lit. F: la UHT y la saborizada pagan.
    expect(exo('1-F')).toMatch(/no la saborizada ni la UHT/)
    // Art. 38 num. 1 lit. B y art. 36 lit. I.
    expect(exo('1-B')).toMatch(/como parte de su actividad/)
    expect(exo('1-B')).toMatch(/terrenos sin mejoras/)
    // Art. 38 num. 2: la excepción es para personas FÍSICAS.
    expect(IVA_INTEREST_NOTE).toMatch(/personas físicas/)
  })

  it('los multiplicadores salen de la tasa', () => {
    expect(ivaFactor(22)).toBe('1,22')
    expect(ivaFactor(10)).toBe('1,10')
    expect(ivaFactor(IVA_TASA_BASICA)).toBe('1,22')
  })

  it('las rebajas con tarjeta que cita la página existen', () => {
    expect(IVA_REGIMES.find(x => x.id === 'general')?.points).toBeGreaterThan(0)
    expect(IVA_REGIMES.find(x => x.id === 'gastronomia')?.points).toBeGreaterThan(0)
  })
})

describe('la página', () => {
  it('pone las tablas en el HTML del servidor, debajo de la calculadora', () => {
    expect(PAGE).toContain('content-layout="below"')
    expect(PAGE).toContain('data-testid="iva-tabla-sumar"')
    expect(PAGE).toContain('data-testid="iva-tabla-quitar"')
    expect(PAGE).toMatch(/v-for="row in addRows"/)
    expect(PAGE).toMatch(/v-for="row in removeRows"/)
    expect(PAGE).toMatch(/const addRows = ivaAddRows\(\)/)
    expect(PAGE).toMatch(/const removeRows = ivaRemoveRows\(\)/)
    expect(PAGE).not.toContain('<ClientOnly')
  })

  it('el título y la descripción siguen saliendo de toolSnippetIva()', () => {
    expect(PAGE).toContain(':seo-title="snippet.title"')
    expect(PAGE).toContain(':seo-description="snippet.description"')
    expect(PAGE).toContain('const snippet = toolSnippetIva()')
  })

  it('no hay montos escritos a mano en el texto', () => {
    const template = PAGE.slice(0, PAGE.indexOf('<script'))
    // Un «$ 1.830» literal en la plantilla es una cifra que nadie ata a la calculadora.
    expect(template).not.toMatch(/\$(&nbsp;|\s)?\d/)
    // Ni los multiplicadores: salen de `ivaFactor`.
    expect(template).not.toMatch(/1,22|1,10/)
  })

  it('la respuesta de «¿Qué no paga IVA?» sale de la lista del cuerpo', () => {
    expect(PAGE).toMatch(/IVA_EXONERADOS\.map\(i => i\.text\)/)
    expect(PAGE).toMatch(/a: exoneradosFaq/)
  })

  it('las tablas que se desplazan tienen foco y nombre', () => {
    const regions = PAGE.match(/<div[^>]*class="table-scroll[^"]*"[^>]*>/g) ?? []
    expect(regions).toHaveLength(2)
    for (const r of regions) {
      expect(r).toContain('tabindex="0"')
      expect(r).toContain('role="region"')
      expect(r).toMatch(/aria-label="[^"]+"/)
    }
    // VTable con fixed-header se desplaza por dentro, en un área sin foco.
    expect(PAGE).not.toMatch(/fixed-header/)
    expect(PAGE).toMatch(/:deep\(\.v-table__wrapper\)\s*\{\s*overflow: visible/)
  })

  it('la grilla del texto no corta a 320 px', () => {
    expect(PAGE).toContain('class="tool-article-grid iva-article-grid"')
    expect(PAGE).toMatch(/minmax\(min\(280px, 100%\), 1fr\)/)
  })
})
