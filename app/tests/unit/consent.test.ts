import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
  CONSENT_STRICT_REGIONS,
  parseConsent,
  serializeConsent,
  consentSignals,
  insertStoredConsent,
} from '../../utils/consent'
// The installed module's own queue builder: the order under test is the one it really produces.
import { initGtag } from '../../node_modules/nuxt-gtag/dist/runtime/utils.js'

describe('consent core', () => {
  it('exposes the cookie name and a ~1y max-age', () => {
    expect(CONSENT_COOKIE_NAME).toBe('cu_consent')
    expect(CONSENT_MAX_AGE).toBe(60 * 60 * 24 * 365)
  })

  it('parses only the two valid decisions, else null', () => {
    expect(parseConsent('granted')).toBe('granted')
    expect(parseConsent('denied')).toBe('denied')
    expect(parseConsent('')).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('GRANTED')).toBeNull()
    expect(parseConsent('yes')).toBeNull()
  })

  it('round-trips serialize/parse', () => {
    expect(parseConsent(serializeConsent('granted'))).toBe('granted')
    expect(parseConsent(serializeConsent('denied'))).toBe('denied')
  })

  it('maps granted to all-granted signals', () => {
    expect(consentSignals('granted')).toEqual({
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
  })

  it('maps denied to all-denied signals', () => {
    expect(consentSignals('denied')).toEqual({
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  })
})

// The consent defaults are region-scoped (nuxt.config.ts): denied where Google's EU user consent
// policy requires it, granted elsewhere. Getting this list wrong is not a visible bug — it is
// either a compliance problem in Europe or three quarters of the traffic going unmeasured at home.
describe('strict consent regions', () => {
  it('covers the EEA, the UK and Switzerland', () => {
    for (const code of [
      'DE',
      'FR',
      'ES',
      'IT',
      'NL',
      'PL',
      'SE',
      'IE',
      'NO',
      'IS',
      'LI',
      'GB',
      'CH',
    ]) {
      expect(CONSENT_STRICT_REGIONS).toContain(code)
    }
    // 27 EU + 3 EEA + UK + CH.
    expect(CONSENT_STRICT_REGIONS).toHaveLength(32)
  })

  it('does not cover the markets this site actually serves', () => {
    // 96 % of impressions are Uruguayan; these are the ones the strict default was silently costing.
    for (const code of ['UY', 'AR', 'BR', 'US', 'CL', 'PY', 'BO', 'MX', 'CO']) {
      expect(CONSENT_STRICT_REGIONS).not.toContain(code)
    }
  })

  it('is uppercase ISO-3166 alpha-2 with no duplicates', () => {
    for (const code of CONSENT_STRICT_REGIONS) expect(code).toMatch(/^[A-Z]{2}$/)
    expect(new Set(CONSENT_STRICT_REGIONS).size).toBe(CONSENT_STRICT_REGIONS.length)
  })
})

/** What gtag() queues: the call's own Arguments object, like nuxt-gtag's runtime does. */
function queued(..._command: unknown[]): IArguments {
  // eslint-disable-next-line prefer-rest-params -- the Arguments object is what gtag.js executes
  return arguments
}
const isArguments = (value: unknown) =>
  Object.prototype.toString.call(value) === '[object Arguments]'
const names = (queue: unknown[]) =>
  queue.map(entry => {
    const [name, detail] = Array.from(entry as ArrayLike<unknown>)
    return name === 'consent' ? `consent ${String(detail)}` : String(name)
  })
const allDenied = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
}

// The two `consent default` commands nuxt.config.ts hands the module, in the same order.
const initCommands = [
  [
    'consent',
    'default',
    {
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      ad_storage: 'granted',
      analytics_storage: 'granted',
    },
  ],
  [
    'consent',
    'default',
    { ...allDenied, wait_for_update: 500, region: [...CONSENT_STRICT_REGIONS] },
  ],
]
/** The queue the installed nuxt-gtag builds at boot for the site's two tags. */
function bootQueue(): unknown[] {
  const browser: { dataLayer?: unknown[] } = {}
  vi.stubGlobal('window', browser)
  initGtag({
    tags: [
      { id: 'G-F97PNVRMRF', config: {}, initCommands },
      { id: 'AW-972399920', config: { send_page_view: true } },
    ] as Parameters<typeof initGtag>[0]['tags'],
  })
  return browser.dataLayer!
}

// Measured 2026-11-08 with cu_consent=denied: the first /g/collect carried gcs=G111 and `_ga` was
// written again on every load, because the replayed update was queued after `config`. Checked the
// same day in Chrome against the site's own GA4 container (served locally, every hit aborted): with
// the update inserted before `js`, the first page_view goes out with gcs=G100 and no `_ga`.
describe('a stored decision is queued before the first hit', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lands after the two defaults and before js on the queue nuxt-gtag really builds', () => {
    const queue = bootQueue()
    expect(names(queue)).toEqual(['consent default', 'consent default', 'js', 'config', 'config'])
    expect(insertStoredConsent(queue, consentSignals('denied'))).toBe(true)
    expect(names(queue)).toEqual([
      'consent default',
      'consent default',
      'consent update',
      'js',
      'config',
      'config',
    ])
    expect(isArguments(queue[2])).toBe(true)
    expect(Array.from(queue[2] as IArguments)).toEqual(['consent', 'update', allDenied])
  })

  it('takes index 2 of [default, default, js, config, config] and leaves the rest in order', () => {
    const queue: unknown[] = [
      queued('consent', 'default', {}),
      queued('consent', 'default', {}),
      queued('js', new Date()),
      queued('config', 'G-F97PNVRMRF', {}),
      queued('config', 'AW-972399920', {}),
    ]
    const before = [...queue]
    expect(insertStoredConsent(queue, consentSignals('granted'))).toBe(true)
    expect(queue).toHaveLength(6)
    expect(isArguments(queue[2])).toBe(true)
    expect(Array.from(queue[2] as IArguments)).toEqual([
      'consent',
      'update',
      consentSignals('granted'),
    ])
    expect([...queue.slice(0, 2), ...queue.slice(3)]).toEqual(before)
  })

  it('a rejection replays all four signals as denied', () => {
    const queue: unknown[] = [queued('js', new Date())]
    insertStoredConsent(queue, consentSignals('denied'))
    const [, , signals] = Array.from(queue[0] as IArguments)
    expect(signals).toEqual(allDenied)
    expect(Object.values(signals as object).every(value => value === 'denied')).toBe(true)
  })

  it('appends when nothing has queued `js` yet', () => {
    const queue: unknown[] = [queued('consent', 'default', {})]
    expect(insertStoredConsent(queue, consentSignals('denied'))).toBe(true)
    expect(names(queue)).toEqual(['consent default', 'consent update'])
    expect(isArguments(queue[1])).toBe(true)
    const empty: unknown[] = []
    expect(insertStoredConsent(empty, consentSignals('denied'))).toBe(true)
    expect(names(empty)).toEqual(['consent update'])
  })

  it('refuses a queue gtag.js already runs, without touching it', () => {
    const queue: unknown[] = [queued('consent', 'default', {}), queued('js', new Date())]
    const processed: unknown[] = []
    // What gtag.js does on load: its own push executes each command as it arrives.
    Object.defineProperty(queue, 'push', {
      value: (...entries: unknown[]) => processed.push(...entries),
    })
    expect(insertStoredConsent(queue, consentSignals('denied'))).toBe(false)
    expect(names(queue)).toEqual(['consent default', 'js'])
    expect(processed).toEqual([])
  })

  it('refuses anything that is not a data layer', () => {
    for (const value of [undefined, null, {}, 'dataLayer', { push: () => 0, length: 0 }])
      expect(insertStoredConsent(value, consentSignals('denied'))).toBe(false)
  })

  it('looks for the gtag `js` command, not Tag Manager entries that look like it', () => {
    // An object push and a plain array are Tag Manager commands; gtag.js only executes Arguments.
    const queue: unknown[] = [{ event: 'gtm.js' }, ['js'], queued('js', new Date())]
    insertStoredConsent(queue, consentSignals('denied'))
    expect(queue).toHaveLength(4)
    expect(queue.findIndex(isArguments)).toBe(2)
    expect(Array.from(queue[2] as IArguments).slice(0, 2)).toEqual(['consent', 'update'])
    expect(names(queue).slice(3)).toEqual(['js'])
  })

  it('queues a copy, so a later change to the signals object cannot alter it', () => {
    const queue: unknown[] = [queued('js', new Date())]
    const signals = consentSignals('denied')
    insertStoredConsent(queue, signals)
    signals.analytics_storage = 'granted'
    expect(Array.from(queue[0] as IArguments)[2]).toEqual(allDenied)
  })
})

describe('the consent plugin replays before gtag.js can run the queue', () => {
  const plugins = resolve(__dirname, '../../plugins')
  const source = readFileSync(resolve(plugins, 'consent.client.ts'), 'utf8')

  it('inserts first and calls gtag() only when the queue is already live', () => {
    const insert = source.indexOf('insertStoredConsent(')
    const update = source.indexOf("gtag('consent', 'update'")
    expect(insert).toBeGreaterThan(-1)
    expect(update).toBeGreaterThan(insert)
    expect(source).toMatch(/^\s*if \(insertStoredConsent\(.*\)\) return$/m)
  })

  it('runs ahead of the plugin that injects gtag.js', () => {
    // Nuxt runs app plugins in file-name order unless one declares `order` or `enforce`.
    const files = readdirSync(plugins).sort()
    expect(files.indexOf('consent.client.ts')).toBeGreaterThan(-1)
    expect(files.indexOf('consent.client.ts')).toBeLessThan(files.indexOf('gtag-init.client.ts'))
    for (const file of ['consent.client.ts', 'gtag-init.client.ts'])
      expect(readFileSync(resolve(plugins, file), 'utf8')).not.toMatch(/\b(?:enforce|order)\s*:/)
  })
})
