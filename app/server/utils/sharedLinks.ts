import { createHash, randomBytes } from 'node:crypto'
import { getHeader, getRequestWebStream, type H3Event } from 'h3'
import {
  isSharedLinkId,
  normalizeSharePath,
  normalizeShareText,
  SHARED_LINK_DESCRIPTION_LENGTH,
  SHARED_LINK_ORIGIN,
  SHARED_LINK_TITLE_LENGTH,
  type SharedLinkResponse,
} from '../../utils/sharedLinks'
import { publicShareSummary } from '../../utils/shareSummary'
import { SharedLinkModel, type SharedLinkDoc } from '../models/SharedLink'
import { connectDb } from './db'
import { siteNavDocs } from './siteNavIndex'

export class SharedLinkError extends Error {
  constructor(readonly statusCode: 400 | 404 | 413 | 429 | 503) {
    super('Shared link request failed')
  }
}

/** Bounded best-effort quotas per worker, following the site's public lookup endpoints. */
export function createSharedLinkLimiter(now = Date.now) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  let global = { count: 0, resetAt: 0 }
  return (ip: string): void => {
    const time = now()
    for (const [key, hit] of hits) if (hit.resetAt <= time) hits.delete(key)
    if (global.resetAt <= time) global = { count: 0, resetAt: time + 60_000 }
    const key = createHash('sha256').update(ip.slice(0, 128)).digest('hex')
    let hit = hits.get(key)
    if (!hit) {
      if (hits.size >= 2000) throw new SharedLinkError(429)
      hit = { count: 0, resetAt: time + 60_000 }
      hits.set(key, hit)
    }
    if (hit.count >= 10 || global.count >= 60) throw new SharedLinkError(429)
    hit.count++
    global.count++
  }
}

export const takeSharedLinkQuota = createSharedLinkLimiter()

/** Bound actual streamed bytes, including chunked requests with no Content-Length. */
export async function readSharedLinkBody(event: H3Event): Promise<unknown> {
  const maxBytes = 16 * 1024
  if (!/^application\/json(?:\s*;|$)/i.test(getHeader(event, 'content-type') || ''))
    throw new SharedLinkError(400)
  const length = getHeader(event, 'content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new SharedLinkError(413)
  const chunks: Buffer[] = []
  let bytes = 0
  const add = (chunk: Buffer | Uint8Array | string) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.byteLength
    if (bytes > maxBytes) throw new SharedLinkError(413)
    chunks.push(buffer)
  }
  if (event.web?.request || '__unenv__' in event.node.req) {
    const reader = getRequestWebStream(event)?.getReader()
    if (!reader) throw new SharedLinkError(400)
    let timeout: ReturnType<typeof setTimeout>
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(new SharedLinkError(400)), 5000)
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
    } finally {
      clearTimeout(timeout!)
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
        } catch (error) {
          finish(error as Error)
        }
      }
      const end = () => finish()
      const failure = () => finish(new SharedLinkError(400))
      const timeout = setTimeout(failure, 5000)
      req.on('data', data).once('end', end).once('error', failure).once('aborted', failure)
    })
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new SharedLinkError(400)
  }
}

/**
 * What a shared link says about itself, from the site and never from the request. A short link on
 * this domain draws a branded card and a page: if its words came from whoever minted it (the old
 * `{ title, description }` body), anyone could publish anonymous text under cambio-uruguay.com.
 * The title is the target page's own name in the site navigation (the closest listed ancestor for
 * a page that is not listed itself); the description lists only filters whose values come from a
 * closed vocabulary (`publicShareSummary`: departments, currencies, conditions, numbers).
 */
export function sharedLinkText(path: string): { title: string; description: string } {
  const url = new URL(path, SHARED_LINK_ORIGIN)
  const locale = /^\/(en|pt)(?=\/|$)/.exec(url.pathname)?.[1] ?? 'es'
  let base = url.pathname.replace(/^\/(?:en|pt)(?=\/|$)/, '') || '/'
  const docs = siteNavDocs()
  let title = ''
  // The home's navigation label is "Inicio", which names nothing: it falls back to the site name.
  while (base !== '/' && !title) {
    title = docs.find(doc => doc.to === base && !doc.action)?.title || ''
    base = base.slice(0, base.lastIndexOf('/')) || '/'
  }
  return {
    title: normalizeShareText(title, SHARED_LINK_TITLE_LENGTH) || 'Cambio Uruguay',
    description: normalizeShareText(
      publicShareSummary(path, locale),
      SHARED_LINK_DESCRIPTION_LENGTH
    ),
  }
}

function response(doc: SharedLinkDoc): SharedLinkResponse {
  const path = normalizeSharePath(doc.path)
  if (!path || !isSharedLinkId(doc._id) || /^\/(?:en\/|pt\/|es\/)?s\//.test(path))
    throw new SharedLinkError(404)
  // Recomputed on every read, so no stored text (or a row written before this rule) is ever served.
  return { id: doc._id, url: `${SHARED_LINK_ORIGIN}/s/${doc._id}`, path, ...sharedLinkText(path) }
}

export async function createSharedLink(body: unknown): Promise<SharedLinkResponse> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SharedLinkError(400)
  const input = body as Record<string, unknown>
  const path = normalizeSharePath(input.path)
  if (!path || /^\/(?:en\/|pt\/|es\/)?s\//.test(path)) throw new SharedLinkError(400)
  // `input.title` and `input.description` are ignored on purpose (see sharedLinkText).
  const { title, description } = sharedLinkText(path)
  // The text is derived from the path, so the path alone is the link's identity.
  const targetHash = createHash('sha256').update(JSON.stringify({ path })).digest('hex')
  await connectDb()
  // Wait for the unique target index before the first write, including a new deployment.
  await SharedLinkModel.init()
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const doc = await SharedLinkModel.findOneAndUpdate(
        { targetHash },
        {
          $setOnInsert: {
            _id: randomBytes(9).toString('base64url'),
            targetHash,
            path,
            title,
            description,
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true, runValidators: true }
      )
        .lean()
        .exec()
      if (doc) return response(doc)
      throw new SharedLinkError(503)
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error
      // Concurrent identical insert, or an extraordinarily unlikely random ID collision.
      const existing = await SharedLinkModel.findOne({ targetHash }).lean().exec()
      if (existing) return response(existing)
    }
  }
  throw new SharedLinkError(503)
}

export async function readSharedLink(id: unknown): Promise<SharedLinkResponse> {
  if (!isSharedLinkId(id)) throw new SharedLinkError(404)
  await connectDb()
  const doc = await SharedLinkModel.findById(id).lean().exec()
  if (!doc) throw new SharedLinkError(404)
  return response(doc)
}
