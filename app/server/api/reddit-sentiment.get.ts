// What Uruguayans say about each bank/fintech on Reddit — the snapshot written by the
// daily `reddit:sentiment` task. This handler never calls Reddit: it reads MongoDB, so it
// is cheap, and a Reddit outage can't affect the page. Cached short (the data only moves
// once a day) with a long stale window so a Mongo hiccup still serves the last good copy.
import { getPublishedSentiment } from '../utils/redditSentimentStore'

export default defineCachedEventHandler(
  async () => {
    try {
      return await getPublishedSentiment()
    } catch {
      // No Mongo configured / unreachable: degrade to "no data" instead of a 500.
      return { entities: [], asOf: null, empty: true, subs: [], minSample: 5 }
    }
  },
  {
    maxAge: 60 * 60, // the task runs daily; an hour of cache is plenty
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'reddit-sentiment-uy',
    getKey: () => 'board',
  }
)
