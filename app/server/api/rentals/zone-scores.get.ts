import { createError, defineEventHandler, setResponseHeader } from 'h3'
import { loadRentalZoneScores } from '../../utils/rentalZoneServices'

/** Each zone's place among the others (crime, power, water, complaints, services), for listing cards. */
export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  let scores
  try {
    scores = await loadRentalZoneScores()
  } catch {
    scores = null
  }
  if (!scores || !Object.keys(scores.zones).length)
    throw createError({ statusCode: 503, statusMessage: 'Zone scores temporarily unavailable' })
  setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=600')
  return scores
})
