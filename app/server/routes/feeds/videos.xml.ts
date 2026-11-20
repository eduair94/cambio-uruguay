// Sin sufijo de método a propósito (como `x.xml.ts`): responde GET y HEAD.
import { VideosSnapshotModel, type VideoItem } from '../../models/VideosSnapshot'
import { connectDb } from '../../utils/db'
import {
  renderVideosFeed,
  scheduleVideoTweets,
  videoFeedCacheControl,
} from '../../../utils/videoPosts'

/**
 * `/feeds/videos.xml`: los videos nuevos de canales uruguayos de la lista de
 * `/videos-de-economia-uruguay`, para el applet de IFTTT "RSS Feed: New feed item → X (Twitter):
 * Post a tweet" (ver `docs/app/X_FEED.md`, "Videos nuevos").
 *
 * Un ítem por video ya salido, con el id del video como `guid`: IFTTT tuitea cada uno una vez. Qué
 * video cuenta y a qué hora sale lo decide `utils/videoPosts.ts`, sin estado. Si la base no
 * contesta, el feed sale sin ítems: IFTTT no publica nada y lo vuelve a pedir.
 */
export default defineEventHandler(async event => {
  const now = new Date()
  let videos: VideoItem[] = []
  let ok = true
  try {
    await connectDb()
    const doc = await VideosSnapshotModel.findOne({ key: 'uy' })
      .select({ _id: 0, videos: 1 })
      .lean<{ videos?: VideoItem[] }>()
    videos = doc?.videos ?? []
  } catch {
    ok = false
  }

  const plan = scheduleVideoTweets(videos, now)
  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(
    event,
    'cache-control',
    ok
      ? videoFeedCacheControl(now, plan.nextAt)
      : 'public, max-age=0, s-maxage=60, stale-if-error=86400'
  )
  setResponseHeader(event, 'x-robots-tag', 'noindex')
  return renderVideosFeed(plan.released, now)
})
