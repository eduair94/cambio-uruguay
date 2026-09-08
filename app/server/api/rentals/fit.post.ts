import {
  createError,
  defineEventHandler,
  getHeader,
  getRequestIP,
  getRequestWebStream,
  setResponseHeader,
  type H3Event,
} from 'h3'
import { evaluateRentalFit, RentalFitError } from '../../utils/rentalFit'

const MAX_BODY_BYTES = 24 * 1024
const BODY_TIMEOUT_MS = 5000
const invalid = () => new RentalFitError(400)

/** Stop retaining chunks at the byte limit, including requests without Content-Length. */
export async function readRentalFitBody(event: H3Event): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(getHeader(event, 'content-type') || '')) throw invalid()
  const length = getHeader(event, 'content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw invalid()
  const chunks: Buffer[] = []
  let bytes = 0
  const add = (chunk: Buffer | Uint8Array | string) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.byteLength
    if (bytes > MAX_BODY_BYTES) throw invalid()
    chunks.push(buffer)
  }
  // Web/unenv requests already own a stream or supplied body; real Node requests need a
  // bounded data listener because h3's generic web adapter eagerly queues the entire body.
  if (event.web?.request || '__unenv__' in event.node.req) {
    const reader = getRequestWebStream(event)?.getReader()
    if (!reader) throw invalid()
    let timeout: ReturnType<typeof setTimeout>
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(invalid()), BODY_TIMEOUT_MS)
    })
    try {
      await Promise.race([
        (async () => {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            add(value)
          }
        })(),
        deadline,
      ])
    } catch {
      throw invalid()
    } finally {
      clearTimeout(timeout!)
      // An underlying cancel implementation must not hold a ranking slot after the deadline.
      void reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
  } else {
    await new Promise<void>((resolve, reject) => {
      const req = event.node.req
      const finish = (error?: Error) => {
        clearTimeout(timeout)
        req.off('data', data).off('end', end).off('error', failure).off('aborted', failure)
        if (error) {
          req.resume()
          reject(error)
        } else resolve()
      }
      const data = (chunk: Buffer) => {
        try {
          add(chunk)
        } catch {
          finish(invalid())
        }
      }
      const end = () => finish()
      const failure = () => finish(invalid())
      const timeout = setTimeout(failure, BODY_TIMEOUT_MS)
      req.on('data', data).once('end', end).once('error', failure).once('aborted', failure)
    })
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw invalid()
  }
}

export default defineEventHandler(async event => {
  // Set before admission, reading or validation so success and every handler failure stay private.
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    return await evaluateRentalFit(
      () => readRentalFitBody(event),
      getRequestIP(event, { xForwardedFor: true }) || 'unknown'
    )
  } catch (error) {
    const statusCode = error instanceof RentalFitError ? error.statusCode : 503
    if (statusCode === 429) setResponseHeader(event, 'retry-after', '60')
    if (statusCode === 400) setResponseHeader(event, 'connection', 'close')
    throw createError({
      statusCode,
      statusMessage:
        statusCode === 400
          ? 'Invalid household search'
          : statusCode === 429
            ? 'Household search limit reached'
            : 'Household search temporarily unavailable',
    })
  }
})
