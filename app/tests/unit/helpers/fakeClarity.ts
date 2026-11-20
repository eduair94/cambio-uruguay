// A model of clarity-js 0.8.x's life cycle, written from its source (src/queue.ts, src/clarity.ts,
// src/core/index.ts, src/core/history.ts, src/interaction/pageshow.ts, src/interaction/unload.ts,
// src/data/metadata.ts, src/data/consent.ts, src/data/upload.ts, src/core/scrub.ts) and checked
// against the real build in jsdom. A fake that is "a function with a version" cannot tell a stale
// reference to the global from the live one, and cannot restart by itself; this one can:
//   - `window.clarity` is a NEW queue after every stop, and the queue pushes onto whatever the
//     global is at call time. A `start` sent to it swaps the library's function back in.
//   - It restarts on its own: a pageshow listener bound once and never removed (bfcache), the
//     listeners it arms after pausing for five idle minutes, and 250 ms after a URL change it saw.
//   - Each upload goes to `config.upload` (a URL, or a function), with `location.href` through
//     the `drop` list; stop() always sends a last one.
//   - The tag's metadata callback requests c.gif whenever Clarity's consent says ad granted.
// Nothing here touches the network: an upload is a row in `uploads`, c.gif a row in `images`.

type Fn = ((...args: unknown[]) => unknown) & { q?: unknown[][]; v?: string; t?: boolean }
type ClarityWindow = Window & {
  clarity?: Fn
  google_tag_data?: { ics?: { addListener: (types: string[], listener: () => void) => void } }
}

export interface FakeUpload {
  /** `network` for a URL target, `sink` for a function, `none` without one. */
  to: 'network' | 'sink' | 'none'
  /** The envelope's url: location.href at upload time, through the drop list. */
  url: string
  final: boolean
  page: number
}

export const VERSION = '0.8.77'
export const TAG_CONFIG = Object.freeze({
  projectId: '3t0wlogvdz',
  upload: 'https://r.clarity.ms/collect',
  expire: 365,
  cookies: ['_uetmsclkid', '_uetvid', '_clck'],
  track: true,
  content: true,
  dob: 2503,
})

export function createFakeClarity(win: ClarityWindow = window as ClarityWindow) {
  const config: { upload: unknown; drop: string[]; track: boolean } = {
    upload: null,
    drop: [],
    track: true,
  }
  const uploads: FakeUpload[] = []
  const images: string[] = []
  const warnings: string[] = []
  /** Calls that reached the running library, with the page they landed on. */
  const calls: Array<{ method: string; args: unknown[]; page: number }> = []
  const timers: Array<() => void> = []
  let active = false
  let page = 0
  let firstUpload = false
  let consent: { ad_Storage: string; analytics_Storage: string } | null = null
  const callbacks: Array<{ callback: (...args: unknown[]) => void; consentInfo: boolean }> = []
  let bindings: Array<[EventTarget, string, EventListener]> = []
  let pageshow: EventListener | null = null
  let historyProxied = false
  let trackedUrl: string | null = null
  const originalPush = win.history.pushState.bind(win.history)
  const originalReplace = win.history.replaceState.bind(win.history)

  const href = () => win.location.href.split('#')[0] ?? ''
  const scrub = (input: string) => {
    if (!config.drop.length || !input.includes('?')) return input
    const [path, query] = input.split('?')
    const kept = query!
      .split('&')
      .map(part =>
        config.drop.some(name => part.indexOf(name + '=') === 0)
          ? part.split('=')[0] + '=*na*'
          : part
      )
    return path + '?' + kept.join('&')
  }

  function bind(target: EventTarget, type: string, listener: EventListener) {
    target.addEventListener(type, listener, { capture: false, passive: true })
    bindings.push([target, type, listener])
  }
  function unbindAll() {
    for (const [target, type, listener] of bindings) target.removeEventListener(type, listener)
    bindings = []
  }

  function upload(final: boolean) {
    const target = config.upload
    uploads.push({
      to: typeof target === 'string' ? 'network' : typeof target === 'function' ? 'sink' : 'none',
      url: scrub(href()),
      final,
      page,
    })
    if (typeof target === 'function') target('{"e":[],"a":[]}')
    if (!firstUpload) {
      firstUpload = true
      // upload.ts done(1) → metadata.callback(): the metadata callbacks run again.
      for (const entry of callbacks)
        entry.callback({}, true, entry.consentInfo ? consent : undefined)
    }
  }

  function setupQueue() {
    const queue: Fn = function (...args: unknown[]) {
      const current = win.clarity!
      ;(current.q = current.q || []).push(args)
      if (args[0] === 'start') {
        current.q.unshift(current.q.pop()!)
        process()
      }
    }
    win.clarity = queue
  }

  function process() {
    if (win.clarity?.v) {
      warnings.push('Error CL001: Multiple Clarity tags detected.')
      return
    }
    const queue = win.clarity?.q ?? []
    const live: Fn = (method: unknown, ...args: unknown[]) =>
      (api as Record<string, (...rest: unknown[]) => unknown>)[method as string]?.(...args)
    live.v = VERSION
    win.clarity = live
    while (queue.length) live(...queue.shift()!)
  }

  function compute() {
    if (trackedUrl !== href()) {
      api.stop()
      timers.push(() => api.start())
    }
  }

  function proxyHistory() {
    if (historyProxied) return
    historyProxied = true
    win.history.pushState = function (...args: Parameters<History['pushState']>) {
      originalPush(...args)
      if (active) compute()
    }
    win.history.replaceState = function (...args: Parameters<History['replaceState']>) {
      originalReplace(...args)
      if (active) compute()
    }
  }

  const api = {
    start(override: Record<string, unknown> | null = null) {
      if (active) return
      if (override) {
        if ('upload' in override) config.upload = override.upload
        if (Array.isArray(override.drop)) config.drop = override.drop as string[]
        if (typeof override.track === 'boolean') config.track = override.track
      }
      active = true
      page++
      firstUpload = false
      unbindAll()
      trackedUrl = href()
      proxyHistory()
      bind(win, 'popstate', compute)
      bind(win, 'pagehide', () => api.stop())
      if (!pageshow) {
        // interaction/pageshow.ts: bound once, never removed, restarts on every bfcache restore.
        pageshow = event => {
          if ((event as PageTransitionEvent).persisted) api.start()
        }
        win.addEventListener('pageshow', pageshow, { capture: false, passive: true })
      }
      consent ??= {
        ad_Storage: config.track ? 'granted' : 'denied',
        analytics_Storage: config.track ? 'granted' : 'denied',
      }
      win.google_tag_data?.ics?.addListener(['ad_storage', 'analytics_storage'], () =>
        api.consentv2(gcmState())
      )
      if (override === null) process()
    },
    stop() {
      if (!active) return
      upload(true)
      unbindAll()
      trackedUrl = null
      active = false
      setupQueue()
    },
    consentv2(state: { ad_Storage?: string; analytics_Storage?: string }) {
      if (!active || !consent) return
      const next = {
        ad_Storage: (state.ad_Storage ?? consent.ad_Storage).toLowerCase(),
        analytics_Storage: (state.analytics_Storage ?? consent.analytics_Storage).toLowerCase(),
      }
      if (
        next.ad_Storage === consent.ad_Storage &&
        next.analytics_Storage === consent.analytics_Storage
      )
        return
      consent = next
      for (const entry of callbacks.filter(item => item.consentInfo))
        entry.callback({}, true, consent)
      if (next.analytics_Storage !== 'granted' && config.track) {
        config.track = false
        api.stop()
        timers.push(() => api.start())
      }
    },
    metadata(callback: (...args: unknown[]) => void, wait = true, recall = false, info = false) {
      if (active && wait === false) callback({}, true, info ? consent : undefined)
      if (recall) callbacks.push({ callback, consentInfo: info })
    },
    set: (...args: unknown[]) => void calls.push({ method: 'set', args, page }),
    event: (...args: unknown[]) => void calls.push({ method: 'event', args, page }),
    upgrade: (...args: unknown[]) => void calls.push({ method: 'upgrade', args, page }),
    identify: (...args: unknown[]) => void calls.push({ method: 'identify', args, page }),
  }

  let gcm = { ad_storage: 1, analytics_storage: 1 }
  const gcmListeners: Array<() => void> = []
  const gcmState = () => ({
    ad_Storage: gcm.ad_storage === 1 ? 'granted' : 'denied',
    analytics_Storage: gcm.analytics_storage === 1 ? 'granted' : 'denied',
  })

  return {
    uploads,
    images,
    warnings,
    calls,
    get active() {
      return active
    },
    get config() {
      return config
    },
    /** What www.clarity.ms/tag/<id> does (demo tag, cookies on), minus inserting clarity.js. */
    runTag(tagConfig: Record<string, unknown> = { ...TAG_CONFIG }) {
      const a = win as ClarityWindow
      a.clarity!(
        'metadata',
        (_data: unknown, _upgraded: unknown, state?: { ad_Storage?: string }) => {
          if (state?.ad_Storage === 'granted') images.push('https://c.clarity.ms/c.gif')
        },
        false,
        true,
        true
      )
      if (a.clarity!.v || a.clarity!.t) return void a.clarity!('event', 'clarity', 'dup')
      a.clarity!.t = true
      a.clarity!('start', tagConfig)
      a.clarity!.q?.unshift(a.clarity!.q.pop()!)
      a.clarity!('set', 'C_IS', '0')
    },
    /** clarity.js arriving: global.ts calls queue.process(). */
    runLibrary() {
      process()
    },
    /** An upload on Clarity's own timer, while it runs. */
    tick() {
      if (active) upload(false)
    },
    /** core.suspend(): five idle minutes. Stops, and wakes on the next interaction. */
    suspend() {
      if (!active) return
      api.stop()
      const restart = () => api.start()
      for (const type of ['mousemove', 'touchstart']) bind(win.document, type, restart)
      for (const type of ['resize', 'scroll', 'pageshow']) bind(win, type, restart)
    },
    /** A back/forward step: the browser changes the URL (no pushState), then fires popstate. */
    browserGoTo(url: string) {
      originalReplace({}, '', url)
      win.dispatchEvent(new PopStateEvent('popstate'))
    },
    /** The page enters the back/forward cache and comes back. */
    bfcacheRoundTrip() {
      win.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
      win.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    },
    /** Clarity's own timers (its 250 ms restarts), run now. */
    runTimers() {
      while (timers.length) timers.shift()!()
    },
    /** gtag's Consent Mode with google_tag_data.ics, as Clarity reads it (1 granted, 2 denied). */
    installConsentMode(initial = { ad_storage: 1, analytics_storage: 1 }) {
      gcm = { ...initial }
      win.google_tag_data = {
        ics: {
          addListener: (_types: string[], listener: () => void) => gcmListeners.push(listener),
        },
      }
    },
    /** gtag('consent', 'update'): listeners hear it only when a value changes. */
    consentUpdate(next: { ad_storage: number; analytics_storage: number }) {
      const changed =
        next.ad_storage !== gcm.ad_storage || next.analytics_storage !== gcm.analytics_storage
      gcm = { ...next }
      if (changed) for (const listener of gcmListeners) listener()
    },
    uploadsNaming(fragment: string) {
      return uploads.filter(item => item.to === 'network' && item.url.includes(fragment))
    },
    restore() {
      win.history.pushState = originalPush
      win.history.replaceState = originalReplace
      unbindAll()
      if (pageshow) win.removeEventListener('pageshow', pageshow)
      delete win.google_tag_data
    },
  }
}

export type FakeClarity = ReturnType<typeof createFakeClarity>
