import { estimateWeightKg } from '../utils/weightEstimate'

// Best-effort AI weight estimate for the import cart. Returns `{ weightKg }`
// (number or null). Null means the AI isn't configured or couldn't produce a
// usable figure — the client keeps the manual weight field.
export default defineEventHandler(async (event): Promise<{ weightKg: number | null }> => {
  const query = getQuery(event)
  const name = String(query?.name ?? '').trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }
  return { weightKg: await estimateWeightKg(name) }
})
