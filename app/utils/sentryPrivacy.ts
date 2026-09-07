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
  for (const prefix of apiFamilies) {
    if (path === prefix || path.startsWith(`${prefix}/`))
      return path === prefix ? prefix : `${prefix}/:item`
  }
  const first = path.split('/')[1]
  return pageFamilies.includes(first)
    ? `/${first}${path.split('/').length > 2 ? '/:item' : ''}`
    : '/other'
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
