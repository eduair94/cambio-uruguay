// Nitro scheduled task: keep "qué dice Reddit" on /mejores-bancos-uruguay current.
// Harvests new threads (MongoDB dedupes — nothing is downloaded twice), re-scores the
// stored corpus deterministically and republishes one snapshot per entity. Registered in
// nuxt.config under `nitro.scheduledTasks`. With no Reddit credentials it is a no-op that
// leaves the last snapshot serving.
//
// Payload (optional, for a manual run):
//   { window: 'all' }        → backfill the whole history instead of the last year
//   { withSummaries: false } → skip the AI prose pass (numbers only)
import { refreshRedditSentiment } from '../../utils/redditSentimentStore'
import { refreshScamRadar } from '../../utils/scamRadarStore'

export default defineTask({
  meta: {
    name: 'reddit:sentiment',
    description:
      'Harvest Reddit threads about UY banks/fintechs and refresh the sentiment snapshot',
  },
  async run({ payload }) {
    const window = (payload as { window?: 'year' | 'all' })?.window === 'all' ? 'all' : 'year'
    const withSummaries = (payload as { withSummaries?: boolean })?.withSummaries !== false
    const result = await refreshRedditSentiment({ window, withSummaries })
    // Same corpus, second read: the scam radar on /estafas-uruguay. No new data source.
    const radar = await refreshScamRadar()
    return { result: { ...result, radar } }
  },
})
