import { defineCachedEventHandler } from '#imports'
import { buildLocations, type MapBranch } from '../utils/locations'
import extra from '../data/extra-locations.json'

// Cached 10 min at the edge of the Nitro server; the backend itself also caches 10 min.
export default defineCachedEventHandler(
  async () => {
    const config = useRuntimeConfig()
    const base = config.apiBaseServer || config.public.apiBase
    let backend: any[] = []
    try {
      backend = await $fetch<any[]>('/locations', { baseURL: base })
    } catch (err) {
      console.error('[/api/locations] backend fetch failed:', err)
      backend = []
    }
    return buildLocations(backend, extra as MapBranch[])
  },
  { maxAge: 600, name: 'locations', getKey: () => 'all' }
)
