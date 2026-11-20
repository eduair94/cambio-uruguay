// Sin sufijo de método a propósito (como `linkedin.xml.ts`): responde GET y HEAD.
import { fetchUsdSnapshot } from '../../utils/linkedinUsd'
import {
  currentXSlot,
  dollarTweet,
  renderXFeed,
  xFeedCacheControl,
  xGuideFor,
} from '../../../utils/xPosts'

/**
 * `/feeds/x.xml`: los tuits de la cuenta de X, para el applet de IFTTT
 * "RSS Feed: New feed item → X (Twitter): Post a tweet" (ver `docs/app/X_FEED.md`).
 *
 * Un solo ítem, el del turno vigente: el dólar a las 10 de cada día hábil y una guía a las 15 de
 * lunes, miércoles y viernes. Si el dólar no tiene datos confiables (mismas guardas que el post de
 * LinkedIn: sin pizarras quietas, sin el reporte no hay número), el feed sale sin ítems y con caché
 * corta, así IFTTT no publica nada y lo vuelve a intentar. Nunca un número dudoso.
 */
export default defineEventHandler(async event => {
  const now = new Date()
  const slot = currentXSlot(now)
  const usd = slot.kind === 'dolar' ? await fetchUsdSnapshot(now) : null
  const post =
    slot.kind === 'guia' ? xGuideFor(slot.date) : usd ? dollarTweet(usd, slot.date) : null

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(event, 'cache-control', xFeedCacheControl(now, post !== null))
  setResponseHeader(event, 'x-robots-tag', 'noindex')
  return renderXFeed(slot, post, now)
})
