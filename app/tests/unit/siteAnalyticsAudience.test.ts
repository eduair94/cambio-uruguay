// /estadisticas-del-sitio muestra por defecto a los lectores de Uruguay. Con todos los países, la
// mayoría de lo que GA4 mide es tráfico automatizado (16/11/2026: 73 % de las sesiones de 28 días
// venía de afuera y 97 % de ésas era una página y menos de diez segundos), y la página pública decía
// "21 % de interacción" de un sitio cuyos lectores interactúan el 67 %.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  audienceView,
  outsideUruguay,
  type AnalyticsTotals,
  type SiteAnalyticsSnapshot,
} from '../../utils/siteAnalytics'
import { siteStatsScopeMessages } from '../../utils/siteStatsScopeMessages'

const totals = (sessions: number, engagedSessions: number): AnalyticsTotals => ({
  activeUsers: sessions,
  newUsers: sessions,
  sessions,
  screenPageViews: sessions * 2,
  engagedSessions,
  engagementRate: sessions ? engagedSessions / sessions : 0,
  averageSessionDuration: 60,
  eventCount: sessions * 5,
})

const base: SiteAnalyticsSnapshot = {
  key: 'site',
  propertyId: '1',
  asOf: '2026-11-15T10:51:01.582Z',
  timezone: 'America/Los_Angeles',
  range: { start: '2026-10-18', end: '2026-11-14', days: 28 },
  previousRange: { start: '2026-09-20', end: '2026-10-17', days: 28 },
  totals: totals(31750, 6676),
  previousTotals: totals(21754, 4425),
  daily: [{ date: '2026-11-14', activeUsers: 900, sessions: 1000, screenPageViews: 1200 }],
  topPages: [
    {
      path: '/alquileres-uruguay',
      title: 'Alquileres',
      views: 900,
      users: 800,
      avgEngagementSeconds: 1,
    },
  ],
  channels: [{ label: 'Direct', value: 23139, share: 0.73 }],
  countries: [{ label: 'Uruguay', value: 7182, share: 0.24 }],
  devices: [{ label: 'desktop', value: 25000, share: 0.8 }],
  events: [{ name: 'page_view', count: 38401, users: 30288 }],
}

const withUruguay: SiteAnalyticsSnapshot = {
  ...base,
  uruguay: {
    totals: totals(8615, 5740),
    previousTotals: totals(5959, 3826),
    daily: [{ date: '2026-11-14', activeUsers: 300, sessions: 330, screenPageViews: 540 }],
    topPages: [{ path: '/', title: 'Inicio', views: 1207, users: 500, avgEngagementSeconds: 79 }],
    channels: [{ label: 'Organic Search', value: 5841, share: 0.68 }],
    devices: [{ label: 'mobile', value: 5939, share: 0.69 }],
    events: [{ name: 'page_view', count: 14175, users: 7190 }],
  },
}

describe('la vista de una audiencia', () => {
  it('Uruguay pisa los totales, la serie, las páginas, los canales, los dispositivos y los eventos', () => {
    const view = audienceView(withUruguay, 'uruguay')!
    expect(view.totals.sessions).toBe(8615)
    expect(view.previousTotals.sessions).toBe(5959)
    expect(view.daily[0]!.sessions).toBe(330)
    expect(view.topPages[0]!.path).toBe('/')
    expect(view.channels[0]!.label).toBe('Organic Search')
    expect(view.devices[0]!.label).toBe('mobile')
    expect(view.events[0]!.count).toBe(14175)
  })

  it('conserva la ventana y el desglose por país de la propiedad entera', () => {
    const view = audienceView(withUruguay, 'uruguay')!
    expect(view.range).toEqual(base.range)
    expect(view.asOf).toBe(base.asOf)
    expect(view.countries).toEqual(base.countries)
  })

  it('"todos los países" es el documento tal cual', () => {
    expect(audienceView(withUruguay, 'all')).toBe(withUruguay)
  })

  it('sin bloque de Uruguay (documento anterior, mitad fallida) toda vista es la propiedad entera', () => {
    expect(audienceView(base, 'uruguay')).toBe(base)
    expect(audienceView(null, 'uruguay')).toBeNull()
  })
})

describe('lo que agrega "todos los países"', () => {
  it('dice cuántas sesiones llegaron de afuera y cuántas terminaron sin interacción', () => {
    const abroad = outsideUruguay(withUruguay)!
    expect(abroad.sessions).toBe(31750 - 8615)
    expect(abroad.share).toBeCloseTo(23135 / 31750, 6)
    // 6.676 - 5.740 = 936 con interacción de 23.135: 96 % sin.
    expect(abroad.bounceRate).toBeCloseTo(1 - 936 / 23135, 6)
    expect(abroad.bounceRate).toBeGreaterThan(0.95)
  })

  it('no afirma nada sin el bloque, ni cuando no hay sesiones de afuera', () => {
    expect(outsideUruguay(base)).toBeNull()
    expect(outsideUruguay(null)).toBeNull()
    const onlyUruguay = { ...withUruguay, totals: withUruguay.uruguay!.totals }
    expect(outsideUruguay(onlyUruguay)).toBeNull()
  })

  it('una resta que da negativa por redondeo de GA4 no publica un rebote mayor que 100 %', () => {
    const odd = {
      ...withUruguay,
      totals: totals(9000, 5000),
    }
    const abroad = outsideUruguay(odd)!
    expect(abroad.bounceRate).toBeLessThanOrEqual(1)
    expect(abroad.bounceRate).toBeGreaterThanOrEqual(0)
  })
})

describe('la página', () => {
  const page = readFileSync(join(__dirname, '..', '..', 'pages/estadisticas-del-sitio.vue'), 'utf8')

  it('arranca en Uruguay, también en el HTML del servidor', () => {
    expect(page).toContain("const scope = ref<AudienceScope>('uruguay')")
    expect(page).toContain(
      'const snapshot = computed(() => audienceView(stored.value, scope.value))'
    )
  })

  it('el selector sólo existe si hay algo que elegir', () => {
    expect(page).toContain('<div v-if="hasUruguay" class="site-stats__scope mb-5">')
  })

  it('las tres lenguas propias tienen las mismas claves, y la frase lleva sus dos cifras', () => {
    const keys = Object.keys(siteStatsScopeMessages.es.scope).sort()
    for (const locale of ['en', 'pt'] as const) {
      expect(Object.keys(siteStatsScopeMessages[locale].scope).sort()).toEqual(keys)
    }
    for (const locale of ['es', 'en', 'pt'] as const) {
      expect(siteStatsScopeMessages[locale].scope.abroad).toContain('{share}')
      expect(siteStatsScopeMessages[locale].scope.abroad).toContain('{bounce}')
    }
  })
})
