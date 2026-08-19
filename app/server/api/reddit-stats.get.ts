// Sirve la foto que el job del backend `currency-reddit-stats` escribe en la Mongo de la app.
//
// De sólo lectura y sin autenticación a propósito: /estadisticas-reddit publica estos números, y ese
// es el punto — una cuenta que comenta automáticamente en subs uruguayos tiene que poder auditarse
// desde afuera. El documento no trae el autor de ningún hilo (se decide en
// classes/redditstats/refresh.ts), así que lo que sale de acá es lo que Reddit ya publica más lo que
// escribimos nosotros.
//
// Cacheado una hora: la fuente se recalcula cada tres, así que menos que eso sólo cuesta viajes a
// Mongo.
import { RedditBotStatsModel } from '../models/RedditBotStats'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    return await RedditBotStatsModel.findOne({ key: 'reddit' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    // La página tiene su propio estado de "todavía no hay datos"; un 500 acá convertiría una foto
    // que falta en una página rota.
    return null
  }
})
