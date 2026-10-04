import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { loadRentalBarrio } from '../../utils/rentalBarrio'

const SLUG = /^[a-z0-9-]{1,80}$/

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const query = getQuery(event)
  const department = String(query.department ?? '')
  const barrio = String(query.barrio ?? '')
  if (!SLUG.test(department) || !SLUG.test(barrio))
    throw createError({ statusCode: 404, statusMessage: 'Neighborhood not found' })
  let page
  try {
    page = await loadRentalBarrio(department, barrio)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Neighborhood data temporarily unavailable' })
  }
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Neighborhood not found' })
  setResponseHeader(event, 'cache-control', 'public, max-age=120, s-maxage=300')
  return page
})
