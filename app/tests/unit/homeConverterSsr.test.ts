// The converter of the home (`pages/index.vue`): what the server renders, and what a tap costs.
//
// Measured in production on 2026-11-19 (wf/ui/home.md):
// - The server HTML shipped the converter as "Cargando..." with no best-rate grid and none of the
//   16 links to /historico/<casa>/usd when the rates request was the slowest of the render: the
//   only code that fills the converter is an immediate watcher, which runs ONCE on the server.
//   Hydration then threw the card away and rebuilt it (the page's own CLS).
// - Two more hydration mismatches: a `new Date()` in the hero answer and the form read from
//   localStorage during setup.
// - A tap on a preset amount took 1,072 ms at 4x CPU: `router.push` per tap, gtag and localStorage
//   inside the handler, and a new Intl.NumberFormat on every formatted figure.
//
// The page cannot be mounted here (3,500 lines of Nuxt + Vuetify), so the script is read as an AST
// and the pure pieces are run.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { callsTo, clockNames, parseScript, readsClock, walk } from './helpers/headScan'
import { formatUyuCurrency, keepCurrency } from '../../utils/homeConverter'

const APP = join(__dirname, '..', '..')
const source = parseScript(join(APP, 'pages', 'index.vue'))

/** The initializer of a top-level `const name = ...` of the page script. */
function declaration(name: string): ts.Expression {
  let found: ts.Expression | undefined
  walk(source, node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      found = node.initializer
    }
  })
  if (!found) throw new Error(`no declaration of ${name}`)
  return found
}

/** Calls inside a subtree whose callee text is `name` (`trackConvert`, `router.push`...). */
function callsIn(node: ts.Node, name: string): ts.CallExpression[] {
  const calls: ts.CallExpression[] = []
  walk(node, child => {
    if (ts.isCallExpression(child) && child.expression.getText(source) === name) calls.push(child)
  })
  return calls
}

/** Every identifier reference to `name` in the script. */
function references(name: string): ts.Identifier[] {
  const refs: ts.Identifier[] = []
  walk(source, node => {
    if (ts.isIdentifier(node) && node.text === name) {
      const parent = node.parent
      if (ts.isVariableDeclaration(parent) && parent.name === node) return
      refs.push(node)
    }
  })
  return refs
}

/** The nearest function (arrow or declaration) that encloses a node. */
function enclosingFunction(node: ts.Node): ts.FunctionLikeDeclaration | undefined {
  for (let at = node.parent; at; at = at.parent) {
    if (ts.isArrowFunction(at) || ts.isFunctionExpression(at) || ts.isFunctionDeclaration(at))
      return at
  }
  return undefined
}

/** Whether a node sits inside the callback of a `setTimeout(...)` call. */
function insideSetTimeout(node: ts.Node): boolean {
  for (let at = node.parent; at; at = at.parent) {
    if (ts.isCallExpression(at) && at.expression.getText(source) === 'setTimeout') return true
  }
  return false
}

describe('the server renders the converter with data', () => {
  it('useExchangeRates hands the page a ready() it can wait for', () => {
    const composable = readFileSync(join(APP, 'composables', 'useExchangeRates.ts'), 'utf8')
    expect(composable).toMatch(/const ready = async \(\): Promise<void> => \{\s*await request\s*\}/)
    expect(composable).toMatch(/return \{[^}]*\bready\b[^}]*\}/)
    let bound = false
    walk(source, node => {
      if (
        ts.isBindingElement(node) &&
        node.propertyName?.getText(source) === 'ready' &&
        node.name.getText(source) === 'ratesReady' &&
        ts.isVariableDeclaration(node.parent.parent) &&
        node.parent.parent.initializer?.getText(source) === 'useExchangeRates()'
      ) {
        bound = true
      }
    })
    expect(bound).toBe(true)
  })

  it('an onServerPrefetch waits for the rates, then fills the converter and clears the spinner', () => {
    const hooks = callsTo(source, 'onServerPrefetch')
    expect(hooks).toHaveLength(1)
    const body = hooks[0]!.arguments[0]!.getText(source)
    const wait = body.indexOf('await ratesReady()')
    const apply = body.indexOf('applyExchangeData(')
    const done = body.indexOf('initialLoading.value = false')
    expect(wait).toBeGreaterThan(-1)
    expect(apply).toBeGreaterThan(wait)
    expect(done).toBeGreaterThan(wait)
    // A top-level statement of <script setup>, not hidden in a branch that could skip it.
    expect(ts.isExpressionStatement(hooks[0]!.parent)).toBe(true)
    expect(ts.isSourceFile(hooks[0]!.parent.parent)).toBe(true)
  })

  it('the hero answer does not read the clock: one useState instant shared with the JSON-LD', () => {
    const tainted = clockNames(source)
    expect(readsClock(declaration('usdHeadline'), tainted)).toBe(false)
    expect(readsClock(declaration('currentDate'), tainted)).toBe(false)
    expect(declaration('renderedAt').getText(source)).toMatch(/^useState\('home-rendered-at'/)
    const clockStates = callsTo(source, 'useState').filter(call =>
      call.arguments.some(argument => /Date\.now\(\)|new Date\(\)/.test(argument.getText(source)))
    )
    expect(clockStates).toHaveLength(1)
  })

  it('the saved form is read only after mount', () => {
    const reads = callsTo(source, 'getStoredFormData')
    expect(reads.length).toBeGreaterThan(0)
    for (const read of reads) {
      const fn = enclosingFunction(read)
      expect(fn, 'getStoredFormData() at the top level of setup').toBeDefined()
      // Either the function is the argument of onMounted itself, or it is a named const whose
      // every use is `onMounted(name)`.
      const parent = fn!.parent
      if (ts.isCallExpression(parent)) {
        expect(parent.expression.getText(source)).toBe('onMounted')
        continue
      }
      expect(ts.isVariableDeclaration(parent)).toBe(true)
      const name = (parent as ts.VariableDeclaration).name.getText(source)
      const uses = references(name)
      expect(uses.length, name).toBeGreaterThan(0)
      for (const use of uses) {
        expect(ts.isCallExpression(use.parent), name).toBe(true)
        expect((use.parent as ts.CallExpression).expression.getText(source), name).toBe('onMounted')
      }
    }
  })

  it('restoring the saved form neither tracks a conversion nor writes the URL', () => {
    const restore = declaration('restoreStoredForm')
    expect(callsIn(restore, 'trackConvert')).toHaveLength(0)
    expect(callsIn(restore, 'updateQueryParams')).toHaveLength(0)
    expect(callsIn(restore, 'updateExchange')).toHaveLength(0)
    expect(callsIn(restore, 'applyForm')).toHaveLength(1)
    const applyForm = declaration('applyForm')
    for (const name of ['trackConvert', 'updateQueryParams', 'saveFormData', 'replaceQueryInPlace'])
      expect(callsIn(applyForm, name), name).toHaveLength(0)
  })
})

describe('a converter tap stays cheap', () => {
  it('updateQueryParams writes the URL in place, never through the router', () => {
    const fn = declaration('updateQueryParams')
    expect(callsIn(fn, 'replaceQueryInPlace')).toHaveLength(1)
    for (const name of ['router.push', 'router.replace', 'navigateTo'])
      expect(callsIn(fn, name), name).toHaveLength(0)
    // No comparison against the router's (now stale) `route.query`: the util compares the URL.
    let readsRouteQuery = false
    walk(fn, node => {
      if (ts.isPropertyAccessExpression(node) && node.getText(source) === 'route.query')
        readsRouteQuery = true
    })
    expect(readsRouteQuery).toBe(false)
    // Nowhere else in the page either.
    expect(callsIn(source, 'router.push')).toHaveLength(0)
    expect(callsIn(source, 'router.replace')).toHaveLength(0)
  })

  it("one 'convert' key event, deferred out of the tap together with the storage write", () => {
    const all = callsIn(source, 'trackConvert')
    expect(all).toHaveLength(1)
    expect(all[0]!.arguments[0]!.getText(source)).toBe("'convert'")
    expect(insideSetTimeout(all[0]!)).toBe(true)
    const update = declaration('updateExchange')
    expect(callsIn(update, 'trackConvert')).toHaveLength(1)
    const saves = callsIn(update, 'saveFormData')
    expect(saves).toHaveLength(1)
    expect(insideSetTimeout(saves[0]!)).toBe(true)
  })

  it('the direction swap defers its storage write and sends no key event', () => {
    const toggle = declaration('toggleDirection')
    expect(callsIn(toggle, 'trackConvert')).toHaveLength(0)
    expect(callsIn(toggle, 'saveFormData')).toHaveLength(0)
    expect(toggle.getText(source)).toContain('setTimeout(saveFormData, 0)')
  })

  it('the page builds no Intl.NumberFormat of its own', () => {
    let built = 0
    walk(source, node => {
      if (ts.isNewExpression(node) && node.expression.getText(source) === 'Intl.NumberFormat')
        built++
    })
    expect(built).toBe(0)
    expect(declaration('formatCurrency').getText(source)).toBe('formatUyuCurrency')
  })

  it('reading progress is per path, so query-only URL writes never restarted it', () => {
    // The critic's check: dropping the router also drops router.afterEach on taps. track-reading
    // already ignored same-path navigations, so it reports once per page with or without them.
    const plugin = readFileSync(join(APP, 'plugins', 'track-reading.client.ts'), 'utf8')
    expect(plugin).toMatch(
      /afterEach\(\(to, from, failure\) => \{\s*if \(!failure && to\.path !== from\.path\) visit\(\)/
    )
  })
})

describe('clearing a currency select keeps a currency', () => {
  it('both selects are guarded by keepCurrency', () => {
    for (const name of ['selectedCurrencyInput', 'selectedTargetCurrencyInput']) {
      const guard = callsTo(source, 'watch').find(
        call => call.arguments[0]?.getText(source) === name
      )
      expect(guard, name).toBeDefined()
      const body = guard!.arguments[1]!.getText(source)
      expect(body, name).toContain('keepCurrency(next, previous')
      expect(body, name).toContain(`${name}.value = kept`)
    }
  })

  it('a cleared value goes back to the previous currency', () => {
    expect(keepCurrency(null, 'EUR', 'USD')).toBe('EUR')
    expect(keepCurrency(undefined, 'BRL', 'USD')).toBe('BRL')
    expect(keepCurrency('', 'ARS', 'USD')).toBe('ARS')
    expect(keepCurrency('  ', 'ARS', 'USD')).toBe('ARS')
  })

  it('with no previous currency, the fallback; a real choice passes through', () => {
    expect(keepCurrency(null, null, 'UYU')).toBe('UYU')
    expect(keepCurrency(null, '', 'UYU')).toBe('UYU')
    expect(keepCurrency('EUR', 'USD', 'UYU')).toBe('EUR')
  })

  it('the guard, run as the page wires it, puts the previous currency back', async () => {
    const { watch, nextTick } = await import('vue')
    const input = ref<string | null>('USD')
    watch(input, (next, previous) => {
      const kept = keepCurrency(next, previous, 'USD')
      if (kept !== next) input.value = kept
    })
    input.value = 'EUR'
    await nextTick()
    input.value = null // the clear icon
    await nextTick()
    expect(input.value).toBe('EUR')
  })
})

describe('formatUyuCurrency', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('prints the same figures as before, symbol first', () => {
    for (const value of [0, 40.5, 1234.5, 1000000]) {
      const out = formatUyuCurrency(value)
      expect(out.startsWith('$')).toBe(true)
      expect(out).not.toContain('UYU')
      expect(out).toMatch(/,\d{2}$/)
    }
    expect(formatUyuCurrency(1234.5)).toContain('1.234,50')
  })

  it('builds the Intl.NumberFormat once, not per call', async () => {
    vi.resetModules()
    const spy = vi.spyOn(Intl, 'NumberFormat')
    const fresh = await import('../../utils/homeConverter')
    for (let i = 0; i < 15; i++) fresh.formatUyuCurrency(i * 10.25)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('useExchangeRates().ready', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('resolves only once the rates request settled', async () => {
    let settle!: () => void
    const handle = Object.assign(
      new Promise<void>(resolve => {
        settle = resolve
      }),
      { data: ref([]), pending: ref(true), error: ref(null), refresh: vi.fn() }
    )
    vi.stubGlobal('useApiService', () => ({ getProcessedExchangeData: vi.fn() }))
    vi.stubGlobal('useAsyncData', () => handle)
    vi.stubGlobal('computed', computed)
    const { useExchangeRates } = await import('../../composables/useExchangeRates')
    const { ready } = useExchangeRates()
    let done = false
    void ready().then(() => {
      done = true
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(done).toBe(false)
    settle()
    await ready()
    expect(done).toBe(true)
  })
})
