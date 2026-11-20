// Leer el `<script>` de las páginas como AST para los tests del head (headHydrationParity,
// localizedRoutes). Con expresiones regulares sobre el texto, un comentario que dice
// "useSeoMeta({" o una cadena con un paréntesis bastaban para que el test mirara otra cosa.
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'

/** The script of a .vue (both blocks) or a .ts file, parsed. Templates and styles are not code. */
export function parseScript(file: string, text = readFileSync(file, 'utf8')): ts.SourceFile {
  const code = file.endsWith('.vue')
    ? (() => {
        const { descriptor } = parse(text, { filename: file })
        return [descriptor.script?.content, descriptor.scriptSetup?.content]
          .filter(Boolean)
          .join('\n')
      })()
    : text
  return ts.createSourceFile(file, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)
}

/** Every node of a subtree, depth first. `visit` returns `false` to skip a node's children. */
export function walk(node: ts.Node, visit: (node: ts.Node) => unknown): void {
  if (visit(node) === false) return
  node.forEachChild(child => walk(child, visit))
}

/** Calls to a function by name: `useHead(...)`, `defineI18nRoute(...)`. */
export function callsTo(source: ts.SourceFile, name: string): ts.CallExpression[] {
  const calls: ts.CallExpression[] = []
  walk(source, node => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === name
    ) {
      calls.push(node)
    }
  })
  return calls
}

/** Whether a subtree holds this string literal. */
export function hasString(node: ts.Node, value: string): boolean {
  let found = false
  walk(node, child => {
    if (found) return false
    if (
      (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) &&
      child.text === value
    ) {
      found = true
    }
  })
  return found
}

const isCallTo = (node: ts.Node, name: string) =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name

/** `new Date()` with no argument, or `Date.now()`: a read of the clock. */
function isClockRead(node: ts.Node): boolean {
  if (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'Date'
  ) {
    return !node.arguments || node.arguments.length === 0
  }
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Date' &&
    node.expression.name.text === 'now'
  )
}

/** An identifier used as a value — not the name in `{ name: x }` or in `a.name`. */
function isValueReference(node: ts.Identifier): boolean {
  const parent = node.parent
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false
  if (ts.isVariableDeclaration(parent) && parent.name === node) return false
  return true
}

/**
 * Whether a subtree depends on the clock: it reads it, or it uses a name whose value does. A read
 * inside `useState(...)` does not count — that instant is taken once and travels in the payload,
 * so the server and the browser agree on it.
 */
export function readsClock(node: ts.Node, tainted: ReadonlySet<string> = new Set()): boolean {
  let found = false
  walk(node, child => {
    if (found || isCallTo(child, 'useState')) return false
    if (
      isClockRead(child) ||
      (ts.isIdentifier(child) && tainted.has(child.text) && isValueReference(child))
    ) {
      found = true
    }
  })
  return found
}

/** The names declared in a file whose value depends on the clock, through any chain of names. */
export function clockNames(source: ts.SourceFile): Set<string> {
  const declarations: Array<{ name: string; init: ts.Expression }> = []
  walk(source, node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      declarations.push({ name: node.name.text, init: node.initializer })
    }
  })
  const tainted = new Set<string>()
  for (let grew = true; grew;) {
    grew = false
    for (const { name, init } of declarations) {
      if (!tainted.has(name) && readsClock(init, tainted)) {
        tainted.add(name)
        grew = true
      }
    }
  }
  return tainted
}
