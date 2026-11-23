// "¿Está mal?" sobre lo que las fotos muestran según la IA (components/rentals/RentalPhotoFacts.vue).
// Es la medida del daño que pide docs/app/PHOTO_FACTS.md: cuántas veces alguien dice que un rótulo
// publicado es falso, por rótulo. Anónimo, como el buzón de alquileres: sin IP guardada, límite por IP
// en memoria, y sólo valores de una lista cerrada.
import mongoose from 'mongoose'
import { connectDb } from '../../utils/db'
import { carContactRateOk } from '../../utils/carContacts'
import { PUBLIC_PHOTO_FACTS, type PublicPhotoFact } from '../../../utils/photoFactsPublic'

const LISTING_ID = /^[a-z]+:[\w.-]{1,80}$/
const perMinute = new Map<string, { count: number; resetAt: number }>()
const perDay = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async event => {
  setResponseHeaders(event, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' })
  const body = await readBody<{ listingId?: unknown; fact?: unknown; website?: unknown }>(event)
  if (body?.website) return { ok: true }
  const listingId = String(body?.listingId ?? '')
  const fact = String(body?.fact ?? '') as PublicPhotoFact
  if (!LISTING_ID.test(listingId) || !PUBLIC_PHOTO_FACTS.includes(fact))
    throw createError({ statusCode: 400, statusMessage: 'Invalid report' })
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!carContactRateOk(perMinute, ip, 5, 60_000) || !carContactRateOk(perDay, ip, 30, 86_400_000))
    throw createError({ statusCode: 429, statusMessage: 'Too many reports' })
  await connectDb()
  await mongoose.connection.db
    ?.collection('photofactreports')
    .insertOne({ listingId, fact, at: new Date().toISOString() })
  return { ok: true }
})
