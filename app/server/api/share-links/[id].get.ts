import { createError, defineEventHandler, getRouterParam, setResponseHeader } from 'h3'
import { readSharedLink, SharedLinkError } from '../../utils/sharedLinks'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    const result = await readSharedLink(getRouterParam(event, 'id'))
    setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=3600')
    return result
  } catch (error) {
    const statusCode = error instanceof SharedLinkError ? error.statusCode : 503
    throw createError({
      statusCode,
      statusMessage:
        statusCode === 404 ? 'Shared link not found' : 'Sharing temporarily unavailable',
    })
  }
})
