import type { Event, EventHint, StackFrame } from '@sentry/nuxt'

export interface SentryErrorConfig {
  dsn?: string
  enabled?: boolean | string
  environment?: string
  release?: string
}

/** A lazily imported script or stylesheet that never arrived (Chrome, Safari, Firefox, Vite). */
const CHUNK_FAILURE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (?:CSS )?chunk .+ failed|Unable to preload CSS/i
/** A DOM node Vue was patching was moved or removed by something else (translators, extensions). */
const DOM_PATCH_FAILURE =
  /Failed to execute '(?:insertBefore|removeChild|appendChild|replaceChild)' on 'Node'|The node (?:before which the new node is to be inserted|to be removed) is not a child of this node|Node\.(?:insertBefore|removeChild|appendChild|replaceChild): Child/i

/**
 * Crawlers and automation run the page's JavaScript with budgets and blocked requests a visitor
 * never has. On 2026-10-05, 59 events of "JavaScript chunk failed to load" came almost entirely
 * from Yandex, Bing, Baidu, Meta and Tencent-cloud address blocks: none of them is a visitor.
 */
// A bare "bot" word is not enough: phones such as "CUBOT X30" carry it. Crawlers announce
// themselves as `Name-bot/1.0`, `compatible; Namebot` or with a `+http://` info URL.
const AUTOMATED_USER_AGENT =
  /bot\/|compatible; [^;)]*bot|\+https?:\/\/|crawl|spider|slurp|scrapy|headless|lighthouse|pagespeed|facebookexternalhit|meta-external|facebookcatalog|embedly|google web preview|yandex|baidu|bytespider|bytedance|petalbot|semrush|ahrefs|mj12|dotbot|bingpreview|adsbot|mediapartners|google-inspectiontool|googleother|applebot|duckduck|sogou|360spider|qwant|seznam|phantomjs|puppeteer|playwright|selenium|python|curl\/|wget|go-http|java\/|okhttp|axios|node-fetch/i

export function isAutomatedBrowser(navigatorLike: unknown): boolean {
  if (!navigatorLike || typeof navigatorLike !== 'object') return false
  const nav = navigatorLike as { userAgent?: unknown; webdriver?: unknown }
  if (nav.webdriver === true) return true
  const agent = typeof nav.userAgent === 'string' ? nav.userAgent : ''
  return !agent || AUTOMATED_USER_AGENT.test(agent)
}

/** Browser family and major version only; never the full user agent. */
export function sentryBrowserTag(userAgent: unknown): string {
  const agent = typeof userAgent === 'string' ? userAgent : ''
  if (/\bInstagram\b/.test(agent)) return 'Instagram app'
  if (/\bFBA[NV]\/|\bFB_IAB\b/.test(agent)) return 'Facebook app'
  const major = (pattern: RegExp) => agent.match(pattern)?.[1]?.slice(0, 3)
  const families: Array<[string, RegExp]> = [
    ['Edge', /\bEdg(?:e|A|iOS)?\/(\d+)/],
    ['Opera', /\bOPR\/(\d+)/],
    ['Samsung', /\bSamsungBrowser\/(\d+)/],
    ['Firefox', /\b(?:Firefox|FxiOS)\/(\d+)/],
    ['Chrome', /\b(?:Chrome|CriOS)\/(\d+)/],
    ['Safari', /\bVersion\/(\d+)(?:\.\d+)* (?:Mobile\/\S+ )?Safari\//],
  ]
  for (const [family, pattern] of families) {
    const version = major(pattern)
    if (version) return `${family} ${version}`
  }
  return 'Other'
}

/** Vue's own vocabulary for where an error happened: component file name and lifecycle code. */
export function sentryVueTags(instance: unknown, info: unknown): Record<string, string> {
  const tags: Record<string, string> = {}
  const options =
    instance && typeof instance === 'object'
      ? ((instance as { $options?: { __name?: unknown; name?: unknown } }).$options ?? {})
      : {}
  const name = typeof options.__name === 'string' ? options.__name : options.name
  if (typeof name === 'string' && /^[A-Z_][\w-]{0,63}$/i.test(name)) tags.component = name
  const hook =
    typeof info === 'string'
      ? (info.match(/#(runtime-\d{1,2})$/)?.[1] ?? (/^[a-z][a-z ]{2,40}$/.test(info) ? info : ''))
      : ''
  if (hook) tags.vue_hook = hook
  return tags
}

/** A Nuxt route NAME (from file names under pages/), without the i18n locale suffix. */
export function sentryPageName(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined
  const page = name.replace(/___[a-z]{2}(?:-[A-Z]{2})?$/, '')
  return /^[a-z\d][\w-]{0,80}$/i.test(page) ? page : undefined
}

/**
 * The string code from the error or its cause chain (`ERR_HTTP_HEADERS_SENT`, `ECONNRESET`,
 * `RENTAL_ANALYSIS_STALE`): a fixed enum naming what failed, never on what.
 */
export function sentryErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>()
  let current = error
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    if (seen.has(current)) return undefined
    seen.add(current)
    const candidate = current as { code?: unknown; cause?: unknown }
    if (typeof candidate.code === 'string' && /^[A-Z][A-Z\d_]{1,63}$/.test(candidate.code))
      return candidate.code
    current = candidate.cause
  }
  return undefined
}

/**
 * Refusals a route answers on purpose and that heal themselves, so a report adds nothing: the
 * rental analysis snapshot not built yet on a cold worker (the bootstrap plugin builds it; the
 * route answers 503 with this code meanwhile). A STALE snapshot is still reported: it means the
 * weekly rebuild has been failing for two weeks.
 */
export const EXPECTED_REFUSAL_CODES: ReadonlySet<string> = new Set(['RENTAL_ANALYSIS_UNAVAILABLE'])

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
    /^(?:Error|TypeError|RangeError|ReferenceError|SyntaxError|URIError|H3Error|FetchError|MongoServerError|MongoNetworkError|MongoServerSelectionError|AbortError|ChunkLoadError|DOMException|NotFoundError|HierarchyRequestError)$/.test(
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
  if (CHUNK_FAILURE.test(message)) return 'JavaScript chunk failed to load'
  if (DOM_PATCH_FAILURE.test(message)) return 'DOM node changed outside Vue during patch'
  if (/Map container (?:not found|is already initialized)/.test(message))
    return 'Leaflet map container unavailable'
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
//
// Added 2026-10-05, because every open browser issue that day was unattributable
// (`/other`, frames only inside Vue's renderer): the string code of the error
// chain (`ERR_HTTP_HEADERS_SENT`, `RENTAL_ANALYSIS_STALE`), the Vue component
// file name and lifecycle code, the Nuxt route NAME (built from file names under
// pages/, never from what the visitor typed), the browser family and major
// version, and the HTTP status a failed asset answered when re-checked.
const diagnosticTags: Array<[string, RegExp]> = [
  ['mongo_code', /^\d{1,6}$/],
  ['og_source', /^(?:[1-5]\d{2}|unobserved)$/],
  ['error_code', /^[A-Z][A-Z\d_]{1,63}$/],
  ['component', /^[A-Z_][\w-]{0,63}$/i],
  ['vue_hook', /^(?:runtime-\d{1,2}|[a-z][a-z ]{2,40})$/],
  ['page', /^[a-z\d][\w-]{0,80}$/i],
  [
    'browser',
    /^(?:(?:Chrome|Edge|Firefox|Safari|Samsung|Opera) \d{1,3}|Facebook app|Instagram app|Other)$/,
  ],
  ['asset_status', /^(?:[1-5]\d{2}|network)$/],
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

/** The error's own message, or the first one down its cause chain (Nuxt wraps chunk errors). */
function originalMessages(error: unknown): string[] {
  const messages: string[] = []
  const seen = new Set<unknown>()
  let current = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    if (seen.has(current)) break
    seen.add(current)
    const { message, cause } = current as { message?: unknown; cause?: unknown }
    if (typeof message === 'string') messages.push(message)
    current = cause
  }
  if (typeof error === 'string') messages.push(error)
  return messages
}

/**
 * For a lazy chunk or stylesheet that failed to load: the same-origin `/_nuxt/` asset it names
 * (`null` when the browser does not name it, as Safari's "Importing a module script failed").
 * `undefined` when the error is not an asset failure at all.
 */
export function chunkFailureAsset(error: unknown, origin: string): string | null | undefined {
  const messages = originalMessages(error)
  if (!messages.some(message => CHUNK_FAILURE.test(message))) return undefined
  for (const message of messages) {
    for (const candidate of message.match(/https?:\/\/[^\s'"<>]+|\/_nuxt\/[^\s'"<>]+/g) || []) {
      try {
        const url = new URL(candidate.replace(/[).,;]+$/, ''), origin)
        if (url.origin === new URL(origin).origin && url.pathname.startsWith('/_nuxt/'))
          return `${url.origin}${url.pathname}`
      } catch {
        // Not a URL after all: keep looking.
      }
    }
  }
  return null
}

/**
 * Whether the frame that threw is code this site does not ship: an anonymous or evaluated frame
 * (`<anonymous>:1:226`, what in-app browsers and extensions inject), or a script on another host.
 * The page's own bundle (`/_nuxt/`) and same-origin inline scripts are first-party.
 */
export function thrownOutsideSiteCode(event: Event, origin: string): boolean {
  const frames = event.exception?.values?.at(-1)?.stacktrace?.frames
  if (!frames?.length) return false
  const filename = String(frames.at(-1)?.filename || '')
  if (!filename || /^(?:<anonymous>|\[native code\]|native)$/.test(filename)) return true
  if (filename.startsWith('/_nuxt/')) return false
  if (!/^(?:https?:)?\/\//.test(filename)) return false
  try {
    const url = new URL(filename, origin)
    return url.origin !== new URL(origin).origin && !url.pathname.startsWith('/_nuxt/')
  } catch {
    return true
  }
}

/** HEAD the asset again, bypassing every cache: what a reload would get. */
export async function checkAssetStatus(
  url: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<number | 'network'> {
  if (typeof fetcher !== 'function') return 'network'
  const controller = typeof AbortController === 'function' ? new AbortController() : undefined
  const timer = controller ? setTimeout(() => controller.abort(), 5000) : undefined
  try {
    const response = await fetcher(url, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller?.signal,
    })
    return response.status
  } catch {
    return 'network'
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** A re-checked asset that is really gone or broken on the server (not the visitor's network). */
export const assetIsMissing = (status: number | 'network') =>
  typeof status === 'number' && (status === 404 || status === 410 || status >= 500)

export interface BrowserReportContext {
  /** The page origin, to tell the site's own scripts from injected or foreign ones. */
  origin?: () => string
  /** Extra diagnostic tags read at send time (browser family, Nuxt page name). */
  tags?: () => Record<string, string | undefined>
  /** Re-checks a failed asset; injectable for tests. */
  checkAsset?: (url: string) => Promise<number | 'network'>
  /** Events one page load may send; the rest are almost always knock-on failures. */
  maxEventsPerPage?: number
}

export function sentryErrorOptions(
  config: SentryErrorConfig,
  runtime: 'browser' | 'nitro',
  route?: () => unknown,
  context: BrowserReportContext = {}
) {
  // One page load: after an asset failed or a DOM patch broke, Vue's tree and the module graph
  // are inconsistent until the next reload, and every later error is a consequence (on
  // 2026-10-05, CAMBIO-URUGUAY-BACKEND-16, -13 and -N were one visitor's single DOM failure).
  const page = { incident: false, sent: 0 }
  const maxEventsPerPage = context.maxEventsPerPage ?? 5
  const origin = () => {
    try {
      return context.origin?.() || globalThis.location?.origin || 'https://cambio-uruguay.com'
    } catch {
      return 'https://cambio-uruguay.com'
    }
  }
  const finishBrowser = (event: Event, hint: EventHint): Event | null => {
    if (page.sent >= maxEventsPerPage) return null
    const sanitized = sanitizeSentryEvent(event, hint, config, runtime)
    if (sanitized) page.sent += 1
    return sanitized
  }
  const permitted = new Set(
    runtime === 'browser'
      ? ['EventFilters', 'FunctionToString', 'BrowserApiErrors', 'GlobalHandlers', 'Dedupe']
      : ['EventFilters', 'FunctionToString', 'OnUncaughtException', 'OnUnhandledRejection']
  )
  const seen = new WeakSet<object>()
  return {
    dsn: config.dsn,
    environment: /^(?:production|staging|development|test)$/.test(config.environment || '')
      ? config.environment
      : 'production',
    release: /^[\w.@+-]{1,160}$/.test(config.release || '') ? config.release : undefined,
    // Scripts the page embeds but does not control. Their frames are their own
    // code, so the report is not actionable here; EventFilters reads the last
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
      : {
          // Both only serve tracing, which is never enabled: the load-time module
          // hooks, and the SpanStreaming integration v11 adds behind the allowlist.
          enableRuntimeChannelInjection: false,
          traceLifecycle: 'static' as const,
        }),
    // No IP inference, headers, cookies, bodies or query strings (v11 collects
    // all of them by default; `sendDefaultPii` no longer exists).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    sendClientReports: false,
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
      if (runtime !== 'browser') return sanitizeSentryEvent(event, hint, config, runtime)

      const extra = (() => {
        try {
          return context.tags?.() ?? {}
        } catch {
          return {}
        }
      })()
      event = { ...event, tags: { ...extra, ...event.tags } }
      if (page.incident) return null
      const asset = chunkFailureAsset(original, origin())
      if (asset !== undefined) {
        // Whatever the verdict, what follows on this page is a consequence of the missing module.
        page.incident = true
        // Safari names no URL: nothing to verify, and a deploy that really lost an asset is
        // still reported by every browser that does name it.
        if (!asset) return null
        const check = context.checkAsset ?? (url => checkAssetStatus(url))
        return check(asset).then(status =>
          assetIsMissing(status)
            ? finishBrowser(
                { ...event, tags: { ...event.tags, asset_status: String(status) } },
                hint
              )
            : null
        )
      }
      if (thrownOutsideSiteCode(event, origin())) return null
      // No frame at all and no HTTP status: nothing in the event says where or what (the
      // message is withheld on purpose), so the report could never be acted on.
      const frames = event.exception?.values?.at(-1)?.stacktrace?.frames
      if (!frames?.length && !/^5\d\d$/.test(String(event.tags?.http_status || ''))) return null
      if (originalMessages(original).some(message => DOM_PATCH_FAILURE.test(message)))
        page.incident = true
      return finishBrowser(event, hint)
    },
  }
}

export function sentryHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const status = Number((error as { statusCode?: unknown }).statusCode)
  return Number.isInteger(status) && status >= 300 && status <= 599 ? status : null
}
