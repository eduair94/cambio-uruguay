// Serves the stored "temas de dinero en Reddit" snapshot for /temas-de-dinero-reddit.
// Reads MongoDB on every request on purpose: a per-process Nitro cache diverges across
// pm2's cluster workers, and the snapshot is small. Never makes a live Reddit call.
import { getPublishedTopics } from '../utils/redditTopicsStore'

export default defineEventHandler(async () => {
  try {
    return await getPublishedTopics()
  } catch {
    return { topics: [], asOf: null, empty: true, subs: [] }
  }
})
