// Toda fila que se rearma antes de coronar conserva la marca `frozen`.
//
// POR QUÉ ESTE TEST. La API marca las pizarras que llevan días sin cambiar (classes/frozen_marks.ts)
// y la regla de coronar (utils/marketOutlier.ts) les niega el primer puesto. Pero la regla sólo ve la
// marca si llega hasta ella, y muchas páginas copian la fila a un objeto propio antes de rankear:
// `{ origin: row.origin, buy: row.buy, sell: row.sell }`. Esa copia no falla, no avisa y vuelve a
// coronar la pizarra quieta. Pasó dos veces en el mismo cambio (2026-11-11): el "¿Dónde cambiar?" de
// la portada y /mejor-casa-de-cambio, que ningún otro test recorre porque el armado vive en la página.
//
// La regla de este archivo: en un archivo que corona, un objeto que copia `buy` y `sell` de otra
// fila (`x.buy`, `x.sell`) también copia `frozen` (o hace spread de la fila entera).

import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { callsTo, parseScript, walk } from './helpers/headScan'

const APP = join(__dirname, '..', '..')
const SCANNED = ['pages', 'components', 'layouts', 'composables', 'utils', 'server']

/** What crowns a price: the rule itself and every helper built on it. */
const CROWNING = [
  'offMarketSide',
  'crownable',
  'frozenAheadIn',
  'rankUsableQuotes',
  'rankExchanges',
  'bestDigestQuotes',
  'getExchangeRate',
  'marketAverageSavings',
  'compareInstitutionKinds',
  'buildRatesByOrigin',
  'buildUsdComparison',
  'buildCurrencyMarket',
  'currencyFactsFor',
]

/** Copies that do not feed a crown, each with the reason. */
const ALLOWED: Record<string, string> = {
  // The Argentine peso's quotes go through partitionArsQuotes (a band against the official rate),
  // not through the crowning rule; the dollar of the same page is read off the raw rows.
  'server/api/dolar-blue.get.ts': 'ARS quotes are judged by partitionArsQuotes',
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(?:vue|ts)$/.test(name) ? [full] : []
  })
}

/** `x.buy` / `x?.buy`: the `x` a value is read straight off, or null. */
function rowOf(
  node: ts.Expression | undefined,
  field: string,
  source: ts.SourceFile
): string | null {
  if (!node || !ts.isPropertyAccessExpression(node) || node.name.text !== field) return null
  return node.expression.getText(source)
}

const copies = SCANNED.flatMap(dir => sourceFiles(join(APP, dir))).flatMap(file => {
  const source = parseScript(file)
  if (!CROWNING.some(name => callsTo(source, name).length > 0)) return []
  const found: Array<{ file: string; line: number; carries: boolean }> = []
  walk(source, node => {
    if (!ts.isObjectLiteralExpression(node)) return
    const init = (field: string) =>
      node.properties.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === field
      )?.initializer
    // Both off the SAME row: `{ sell: sellers.sell, buy: buyers.buy }` is a summary, not a copy.
    const row = rowOf(init('buy'), 'buy', source)
    if (row === null || row !== rowOf(init('sell'), 'sell', source)) return
    const carries = node.properties.some(
      p =>
        ts.isSpreadAssignment(p) ||
        ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
          ts.isIdentifier(p.name) &&
          p.name.text === 'frozen')
    )
    found.push({
      file: relative(APP, file).split(sep).join('/'),
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      carries,
    })
  })
  return found
})

describe('la marca de pizarra quieta llega a la regla', () => {
  it('ninguna fila rearmada antes de coronar la pierde', () => {
    const offenders = copies
      .filter(copy => !copy.carries && !ALLOWED[copy.file])
      .map(copy => `${copy.file}:${copy.line}`)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('encuentra las copias que vigila (guarda de vacuidad)', () => {
    const files = new Set(copies.map(copy => copy.file))
    expect(files).toContain('pages/mejor-casa-de-cambio.vue')
    expect(files).toContain('components/WhereToChange.vue')
    expect(files).toContain('utils/casaIntents.ts')
  })

  it('cada excepción sigue existiendo', () => {
    const files = new Set(copies.map(copy => copy.file))
    for (const file of Object.keys(ALLOWED)) expect(files, file).toContain(file)
  })
})
