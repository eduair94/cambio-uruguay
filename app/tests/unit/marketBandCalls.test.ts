// Toda llamada a la regla de "fuera de mercado" dice de qué moneda se trata.
//
// POR QUÉ ESTE TEST. La banda depende de la moneda (utils/marketOutlier.ts: 3 % para el dólar,
// 12 % para el real, ×2 para el peso argentino). Una llamada sin moneda no falla: cae en la banda
// del dólar, que es exactamente el defecto que se arregló el 2026-11-11 (/cotizacion/real decía
// "se vende desde $8,45" con cuatro casas vivas a 8,00–8,10). Y en el app nada lo atraparía: los
// tests no compilan tipos y `npm run typecheck` no corre (AGENTS.md).

import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { callsTo, parseScript } from './helpers/headScan'

const APP = join(__dirname, '..', '..')
const SCANNED = ['pages', 'components', 'layouts', 'composables', 'utils', 'server']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(?:vue|ts)$/.test(name) ? [full] : []
  })
}

/** Function → how many arguments a call must pass for the currency to be among them. */
const REQUIRED_ARGS: Record<string, number> = {
  offMarketSide: 3,
  crownable: 4,
  rankUsableQuotes: 2,
  compareInstitutionKinds: 2,
  bestDigestQuotes: 2,
}

const calls = SCANNED.flatMap(dir => sourceFiles(join(APP, dir))).flatMap(file => {
  const source = parseScript(file)
  return Object.keys(REQUIRED_ARGS).flatMap(name =>
    callsTo(source, name).map(call => ({
      file: relative(APP, file).split(sep).join('/'),
      name,
      args: call.arguments.length,
      line: source.getLineAndCharacterOfPosition(call.getStart(source)).line + 1,
    }))
  )
})

describe('la regla de fuera de mercado siempre sabe la moneda', () => {
  it('ninguna llamada omite la moneda', () => {
    const offenders = calls
      .filter(call => call.args < REQUIRED_ARGS[call.name]!)
      .map(call => `${call.file}:${call.line} ${call.name}(${call.args} args)`)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('encuentra las llamadas que vigila', () => {
    expect(calls.filter(call => call.name === 'offMarketSide').length).toBeGreaterThan(10)
    expect(calls.filter(call => call.name === 'rankUsableQuotes').length).toBeGreaterThanOrEqual(4)
  })
})
