import { describe, expect, it } from 'vitest'
import {
  busiestDay,
  formatDelta,
  formatDuration,
  isAutomaticEvent,
  isKeyEvent,
  isStale,
  metricDelta,
  movingAverage,
  pageLabel,
  pageShare,
  seriesSlice,
  summaryMetrics,
  hasLiveActivity,
  realtimeAgeSeconds,
  sparklineHeights,
  type RealtimeSnapshot,
  type SiteAnalyticsSnapshot,
} from '../../utils/siteAnalytics'

const totals = {
  activeUsers: 1000,
  newUsers: 700,
  sessions: 1400,
  screenPageViews: 3200,
  engagedSessions: 900,
  engagementRate: 0.642857,
  averageSessionDuration: 95.4,
  eventCount: 8800,
}

const snapshot: SiteAnalyticsSnapshot = {
  key: 'site',
  propertyId: '123456789',
  asOf: '2026-07-11T13:00:00.000Z',
  timezone: 'America/Montevideo',
  range: { start: '2026-06-13', end: '2026-07-10', days: 28 },
  previousRange: { start: '2026-05-16', end: '2026-06-12', days: 28 },
  totals,
  previousTotals: { ...totals, activeUsers: 800, sessions: 1400, screenPageViews: 4000 },
  daily: [
    { date: '2026-07-09', activeUsers: 50, sessions: 70, screenPageViews: 160 },
    { date: '2026-07-08', activeUsers: 90, sessions: 120, screenPageViews: 260 },
    { date: '2026-07-10', activeUsers: 60, sessions: 80, screenPageViews: 190 },
  ],
  topPages: [
    {
      path: '/dolar-hoy',
      title: 'Dólar hoy | Cambio Uruguay',
      views: 800,
      users: 400,
      avgEngagementSeconds: 53,
    },
  ],
  channels: [{ label: 'Organic Search', value: 700, share: 0.7 }],
  countries: [{ label: 'Uruguay', value: 800, share: 0.8 }],
  devices: [{ label: 'mobile', value: 900, share: 0.9 }],
  events: [{ name: 'page_view', count: 3200, users: 1000 }],
}

describe('metricDelta', () => {
  it('reports a signed fraction against the previous window', () => {
    expect(metricDelta(1000, 800)).toMatchObject({ deltaPct: 0.25, direction: 'up' })
    expect(metricDelta(600, 800)).toMatchObject({ deltaPct: -0.25, direction: 'down' })
  })

  it('calls sub-half-a-percent moves flat, not a trend', () => {
    expect(metricDelta(1002, 1000).direction).toBe('flat')
    expect(metricDelta(1000, 1000)).toMatchObject({ deltaPct: 0, direction: 'flat' })
  })

  it('has no percentage to show when the previous window was zero', () => {
    expect(metricDelta(120, 0)).toMatchObject({ deltaPct: null, direction: 'up' })
    expect(metricDelta(0, 0)).toMatchObject({ deltaPct: null, direction: 'flat' })
  })

  it('treats missing numbers as zero rather than NaN', () => {
    expect(metricDelta(Number.NaN, undefined as unknown as number)).toMatchObject({
      value: 0,
      previous: 0,
      deltaPct: null,
    })
  })
})

describe('summaryMetrics', () => {
  const metrics = summaryMetrics(snapshot)

  it('opens with users and carries each metric its own format', () => {
    expect(metrics[0].key).toBe('activeUsers')
    expect(metrics.find(m => m.key === 'engagementRate')?.format).toBe('percent')
    expect(metrics.find(m => m.key === 'averageSessionDuration')?.format).toBe('duration')
  })

  it('compares against the same metric in the previous window', () => {
    expect(metrics.find(m => m.key === 'activeUsers')).toMatchObject({ value: 1000, previous: 800 })
    expect(metrics.find(m => m.key === 'screenPageViews')?.direction).toBe('down')
    expect(metrics.find(m => m.key === 'sessions')?.direction).toBe('flat')
  })

  it('survives a snapshot with no previous window at all', () => {
    const fresh = summaryMetrics({ ...snapshot, previousTotals: undefined as never })
    expect(fresh.every(m => m.previous === 0)).toBe(true)
  })
})

describe('series helpers', () => {
  it('sorts by date and keeps the last N days', () => {
    expect(seriesSlice(snapshot.daily, 2).map(p => p.date)).toEqual(['2026-07-09', '2026-07-10'])
    expect(seriesSlice(snapshot.daily, 0).map(p => p.date)).toEqual([
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
    ])
  })

  it('averages over what exists so the line starts with the data', () => {
    expect(movingAverage([10, 20, 30], 7)).toEqual([10, 15, 20])
    expect(movingAverage([10, 20, 30], 1)).toEqual([10, 20, 30])
  })

  it('finds the busiest day', () => {
    expect(busiestDay(snapshot.daily)?.date).toBe('2026-07-08')
    expect(busiestDay([])).toBeNull()
  })
})

describe('page rows', () => {
  it('drops the site-name suffix from the title', () => {
    expect(pageLabel({ path: '/dolar-hoy', title: 'Dólar hoy | Cambio Uruguay' })).toBe('Dólar hoy')
    expect(pageLabel({ path: '/dolar-hoy', title: 'Dólar hoy - Cambio Uruguay: cotización' })).toBe(
      'Dólar hoy'
    )
  })

  it('falls back to the path when the title is only the site name or missing', () => {
    expect(pageLabel({ path: '/pizarra', title: 'Cambio Uruguay' })).toBe('/pizarra')
    expect(pageLabel({ path: '/pizarra', title: '' })).toBe('/pizarra')
  })

  it('shares a page against the window views', () => {
    expect(pageShare(snapshot.topPages[0], snapshot.totals)).toBeCloseTo(0.25, 6)
    expect(pageShare(snapshot.topPages[0], { ...snapshot.totals, screenPageViews: 0 })).toBe(0)
  })
})

describe('event classification', () => {
  it('knows our own key events from GA4 automatic ones', () => {
    expect(isKeyEvent('outbound_click')).toBe(true)
    expect(isKeyEvent('page_view')).toBe(false)
    expect(isAutomaticEvent('session_start')).toBe(true)
    expect(isAutomaticEvent('convert')).toBe(false)
  })
})

describe('staleness', () => {
  it('flags a snapshot older than the daily job could explain', () => {
    const now = new Date('2026-07-14T13:00:00Z')
    expect(isStale(snapshot.asOf, now)).toBe(true)
    expect(isStale('2026-07-14T09:00:00Z', now)).toBe(false)
  })

  it('treats a missing or unparseable timestamp as stale', () => {
    expect(isStale('')).toBe(true)
    expect(isStale('nunca')).toBe(true)
  })
})

describe('live panel', () => {
  const minutes = (values: number[]) =>
    values.map((activeUsers, i) => ({ minutesAgo: values.length - 1 - i, activeUsers }))

  it('scales the sparkline to the busiest minute in view', () => {
    expect(sparklineHeights(minutes([0, 5, 10]))).toEqual([0, 0.5, 1])
  })

  it('draws a flat series flat, not as a full-height wall', () => {
    expect(sparklineHeights(minutes([4, 4, 4]))).toEqual([0.5, 0.5, 0.5])
  })

  it('draws nothing when nobody was around', () => {
    expect(sparklineHeights(minutes([0, 0, 0]))).toEqual([0, 0, 0])
    expect(sparklineHeights([])).toEqual([])
  })

  it('shows the panel only when there is something live to show', () => {
    const base: RealtimeSnapshot = {
      asOf: '2026-08-10T13:00:00.000Z',
      activeUsers: 0,
      activeUsersLast5: 0,
      perMinute: minutes([0, 0]),
      pages: [],
    }
    expect(hasLiveActivity(null)).toBe(false)
    expect(hasLiveActivity(base)).toBe(false)
    expect(hasLiveActivity({ ...base, activeUsers: 3 })).toBe(true)
    // Users can drop to zero in the last minute while the half hour still had traffic.
    expect(hasLiveActivity({ ...base, perMinute: minutes([2, 0]) })).toBe(true)
  })

  it('never reports a negative age when the client clock runs behind the server', () => {
    const asOf = '2026-08-10T13:00:00.000Z'
    expect(realtimeAgeSeconds(asOf, new Date('2026-08-10T13:00:42Z'))).toBe(42)
    expect(realtimeAgeSeconds(asOf, new Date('2026-08-10T12:59:30Z'))).toBe(0)
    expect(realtimeAgeSeconds('', new Date())).toBe(0)
  })
})

describe('formatting', () => {
  it('splits durations at the minute', () => {
    expect(formatDuration(95.4)).toBe('1 min 35 s')
    expect(formatDuration(42)).toBe('42 s')
    expect(formatDuration(-5)).toBe('0 s')
  })

  it('always signs the delta chip, and has nothing to show without a baseline', () => {
    expect(formatDelta(0.124, 'es-UY')).toMatch(/^\+12,4\s?%$/)
    expect(formatDelta(-0.124, 'es-UY')).toMatch(/^-12,4\s?%$/)
    expect(formatDelta(null)).toBeNull()
  })
})
