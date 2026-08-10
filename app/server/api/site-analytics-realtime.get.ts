// "Ahora mismo" for /estadisticas-del-sitio, proxied from the backend (`GET
// /site-analytics-realtime`, itself Redis-cached 45 s). No Google credentials live in this app, so
// the realtime read has to come through the API.
//
// Cached 30 s here as well: the page polls every minute and several open tabs must not each become
// a request to the backend. On any failure it answers an empty snapshot — the panel hides itself on
// a zero count, which is a much better outcome than a broken card.
import type { RealtimeSnapshot } from '../../utils/siteAnalytics'

const EMPTY = (): RealtimeSnapshot => ({
  asOf: new Date().toISOString(),
  activeUsers: 0,
  activeUsersLast5: 0,
  perMinute: [],
  pages: [],
})

export default defineCachedEventHandler(
  async (): Promise<RealtimeSnapshot> => {
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<RealtimeSnapshot>(`${base}/site-analytics-realtime`, {
        timeout: 8000,
      })
      return res && typeof res.activeUsers === 'number' ? res : EMPTY()
    } catch {
      return EMPTY()
    }
  },
  {
    maxAge: 30,
    // Deliberately short: a stale "live" number is worse than no live number. 5 minutes of grace is
    // enough to ride out a backend restart without the panel flickering away.
    staleMaxAge: 300,
    name: 'site-analytics-realtime-v1',
    getKey: () => 'live',
  }
)
