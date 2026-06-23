// One-off: sweep key pages in forced LIGHT mode, run axe-core, report
// color-contrast + serious/critical violations with element targets.
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3311'
const PAGES = (process.env.PAGES && process.env.PAGES.split(',')) || [
  '/',
  '/comparar',
  '/mapa',
  '/estado',
  '/indicadores',
  '/convertir',
  '/herramientas',
  '/herramientas/carrito-importacion',
  '/blog',
  '/noticias',
  '/cotizacion',
]

const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js'

const browser = await chromium.launch()
const ctx = await browser.newContext({ colorScheme: 'light', viewport: { width: 1366, height: 900 } })
// Seed the light preference before any app code runs.
await ctx.addInitScript(() => {
  try { localStorage.setItem('cu_theme', 'light') } catch {}
})
const page = await ctx.newPage()

const summary = []
for (const path of PAGES) {
  const url = BASE + path
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  } catch (e) {
    // networkidle can flake on pages with long-polling/live API; fall back.
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }) } catch {}
  }
  // Block until the client theme controller has applied light (post-hydration).
  // Cold-compiling pages can hydrate well after load, so don't snapshot early.
  try {
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'light',
      { timeout: 20000 },
    )
  } catch {
    console.log(`  ! ${path}: theme never became light within 20s (snapshot may be dark)`)
  }
  // Let the a11y shim + lazy content settle.
  await page.waitForTimeout(1200)
  const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await page.addScriptTag({ url: AXE_CDN })
  const res = await page.evaluate(async () => {
    // @ts-ignore
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      resultTypes: ['violations'],
    })
    return r.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 6).map(n => ({
        target: n.target.join(' '),
        summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220),
        html: n.html.slice(0, 160),
      })),
      count: v.nodes.length,
    }))
  })
  const contrast = res.filter(v => v.id === 'color-contrast')
  const other = res.filter(v => v.id !== 'color-contrast' && (v.impact === 'serious' || v.impact === 'critical'))
  summary.push({ path, applied })
  console.log('\n========================================')
  console.log(`PAGE ${path}  (theme=${applied})`)
  if (!contrast.length && !other.length) {
    console.log('  ✓ no contrast / serious+ violations')
  }
  for (const v of [...contrast, ...other]) {
    console.log(`  [${v.impact}] ${v.id} — ${v.help} (${v.count} node${v.count > 1 ? 's' : ''})`)
    for (const n of v.nodes) {
      console.log(`     • ${n.target}`)
      if (v.id === 'color-contrast') console.log(`       ${n.summary}`)
      console.log(`       ${n.html}`)
    }
  }
}

await browser.close()
console.log('\n=== swept', summary.length, 'pages ===')
console.log(summary.map(s => `${s.path} [${s.applied}]`).join('  '))
