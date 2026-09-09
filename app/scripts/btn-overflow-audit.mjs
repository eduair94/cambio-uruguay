// Sweep every route for button LABELS that render OUTSIDE their own button.
//
// Why this exists: Vuetify 3's `.v-btn` carried `overflow: hidden`, so a label wider
// than the button was clipped — ugly, but contained. Vuetify 4 dropped it (VBtn.css
// has `max-width: 100%` and nothing else), while `.v-btn__content` still ships
// `white-space: nowrap`. The pair means a long label neither wraps nor clips: it
// SPILLS, drawing text over whatever sits next to the button. `.v-chip` is NOT affected
// (VChip.css still carries `overflow: hidden`, so a long chip clips instead). The site's
// own `legacy-vuetify.css` makes buttons likelier to spill by restoring the v3 UPPERCASE,
// which widens every label ~8%.
//
// The probe measures the label box against the control box. `.v-btn__content` is the
// element Vuetify sizes, so a content rect that reaches past the control's padding box
// is text on top of the page, not text inside a button.
//
// Findings:
//   SPILL   — label escapes horizontally or vertically. Always a defect.
//   ICON    — an icon button whose glyph is wider than the button. A different defect
//             (the square control got squeezed), and out of reach of any wrap rule.
//   FLUSH   — the label (icon included) sits within 8px of the button's own edge. Not a
//             width problem: the button was authored with its horizontal padding
//             zeroed, so the hover/focus box hugs the text and the control reads as
//             cut off. 8px is Vuetify's own floor (`--size-x-small`); nothing it ships
//             gets closer. A flush-left label that must align with the paragraph above
//             it uses `cu-btn-flush` (legacy-vuetify.css), which keeps the padding and
//             pulls the box out with a negative margin instead.
//   TIGHT   — label fits inside the border box but eats into the horizontal padding
//             (<2px of air left). Not broken today; the next translation breaks it.
//   GREW    — FIX=1 only: the rule changed this button's box. Its blast radius; every
//             one of these is a button that has to be looked at, not only counted.
//
// Usage:
//   node scripts/btn-overflow-audit.mjs                      # live site, all sitemap routes
//   BASE=http://localhost:3311 node scripts/btn-overflow-audit.mjs
//   PAGES=/,/descuentos-con-tarjeta-uruguay node scripts/btn-overflow-audit.mjs
//   VIEWPORTS=mobile node scripts/btn-overflow-audit.mjs     # desktop | mobile | both (default)
//   FIX=1 node scripts/btn-overflow-audit.mjs                # re-measure with the candidate fix injected
//   ALL=1 node scripts/btn-overflow-audit.mjs                # every sitemap URL, not one per family
//
// The sitemap is ~3000 URLs, but ~1250 of them are the programmatic families
// (/sucursal/*, /casa/*, /descuentos-con-tarjeta-uruguay/marca/*, …) rendered by one
// template each. Sampling one URL per family covers the same components in minutes
// instead of hours; `ALL=1` sweeps the lot when a per-URL answer is what's wanted.
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'https://cambio-uruguay.com'
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
}

// The candidate fix, kept here so `FIX=1` proves the shipped rule is the one measured.
// Mirrors assets/css/legacy-vuetify.css — update both together.
const FIX_CSS = `
:where(.v-btn:not(.v-btn--icon):not(.v-btn--stacked):not(.v-tab)) {
  --cu-btn-density-delta: 0px;
  height: auto;
  min-height: calc(var(--v-btn-height) + var(--cu-btn-density-delta));
}
:where(.v-btn--density-comfortable) {
  --cu-btn-density-delta: -8px;
}
:where(.v-btn--density-compact) {
  --cu-btn-density-delta: -12px;
}
:where(.v-btn:not(.v-btn--icon):not(.v-btn--stacked):not(.v-tab)) > .v-btn__content {
  white-space: normal;
  min-width: 0;
}
:where(.v-btn-group:not(.cu-btn-wrap) > .v-btn) {
  height: auto;
  min-height: 0;
}
:where(.v-btn-group:not(.cu-btn-wrap) > .v-btn) > .v-btn__content {
  white-space: nowrap;
}
`

const probe = ({ css }) => {
  const buttons = [...document.querySelectorAll('.v-btn')]
  // With FIX on, hold the pre-injection geometry so the run also reports the rule's
  // blast radius: every button whose box the rule moves, not only the ones it repairs.
  const before = css
    ? buttons.map(b => {
        const r = b.getBoundingClientRect()
        return { w: r.width, h: r.height }
      })
    : null
  if (css) {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    document.body.getBoundingClientRect()
  }

  const describe = el => {
    const parts = []
    let n = el
    for (let i = 0; i < 3 && n; i++, n = n.parentElement) {
      const cls = String(n.className || '')
        .trim()
        .split(/\s+/)
        .filter(c => c && !/^v-theme--|^v-btn--(?:density|size|variant)/.test(c))
        .slice(0, 2)
        .join('.')
      parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''))
    }
    return parts.join(' > ')
  }

  const findings = []
  buttons.forEach((el, i) => {
    const content = el.querySelector(':scope > .v-btn__content')
    if (!content) return
    const box = el.getBoundingClientRect()
    const label = content.getBoundingClientRect()
    // A control that is not laid out (display:none ancestor, closed menu) reports 0x0.
    if (box.width === 0 || box.height === 0) return

    const cs = getComputedStyle(el)
    const padL = parseFloat(cs.paddingLeft) || 0
    const padR = parseFloat(cs.paddingRight) || 0
    const out = Math.max(box.left - label.left, label.right - box.right, label.bottom - box.bottom)
    const air = Math.min(label.left - (box.left + padL), box.right - padR - label.right)
    // FLUSH measures the whole inner run — prepend icon, label, append icon — against
    // the border box, because a zeroed padding shows first on the icon: `.v-btn__prepend`
    // carries a negative start margin that only reads as intended over real padding.
    const inner = [
      ...el.querySelectorAll(
        ':scope > .v-btn__prepend, :scope > .v-btn__content, :scope > .v-btn__append'
      ),
    ]
      .map(part => part.getBoundingClientRect())
      .filter(r => r.width > 0)
      .reduce(
        (acc, r) => ({ left: Math.min(acc.left, r.left), right: Math.max(acc.right, r.right) }),
        { left: label.left, right: label.right }
      )
    const edge = Math.min(inner.left - box.left, box.right - inner.right)

    const row = {
      desc: describe(el),
      text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 44),
      box: Math.round(box.width),
      label: Math.round(label.width),
      out: Math.round(out),
    }
    // An icon button that overflows is a different defect — a square control squeezed
    // narrower than its own glyph — and no wrap rule can help it, so it gets its own
    // bucket instead of making a clean FIX=1 run look like a failure.
    const isIcon = el.classList.contains('v-btn--icon')
    const kind =
      out > 1
        ? isIcon
          ? 'ICON'
          : 'SPILL'
        : !isIcon && edge < 8
          ? 'FLUSH'
          : air < 2 && !isIcon
            ? 'TIGHT'
            : null
    if (kind) findings.push({ ...row, kind, out: kind === 'FLUSH' ? Math.round(edge) : row.out })

    const prev = before && before[i]
    if (prev && (Math.abs(prev.h - box.height) > 0.5 || Math.abs(prev.w - box.width) > 0.5)) {
      findings.push({
        ...row,
        kind: 'GREW',
        out: Math.round(box.height - prev.h),
        box: Math.round(prev.h),
        label: Math.round(box.height),
      })
    }
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
      // One URL per template: keep every route whole down to its last static-looking
      // segment, then collapse the rest. `/casa/brou/dolar` and `/casa/itau/dolar` are
      // the same component with different data; `/glosario` is its own page.
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
const css = process.env.FIX ? FIX_CSS : ''

console.log(
  `${BASE} · ${routes.length} routes · ${viewports.map(([n]) => n).join(', ')} · fix=${css ? 'on' : 'off'}\n`
)

const browser = await chromium.launch()
const totals = { SPILL: 0, FLUSH: 0, TIGHT: 0, GREW: 0, ICON: 0 }
const byIdiom = new Map()
let failed = 0

for (const [name, viewport] of viewports) {
  const page = await browser.newPage({ viewport })
  for (const route of routes) {
    let findings
    try {
      const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 })
      if (res && !res.ok()) {
        failed++
        console.log(`  ERROR ${name} ${route} — HTTP ${res.status()}`)
        continue
      }
      await page.waitForTimeout(450)
      findings = await page.evaluate(probe, { css })
    } catch (e) {
      failed++
      console.log(`  ERROR ${name} ${route} — ${e.message.split('\n')[0]}`)
      continue
    }
    for (const f of findings) {
      totals[f.kind]++
      const key = JSON.stringify([f.kind, name, f.desc, f.text])
      if (!byIdiom.has(key))
        byIdiom.set(key, { count: 0, routes: new Set(), sample: f, view: name })
      const entry = byIdiom.get(key)
      entry.count++
      entry.routes.add(route)
    }
    const spills = findings.filter(f => f.kind === 'SPILL').length
    if (spills) console.log(`  ${name} ${route} — ${spills} spilling`)
  }
  await page.close()
}
await browser.close()

const dump = kind => {
  const rows = [...byIdiom.entries()]
    .filter(([, v]) => v.sample.kind === kind)
    .sort((a, b) => b[1].count - a[1].count)
  console.log(`\n=== ${kind} (${rows.length} idioms, ${totals[kind]} elements) ===`)
  for (const [, v] of rows) {
    const { view, sample } = v
    const pages = [...v.routes]
    const measure =
      kind === 'FLUSH'
        ? `label ${sample.label}px in ${sample.box}px (${sample.out}px to the edge)`
        : `label ${sample.label}px in ${sample.box}px (+${sample.out}px out)`
    console.log(
      `${String(v.count).padStart(4)}x [${view}] ${sample.desc}  "${sample.text}"  ${measure}` +
        `\n       ${pages.slice(0, 5).join(', ')}${pages.length > 5 ? ` (+${pages.length - 5})` : ''}`
    )
  }
}
dump('SPILL')
dump('FLUSH')
dump('ICON')
if (css) dump('GREW')
if (process.env.TIGHT) dump('TIGHT')

const reads = routes.length * viewports.length
console.log(
  `\nSPILL=${totals.SPILL} FLUSH=${totals.FLUSH} ICON=${totals.ICON} TIGHT=${totals.TIGHT}` +
    (css ? ` GREW=${totals.GREW}` : '') +
    ` (${reads - failed}/${reads} page loads read)` +
    (process.env.TIGHT ? '' : '  — set TIGHT=1 to list the near-misses')
)
process.exitCode = totals.SPILL > 0 || totals.FLUSH > 0 || failed > 0 ? 1 : 0
