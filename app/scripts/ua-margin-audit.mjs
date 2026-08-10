// Sweep every route for spacing that comes from the BROWSER's default stylesheet
// instead of from our CSS.
//
// Why this exists: Vuetify 4's reset does not zero the margins of <p>, <h1>-<h6>,
// <ul>, <ol>, <dl>, <blockquote>, <pre> or <figure>, so each of them still carries
// the UA `margin-block: 1em`. Between two stacked siblings that margin collapses
// and nobody notices. It does NOT collapse when the element is the first child of
// a padded box or of a flex/grid item — which is exactly how every callout, alert
// head and icon+title row is built here. The result is a title that sits ~14px
// below the icon it belongs to (DESIGN.md → "The Text Block Owns Its Top Margin Rule").
//
// The probe injects a specificity-0 rule:
//     :where(p, h1..h6, ul, ol, dl, blockquote, pre, figure) { margin-block-start: 0 }
// It beats the UA sheet and loses to every rule we author, so any element that
// moves was being spaced by the browser rather than by us.
//
// Findings:
//   TRAPPED — first child of a padded / bordered / flex / grid box. The margin
//             cannot collapse away, so it renders as an unintended gap. Always a
//             defect; `critical.css` already neutralises the first-child case.
//   REVIEW  — the element moved but its margin was collapsing outward or against a
//             sibling, i.e. that gap is currently load-bearing. Declare the spacing
//             in our CSS before removing the UA margin there.
//
// Usage:
//   node scripts/ua-margin-audit.mjs                       # live site, all sitemap routes
//   BASE=http://localhost:3311 node scripts/ua-margin-audit.mjs
//   PAGES=/,/recibir-regalos-del-exterior-uruguay node scripts/ua-margin-audit.mjs
//   VIEWPORTS=desktop node scripts/ua-margin-audit.mjs     # desktop | mobile | both (default)
//   SCOPE=first-child node scripts/ua-margin-audit.mjs     # only what critical.css already neutralises
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'https://cambio-uruguay.com'
const TAGS = 'p, h1, h2, h3, h4, h5, h6, ul, ol, dl, blockquote, pre, figure'
// `all` sees every UA margin still in play; `first-child` re-checks the exact rule
// shipped in critical.css, so a REVIEW finding there is a regression it would cause.
const SCOPE = process.env.SCOPE === 'first-child' ? 'first-child' : 'all'
const SELECTOR =
  SCOPE === 'first-child'
    ? TAGS.split(', ')
        .map(t => `${t}:first-child`)
        .join(', ')
    : TAGS
const PROBE_CSS = `:where(${SELECTOR}){margin-block-start:0}`
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
}

const probe = ({ selector, css }) => {
  const els = [...document.querySelectorAll(selector)]
  const gapOf = el => {
    const b = el.getBoundingClientRect()
    const prev = el.previousElementSibling
    if (prev) return b.top - prev.getBoundingClientRect().bottom
    const parent = el.parentElement
    if (!parent) return null
    const pcs = getComputedStyle(parent)
    return (
      b.top -
      parent.getBoundingClientRect().top -
      parseFloat(pcs.paddingTop) -
      parseFloat(pcs.borderTopWidth)
    )
  }
  const describe = el => {
    const parts = []
    let n = el
    for (let i = 0; i < 3 && n; i++, n = n.parentElement) {
      const cls = String(n.className || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join('.')
      parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''))
    }
    return parts.join(' > ')
  }

  const before = els.map(gapOf)
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  const after = els.map(gapOf)
  style.remove()

  const findings = []
  before.forEach((b, i) => {
    const a = after[i]
    if (b == null || a == null || b - a <= 1) return
    const el = els[i]
    const parent = el.parentElement
    const pcs = getComputedStyle(parent)
    const gpcs = parent.parentElement ? getComputedStyle(parent.parentElement) : null
    const isFirst = parent.firstElementChild === el
    const boxed =
      /flex|grid/.test(pcs.display) ||
      (gpcs && /flex|grid/.test(gpcs.display)) ||
      parseFloat(pcs.paddingTop) > 0 ||
      parseFloat(pcs.borderTopWidth) > 0
    findings.push({
      kind: isFirst && boxed ? 'TRAPPED' : 'REVIEW',
      tag: el.tagName.toLowerCase(),
      desc: describe(el),
      text: el.textContent.trim().slice(0, 40),
      before: Math.round(b),
      after: Math.round(a),
    })
  })
  return findings
}

const routes = process.env.PAGES
  ? process.env.PAGES.split(',').map(r => r.trim())
  : await (async () => {
      const xml = await (await fetch(`${BASE}/__sitemap__/es-ES.xml`)).text()
      return [
        ...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname)),
      ]
    })()

const wanted = process.env.VIEWPORTS || 'both'
const viewports = Object.entries(VIEWPORTS).filter(([name]) => wanted === 'both' || wanted === name)

console.log(
  `${BASE} · ${routes.length} routes · ${viewports.map(([n]) => n).join(', ')} · scope=${SCOPE}\n`
)

const browser = await chromium.launch()
const totals = { TRAPPED: 0, REVIEW: 0 }
const byIdiom = new Map()
let failed = 0

for (const [name, viewport] of viewports) {
  const page = await browser.newPage({ viewport })
  for (const route of routes) {
    let findings
    try {
      const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
      // A 500 renders no content and would report a clean page — say so instead.
      // A cold `npm run dev` returns exactly that for its first few requests.
      if (res && !res.ok()) {
        failed++
        console.log(`  ERROR ${name} ${route} — HTTP ${res.status()}`)
        continue
      }
      await page.waitForTimeout(450)
      findings = await page.evaluate(probe, { selector: SELECTOR, css: PROBE_CSS })
    } catch (e) {
      failed++
      console.log(`  ERROR ${name} ${route} — ${e.message.split('\n')[0]}`)
      continue
    }
    for (const f of findings) {
      totals[f.kind]++
      const key = `${f.kind}  ${f.desc}`
      if (!byIdiom.has(key)) byIdiom.set(key, { count: 0, routes: new Set(), sample: f })
      const entry = byIdiom.get(key)
      entry.count++
      entry.routes.add(route)
    }
    const trapped = findings.filter(f => f.kind === 'TRAPPED').length
    if (trapped) console.log(`  ${name} ${route} — ${trapped} trapped`)
  }
  await page.close()
}
await browser.close()

const dump = kind => {
  const rows = [...byIdiom.entries()]
    .filter(([k]) => k.startsWith(kind))
    .sort((a, b) => b[1].count - a[1].count)
  console.log(`\n=== ${kind} (${rows.length} idioms, ${totals[kind]} elements) ===`)
  for (const [key, v] of rows) {
    const pages = [...v.routes]
    console.log(
      `${String(v.count).padStart(4)}x ${key.slice(kind.length + 2)}  ${v.sample.before}px → ${v.sample.after}px` +
        `\n       ${pages.slice(0, 5).join(', ')}${pages.length > 5 ? ` (+${pages.length - 5})` : ''}`
    )
  }
}
dump('TRAPPED')
dump('REVIEW')

const reads = routes.length * viewports.length
console.log(
  `\nTRAPPED=${totals.TRAPPED} REVIEW=${totals.REVIEW} (${reads - failed}/${reads} page loads read)`
)
process.exitCode = totals.TRAPPED > 0 || failed > 0 ? 1 : 0
