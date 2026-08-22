// The regional board, joined with the catalogue of who publishes each number.
//
// `GET /regional` on the public API returns every quote with a `source` id;
// `GET /regional/sources` returns what those ids mean. The page needs both on
// every row ("Dólar blue — Bluelytics"), so they are joined once here rather
// than shipping a second request to every browser.
//
// Anyone integrating should call the public API directly: this route is the
// site's own read path, not a second API.
import type {
  RegionalSnapshot,
  RegionalSourceMeta,
  RegionalSourcesSummary,
} from '../../utils/regional'

export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer

    const [snapshot, catalogue] = await Promise.all([
      $fetch<RegionalSnapshot>(`${base}/regional`, { timeout: 9000 }).catch(() => null),
      $fetch<{ sources: RegionalSourceMeta[]; summary?: RegionalSourcesSummary }>(
        `${base}/regional/sources`,
        { timeout: 9000 }
      ).catch(() => ({ sources: [] as RegionalSourceMeta[], summary: undefined })),
    ])

    if (!snapshot) {
      // An empty board of the right shape beats a 500: the page renders its
      // "sin datos" state instead of failing to render at all.
      return {
        generatedAt: null,
        oldestQuoteAt: null,
        quotes: [],
        board: [],
        gaps: [],
        cross: [],
        routes: [],
        sources: [],
        rejected: [],
        catalogue: catalogue.sources,
        catalogueSummary: catalogue.summary ?? null,
      }
    }

    return {
      ...snapshot,
      catalogue: catalogue.sources,
      catalogueSummary: catalogue.summary ?? null,
    }
  },
  {
    // The job refreshes every 10 minutes; five is short enough that the page is
    // never more than one cycle behind and long enough to absorb a crawl.
    maxAge: 60 * 5,
    staleMaxAge: 60 * 60 * 3,
    name: 'regional',
    getKey: () => 'all',
  }
)
