// Admin-only: seed a historical MoveExplanation from controller-researched
// headlines/narrative (real WebSearch citations, never fabricated). Computes
// attribution server-side from real driver data via loadDriverSeries +
// attributeMove — the caller supplies only the currency, date, the move's own
// pctChange/direction (read off the existing /api/analysis/:currency response),
// and the researched headlines/narrative. Mirrors /api/drivers/ingest's token
// gate + cache-bust pattern.
import { connectDb } from '../../utils/db'
import { MoveExplanationModel } from '../../models/MoveExplanation'
import { loadDriverSeries } from '../../utils/analysis'
import { attributeMove } from '../../../utils/attribution'

interface BackfillBody {
  currency: string
  date: string // YYYY-MM-DD
  pctChange: number
  direction: 'up' | 'down'
  headlines?: { title: string; source: string; link: string }[]
  narrative?: string | null
}

export default defineEventHandler(async event => {
  const required = useRuntimeConfig().driversIngestToken
  if (required) {
    const provided = getHeader(event, 'x-ingest-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }

  const body = await readBody<BackfillBody>(event)
  if (!body?.currency || !body?.date || typeof body.pctChange !== 'number' || !body.direction) {
    throw createError({
      statusCode: 400,
      statusMessage: 'currency, date, pctChange, direction are required',
    })
  }
  const currency = body.currency.toUpperCase()

  await connectDb()
  const driverSeries = await loadDriverSeries(currency)
  const drivers = attributeMove(body.date, driverSeries)
    .slice(0, 5)
    .map(d => ({ key: d.key, dayMovePct: d.dayMovePct }))

  await MoveExplanationModel.updateOne(
    { currency, date: body.date },
    {
      $set: {
        pctChange: body.pctChange,
        direction: body.direction,
        drivers,
        narrative: body.narrative ?? null,
        headlines: body.headlines ?? [],
      },
    },
    { upsert: true }
  )

  // Best-effort cache invalidation, matching /api/drivers/ingest — so the
  // seeded explanation shows up immediately instead of after the TTL.
  try {
    const cache = useStorage('cache')
    const keys = await cache.getKeys()
    await Promise.all(keys.filter(k => k.includes('analysis')).map(k => cache.removeItem(k)))
  } catch {
    // Non-fatal.
  }

  return { ok: true, currency, date: body.date, driversAttributed: drivers.length }
})
