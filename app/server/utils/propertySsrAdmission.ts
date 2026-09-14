import type { IncomingMessage, ServerResponse } from 'node:http'

type NodeListener = (request: IncomingMessage, response: ServerResponse) => unknown

interface AdmissionOptions {
  maxActive?: number
  maxQueued?: number
  maxWaitMs?: number
}

interface PendingRequest {
  request: IncomingMessage
  response: ServerResponse
  resolve: () => void
  reject: (error: unknown) => void
  waiting: boolean
  timer?: ReturnType<typeof setTimeout>
  abort?: () => void
}

export function isPropertySsrRequest(method: string | undefined, url: string | undefined): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false
  let path = (url || '/').split(/[?#]/, 1)[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    return false
  }
  path = path.replace(/^\/(en|pt)(?=\/|$)/, '')
  return (
    /^\/alquileres(?:\/|$)/.test(path) ||
    /^\/alquileres-uruguay\/?$/.test(path) ||
    /^\/venta-viviendas-uruguay(?:\/|$)/.test(path)
  )
}

function disconnected(entry: Pick<PendingRequest, 'request' | 'response'>): boolean {
  return entry.request.aborted || entry.response.destroyed || entry.response.writableEnded
}

function unavailable(response: ServerResponse) {
  if (response.destroyed || response.writableEnded) return
  response.statusCode = 503
  response.setHeader('content-type', 'text/plain; charset=utf-8')
  response.setHeader('cache-control', 'no-store, max-age=0')
  response.setHeader('cdn-cache-control', 'no-store')
  response.setHeader('retry-after', '2')
  response.end('Service temporarily unavailable')
}

/**
 * Bound expensive public SSR before Nuxt creates a Vue instance. Internal APIs and
 * other pages bypass the queue. Active permits follow the listener promise, including
 * H3 error rendering; closing a socket does not cancel an already-running render.
 */
export function createPropertySsrListener(listener: NodeListener, options: AdmissionOptions = {}) {
  const maxActive = options.maxActive ?? 2
  const maxQueued = options.maxQueued ?? 8
  const maxWaitMs = options.maxWaitMs ?? 5000
  const queue: PendingRequest[] = []
  let active = 0

  function detach(entry: PendingRequest) {
    entry.waiting = false
    if (entry.timer) clearTimeout(entry.timer)
    if (entry.abort) {
      entry.request.off('aborted', entry.abort)
      entry.response.off('close', entry.abort)
    }
  }

  function remove(entry: PendingRequest) {
    const index = queue.indexOf(entry)
    if (index >= 0) queue.splice(index, 1)
    detach(entry)
  }

  function drain() {
    while (active < maxActive && queue.length) {
      const entry = queue.shift()!
      detach(entry)
      if (disconnected(entry)) entry.resolve()
      else void run(entry)
    }
  }

  async function run(entry: PendingRequest) {
    active++
    try {
      await listener(entry.request, entry.response)
      entry.resolve()
    } catch (error) {
      entry.reject(error)
    } finally {
      active--
      drain()
    }
  }

  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!isPropertySsrRequest(request.method, request.url)) {
      await listener(request, response)
      return
    }
    if (disconnected({ request, response })) return
    return new Promise<void>((resolve, reject) => {
      const entry: PendingRequest = { request, response, resolve, reject, waiting: false }
      if (active < maxActive) {
        void run(entry)
        return
      }
      if (queue.length >= maxQueued) {
        unavailable(response)
        resolve()
        return
      }
      entry.waiting = true
      entry.abort = () => {
        if (!entry.waiting) return
        remove(entry)
        resolve()
      }
      entry.timer = setTimeout(() => {
        if (!entry.waiting) return
        remove(entry)
        unavailable(response)
        resolve()
      }, maxWaitMs)
      // IncomingMessage.close can also mean a normal GET finished being read.
      // Only an aborted request or a closed response cancels a waiting render.
      request.once('aborted', entry.abort)
      response.once('close', entry.abort)
      queue.push(entry)
    })
  }
}
