import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { load, resetClarityState } from '../../services/clarity'

// Microsoft Clarity is ~25 KB of script plus a serialisation of the whole DOM, measured at about
// 0.5 s of JavaScript per page at CPU×4. Nothing about it may run before the page is usable, and
// nothing it is told may undo the visitor's choice. A one-line regression (a setTimeout, a
// consentv2 'denied', the tag inserted before its consent, a static import of the runtime) changes
// no visible behaviour, so these guard the source.
const ROOT = join(__dirname, '..', '..')
const SKIP = new Set(['node_modules', 'tests', 'public', '.nuxt', '.output'])
const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
const read = (path: string) => withoutComments(readFileSync(join(ROOT, path), 'utf8'))

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sources(path, out)
    else if (/\.(?:ts|vue|mjs)$/.test(name) && !name.endsWith('.d.ts')) out.push(path)
  }
  return out
}

/** Files with a static (non-type) import of a module matching `target` (firebaseOffEntry's). */
function staticImporters(target: RegExp): string[] {
  // The first quote after `import ` opens the specifier; `import(` is dynamic and does not match.
  const re = /^\s*import(?!\s+type\b)\s[^'"]*['"]([^'"]+)['"]/gm
  return sources(ROOT)
    .map(file => relative(ROOT, file).split(sep).join('/'))
    .filter(path => [...read(path).matchAll(re)].some(match => target.test(match[1] ?? '')))
    .sort()
}

describe('the Clarity plugin stays off the critical path', () => {
  const plugin = read('plugins/clarity.client.ts')
  const runtime = read('services/clarityRuntime.ts')
  const service = read('services/clarity.ts')

  it('has no fixed timer: the old one fired 3 s after setup, hydrated or not', () => {
    for (const text of [plugin, runtime, service]) expect(text).not.toMatch(/\bsetTimeout\s*\(/)
  })

  it('starts after hydration, in an idle moment, with the tab visible', () => {
    const ready = plugin.indexOf('onNuxtReady(')
    const idle = plugin.indexOf('requestIdleCallback(')
    expect(ready).toBeGreaterThan(-1)
    expect(idle).toBeGreaterThan(-1)
    expect(plugin).toMatch(/timeout:\s*8000/)
    expect(plugin).toMatch(/visibilityState === 'visible'/)
    // The runtime is fetched inside that idle callback, never before.
    expect(plugin.indexOf("import('~/services/clarityRuntime')")).toBeGreaterThan(idle)
  })

  it('does nothing at all while the project id is empty', () => {
    const bail = plugin.search(/if \(!projectId\) return/)
    expect(bail).toBeGreaterThan(-1)
    for (const hook of ['addEventListener(', 'useRouter(', 'onNuxtReady(', 'import(']) {
      expect(plugin.indexOf(hook), hook).toBeGreaterThan(bail)
    }
  })

  it('ships only the plugin in the entry chunk: the rules and the runtime load on demand', () => {
    // The plugin imports nothing statically; the runtime and the policy only from on-demand code.
    expect(plugin).not.toMatch(/^\s*import\s/m)
    expect(staticImporters(/clarityRuntime$/)).toEqual([])
    expect(staticImporters(/clarityPolicy$/)).toEqual([
      'server/api/consent-region.get.ts',
      'services/clarityRuntime.ts',
    ])
    // useTrack and the survey card import the service on every page: it carries no route lists.
    expect(staticImporters(/\/clarityValues$/)).toEqual([
      'services/clarity.ts',
      'utils/clarityPolicy.ts',
    ])
    expect(service).not.toMatch(/clarityPolicy/)
  })

  it('puts nothing in the server HTML: no head tag, no preconnect, no tag URL outside the service', () => {
    expect(plugin + runtime).not.toMatch(/useHead|useScript|useSeoMeta|preconnect/)
    const mentions = sources(ROOT)
      .filter(file =>
        /https?:\/\/[\w.-]*clarity\.ms/.test(withoutComments(readFileSync(file, 'utf8')))
      )
      .map(file => relative(ROOT, file).split(sep).join('/'))
    expect(mentions).toEqual(['services/clarity.ts'])
  })

  it('stops Clarity before the URL changes, back and forward included', () => {
    expect(runtime).toMatch(/router\.beforeEach\(/)
    expect(runtime).toMatch(/'popstate',[\s\S]{0,200}\{ capture: true \}/)
    expect(plugin).toMatch(/'page:loading:end'/)
  })

  it('answers the restarts clarity-js makes on its own: a page restored from the cache', () => {
    expect(runtime).toMatch(/'pageshow'[\s\S]{0,120}persisted/)
  })
})

describe('what Clarity is told about consent', () => {
  it('is never told analytics_Storage denied, nor consent(false), anywhere in the app', () => {
    const offenders = sources(ROOT)
      .filter(file => {
        const text = withoutComments(readFileSync(file, 'utf8'))
        return (
          /consentv2[\s\S]{0,300}analytics_Storage['"]?\s*:\s*['"]denied/.test(text) ||
          /['"]consent['"]\s*,\s*false/.test(text)
        )
      })
      .map(file => relative(ROOT, file).split(sep).join('/'))
    expect(offenders).toEqual([])
  })

  it('a rejection reaches Clarity before gtag: useConsent dispatches cu:consent first', () => {
    const consent = read('composables/useConsent.ts')
    const dispatch = consent.indexOf("new CustomEvent('cu:consent'")
    const gtag = consent.indexOf("gtag('consent', 'update'")
    expect(dispatch).toBeGreaterThan(-1)
    expect(gtag).toBeGreaterThan(dispatch)
  })
})

describe('services/clarity.ts load()', () => {
  type Stub = ((...args: unknown[]) => void) & { q?: unknown[][]; v?: unknown }
  const host: { clarity?: Stub } = {}
  const inserted: Array<{ src: string; async: boolean; queueAtInsert: unknown[][] }> = []

  beforeEach(() => {
    resetClarityState()
    delete host.clarity
    inserted.length = 0
    vi.stubGlobal('window', host)
    vi.stubGlobal('document', {
      createElement: () => ({ src: '', async: false }),
      head: {
        appendChild: (element: { src: string; async: boolean }) => {
          inserted.push({ ...element, queueAtInsert: [...(host.clarity?.q ?? [])] })
        },
      },
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queues consentv2 with ad storage denied BEFORE inserting the tag, so c.gif never fires', () => {
    expect(load('3t0wlogvdz')).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]!.src).toBe('https://www.clarity.ms/tag/3t0wlogvdz')
    expect(inserted[0]!.async).toBe(true)
    expect(inserted[0]!.queueAtInsert).toEqual([
      ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }],
    ])
  })

  it('inserts the tag once', () => {
    load('3t0wlogvdz')
    expect(load('3t0wlogvdz')).toBe(false)
    expect(inserted).toHaveLength(1)
  })

  it('refuses a malformed id and a Clarity global it did not create', () => {
    expect(load('')).toBe(false)
    expect(load('id"><script>')).toBe(false)
    host.clarity = Object.assign(() => {}, { v: '0.8.77' })
    expect(load('3t0wlogvdz')).toBe(false)
    expect(inserted).toEqual([])
  })
})
