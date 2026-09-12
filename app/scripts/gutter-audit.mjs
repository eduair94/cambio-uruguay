// Sweep every route template for content that sits against the viewport edge.
//
// Why this exists: the layout gives every page 12px of side padding
// (`.container_custom`) and each page's own <VContainer> adds the other 16, so
// content normally starts 28px in. A page whose root is a bare <div> or a <v-row>
// never gets the second half, and Vuetify 4's grid no longer hides that with the
// v3 negative row margins. Measured live on 2026-09-12, 57 of 214 templates had
// their first card 12px from the phone's edge (and 12px from the 1280px cap on a
// laptop) while the other 150 had 28px. `tests/unit/pageContainer.test.ts` now
// guards the source; this measures the rendered result, which is what the reader
// sees (DESIGN.md → "The Page Brings Its Container Rule").
//
// What it measures: inside the page root (`.container_custom > :first-child`),
// the smallest distance from any visible content box — cards, sections, tables,
// headings, paragraphs, images, buttons — to the left or right viewport edge.
// The container box itself and `cu-btn-flush` buttons (whose hover box is meant to
// hang past the text edge) are skipped. Negative distances are children clipped
// by an `overflow` wrapper, not page overflow, and are reported separately only
// when the document really scrolls sideways.
//
// Findings:
//   EDGE     — a content box closer than FLOOR (16px) to an edge. A defect unless
//              the route is a documented full-bleed surface (home, /mapa, /avanzado).
//   OVERFLOW — the document is wider than the viewport: something escaped.
//
// Usage:
//   node scripts/gutter-audit.mjs                            # live site, one route per template
//   BASE=http://localhost:3000 node scripts/gutter-audit.mjs
//   PAGES=/comparar,/historico node scripts/gutter-audit.mjs
//   VIEWPORTS=mobile node scripts/gutter-audit.mjs           # desktop | mobile | both (default)
//   ALL=1 node scripts/gutter-audit.mjs                      # every sitemap URL, not one per family
//   FLOOR=28 node scripts/gutter-audit.mjs                   # stricter: flag anything under the site norm
// Exits 1 when any EDGE or OVERFLOW finding remains, so it can gate a deploy check.
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'https://cambio-uruguay.com'
const FLOOR = Number(process.env.FLOOR || 16)
const FULL_BLEED = new Set(['/', '/mapa', '/avanzado'])
const VIEWPORTS = {
  desktop: { width: 1366, height: 900 },
  mobile: { width: 390, height: 844 },
}

const probe = () => {
  const vw = document.documentElement.clientWidth
  const cont = document.querySelector('.container_custom')
  const root = cont && cont.firstElementChild
  if (!root) return { vw, scrollW: document.documentElement.scrollWidth, minL: null, minR: null }
  const sel =
    '.v-card, .v-sheet, .v-alert, section, article, header, .v-table, table, h1, h2, p, img, ' +
    '.v-btn:not(.cu-btn-flush), .v-chip, form, .v-data-table, .v-list, .v-expansion-panels, nav, ul, ol, figure, blockquote, pre'
  const name = el => {
    const cls = String(el.className || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join('.')
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '')
  }
  let minL = Infinity
  let minR = Infinity
  let atL = ''
  let atR = ''
  for (const el of root.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0 || r.top > 1800 || r.bottom < 0) continue
    const l = Math.round(r.left)
    const rr = Math.round(vw - r.right)
    // Clipped children read as negative; they are not the page's edge.
    if (l >= 0 && l < minL) {
      minL = l
      atL = name(el)
    }
    if (rr >= 0 && rr < minR) {
      minR = rr
      atR = name(el)
    }
  }
  return {
    vw,
    scrollW: document.documentElement.scrollWidth,
    minL: minL === Infinity ? null : minL,
    minR: minR === Infinity ? null : minR,
    atL,
    atR,
    root: name(root),
  }
}

const routes = process.env.PAGES
  ? process.env.PAGES.split(',').map(r => r.trim())
  : await (async () => {
      const xml = await (await fetch(`${BASE}/__sitemap__/es-ES.xml`)).text()
      const all = [
        ...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname)),
      ]
      if (process.env.ALL) return all
      // One URL per template, same sampling as btn-overflow-audit.mjs.
      const seen = new Set()
      return all.filter(route => {
        const segs = route.split('/').filter(Boolean)
        const family = segs.length <= 1 ? route : `${segs[0]}/${segs.length}`
        if (seen.has(family)) return false
        seen.add(family)
        return true
      })
    })()

const wanted = process.env.VIEWPORTS || 'both'
const viewports = Object.entries(VIEWPORTS).filter(([name]) => wanted === 'both' || wanted === name)

console.log(
  `${BASE} · ${routes.length} routes · ${viewports.map(([n]) => n).join(', ')} · floor=${FLOOR}px\n`
)

const browser = await chromium.launch()
const context = await browser.newContext()
// First-party only: ads and analytics add seconds per page and no layout.
await context.route('**/*', r => {
  const host = new URL(r.request().url()).hostname
  return /cambio-uruguay\.com$|^localhost$|^127\.0\.0\.1$/.test(host) ? r.continue() : r.abort()
})

const findings = []
const rows = []
for (const route of routes) {
  for (const [view, size] of viewports) {
    const page = await context.newPage()
    await page.setViewportSize(size)
    try {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 60_000 })
      await page.waitForTimeout(800)
      const m = await page.evaluate(probe)
      const gap = m.minL === null ? null : Math.min(m.minL, m.minR)
      rows.push({ route, view, gap, m })
      if (m.scrollW > m.vw + 1)
        findings.push({ kind: 'OVERFLOW', route, view, detail: `${m.scrollW}px wide in ${m.vw}px` })
      if (gap !== null && gap < FLOOR && !FULL_BLEED.has(route)) {
        findings.push({
          kind: 'EDGE',
          route,
          view,
          detail: `${m.minL}/${m.minR}px (${m.minL <= m.minR ? m.atL : m.atR})`,
        })
      }
    } catch (e) {
      rows.push({ route, view, gap: null, error: String(e.message).slice(0, 80) })
    } finally {
      await page.close()
    }
  }
}
await browser.close()

const pad = (s, n) => String(s).padEnd(n)
for (const f of findings.sort((a, b) => a.route.localeCompare(b.route))) {
  console.log(`${pad(f.kind, 9)} ${pad(f.view, 8)} ${pad(f.route, 52)} ${f.detail}`)
}
const errors = rows.filter(r => r.error)
for (const r of errors) console.log(`ERROR    ${pad(r.view, 8)} ${pad(r.route, 52)} ${r.error}`)

const measured = rows.filter(r => r.gap !== null)
const dist = {}
for (const r of measured) dist[r.gap] = (dist[r.gap] || 0) + 1
console.log(
  `\n${rows.length} reads · ${findings.filter(f => f.kind === 'EDGE').length} EDGE · ${findings.filter(f => f.kind === 'OVERFLOW').length} OVERFLOW · ${errors.length} errors`
)
console.log(
  'edge distances seen: ' +
    Object.entries(dist)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([g, n]) => `${g}px×${n}`)
      .join('  ')
)
process.exit(findings.length ? 1 : 0)
