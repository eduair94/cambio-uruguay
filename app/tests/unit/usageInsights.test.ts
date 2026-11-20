import { describe, expect, it } from 'vitest'
import {
  UI_SEVERITY,
  UI_SIGNAL_COLUMNS,
  UI_SIGNAL_IDS,
  UI_SIGNAL_LABELS,
  UI_SOURCE_IDS,
  UI_SOURCE_LABELS,
  UI_SOURCE_STATUSES,
  UI_STATUS,
  UI_COVERAGE_LABELS,
  actionableSignals,
  filterPages,
  isExternalUrl,
  isLinkablePath,
  normalizeInsightPath,
  orderSignals,
  pageDetail,
  pageDetailFields,
  sortPages,
  sourceTables,
  uiCell,
  uiDropNulls,
  uiFamilies,
  uiFormat,
  uiKpis,
  uiLocales,
  uiRate,
  uiSourceDate,
  uiSourceStatusRows,
  uiThresholds,
  waitingSignals,
  type Signal,
  type UsageInsightSnapshot,
} from '../../utils/usageInsights'
import { usageInsightsFixture } from './fixtures/usageInsightsSnapshot'

const clone = (): UsageInsightSnapshot => structuredClone(usageInsightsFixture)

describe('contrato del tablero de uso', () => {
  it('lista las ocho fuentes y las doce señales en el orden de la spec', () => {
    expect([...UI_SOURCE_IDS]).toEqual([
      'cloudflareRum',
      'ga4Behavior',
      'indexation',
      'feedback',
      'clarity',
      'bing',
      'cloudflareZone',
      'crux',
    ])
    expect(UI_SIGNAL_IDS).toHaveLength(12)
    expect(new Set(UI_SIGNAL_IDS).size).toBe(12)
  })

  it('cada señal tiene columnas y etiqueta, y cada fuente su etiqueta', () => {
    for (const id of UI_SIGNAL_IDS) {
      expect(UI_SIGNAL_COLUMNS[id]?.length, id).toBeGreaterThan(0)
      expect(UI_SIGNAL_LABELS[id], id).toBeTruthy()
    }
    for (const id of UI_SOURCE_IDS) expect(UI_SOURCE_LABELS[id], id).toBeTruthy()
  })

  it('cada estado de fuente y cada severidad tiene etiqueta y color', () => {
    for (const s of UI_SOURCE_STATUSES) {
      expect(UI_STATUS[s].label, s).toBeTruthy()
      expect(UI_STATUS[s].color, s).toBeTruthy()
    }
    for (const sev of ['high', 'medium', 'low', 'none'] as const) {
      expect(UI_SEVERITY[sev].color).toBeTruthy()
    }
  })

  it('el fixture cubre un bloque por estado y tiene las doce señales', () => {
    const statuses = new Set(Object.values(usageInsightsFixture.sources).map(b => b.status))
    expect([...statuses].sort()).toEqual([...UI_SOURCE_STATUSES].sort())
    expect(usageInsightsFixture.signals.map(s => s.id).sort()).toEqual([...UI_SIGNAL_IDS].sort())
    expect(usageInsightsFixture.pages).toHaveLength(5)
  })

  it('las columnas de cada señal leen campos que el fixture trae', () => {
    for (const s of usageInsightsFixture.signals) {
      for (const r of s.rows) {
        for (const col of UI_SIGNAL_COLUMNS[s.id]) {
          if (col.get) continue
          expect(Object.prototype.hasOwnProperty.call(r, col.key), `${s.id}.${col.key}`).toBe(true)
        }
      }
    }
  })
})

describe('orderSignals', () => {
  it('pone primero las ok con filas por severidad e impacto, después stale y unavailable', () => {
    const ordered = orderSignals(usageInsightsFixture.signals).map(s => s.id)
    expect(ordered.slice(0, 3)).toEqual(['consent-gap', 'poor-vitals', 'mobile-worse'])
    expect(ordered.slice(-3)).toEqual(['not-indexed', 'bing-only-queries', 'friction'])
  })

  it('una ok sin filas va entre las que tienen filas y las stale', () => {
    const s = clone()
    const edge = s.signals.find(x => x.id === 'edge-errors') as Signal
    edge.rows = []
    edge.severity = 'none'
    const ordered = orderSignals(s.signals).map(x => x.id)
    const at = ordered.indexOf('edge-errors')
    expect(at).toBe(ordered.indexOf('not-indexed') - 1)
    expect(actionableSignals(s.signals).map(x => x.id)).not.toContain('edge-errors')
  })

  it('separa lo que se muestra arriba de lo que todavía no tiene datos', () => {
    expect(actionableSignals(usageInsightsFixture.signals).every(s => s.status === 'ok')).toBe(true)
    expect(waitingSignals(usageInsightsFixture.signals).map(s => s.id)).toEqual([
      'not-indexed',
      'bing-only-queries',
      'friction',
    ])
  })

  it('no muta el arreglo original', () => {
    const before = usageInsightsFixture.signals.map(s => s.id)
    orderSignals(usageInsightsFixture.signals)
    expect(usageInsightsFixture.signals.map(s => s.id)).toEqual(before)
  })
})

describe('páginas', () => {
  const pages = usageInsightsFixture.pages

  it('filtra por texto, familia, señal e idioma', () => {
    expect(filterPages(pages, { q: 'ALQUILER' }).map(p => p.path)).toEqual(['/alquileres-uruguay'])
    expect(filterPages(pages, { family: '/guias/*' })).toHaveLength(2)
    expect(filterPages(pages, { signal: 'helpful-no' }).map(p => p.path)).toEqual(['/guias/ahorro'])
    expect(filterPages(pages, { locale: 'fr' }).map(p => p.path)).toEqual(['/fr/guias/epargne'])
    expect(filterPages(pages, { locale: 'es' })).toHaveLength(4)
    expect(filterPages(pages, {})).toHaveLength(5)
  })

  it('ordena por cargas con los sin dato al final', () => {
    expect(sortPages(pages, 'loads').map(p => p.path)).toEqual([
      '/',
      '/alquileres-uruguay',
      '/guias/ahorro',
      '/fr/guias/epargne',
      '/vieja-pagina',
    ])
  })

  it('cobertura e interacción van de la peor a la mejor', () => {
    expect(
      sortPages(pages, 'coverage')
        .map(p => p.path)
        .slice(0, 2)
    ).toEqual(['/', '/alquileres-uruguay'])
    expect(sortPages(pages, 'engagement')[0]!.path).toBe('/vieja-pagina')
  })

  it('una página sin medición de lectura va al final del orden por lectura', () => {
    const order = sortPages(pages, 'read').map(p => p.path)
    expect(order.indexOf('/guias/ahorro')).toBeGreaterThan(order.indexOf('/vieja-pagina'))
  })

  it('familias por peso e idiomas con el español primero', () => {
    expect(uiFamilies(pages)[0]).toBe('/')
    expect(uiLocales(pages)).toEqual(['es', 'fr'])
  })

  it('"sin medición" no es 0 %', () => {
    const guide = pages.find(p => p.path === '/guias/ahorro')!
    expect(uiRate(guide, 'read')).toBe('sin medición')
    expect(uiRate(guide, 'outbound')).toBe('sin medición')
    const home = pages.find(p => p.path === '/')!
    expect(uiRate(home, 'read')).toBe('30 %')
    const fr = pages.find(p => p.path === '/fr/guias/epargne')!
    expect(uiRate(fr, 'read')).toBe('—')
  })
})

describe('uiFormat', () => {
  it('nulos son una raya en todos los tipos', () => {
    for (const kind of ['int', 'pct', 'ms', 'cls', 'rating', 'date', 'text', 'p75'] as const) {
      expect(uiFormat(null, kind)).toBe('—')
      expect(uiFormat(undefined, kind)).toBe('—')
    }
  })

  it('formatea cada tipo en es-UY', () => {
    expect(uiFormat(12340, 'int')).toBe('12.340')
    expect(uiFormat(5.25, 'num')).toBe('5,3')
    expect(uiFormat(0.41, 'pct')).toBe('41 %')
    expect(uiFormat(0.035, 'pct')).toBe('3,5 %')
    expect(uiFormat(0, 'pct')).toBe('0 %')
    expect(uiFormat(0.3, 'pts')).toBe('30 pts')
    expect(uiFormat(312, 'ms')).toBe('312 ms')
    expect(uiFormat(1900, 'ms')).toBe('1,9 s')
    expect(uiFormat(75, 'sec')).toBe('1 min 15 s')
    expect(uiFormat(0.1234, 'cls')).toBe('0,123')
    expect(uiFormat('good', 'rating')).toBe('bien')
    expect(uiFormat('ni', 'rating')).toBe('regular')
    expect(uiFormat('poor', 'rating')).toBe('mal')
    expect(uiFormat('2026-11-20', 'date')).toBe('20/11/2026')
    expect(uiFormat(true, 'bool')).toBe('sí')
    expect(uiFormat(false, 'bool')).toBe('no')
    expect(uiFormat(42.4, 'depth')).toBe('42 %')
    expect(uiFormat('/x', 'path')).toBe('/x')
  })

  it('el p75 depende de la métrica de la fila', () => {
    expect(uiFormat(0.31, 'p75', { metric: 'cls' })).toBe('0,310')
    expect(uiFormat(3900, 'p75', { metric: 'lcp' })).toBe('3,9 s')
  })

  it('una celda de canónica igual a la ruta dice "la misma"', () => {
    const col = UI_SIGNAL_COLUMNS['not-indexed'].find(c => c.key === 'googleCanonical')!
    expect(uiCell(col, { googleCanonical: '=' })).toBe('la misma')
    const cls = UI_SIGNAL_COLUMNS['not-indexed'].find(c => c.key === 'class')!
    expect(uiCell(cls, { class: 'crawled-not-indexed' })).toBe(
      UI_COVERAGE_LABELS['crawled-not-indexed']
    )
  })

  it('umbrales, fechas de fuente y huecos de las series', () => {
    expect(uiThresholds({ PV_MIN_SAMPLES: 30, CG_REL: 0.6 })).toBe('PV_MIN_SAMPLES 30 · CG_REL 0,6')
    expect(uiThresholds(undefined)).toBe('')
    expect(uiSourceDate({ fetchedAt: '2026-11-20T12:21:00.000Z' })).toBe('datos del 20/11')
    expect(uiSourceDate({ fetchedAt: null })).toBe('sin datos')
    expect(uiDropNulls([1, null, 3])).toEqual([1, 3])
    expect(uiDropNulls(null)).toEqual([])
  })

  it('sólo enlaza rutas reales y enlaces https', () => {
    expect(isLinkablePath('/alquileres-uruguay')).toBe(true)
    expect(isLinkablePath('/autos-usados-uruguay/:item')).toBe(false)
    expect(isLinkablePath('=')).toBe(false)
    expect(isLinkablePath('//evil.example')).toBe(false)
    expect(isLinkablePath('/\\evil.example')).toBe(false)
    expect(isLinkablePath('/ok\\..\\evil')).toBe(false)
    expect(isLinkablePath('/a b')).toBe(false)
    expect(isLinkablePath('/a\tb')).toBe(false)
    expect(isLinkablePath('/')).toBe(true)
    expect(isLinkablePath('/en/dolar-hoy-uruguay')).toBe(true)
    expect(isExternalUrl('https://evil.example\\x')).toBe(false)
    expect(isExternalUrl('https://search.google.com/x')).toBe(true)
    expect(isExternalUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('pageDetail', () => {
  it('junta la fila de la página y sus filas de señales', () => {
    const d = pageDetail(usageInsightsFixture, '/alquileres-uruguay')
    expect(d.row?.path).toBe('/alquileres-uruguay')
    expect(d.signalRows.map(x => x.signal.id)).toEqual([
      'poor-vitals',
      'poor-vitals',
      'mobile-worse',
    ])
  })

  it('acepta una URL completa o con query', () => {
    expect(normalizeInsightPath('https://cambio-uruguay.com/guias/ahorro/?utm=x')).toBe(
      '/guias/ahorro'
    )
    expect(normalizeInsightPath('guias/ahorro#a')).toBe('/guias/ahorro')
    expect(normalizeInsightPath('/')).toBe('/')
    expect(pageDetail(usageInsightsFixture, 'https://cambio-uruguay.com/').row?.path).toBe('/')
  })

  it('una ruta que no está devuelve null sin romper', () => {
    const d = pageDetail(usageInsightsFixture, '/no-existe')
    expect(d.row).toBeNull()
    expect(d.signalRows).toEqual([])
  })

  it('la ficha agrupa por fuente y dice "sin medición" y "pendiente"', () => {
    const guide = usageInsightsFixture.pages.find(p => p.path === '/guias/ahorro')!
    const sections = pageDetailFields(guide)
    const titles = sections.map(s => s.title)
    expect(titles).toContain(UI_SOURCE_LABELS.ga4Behavior)
    expect(titles).toContain(UI_SOURCE_LABELS.feedback)
    expect(titles).not.toContain(UI_SOURCE_LABELS.clarity)
    const ga4 = sections.find(s => s.title === UI_SOURCE_LABELS.ga4Behavior)!
    expect(ga4.items.find(i => i.label === 'Llega a la mitad')?.value).toBe('sin medición')
    const fr = usageInsightsFixture.pages.find(p => p.path === '/fr/guias/epargne')!
    const idx = pageDetailFields(fr).find(s => s.title === UI_SOURCE_LABELS.indexation)!
    expect(idx.items[0]!.value).toBe('pendiente (nueva)')
  })
})

describe('encabezado y fuentes', () => {
  it('las tejas leen las fuentes y la cobertura cuando es usable', () => {
    const kpis = uiKpis(usageInsightsFixture)
    expect(kpis.map(k => k.id)).toEqual(['loads', 'coverage', 'inspected', 'signals'])
    expect(kpis[0]!.value).toBe('52.000')
    expect(kpis[0]!.note).toBe('28 días · 3 días medidos')
    expect(kpis[1]!.value).toBe('41 %')
    expect(kpis[2]!.value).toBe('1.200')
    expect(kpis[2]!.note).toContain('120 de 800 al azar')
    expect(kpis[3]!.value).toBe('9')
  })

  it('sin datos o sin comparación usable muestra "—" y el motivo, nunca un cero', () => {
    const s = clone()
    s.sources.cloudflareRum.data = null
    s.sources.cloudflareRum.enableHint = 'falta CLOUDFLARE_TOKEN'
    s.consentCheck = { ...s.consentCheck!, usable: false, reason: 'faltan días: 2 de 7' }
    s.sources.indexation.data = null
    const kpis = uiKpis(s)
    expect(kpis[0]).toMatchObject({ value: '—', note: 'falta CLOUDFLARE_TOKEN' })
    expect(kpis[1]).toMatchObject({ value: '—', note: 'faltan días: 2 de 7' })
    expect(kpis[2]!.value).toBe('—')
    s.consentCheck = null
    expect(uiKpis(s)[1]!.value).toBe('—')
  })

  it('una fila de estado por fuente; la inactiva muestra qué variable falta', () => {
    const rows = uiSourceStatusRows(usageInsightsFixture.sources)
    expect(rows.map(r => r.id)).toEqual([...UI_SOURCE_IDS])
    const clarity = rows.find(r => r.id === 'clarity')!
    expect(clarity.statusLabel).toBe('inactiva')
    expect(clarity.note).toContain('CLARITY_EXPORT_TOKEN')
    expect(rows.find(r => r.id === 'ga4Behavior')!.carried).toBe('linkAreas')
    expect(rows.find(r => r.id === 'feedback')!.date).toBe('datos del 10/11')
  })

  it('un documento sin un bloque no rompe la tabla de estado', () => {
    const s = clone()
    delete (s.sources as Partial<typeof s.sources>).crux
    const rows = uiSourceStatusRows(s.sources)
    expect(rows.find(r => r.id === 'crux')).toMatchObject({
      status: 'inactive',
      note: 'sin bloque en el documento',
    })
    expect(uiSourceStatusRows(null)).toHaveLength(8)
  })

  it('arma las tablas de cada fuente con datos y ninguna para la que no tiene', () => {
    const src = usageInsightsFixture.sources
    expect(sourceTables(src, 'cloudflareRum').map(t => t.id)).toEqual([
      'devices',
      'referrers',
      'countries',
      'vitals',
      'elements',
    ])
    expect(sourceTables(src, 'clarity')).toEqual([])
    expect(sourceTables(src, 'crux')).toEqual([])
    for (const id of UI_SOURCE_IDS) {
      for (const t of sourceTables(src, id)) {
        for (const r of t.rows)
          for (const col of t.columns) expect(typeof uiCell(col, r)).toBe('string')
      }
    }
    const elements = sourceTables(src, 'cloudflareRum').find(t => t.id === 'elements')!
    const el = elements.columns.find(c => c.key === 'element')!
    expect(uiCell(el, elements.rows[1])).toBe('sin atribuir')
  })

  it('sin la dimensión q las búsquedas se cuentan por página', () => {
    const s = clone()
    s.sources.ga4Behavior.data!.search.qRegistered = false
    const search = sourceTables(s.sources, 'ga4Behavior').find(t => t.id === 'search')!
    expect(search.columns[0]!.kind).toBe('path')
    expect(search.rows[0]).toEqual({ term: '/', events: 80 })
  })
})
