import { createError, defineEventHandler, getHeader, getRequestIP, setResponseHeader } from 'h3'
import {
  createSharedLink,
  readSharedLinkBody,
  SharedLinkError,
  takeSharedLinkQuota,
} from '../utils/sharedLinks'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    // The body reader accepts JSON only; this also refuses browser cross-site fetches.
    if (getHeader(event, 'sec-fetch-site') === 'cross-site') throw new SharedLinkError(400)
    takeSharedLinkQuota(getRequestIP(event, { xForwardedFor: true }) || 'unknown')
    return await createSharedLink(await readSharedLinkBody(event))
  } catch (error) {
    const statusCode = error instanceof SharedLinkError ? error.statusCode : 503
    if (statusCode === 429) setResponseHeader(event, 'retry-after', '60')
    throw createError({
      statusCode,
      statusMessage:
        statusCode === 400
          ? 'Invalid public share target'
          : statusCode === 413
            ? 'Share request is too large'
            : statusCode === 429
              ? 'Too many share requests'
              : 'Sharing temporarily unavailable',
    })
  }
})
