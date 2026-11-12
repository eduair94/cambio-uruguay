// "Ver teléfono" de un armador con ficha de Google: Place Details en vivo, sin guardar nada
// (server/utils/armadorContact.ts). Sólo place ids del directorio de hoy.
import { defineEventHandler, getRequestIP, getRouterParam, setResponseHeader, setResponseStatus } from 'h3'
import { ArmadorSnapshotModel } from '../../../models/ArmadorSnapshot'
import { connectDb } from '../../../utils/db'
import { createArmadorContactService } from '../../../utils/armadorContact'

// Los place ids publicados, releídos cada 10 minutos (el snapshot cambia una vez por día).
let allowList: { ids: Set<string>; at: number } | null = null
async function publishedPlaceIds(): Promise<Set<string>> {
  if (allowList && Date.now() - allowList.at < 600_000) return allowList.ids
  await connectDb()
  const doc = await ArmadorSnapshotModel.findOne({ key: 'mvd' }).select({ 'entries.placeId': 1 }).lean()
  const ids = new Set<string>()
  for (const entry of (doc as { entries?: Array<{ placeId?: string | null }> } | null)?.entries ?? [])
    if (entry.placeId) ids.add(entry.placeId)
  allowList = { ids, at: Date.now() }
  return ids
}

const service = createArmadorContactService({
  fetcher: (url, options) => $fetch(url, { params: options.params, timeout: options.timeout }),
  allowed: async placeId => (await publishedPlaceIds().catch(() => new Set<string>())).has(placeId),
})

export default defineEventHandler(async event => {
  setResponseHeader(event, 'Cache-Control', 'no-store, max-age=0')
  setResponseHeader(event, 'CDN-Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  const { casasReviews, movingReviews } = useRuntimeConfig()
  const response = await service.read({
    placeId: getRouterParam(event, 'placeId') ?? '',
    ip: getRequestIP(event, { xForwardedFor: true }) || 'unknown',
    gmapsBase: movingReviews?.gmapsUrl || casasReviews?.gmapsUrl || '',
  })
  setResponseStatus(event, response.status)
  return response.body
})
