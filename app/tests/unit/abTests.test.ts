import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  AB_STORAGE_KEY,
  AB_TESTS,
  abActive,
  abArm,
  abAssignments,
  abHash,
  abProperties,
} from '../../utils/abTests'

// El script del <head> reparte los brazos antes de pintar; esto corre ESE string (el que viaja en
// el HTML) y exige que asigne exactamente lo que dice utils/abTests.ts.

const CONFIG = readFileSync(join(__dirname, '..', '..', 'nuxt.config.ts'), 'utf8')

function abScript(): string {
  const file = ts.createSourceFile('nuxt.config.ts', CONFIG, ts.ScriptTarget.ES2022, true)
  let init: ts.Expression | undefined
  file.forEachChild(node => {
    if (!ts.isVariableStatement(node)) return
    for (const decl of node.declarationList.declarations)
      if (ts.isIdentifier(decl.name) && decl.name.text === 'PREPAINT_AB_SCRIPT')
        init = decl.initializer
  })
  if (!init) throw new Error('PREPAINT_AB_SCRIPT no está en nuxt.config.ts')
  const onlyLiterals = (e: ts.Expression): boolean =>
    ts.isStringLiteral(e) ||
    (ts.isBinaryExpression(e) &&
      e.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      onlyLiterals(e.left) &&
      onlyLiterals(e.right))
  if (!onlyLiterals(init)) throw new Error('PREPAINT_AB_SCRIPT tiene que ser sólo literales')
  return new Function(`return ${init.getText(file)}`)() as string
}

const SCRIPT = abScript()

interface RunOptions {
  stored?: string | null
  today?: string
  webdriver?: boolean
  storageThrows?: boolean
}

function run(opts: RunOptions = {}): { attrs: Record<string, string>; stored: string | null } {
  const attrs: Record<string, string> = {}
  let stored = opts.stored ?? null
  const today = opts.today ?? '2026-12-10'
  const RealDate = Date
  class FakeDate extends RealDate {
    constructor() {
      super(`${today}T12:00:00Z`)
    }
  }
  const storage = {
    getItem: (key: string) => {
      if (opts.storageThrows) throw new Error('SecurityError')
      return key === AB_STORAGE_KEY ? stored : null
    },
    setItem: (key: string, value: string) => {
      if (key === AB_STORAGE_KEY) stored = value
    },
  }
  const context = {
    navigator: { webdriver: Boolean(opts.webdriver) },
    window: { localStorage: storage },
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attrs[name] = String(value)
        },
      },
    },
    Date: FakeDate,
    Math,
  }
  runInNewContext(SCRIPT, context)
  return { attrs, stored }
}

describe('PREPAINT_AB_SCRIPT', () => {
  it('lleva la misma lista y las mismas ventanas que AB_TESTS', () => {
    for (const test of AB_TESTS)
      expect(SCRIPT).toContain(`["${test.id}","${test.startsOn}","${test.endsOn}"]`)
    expect(SCRIPT.match(/\["[a-z-]+","\d{4}-\d{2}-\d{2}","\d{4}-\d{2}-\d{2}"\]/g)).toHaveLength(
      AB_TESTS.length
    )
  })

  it('es chico y va en el <head> después del de cookies', () => {
    expect(SCRIPT.length).toBeLessThan(900)
    expect(CONFIG).toMatch(
      /innerHTML:\s*PREPAINT_CONSENT_SCRIPT[\s\S]{0,300}innerHTML:\s*PREPAINT_AB_SCRIPT,\s*tagPosition:\s*'head'/
    )
  })

  it('asigna lo mismo que abArm para un navegador con id', () => {
    for (const visitor of ['abc123def456', 'zzzzzzzzzzzz9', 'k3j4h5g6f7d8s9a0']) {
      const { attrs } = run({ stored: visitor })
      for (const test of AB_TESTS) expect(attrs[`data-ab-${test.id}`]).toBe(abArm(visitor, test.id))
    }
  })

  it('crea un id de 16 caracteres si no hay o no es válido, y lo guarda', () => {
    for (const stored of [null, '', 'corto', '<script>']) {
      const out = run({ stored })
      expect(out.stored).toMatch(/^[a-z0-9]{16}$/)
      expect(Object.keys(out.attrs)).toHaveLength(AB_TESTS.length)
    }
  })

  it('no marca a un navegador controlado por un programa', () => {
    expect(run({ stored: 'abc123def456', webdriver: true }).attrs).toEqual({})
  })

  it('no marca fuera de la ventana de cada experimento', () => {
    expect(run({ stored: 'abc123def456', today: '2026-11-27' }).attrs).toEqual({})
    const late = run({ stored: 'abc123def456', today: '2027-02-01' }).attrs
    expect(Object.keys(late)).toEqual(['data-ab-jubilaciones'])
  })

  it('con el almacenamiento bloqueado no tira y no marca', () => {
    expect(() => run({ storageThrows: true })).not.toThrow()
    expect(run({ storageThrows: true }).attrs).toEqual({})
  })
})

describe('utils/abTests', () => {
  it('reparte cerca de mitad y mitad, e independiente entre experimentos', () => {
    let b = 0
    let both = 0
    const n = 4000
    for (let i = 0; i < n; i++) {
      const visitor = `v${i.toString(36)}x${(i * 7919).toString(36)}`
      const j = abArm(visitor, 'jubilaciones') === 'b'
      const s = abArm(visitor, 'seguimiento') === 'b'
      if (j) b++
      if (j && s) both++
    }
    expect(b / n).toBeGreaterThan(0.46)
    expect(b / n).toBeLessThan(0.54)
    expect(both / n).toBeGreaterThan(0.21)
    expect(both / n).toBeLessThan(0.29)
  })

  it('abHash es FNV-1a de 32 bits', () => {
    expect(abHash('')).toBe(2166136261)
    expect(abHash('a')).toBe(0xe40c292c)
  })

  it('abActive incluye los dos extremos', () => {
    const t = { startsOn: '2026-11-28', endsOn: '2027-01-15' }
    expect(abActive(t, '2026-11-28')).toBe(true)
    expect(abActive(t, '2027-01-15')).toBe(true)
    expect(abActive(t, '2027-01-16')).toBe(false)
  })

  it('lee las marcas del <html> y arma las propiedades de GA4', () => {
    const marks: Record<string, string> = {
      'data-ab-jubilaciones': 'b',
      'data-ab-alquiler-tarjeta': 'a',
      'data-ab-seguimiento': 'x',
    }
    const assigned = abAssignments({ getAttribute: name => marks[name] ?? null })
    expect(assigned).toEqual({ jubilaciones: 'b', 'alquiler-tarjeta': 'a' })
    expect(abProperties(assigned)).toEqual({ ab_jubilaciones: 'b', ab_alquiler_tarjeta: 'a' })
  })

  it('`npm run ab_report` (raíz) lee el registro como texto con esta forma', () => {
    // scripts/oneoff/ab_report.ts no puede importar el app (ESM): lee este archivo con una
    // expresión. Si alguien cambia la forma de las entradas, la lectura se queda sin experimentos.
    const source = readFileSync(join(__dirname, '..', '..', 'utils', 'abTests.ts'), 'utf8')
    const block =
      /\{\s*id: '([a-z-]+)',\s*param: '([a-z_]+)',\s*startsOn: '(\d{4}-\d{2}-\d{2})',\s*endsOn: '(\d{4}-\d{2}-\d{2})',\s*what: '([^']+)',?\s*\}/g
    expect([...source.matchAll(block)].map(m => m[1])).toEqual(AB_TESTS.map(t => t.id))
    const report = readFileSync(
      join(__dirname, '..', '..', '..', 'scripts', 'oneoff', 'ab_report.ts'),
      'utf8'
    )
    expect(report).toContain(block.source)
  })

  it('cada propiedad entra en GA4 (≤ 24 caracteres, minúsculas y guion bajo)', () => {
    for (const test of AB_TESTS) expect(test.param).toMatch(/^[a-z][a-z_]{0,23}$/)
  })
})
