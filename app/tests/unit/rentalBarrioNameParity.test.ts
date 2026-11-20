import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { rentalBarrioNamePlausible } from '../../utils/rentalBarrio'

/**
 * The app's barrio-name rule (`utils/rentalBarrioName.ts`) is a hand copy of the Casasweb reader's
 * (`classes/rentals/sources/casasweb.ts`): `app/` cannot import from the repo root, and the app CI
 * job installs only `app/`, so the backend module — cheerio, mongoose — cannot even be imported
 * here. The rule is therefore read as TEXT: the function is found by name, its own helpers (and
 * those of the relative modules it imports, such as `flatten` from `../normalize`) are pulled
 * along, and the result is run on the same names as the app's copy. If the two ever disagree on a
 * name, one side lets a junk barrio open an indexable page, or hides a real one.
 *
 * Until the reader that fixed the 2026-11-03 regression lands (it reads the card's
 * `.badge-zona-resultado`), the backend has no such rule and the comparison is skipped. From then
 * on, a rule that cannot be found by name fails here instead of skipping in silence.
 */
const ROOT = resolve(__dirname, '../../..')
const CASASWEB = resolve(ROOT, 'classes/rentals/sources/casasweb.ts')

/** [name, plausible]: the names the 2026-11 incident produced, and real places that look alike. */
const CASES: ReadonlyArray<readonly [string, boolean]> = [
  ['40 m2 40 m2', false],
  ['60 m2 60 m2', false],
  ['40 m2 44 m2', false],
  ['10 m2', false],
  ['35 m²', false],
  ['50 mts', false],
  ['45 metros', false],
  ['4 H', false],
  ['4h', false],
  ['2 ha', false],
  ['1234', false],
  ['1.234', false],
  ['Uruguay', false],
  [' URUGUAY ', false],
  ['', false],
  ['Pocitos', true],
  ['Cordón', true],
  ['POCITOS NUEVO', true],
  ['Punta Carretas', true],
  ['Barrio Sur', true],
  ['25 de Mayo', true],
  ['18 de Julio', true],
  ['Aeropuerto Internacional De Carrasco', true],
  ['Ciudad de la Costa', true],
  ['Km 29', true],
]

interface SourceModule {
  source: ts.SourceFile
  /** Top-level functions and variables, by every name they declare. */
  declarations: Map<string, ts.Statement>
  /** Value imports (type-only ones are erased): local name → module specifier and exported name. */
  imports: Map<string, { from: string; name: string }>
}

function load(file: string): SourceModule {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const declarations = new Map<string, ts.Statement>()
  const imports = new Map<string, { from: string; name: string }>()
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const from = (statement.moduleSpecifier as ts.StringLiteral).text
      const clause = statement.importClause
      if (!clause || clause.isTypeOnly) continue
      if (clause.name) imports.set(clause.name.text, { from, name: 'default' })
      const bindings = clause.namedBindings
      if (bindings && ts.isNamespaceImport(bindings))
        imports.set(bindings.name.text, { from, name: '*' })
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements)
          if (!element.isTypeOnly)
            imports.set(element.name.text, {
              from,
              name: (element.propertyName ?? element.name).text,
            })
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      declarations.set(statement.name.text, statement)
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) declarations.set(declaration.name.text, statement)
    }
  }
  return { source, declarations, imports }
}

/** Identifiers a statement reads: not property names, not types. */
function references(node: ts.Node): string[] {
  const names: string[] = []
  const walk = (child: ts.Node): void => {
    if (ts.isTypeNode(child)) return
    if (ts.isPropertyAccessExpression(child)) return walk(child.expression)
    if (ts.isPropertyAssignment(child)) return walk(child.initializer)
    if (ts.isIdentifier(child)) names.push(child.text)
    ts.forEachChild(child, walk)
  }
  ts.forEachChild(node, walk)
  return names
}

function resolveModule(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  const base = resolve(dirname(from), specifier)
  return (
    [`${base}.ts`, resolve(base, 'index.ts'), base].find(
      file => file.endsWith('.ts') && existsSync(file)
    ) ?? null
  )
}

/**
 * Source of an expression evaluating to `{ ...names }` of `file`: the declarations they need, in
 * file order, with each relative import bundled the same way. A package import (cheerio, mongoose)
 * is refused: the rule has to stay a pure function to be compared at all.
 */
function bundle(file: string, names: readonly string[], depth = 0): string {
  if (depth > 5) throw new Error(`import chain too deep at ${file}`)
  const module = load(file)
  const needed = new Set<ts.Statement>()
  const seen = new Set<string>()
  const fromModules = new Map<string, Map<string, string>>()
  const visit = (name: string): void => {
    if (seen.has(name)) return
    seen.add(name)
    const statement = module.declarations.get(name)
    if (statement) {
      if (needed.has(statement)) return
      needed.add(statement)
      references(statement).forEach(visit)
      return
    }
    const binding = module.imports.get(name)
    if (!binding) return // a parameter, a local, or a global such as RegExp
    const target = resolveModule(file, binding.from)
    if (!target || binding.name === '*' || binding.name === 'default')
      throw new Error(
        `the rule reads "${name}" from "${binding.from}", which this test cannot load`
      )
    const local = fromModules.get(target) ?? new Map<string, string>()
    local.set(name, binding.name)
    fromModules.set(target, local)
  }
  for (const name of names) {
    if (!module.declarations.has(name) && !module.imports.has(name))
      throw new Error(`${file} declares no "${name}"`)
    visit(name)
  }
  const prelude = [...fromModules].map(([target, local]) => {
    const pairs = [...local].map(([as, exported]) => (as === exported ? as : `${exported}: ${as}`))
    const bundled = bundle(target, [...new Set(local.values())], depth + 1)
    return `const { ${pairs.join(', ')} } = ${bundled};`
  })
  const body = module.source.statements
    .filter(statement => needed.has(statement))
    .map(statement => statement.getText(module.source).replace(/^export\s+(?:default\s+)?/, ''))
  return `(() => {\n${[...prelude, ...body].join('\n')}\nreturn { ${names.join(', ')} };\n})()`
}

/** The backend's rule as a function, or null while the backend has none. */
function backendRule(): { name: string; plausible: (value: string) => boolean } | null {
  const module = load(CASASWEB)
  const candidates = [...module.declarations.keys(), ...module.imports.keys()].filter(
    name => /plausib/i.test(name) && /neighbo|barrio/i.test(name)
  )
  if (!candidates.length) return null
  if (candidates.length > 1)
    throw new Error(`more than one barrio rule in casasweb.ts: ${candidates.join(', ')}`)
  const name = candidates[0]!
  const { outputText } = ts.transpileModule(`module.exports = ${bundle(CASASWEB, [name])};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const sandbox = { exports: {} as Record<string, unknown> }
  new Function('module', 'exports', outputText)(sandbox, sandbox.exports)
  const rule = sandbox.exports[name] as (value: string) => unknown
  const inverted = /implausib/i.test(name)
  return { name, plausible: value => (inverted ? !rule(value) : Boolean(rule(value))) }
}

const rule = backendRule()
const backendFixed = readFileSync(CASASWEB, 'utf8').includes('badge-zona-resultado')

describe('the barrio-name rule of the app and of the Casasweb reader', () => {
  it.each(CASES)('the app decides "%s" → %s', (name, plausible) => {
    expect(rentalBarrioNamePlausible(name)).toBe(plausible)
  })

  it.skipIf(!backendFixed)('the backend rule can still be found by name', () => {
    expect(
      rule,
      'casasweb.ts reads the badge but no `plausible…Neighborhood` rule was found: update this test'
    ).not.toBeNull()
  })

  it.skipIf(!rule)('the backend decides every case the same way', () => {
    const disagreements = CASES.filter(
      ([name]) => rule!.plausible(name) !== rentalBarrioNamePlausible(name)
    ).map(([name]) => `"${name}": backend ${rule!.plausible(name)}`)
    expect(disagreements, rule?.name).toEqual([])
  })

  it('the source reader finds a rule and its helpers in a module like casasweb.ts', () => {
    // Without this, a reader that never finds anything would keep the comparison skipped forever.
    const parsed = ts.transpileModule(
      `module.exports = ${bundle(resolve(ROOT, 'classes/rentals/normalize.ts'), ['flatten'])};`,
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
    ).outputText
    const sandbox = { exports: {} as Record<string, (value: string) => string> }
    new Function('module', 'exports', parsed)(sandbox, sandbox.exports)
    expect(sandbox.exports.flatten!('  Cordón   SUR ')).toBe('cordon sur')
  })
})
