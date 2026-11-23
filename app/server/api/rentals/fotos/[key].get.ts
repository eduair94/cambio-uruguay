// Lo que las fotos de un aviso muestran y el aviso no dice, para la ficha de /alquileres/<key>
// (components/rentals/RentalPhotoFacts.vue). Lee la colección privada `photofacts` y devuelve SÓLO la
// proyección pública de utils/photoFactsPublic.ts, campo por campo: nada de lo demás que guarda el
// job (banderas internas, notas, costo, huellas) sale de acá.
//
// Aparte de /api/rentals/ficha a propósito: la ficha la pinta el servidor y su HTML está dentro de
// una ventana de medición (docs/seo/experiments.json, `fichas-alquiler-calle-precio-total…`); este
// bloque lo pide el navegador después, así que no cambia lo que se mide.
import mongoose from 'mongoose'
import { connectDb } from '../../../utils/db'
import { publicPhotoFacts } from '../../../../utils/photoFactsPublic'

const LISTING_ID = /^[a-z]+:[\w.-]{1,80}$/

export default defineEventHandler(async event => {
  setResponseHeaders(event, {
    'cache-control': 'public, max-age=600, s-maxage=3600',
    'x-robots-tag': 'noindex',
  })
  const key = String(getRouterParam(event, 'key') || '').slice(0, 200)
  const listingId = String(getQuery(event).oferta || '')
  if (!key || !LISTING_ID.test(listingId)) return { facts: null }
  await connectDb()
  const db = mongoose.connection.db
  if (!db) return { facts: null }
  const property = await db
    .collection('rentallistings')
    .findOne(
      { key, 'offers.listingId': listingId },
      { projection: { _id: 0, 'offers.listingId': 1, 'offers.source': 1, 'offers.furnished': 1 } }
    )
  const offer = (property?.offers as Array<Record<string, unknown>> | undefined)?.find(
    item => item?.listingId === listingId
  )
  if (!offer) return { facts: null }
  const doc = await db.collection('photofacts').findOne({ _id: `alquiler:${listingId}` } as never, {
    projection: {
      ok: 1,
      schema: 1,
      model: 1,
      readAt: 1,
      listingId: 1,
      'photos.url': 1,
      'facts.furniture': 1,
      'facts.furniturePhoto': 1,
      'facts.seen.integratedKitchen': 1,
    },
  })
  return {
    facts: publicPhotoFacts(doc as never, {
      listingId,
      source: String(offer.source ?? ''),
      declaredFurnished: offer.furnished as boolean | null | undefined,
    }),
  }
})
