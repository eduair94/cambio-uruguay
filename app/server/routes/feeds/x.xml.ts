// Sin sufijo de método a propósito (como `linkedin.xml.ts`): responde GET y HEAD.
import { VideosSnapshotModel, type VideoItem } from '../../models/VideosSnapshot'
import { connectDb } from '../../utils/db'
import { fetchRateInputs } from '../../utils/linkedinUsd'
import { fetchBrouDay, fetchBrouEvolution } from '../../utils/xMarket'
import { summarizeUsd } from '../../../utils/linkedinPosts'
import { scheduleVideoTweets, videoXItem } from '../../../utils/videoPosts'
import {
  X_VIDEOS_SINCE,
  closeTweet,
  currentXSlot,
  dollarTweet,
  renderXFeed,
  slotItem,
  summarizeBrouWeek,
  summarizeCurrency,
  travelTweet,
  weekTweet,
  xFeedCacheControl,
  xGuideFor,
  type XPost,
  type XSlot,
} from '../../../utils/xPosts'

/**
 * El tuit del turno vigente, o `null`. `missing` distingue "no había datos confiables" (reintentar
 * en cinco minutos) de "este turno hoy no publica" (el cierre de un día en que el BROU no se movió).
 */
async function slotPost(slot: XSlot, now: Date): Promise<{ post: XPost | null; missing: boolean }> {
  switch (slot.kind) {
    case 'guia':
      return { post: xGuideFor(slot.date), missing: false }
    case 'dolar': {
      const inputs = await fetchRateInputs()
      const usd = inputs && summarizeUsd(inputs.rows, inputs.names, inputs.frozenKeys, now)
      return usd
        ? { post: dollarTweet(usd, slot.date), missing: false }
        : { post: null, missing: true }
    }
    case 'cierre': {
      const [inputs, brou] = await Promise.all([fetchRateInputs(), fetchBrouDay()])
      const usd = inputs && summarizeUsd(inputs.rows, inputs.names, inputs.frozenKeys, now)
      if (!usd || !brou) return { post: null, missing: true }
      const post = closeTweet(
        {
          brouOpen: brou.open,
          brouLast: brou.last,
          cheapestSell: usd.cheapestSell,
          cheapestNames: usd.cheapestNames,
        },
        slot.date
      )
      return { post, missing: false }
    }
    case 'viaje': {
      const inputs = await fetchRateInputs()
      const brl =
        inputs && summarizeCurrency('BRL', inputs.rows, inputs.names, inputs.frozenKeys, now)
      return brl
        ? { post: travelTweet(brl, slot.date), missing: false }
        : { post: null, missing: true }
    }
    case 'semana': {
      const points = await fetchBrouEvolution()
      const week = points && summarizeBrouWeek(points, slot.date)
      return week
        ? { post: weekTweet(week, slot.date), missing: false }
        : { post: null, missing: true }
    }
  }
}

/**
 * `/feeds/x.xml`: los tuits de la cuenta de X, para el applet de IFTTT
 * "RSS Feed: New feed item → X (Twitter): Post a tweet" (ver `docs/app/X_FEED.md`).
 *
 * El ítem del turno vigente (el dólar a las 10 y el cierre a las 17 de cada día hábil, una guía a
 * las 15 de lunes, miércoles y viernes, el real los sábados y la semana del dólar los domingos) más
 * los videos de canales uruguayos que ya salieron. Si un turno no tiene datos confiables (mismas
 * guardas que el post de LinkedIn), no tiene ítem y la caché es corta: IFTTT no publica nada y lo
 * vuelve a intentar. Nunca un número dudoso.
 */
export default defineEventHandler(async event => {
  const now = new Date()
  const slot = currentXSlot(now)

  const loadVideos = async (): Promise<VideoItem[] | null> => {
    try {
      await connectDb()
      const doc = await VideosSnapshotModel.findOne({ key: 'uy' })
        .select({ _id: 0, videos: 1 })
        .lean<{ videos?: VideoItem[] }>()
      return doc?.videos ?? []
    } catch {
      return null
    }
  }

  const [{ post, missing }, videos] = await Promise.all([slotPost(slot, now), loadVideos()])
  const since = Date.parse(X_VIDEOS_SINCE)
  const plan = scheduleVideoTweets(videos ?? [], now)
  const items = [
    ...(post ? [slotItem(slot, post)] : []),
    ...plan.released.filter(s => s.at.getTime() >= since).map(videoXItem),
  ]

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(
    event,
    'cache-control',
    xFeedCacheControl(now, !missing && videos !== null, plan.nextAt)
  )
  setResponseHeader(event, 'x-robots-tag', 'noindex')
  return renderXFeed(items, now)
})
