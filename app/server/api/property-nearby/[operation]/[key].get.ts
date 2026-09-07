import { resolvePropertyNearby } from '../../../utils/propertyNearby'
import { emptyPropertyNearby, type PropertyNearbyOperation } from '../../../../utils/propertyNearby'
import { propertySaleValidKey } from '../../../../utils/propertySales'

export default defineEventHandler(async event => {
  const operation = getRouterParam(event, 'operation') as PropertyNearbyOperation
  const key = String(getRouterParam(event, 'key', { decode: true }) || '').trim()
  if (
    !['rent', 'sale'].includes(operation) ||
    !key ||
    key.length > 512 ||
    (operation === 'sale' && !propertySaleValidKey(key))
  ) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Property is not available' })
  }
  if (Object.keys(getQuery(event)).length) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 400,
      statusMessage: 'Nearby services accepts only a property key',
    })
  }
  let result
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    result = await Promise.race([
      resolvePropertyNearby(operation, key),
      new Promise<ReturnType<typeof emptyPropertyNearby>>(resolve => {
        timer = setTimeout(
          () =>
            resolve({
              ...emptyPropertyNearby(operation, key, null, 'unavailable'),
              retryAfterSeconds: 60,
            }),
          5000
        )
      }),
    ])
  } catch {
    result = { ...emptyPropertyNearby(operation, key, null, 'unavailable'), retryAfterSeconds: 60 }
  } finally {
    clearTimeout(timer)
  }
  if (!result) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Property is not available' })
  }
  setResponseHeader(
    event,
    'cache-control',
    result.status === 'unavailable' ? 'no-store' : 'public, max-age=30, s-maxage=60'
  )
  return result
})
