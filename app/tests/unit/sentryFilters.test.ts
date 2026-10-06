import { describe, expect, it, vi } from 'vitest'
import type { Event, EventHint } from '@sentry/nuxt'
import {
  EXPECTED_REFUSAL_CODES,
  assetIsMissing,
  checkAssetStatus,
  chunkFailureAsset,
  isAutomatedBrowser,
  sanitizeSentryEvent,
  sentryBrowserTag,
  sentryErrorCode,
  sentryErrorOptions,
  sentryPageName,
  sentryVueTags,
  thrownOutsideSiteCode,
} from '../../utils/sentryPrivacy'

const config = {
  dsn: 'https://public@sentry.example.invalid/1',
  enabled: true,
  environment: 'production',
  release: 'cambio-uruguay-app@0123456789ab',
}
const origin = 'https://cambio-uruguay.com'
const own = (file = 'CjTS4jAk.js') => ({ filename: `${origin}/_nuxt/${file}`, lineno: 2, colno: 9 })
const eventWith = (
  frames?: Array<Record<string, unknown>>,
  tags: Record<string, string> = {},
  value = 'x'
) =>
  ({
    tags,
    exception: {
      values: [{ type: 'TypeError', value, ...(frames ? { stacktrace: { frames } } : {}) }],
    },
  }) as unknown as Event

function browserOptions(checkAsset = vi.fn(async () => 404 as number | 'network')) {
  const options = sentryErrorOptions(config, 'browser', () => '/alquileres-uruguay', {
    origin: () => origin,
    tags: () => ({ browser: 'Chrome 129', page: 'alquileres-uruguay' }),
    checkAsset,
  })
  const send = (event: Event, error: unknown) =>
    Promise.resolve(options.beforeSend(event, { originalException: error } as EventHint))
  return { options, send, checkAsset }
}

describe('automated browsers never start the SDK', () => {
  it.each([
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/129.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Chrome-Lighthouse',
    'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
  ])('%s', userAgent => {
    expect(isAutomatedBrowser({ userAgent })).toBe(true)
  })

  it('keeps real browsers, including phones whose model contains "bot"', () => {
    for (const userAgent of [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
    ])
      expect(isAutomatedBrowser({ userAgent, webdriver: false })).toBe(false)
    expect(isAutomatedBrowser({ userAgent: 'Mozilla/5.0 Chrome/129', webdriver: true })).toBe(true)
  })
})

describe('identifiable without personal data', () => {
  it('names the browser family and major version only', () => {
    expect(
      sentryBrowserTag('Mozilla/5.0 (Windows NT 10.0) Chrome/129.0.6668.100 Safari/537.36')
    ).toBe('Chrome 129')
    expect(sentryBrowserTag('Mozilla/5.0 Chrome/129.0 Safari/537.36 Edg/129.0.2792.79')).toBe(
      'Edge 129'
    )
    expect(
      sentryBrowserTag(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe('Safari 18')
    expect(
      sentryBrowserTag('Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0')
    ).toBe('Firefox 131')
    expect(sentryBrowserTag('Mozilla/5.0 (iPhone) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]')).toBe(
      'Facebook app'
    )
    expect(sentryBrowserTag('')).toBe('Other')
  })

  it('reads the component file name and Vue lifecycle code, never props or state', () => {
    const instance = { $options: { __name: 'LocationsMap' }, $props: { secret: 'x@y.z' } }
    expect(sentryVueTags(instance, 'https://vuejs.org/error-reference/#runtime-1')).toEqual({
      component: 'LocationsMap',
      vue_hook: 'runtime-1',
    })
    expect(sentryVueTags(instance, 'mounted hook')).toEqual({
      component: 'LocationsMap',
      vue_hook: 'mounted hook',
    })
    expect(sentryVueTags({ $options: { name: 'private user@x' } }, 'free text: x@y.z')).toEqual({})
    expect(sentryVueTags(undefined, undefined)).toEqual({})
  })

  it('reports the Nuxt page name without its locale suffix', () => {
    expect(sentryPageName('casa-origin___es')).toBe('casa-origin')
    expect(sentryPageName('llevar-el-auto-a-brasil-o-argentina___en')).toBe(
      'llevar-el-auto-a-brasil-o-argentina'
    )
    expect(sentryPageName('/alquileres/private-house')).toBeUndefined()
    expect(sentryPageName(undefined)).toBeUndefined()
  })

  it('reads the string error code from the cause chain', () => {
    const headers = Object.assign(new Error('Cannot set headers after they are sent'), {
      code: 'ERR_HTTP_HEADERS_SENT',
    })
    expect(sentryErrorCode({ statusCode: 500, cause: headers })).toBe('ERR_HTTP_HEADERS_SENT')
    expect(sentryErrorCode({ code: 50 })).toBeUndefined()
    expect(sentryErrorCode({ code: 'private user@example.invalid' })).toBeUndefined()
    const loop: { cause?: unknown } = {}
    loop.cause = loop
    expect(sentryErrorCode(loop)).toBeUndefined()
    expect(EXPECTED_REFUSAL_CODES.has('RENTAL_ANALYSIS_UNAVAILABLE')).toBe(true)
    expect(EXPECTED_REFUSAL_CODES.has('RENTAL_ANALYSIS_STALE')).toBe(false)
  })

  it('keeps the new diagnostic tags only in their technical shapes', () => {
    const tags = (value: Record<string, string>) =>
      sanitizeSentryEvent(eventWith([own()], value), {}, config, 'browser')!.tags
    expect(
      tags({
        error_code: 'ERR_HTTP_HEADERS_SENT',
        component: 'LocationsMap',
        vue_hook: 'runtime-1',
        page: 'casa-origin',
        browser: 'Chrome 129',
        asset_status: '404',
      })
    ).toMatchObject({
      error_code: 'ERR_HTTP_HEADERS_SENT',
      component: 'LocationsMap',
      vue_hook: 'runtime-1',
      page: 'casa-origin',
      browser: 'Chrome 129',
      asset_status: '404',
    })
    const dropped = tags({
      error_code: 'user@example.invalid',
      component: '<script>',
      vue_hook: 'https://example.invalid/?q=private',
      page: '/alquileres/private-house',
      browser: 'Mozilla/5.0 (private)',
      asset_status: 'gone',
    })
    for (const name of ['error_code', 'component', 'vue_hook', 'page', 'browser', 'asset_status'])
      expect(dropped).not.toHaveProperty(name)
  })

  it('names DOM patch and Leaflet container failures instead of withholding them', () => {
    const value = (message: string) =>
      sanitizeSentryEvent(
        { exception: { values: [{ type: 'NotFoundError', value: message }] } } as Event,
        {},
        config,
        'browser'
      )!.exception!.values![0]
    expect(
      value(
        "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node."
      )
    ).toEqual(
      expect.objectContaining({
        type: 'NotFoundError',
        value: 'DOM node changed outside Vue during patch',
      })
    )
    expect(value('Map container not found.').value).toBe('Leaflet map container unavailable')
    expect(value('Map container is already initialized.').value).toBe(
      'Leaflet map container unavailable'
    )
  })
})

describe('asset failures are reported only when the asset is really gone', () => {
  it('extracts the same-origin asset a chunk error names', () => {
    expect(
      chunkFailureAsset(
        new TypeError(`Failed to fetch dynamically imported module: ${origin}/_nuxt/BJlzX8-i.js`),
        origin
      )
    ).toBe(`${origin}/_nuxt/BJlzX8-i.js`)
    // Nuxt wraps the original error; Vite names CSS by path.
    expect(
      chunkFailureAsset(
        {
          statusCode: 500,
          message: 'x',
          cause: new Error('Unable to preload CSS for /_nuxt/a.Bc.css'),
        },
        origin
      )
    ).toBe(`${origin}/_nuxt/a.Bc.css`)
    expect(chunkFailureAsset(new TypeError('Importing a module script failed.'), origin)).toBeNull()
    expect(
      chunkFailureAsset(
        new TypeError(
          'Failed to fetch dynamically imported module: https://evil.example/_nuxt/x.js'
        ),
        origin
      )
    ).toBeNull()
    expect(chunkFailureAsset(new TypeError('x is undefined'), origin)).toBeUndefined()
  })

  it('treats only 404, 410 and 5xx as missing', async () => {
    expect([404, 410, 500, 503].every(assetIsMissing)).toBe(true)
    expect([200, 304, 403, 'network' as const].some(assetIsMissing)).toBe(false)
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }))
    expect(await checkAssetStatus(`${origin}/_nuxt/x.js`, fetcher as unknown as typeof fetch)).toBe(
      404
    )
    expect(fetcher).toHaveBeenCalledWith(
      `${origin}/_nuxt/x.js`,
      expect.objectContaining({ method: 'HEAD', cache: 'no-store', credentials: 'omit' })
    )
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await checkAssetStatus('x', offline as unknown as typeof fetch)).toBe('network')
  })

  it('reports a missing asset with its status, and drops a visitor network failure', async () => {
    const missing = browserOptions(vi.fn(async () => 404))
    const error = new TypeError(
      `Failed to fetch dynamically imported module: ${origin}/_nuxt/Gone.js`
    )
    const reported = await missing.send(
      eventWith(undefined, { http_status: '500' }, error.message),
      error
    )
    expect(missing.checkAsset).toHaveBeenCalledWith(`${origin}/_nuxt/Gone.js`)
    expect(reported?.tags).toMatchObject({
      asset_status: '404',
      browser: 'Chrome 129',
      page: 'alquileres-uruguay',
    })
    expect(reported?.exception?.values?.[0].value).toBe('JavaScript chunk failed to load')

    const present = browserOptions(vi.fn(async () => 200))
    expect(await present.send(eventWith(), new TypeError(error.message))).toBeNull()
    const offline = browserOptions(vi.fn(async () => 'network' as const))
    expect(await offline.send(eventWith(), new TypeError(error.message))).toBeNull()
  })

  it('drops the knock-on errors of a page whose asset or DOM patch already failed', async () => {
    const chunk = browserOptions(vi.fn(async () => 200))
    await chunk.send(
      eventWith(),
      new TypeError(`Failed to fetch dynamically imported module: ${origin}/_nuxt/x.js`)
    )
    expect(await chunk.send(eventWith([own()]), new TypeError('later'))).toBeNull()

    const dom = browserOptions()
    const patch = new DOMException(
      "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
      'NotFoundError'
    )
    expect(await dom.send(eventWith([own()]), patch)).not.toBeNull()
    // CAMBIO-URUGUAY-BACKEND-13 and -N followed -16 within the same second.
    expect(
      await dom.send(
        eventWith([own()]),
        new TypeError("Cannot read properties of null (reading 'type')")
      )
    ).toBeNull()
  })
})

describe('code the site does not ship', () => {
  it('drops errors thrown by injected, evaluated or foreign scripts, and frameless reports', async () => {
    expect(
      thrownOutsideSiteCode(
        eventWith([own(), { filename: '<anonymous>', lineno: 1, colno: 226 }]),
        origin
      )
    ).toBe(true)
    expect(thrownOutsideSiteCode(eventWith([{ lineno: 1, colno: 226 }]), origin)).toBe(true)
    expect(
      thrownOutsideSiteCode(eventWith([{ filename: 'https://cdn.example/200.js' }]), origin)
    ).toBe(true)
    expect(thrownOutsideSiteCode(eventWith([own()]), origin)).toBe(false)
    expect(thrownOutsideSiteCode(eventWith([{ filename: '/_nuxt/x.js' }]), origin)).toBe(false)
    // Same-origin inline scripts are the site's own.
    expect(thrownOutsideSiteCode(eventWith([{ filename: `${origin}/guias/x` }]), origin)).toBe(
      false
    )

    const { send } = browserOptions()
    expect(
      await send(
        eventWith([{ filename: '<anonymous>', lineno: 1, colno: 226 }]),
        new ReferenceError('x')
      )
    ).toBeNull()
    // No frame and no HTTP status (CAMBIO-URUGUAY-BACKEND-E, -D): nothing to act on.
    expect(await send(eventWith(), new Error('x'))).toBeNull()
    const kept = await send(
      eventWith([own('DFBSu7KX.js')], {}, 'Map container not found.'),
      new Error('Map container not found.')
    )
    expect(kept?.exception?.values?.[0].value).toBe('Leaflet map container unavailable')
    expect(await send(eventWith(undefined, { http_status: '503' }), new Error('y'))).not.toBeNull()
  })

  it('caps the reports of a single page load', async () => {
    const { send } = browserOptions()
    const results = []
    for (let index = 0; index < 8; index += 1)
      results.push(await send(eventWith([own()]), new Error(`failure ${index}`)))
    expect(results.filter(Boolean)).toHaveLength(5)
  })

  it('leaves Nitro events to the existing projection', () => {
    const options = sentryErrorOptions(config, 'nitro')
    expect(
      options.beforeSend(eventWith([{ filename: '<anonymous>' }]), {
        originalException: new Error('x'),
      })
    ).not.toBeNull()
  })
})
