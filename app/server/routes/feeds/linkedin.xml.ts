// Sin sufijo de método a propósito (como `llms-full.txt.ts`): así responde GET y HEAD, y un
// verificador de feeds que pregunta con HEAD no recibe un 404.
import { fetchUsdSnapshot } from '../../utils/linkedinUsd'
import {
  linkedinFeedCacheControl,
  linkedinPostDate,
  pickLinkedinPost,
  renderLinkedinFeed,
  wantsUsd,
} from '../../../utils/linkedinPosts'

/**
 * `/feeds/linkedin.xml`: el post diario de LinkedIn, para el applet de IFTTT
 * "RSS Feed: New feed item → LinkedIn: Share an update" (ver `docs/app/LINKEDIN_FEED.md`).
 *
 * Un solo ítem, el del día (desde las 9 de Montevideo). El borde lo guarda hasta el próximo cambio
 * (`linkedinFeedCacheControl`), así IFTTT no depende de que el origen conteste. `noindex`: no es
 * una página, es la fuente de un robot.
 */
export default defineEventHandler(async event => {
  const now = new Date()
  const date = linkedinPostDate(now)
  const usd = wantsUsd(date) ? await fetchUsdSnapshot(now) : null
  const body = renderLinkedinFeed(date, pickLinkedinPost(date, usd), now)

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(event, 'cache-control', linkedinFeedCacheControl(now))
  setResponseHeader(event, 'x-robots-tag', 'noindex')
  return body
})
