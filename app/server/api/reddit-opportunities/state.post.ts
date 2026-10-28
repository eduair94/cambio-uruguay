// Marcar un hilo de /oportunidades-reddit: respondido, descartado o de vuelta a pendiente.
//
// Es lo ÚNICO que el app escribe en `redditopportunities` (`state`, `stateAt`, `answerUrl`); todo
// lo demás es del job, que nunca pisa estos tres. El enlace del comentario es opcional: si está, el
// job lo relee con el token anónimo y la card dice si se ve.
import { createError } from 'h3'
import { RedditOpportunityModel } from '../../models/RedditOpportunity'
import { connectDb } from '../../utils/db'
import { requireAdmin } from '../../utils/requireAdmin'
import { isCommentUrl, type OppState } from '../../../utils/redditOpportunities'

const STATES: readonly OppState[] = ['open', 'answered', 'dismissed']

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeaders(event, { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' })

  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const postId = typeof body.postId === 'string' ? body.postId : ''
  const state = body.state as OppState
  const answerUrl = typeof body.answerUrl === 'string' ? body.answerUrl.trim() : ''

  if (!/^[a-z0-9]{5,10}$/.test(postId) || !STATES.includes(state)) {
    throw createError({ statusCode: 400, statusMessage: 'postId o state inválido' })
  }
  if (answerUrl && (state !== 'answered' || !isCommentUrl(answerUrl))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El enlace tiene que ser el de un comentario de Reddit (no el del hilo ni uno corto /s/).',
    })
  }

  await connectDb()
  const set: Record<string, unknown> = { state, stateAt: new Date() }
  // Volver a pendiente o descartar borra el enlace y su chequeo: ya no describen nada.
  if (state !== 'answered') Object.assign(set, { answerUrl: '', answerVisible: null, answerCheckedAt: null })
  else if (answerUrl) Object.assign(set, { answerUrl, answerVisible: null, answerCheckedAt: null })

  const res = await RedditOpportunityModel.updateOne({ postId }, { $set: set })
  if (!res.matchedCount) throw createError({ statusCode: 404, statusMessage: 'No está en la cola' })
  return { ok: true, postId, state }
})
