import type { Event, EventHint, StackFrame } from '@sentry/nuxt'

export interface SentryErrorConfig {
  dsn?: string
  enabled?: boolean | string
  environment?: string
  release?: string
}

export function sentryErrorsEnabled(
  config: SentryErrorConfig,
  context: { dev?: boolean; prerender?: boolean; test?: boolean; preflight?: boolean } = {}
): boolean {
  if (Object.values(context).some(Boolean)) return false
  if (config.enabled === false || /^(?:0|false)$/i.test(String(config.enabled))) return false
  try {
    const dsn = new URL(config.dsn || '')
    return (
      dsn.protocol === 'https:' && !!dsn.username && !dsn.password && /^\/\d+$/.test(dsn.pathname)
    )
  } catch {
    return false
  }
}

// Categories, never the visitor's search, property slug, account ID or token.
const pageFamilies = [
  'alquileres-uruguay',
  'alquileres',
  'venta-viviendas-uruguay',
  'oportunidades-inmobiliarias-uruguay',
  'cuenta',
  'buscar',
  'conectar',
  'dolar-hoy',
  'cotizacion',
  'casa',
  'sucursal',
  'sucursales',
  'historico',
  'descuentos-con-tarjeta-uruguay',
  'herramientas',
  'guias',
  'blog',
]
const apiFamilies = [
  '/api/rentals/geocode',
  '/api/rentals/budget',
  '/api/rentals/mapa',
  '/api/rentals/availability',
  '/api/rentals/propiedad',
  '/api/rentals',
  '/api/property-sales',
  '/api/property-opportunities',
  '/api/me/rental-alerts',
  '/api/me/rental-availability',
  '/api/me',
  '/api/auth',
]

export function sentryRouteCategory(value: unknown): string {
  if (typeof value !== 'string') return '/other'
  let path: string
  try {
    path =
      new URL(value, 'https://cambio-uruguay.com').pathname.replace(/^\/(?:en|pt)(?=\/|$)/, '') ||
      '/'
  } catch {
    return '/other'
  }
  if (path === '/') return '/'
  // OG URLs contain the underlying page, which can itself contain private
  // slugs. Retain only its existing route category, including on a second pass.
  const ogRoute = path.match(/^\/__og-image__\/(image|static)(\/.*)?$/)
  if (ogRoute) {
    const page = (ogRoute[2] || '/')
      .replace(/\/og\.(?:png|jpe?g|webp|svg|json|html)$/, '')
      .replace(/^\/(?:en|pt)(?=\/|$)/, '')
    return `/__og-image__/${ogRoute[1]}${pageRouteCategory(page || '/')}`
  }
  return pageRouteCategory(path)
}

/**
 * The driver's numeric failure code, from the error or its cause chain.
 *
 * A Mongo message can quote the query, so it is withheld like any other free
 * text; the code is a fixed enum (292 = sort over the memory limit, 50 = the
 * operation's time limit) and says what failed without saying on what.
 */
export function sentryMongoCode(error: unknown): string | undefined {
  const seen = new Set<unknown>()
  let current = error
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    if (seen.has(current)) return undefined
    seen.add(current)
    const candidate = current as { name?: unknown; code?: unknown; cause?: unknown }
    if (
      String(candidate.name).startsWith('Mongo') &&
      Number.isInteger(candidate.code) &&
      (candidate.code as number) >= 0 &&
      (candidate.code as number) <= 999999
    )
      return String(candidate.code)
    current = candidate.cause
  }
  return undefined
}

function pageRouteCategory(path: string): string {
  if (path === '/') return '/'
  for (const prefix of apiFamilies) {
    if (path === prefix || path.startsWith(`${prefix}/`))
      return path === prefix ? prefix : `${prefix}/:item`
  }
  const segments = path.split('/')
  const first = segments[1]
  if (pageFamilies.includes(first)) return `/${first}${segments.length > 2 ? '/:item' : ''}`
  // Every server route under /api is a file in `server/api`, so its first
  // segment is a directory name, never a visitor's slug: no route directory is
  // dynamic at that depth, and an invented /api path has no handler and cannot
  // reach this with a 5xx. Naming it is what separates a failing endpoint from
  // the `/other` that 126 of the 139 API routes reported. Deeper segments are
  // the parameters, so they collapse. Pages stay on the list above: a first
  // segment there can be anything a visitor or a crawler put in the address.
  if (first === 'api' && /^_{0,2}[a-z][a-z\d-]{0,30}_{0,2}$/.test(segments[2] || ''))
    return `/api/${segments[2]}${segments.length > 3 ? '/:item' : ''}`
  return '/other'
}

function safeFrame(frame: StackFrame): StackFrame {
  // Keep the bundled filename and line/column, not filesystem paths, URLs,
  // source code, function arguments or stack-local variable values.
  const file =
    String(frame.filename || '')
      .split(/[?#]/)[0]
      .replace(/\\/g, '/')
      .split('/')
      .pop() || ''
  return {
    ...(/^[\w.-]{1,160}\.(?:[cm]?js|tsx?|vue)$/.test(file) ? { filename: file } : {}),
    ...(Number.isInteger(frame.lineno) ? { lineno: frame.lineno } : {}),
    ...(Number.isInteger(frame.colno) ? { colno: frame.colno } : {}),
    ...(typeof frame.in_app === 'boolean' ? { in_app: frame.in_app } : {}),
  }
}

function errorClass(value: unknown): string {
  return typeof value === 'string' &&
    /^(?:Error|TypeError|RangeError|ReferenceError|SyntaxError|URIError|H3Error|FetchError|MongoServerError|MongoNetworkError|MongoServerSelectionError|AbortError|ChunkLoadError)$/.test(
      value
    )
    ? value
    : 'Error'
}

function technicalMessage(value: unknown, status?: string): string {
  const message = typeof value === 'string' ? value : ''
  if (/Sort exceeded memory limit/i.test(message)) return 'MongoDB sort exceeded memory limit'
  if (/\[Nuxt OG Image\].*missing the #nuxt-og-image-options script tag/.test(message))
    return 'OG image metadata missing from page'
  if (/\[Nuxt OG Image\].*returning no HTML/.test(message)) return 'OG image page returned no HTML'
  if (
    /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .+ failed/i.test(
      message
    )
  )
    return 'JavaScript chunk failed to load'
  if (/Cannot read propert(?:y|ies) of (?:undefined|null)/i.test(message))
    return 'Cannot read a property of null or undefined'
  if (/is not a function/i.test(message)) return 'Value is not a function'
  if (/Maximum call stack size exceeded/i.test(message)) return 'Maximum call stack size exceeded'
  if (/hydration.*mismatch/i.test(message)) return 'Vue hydration mismatch'
  if (status) return `HTTP ${status} error`
  // Exception messages can embed emails, Mongo queries, filters, OAuth codes,
  // URLs or request bodies. Unknown free text is deliberately never exported.
  return 'Error message withheld; inspect the bundled stack'
}

// Diagnostic tags, each a fixed technical vocabulary rather than free text:
// the Mongo failure code, and the status the OG extractor's own page read saw
// (`unobserved` when it never resolved). Anything else in the tag is dropped.
const diagnosticTags: Array<[string, RegExp]> = [
  ['mongo_code', /^\d{1,6}$/],
  ['og_source', /^(?:[1-5]\d{2}|unobserved)$/],
]

/** An allowlist, so future SDK integrations cannot silently add private data. */
export function sanitizeSentryEvent(
  event: Event,
  hint: EventHint,
  config: SentryErrorConfig,
  runtime: 'browser' | 'nitro'
): Event | null {
  hint.attachments = []
  if (event.type || !event.exception?.values?.length) return null
  const status = /^5\d\d$/.test(String(event.tags?.http_status || ''))
    ? String(event.tags!.http_status)
    : undefined
  const route = sentryRouteCategory(event.tags?.route || event.request?.url)
  const release = /^[\w.@+-]{1,160}$/.test(config.release || '') ? config.release : undefined
  const environment = /^(?:production|staging|development|test)$/.test(config.environment || '')
    ? config.environment
    : 'production'
  return {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: 'javascript',
    level: event.level === 'fatal' ? 'fatal' : 'error',
    environment,
    release,
    tags: {
      application: 'cambio-uruguay-app',
      runtime,
      route,
      ...(status ? { http_status: status } : {}),
      ...(/^(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(String(event.tags?.method))
        ? { method: event.tags!.method }
        : {}),
      ...Object.fromEntries(
        diagnosticTags
          .filter(([name, shape]) => shape.test(String(event.tags?.[name] ?? '')))
          .map(([name]) => [name, String(event.tags![name])])
      ),
    },
    exception: {
      values: event.exception.values.slice(-3).map(exception => ({
        type: errorClass(exception.type),
        value: technicalMessage(exception.value, status),
        ...(exception.stacktrace?.frames
          ? { stacktrace: { frames: exception.stacktrace.frames.slice(-40).map(safeFrame) } }
          : {}),
        mechanism: { type: 'generic', handled: exception.mechanism?.handled !== false },
      })),
    },
  }
}

export function sentryErrorOptions(
  config: SentryErrorConfig,
  runtime: 'browser' | 'nitro',
  route?: () => unknown
) {
  const permitted = new Set(
    runtime === 'browser'
      ? ['InboundFilters', 'FunctionToString', 'BrowserApiErrors', 'GlobalHandlers', 'Dedupe']
      : ['InboundFilters', 'FunctionToString', 'OnUncaughtException', 'OnUnhandledRejection']
  )
  const seen = new WeakSet<object>()
  return {
    dsn: config.dsn,
    environment: /^(?:production|staging|development|test)$/.test(config.environment || '')
      ? config.environment
      : 'production',
    release: /^[\w.@+-]{1,160}$/.test(config.release || '') ? config.release : undefined,
    // Scripts the page embeds but does not control. Their frames are their own
    // code, so the report is not actionable here; InboundFilters reads the last
    // named frame, which for these failures is the third-party file itself.
    ...(runtime === 'browser'
      ? {
          denyUrls: [
            /googlesyndication\.com/,
            /doubleclick\.net/,
            /adsbygoogle/,
            /^(?:chrome|moz|safari-web|safari)-extension:/,
          ],
        }
      : {}),
    sendDefaultPii: false,
    sendClientReports: false,
    autoSessionTracking: false,
    maxBreadcrumbs: 0,
    tracePropagationTargets: [] as string[],
    integrations: <T extends { name: string }>(integrations: T[]) =>
      integrations.filter(item => permitted.has(item.name)),
    beforeBreadcrumb: () => null,
    beforeSend(event: Event, hint: EventHint) {
      const original = hint.originalException
      if (original && (typeof original === 'object' || typeof original === 'function')) {
        if (seen.has(original)) return null
        seen.add(original)
      }
      // GlobalHandlers does not pass through Nuxt hooks. Without HttpContext,
      // its events need this narrowly categorized route supplied explicitly.
      if (route && !event.tags?.route)
        event = { ...event, tags: { ...event.tags, route: sentryRouteCategory(route()) } }
      return sanitizeSentryEvent(event, hint, config, runtime)
    },
  }
}

export function sentryHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const status = Number((error as { statusCode?: unknown }).statusCode)
  return Number.isInteger(status) && status >= 300 && status <= 599 ? status : null
}
