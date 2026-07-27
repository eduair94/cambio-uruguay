// Manual topic-only refresh for the shared Reddit corpus and the published money-topic
// snapshots. Unlike /api/reddit-sentiment/refresh, this endpoint does not download comments,
// call AI or rebuild bank sentiment, so it is the appropriate route for a taxonomy backfill.
//
//   curl -X POST 'https://cambio-uruguay.com/api/reddit-topics/refresh?window=all' \
//        -H 'x-reddit-token: …'
//
// A focused LegalUruguay refresh avoids repeating the full cross-subreddit backfill:
//   curl -X POST 'https://cambio-uruguay.com/api/reddit-topics/refresh?scope=legal' \
//        -H 'x-reddit-token: …'
//
// The store upserts on Reddit's post id, making repeated calls idempotent.
import { refreshRedditTopics } from '../../utils/redditTopicsStore'

export default defineEventHandler(async event => {
  const required = useRuntimeConfig().redditRefreshToken as string | undefined
  if (required) {
    const provided = getHeader(event, 'x-reddit-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }

  const query = getQuery(event)
  const topics = await refreshRedditTopics({
    window: query.window === 'all' ? 'all' : 'year',
    harvest: query.harvest !== 'false',
    scope: query.scope === 'legal' ? 'legal' : 'all',
  })

  return { ok: true, topics }
})
