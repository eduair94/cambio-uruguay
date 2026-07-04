// One-off: sweep ALL pages in forced LIGHT mode, run axe-core, report
// color-contrast + serious/critical violations with element targets.
// Usage: BASE=http://localhost:3311 node scripts/lightmode-axe.mjs
//   PAGES=/,/mapa  -> restrict to a subset
//   ONLY=contrast  -> only report color-contrast (default reports contrast + serious/critical)
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3311'
const ALL_PAGES = [
  // --- core / landing ---
  '/',
  '/dolar-hoy',
  '/comparar',
  '/avanzado',
  '/mapa',
  '/estado',
  '/noticias',
  '/dolar/records',
  // --- info / legal / account ---
  '/acerca',
  '/desarrolladores',
  '/couriers-uruguay',
  '/prestamos-uruguay',
  '/casas-de-cambio',
  '/retirar-efectivo-uruguay',
  '/preguntas-frecuentes',
  '/newsletter',
  '/conectar',
  '/contacto',
  '/privacidad',
  '/terminos',
  '/cuenta',
  '/widget',
  '/offline',
  // --- index / catalog pages ---
  '/herramientas',
  '/historico',
  '/sucursales',
  '/glosario',
  '/cotizacion',
  '/convertir',
  '/indicadores',
  '/guias',
  '/blog',
  // --- tools (herramientas) ---
  '/herramientas/calculadora-iva',
  '/herramientas/calculadora-aguinaldo',
  '/herramientas/calculadora-spread',
  '/herramientas/calculadora-propinas',
  '/herramientas/calculadora-irpf',
  '/herramientas/calculadora-plazo-fijo',
  '/herramientas/conversor-de-monedas',
  '/herramientas/calculadora-presupuesto-viaje',
  '/herramientas/widget-dolar',
  '/herramientas/calculadora-prestamo',
  '/herramientas/calculadora-inflacion',
  '/herramientas/conversor-unidad-indexada',
  '/herramientas/calculadora-impuestos-importacion',
  '/herramientas/carrito-importacion',
  // --- dynamic (representative slugs) ---
  '/dolar/montevideo',
  '/casa/brou',
  '/convertir/100-dolares-a-pesos-uruguayos',
  '/historico/brou',
  '/historico/brou/usd',
  '/cotizacion/dolar',
  '/indicadores/unidad-indexada',
  '/sucursales/brou',
  '/glosario/cotizacion',
  '/guias/conviene-comprar-dolares-hoy',
  '/blog/2026-06-22-dolar-uruguay',
]
const PAGES = (process.env.PAGES && process.env.PAGES.split(',')) || ALL_PAGES
const ONLY = process.env.ONLY || ''

const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js'

const browser = await chromium.launch()
const VW = Number(process.env.VIEWPORT_W || 1366)
const VH = Number(process.env.VIEWPORT_H || 900)
const ctx = await browser.newContext({
  colorScheme: 'light',
  viewport: { width: VW, height: VH },
  isMobile: VW < 768,
  deviceScaleFactor: VW < 768 ? 2 : 1,
})
// Seed the light preference before any app code runs.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('cu_theme', 'light')
  } catch {}
})
const page = await ctx.newPage()

const summary = []
let totalContrast = 0
for (const path of PAGES) {
  const url = BASE + path
  let status = '?'
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
    status = resp ? resp.status() : '?'
  } catch {
    // networkidle can flake on pages with long-polling/live API; fall back.
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      status = resp ? resp.status() : '?'
    } catch {}
  }
  // Block until the client theme controller has applied light (post-hydration).
  try {
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'light',
      { timeout: Number(process.env.THEME_TIMEOUT || 25000) }
    )
  } catch {
    console.log(`  ! ${path}: theme never became light in time (snapshot may be dark)`)
  }
  // Let the a11y shim + lazy content settle.
  await page.waitForTimeout(1200)
  const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await page.addScriptTag({ url: AXE_CDN })
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      resultTypes: ['violations'],
    })
    return r.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 200).map(n => ({
        target: n.target.join(' '),
        summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 260),
        html: n.html.slice(0, 180),
      })),
      count: v.nodes.length,
    }))
  })
  const contrast = res.filter(v => v.id === 'color-contrast')
  const other =
    ONLY === 'contrast'
      ? []
      : res.filter(
          v => v.id !== 'color-contrast' && (v.impact === 'serious' || v.impact === 'critical')
        )
  const cCount = contrast.reduce((a, v) => a + v.count, 0)
  totalContrast += cCount
  summary.push({ path, applied, status, cCount })
  console.log('\n========================================')
  console.log(`PAGE ${path}  (theme=${applied}, http=${status}, contrast-nodes=${cCount})`)
  if (!contrast.length && !other.length) {
    console.log('  OK no contrast / serious+ violations')
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
console.log('TOTAL color-contrast nodes:', totalContrast)
const bad = summary.filter(s => s.cCount > 0)
if (bad.length) {
  console.log('PAGES WITH CONTRAST ISSUES:')
  for (const s of bad) console.log(`  ${s.path}  (${s.cCount} nodes)`)
} else {
  console.log('ALL CLEAN — 0 color-contrast nodes across all pages')
}
