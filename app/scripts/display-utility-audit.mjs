// Sweep every route for elements whose `d-*` display utility is being OVERRULED.
//
// Why this exists: Vuetify 3 emitted the display utilities as `.d-none { display: none
// !important }`. Vuetify 4 dropped the `!important` and moved them into
// `@layer vuetify-utilities`. Unlayered CSS beats every layer regardless of specificity,
// and a Vue component's `<style scoped>` is unlayered — so one `display: flex` in a
// component's own stylesheet silently outranks `d-none` at every breakpoint.
//
// Nothing reports it. The class is still in the markup, the media query still matches,
// devtools still lists the utility — under the winning rule. The app bar shipped two
// search icons on every page of the site this way: `.search-trigger { display: flex }`
// beat the `d-none` that was supposed to hide the desktop pill below lg, so the
// collapsed desktop trigger sat next to the mobile magnifier on every phone.
//
// The probe replays the utility cascade for the current viewport — the widest active
// breakpoint wins, bare `d-*` is the xs floor — and compares the winner against the
// computed display.
//
// Two things it deliberately does NOT report:
//   - Blockification. A flex or grid ITEM has `inline` computed to `block` and
//     `inline-flex` to `flex` by spec. That is the browser being correct.
//   - `cu-mobile-cards`. Its phone rules turn every `<td>` into a flex card line, which
//     overrules a `d-none d-sm-table-cell` on that cell. Both rules are ours and the
//     winner is the intended one: the column hidden from the WIDE table still belongs in
//     the stacked card, which is why those cells carry a `data-label`. Reported under
//     CARD rather than mixed into the defects.
//
// Findings:
//   OVERRULED — a utility lost to an authored rule. A defect: the markup asks for one
//               layout and the page renders another.
//   CARD      — the `cu-mobile-cards` case above. Informational.
//
// Usage:
//   node scripts/display-utility-audit.mjs                   # live site, one URL per route family
//   BASE=http://localhost:3311 node scripts/display-utility-audit.mjs
//   PAGES=/,/estado node scripts/display-utility-audit.mjs
//   WIDTHS=390,1280 node scripts/display-utility-audit.mjs   # default 390,768,1280,1920
//   ALL=1 node scripts/display-utility-audit.mjs             # every sitemap URL
//   CARD=1 node scripts/display-utility-audit.mjs            # also list the CARD findings
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'https://cambio-uruguay.com'
const WIDTHS = (process.env.WIDTHS || '390,768,1280,1920').split(',').map(n => parseInt(n, 10))

const probe = () => {
  // Pinned to the project's own thresholds (plugins/vuetify.ts + assets/variables.scss),
  // NOT to Vuetify 4's narrower defaults. Keep this list in sync with those two.
  const BP = { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920, xxl: 2560 }
  const ORDER = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
  const VALUES = [
    'none',
    'inline',
    'inline-block',
    'block',
    'table',
    'table-row',
    'table-cell',
    'flex',
    'inline-flex',
  ]
  // A flex/grid item's display is blockified by the spec before it is computed.
  const BLOCKIFIED = {
    inline: 'block',
    'inline-block': 'block',
    'inline-flex': 'flex',
    'inline-table': 'table',
  }
  const w = window.innerWidth
  const findings = []

  const describe = el => {
    const parts = []
    let n = el
    for (let i = 0; i < 3 && n; i++, n = n.parentElement) {
      const cls = String(n.className || '')
        .trim()
        .split(/\s+/)
        .filter(c => c && !/^v-theme--|^(?:d|text|m[abetlrxy]?|p[abetlrxy]?|ga)-/.test(c))
        .slice(0, 2)
        .join('.')
      parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''))
    }
    return parts.join(' > ')
  }

  document.querySelectorAll('[class*="d-"]').forEach(el => {
    let expected = null
    let winning = -1
    for (const c of el.classList) {
      const m = c.match(/^d-(?:(xs|sm|md|lg|xl|xxl)-)?(.+)$/)
      if (!m) continue
      const [, bp, val] = m
      if (!VALUES.includes(val)) continue
      if (bp && w < BP[bp]) continue
      const idx = bp ? ORDER.indexOf(bp) : 0
      // Later breakpoint wins; equal breakpoints fall to source order, which is the
      // order Vuetify emits them and the order classList reports them.
      if (idx >= winning) {
        winning = idx
        expected = val
      }
    }
    if (expected === null) return

    const actual = getComputedStyle(el).display
    if (actual === expected) return

    const parent = el.parentElement
    const parentDisplay = parent ? getComputedStyle(parent).display : ''
    if (
      /^(?:flex|grid|inline-flex|inline-grid)$/.test(parentDisplay) &&
      BLOCKIFIED[expected] === actual
    ) {
      return
    }

    const rect = el.getBoundingClientRect()
    // The class sits on whatever the author tagged — a bare <table>, or the wrapper
    // VTable renders around one (its inner <table> carries no class of its own).
    const inCardTable = !!el.closest('.cu-mobile-cards')
    findings.push({
      kind: inCardTable ? 'CARD' : 'OVERRULED',
      desc: describe(el),
      cls: [...el.classList].filter(c => c.startsWith('d-')).join(' '),
      expected,
      actual,
      visible: rect.width > 0 && rect.height > 0,
    })
  })
  return findings
}

const routes = process.env.PAGES
  ? process.env.PAGES.split(',').map(r => r.trim())
  : await (async () => {
      const xml = await (await fetch(`${BASE}/__sitemap__/es-ES.xml`)).text()
      const all = [
        ...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname)),
      ]
      if (process.env.ALL) return all
      // One URL per template, same sampling as scripts/btn-overflow-audit.mjs.
      const seen = new Set()
      return all.filter(route => {
        const segs = route.split('/').filter(Boolean)
        const family = segs.length <= 1 ? route : `${segs[0]}/${segs.length}`
        if (seen.has(family)) return false
        seen.add(family)
        return true
      })
    })()

console.log(`${BASE} · ${routes.length} routes · widths ${WIDTHS.join(', ')}\n`)

const browser = await chromium.launch()
const page = await browser.newPage()
const byIdiom = new Map()
const totals = { OVERRULED: 0, CARD: 0 }
let failed = 0

for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 })
  for (const route of routes) {
    let findings
    try {
      const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
      if (res && !res.ok()) {
        failed++
        console.log(`  ERROR ${width} ${route} — HTTP ${res.status()}`)
        continue
      }
      await page.waitForTimeout(450)
      findings = await page.evaluate(probe)
    } catch (e) {
      failed++
      console.log(`  ERROR ${width} ${route} — ${e.message.split('\n')[0]}`)
      continue
    }
    for (const f of findings) {
      totals[f.kind]++
      const key = `${f.kind}|${f.desc}|${f.cls}|${f.expected}|${f.actual}`
      if (!byIdiom.has(key)) byIdiom.set(key, { ...f, count: 0, where: new Set() })
      const entry = byIdiom.get(key)
      entry.count++
      entry.where.add(`${route}@${width}`)
    }
  }
  process.stdout.write(`  ${width}px done\n`)
}
await browser.close()

const dump = kind => {
  const rows = [...byIdiom.values()].filter(v => v.kind === kind).sort((a, b) => b.count - a.count)
  if (!rows.length) return
  console.log(`\n${kind}`)
  for (const v of rows) {
    const where = [...v.where]
    console.log(
      `${String(v.count).padStart(4)}x ${v.visible ? 'VISIBLE' : 'hidden '} ${v.desc}` +
        `\n       "${v.cls}" wants ${v.expected}, renders ${v.actual}` +
        `\n       ${where.slice(0, 5).join(', ')}${where.length > 5 ? ` (+${where.length - 5})` : ''}`
    )
  }
}
dump('OVERRULED')
if (process.env.CARD) dump('CARD')

const reads = routes.length * WIDTHS.length
console.log(
  `\nOVERRULED=${totals.OVERRULED} CARD=${totals.CARD}` +
    ` (${reads - failed}/${reads} page loads read)` +
    (process.env.CARD ? '' : '  — set CARD=1 to list the cu-mobile-cards cells')
)
process.exitCode = totals.OVERRULED > 0 || failed > 0 ? 1 : 0
