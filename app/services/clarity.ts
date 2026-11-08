// The only code that talks to Microsoft Clarity. Outside Nuxt's auto-imports on purpose, like
// services/firebaseLazy.ts: nothing here runs until services/clarityRuntime.ts calls load(), and
// every other export is a no-op before that — with the project id empty (production today)
// `window.clarity` stays undefined and no request reaches *.clarity.ms.
//
// What clarity-js 0.8.x does that shapes this file (read in its source: src/queue.ts,
// src/clarity.ts, src/core/index.ts, src/core/history.ts, src/interaction/pageshow.ts,
// src/data/metadata.ts, src/data/upload.ts, src/core/scrub.ts):
//   - Running, `window.clarity` is the library's own function and carries `v`, its version.
//     Stopped, it is a queue again, a NEW function each time, and a `start` sent to that queue
//     swaps the library's function back in. A reference to the global goes stale at every start
//     and stop, so this file reads it again before every call; "running" means a `v` on it.
//   - It restarts ITSELF, whatever the site decided: on a back/forward-cache restore (a pageshow
//     listener it never removes), on the first mouse move, touch or scroll after pausing itself
//     for five idle minutes, and 250 ms after any URL change it saw while running. So while the
//     site keeps it stopped it is PARKED: started and stopped once more with an upload target
//     that is a function dropping everything (its config outlives a stop). A restart of its own
//     then records into that sink and nothing leaves the browser, until start() gives it back
//     the real target, which the tag's own start call carried (kept here when the tag runs).
//   - The tag requests c.clarity.ms/c.gif, Microsoft's advertising id sync, the moment Clarity
//     reports ad_Storage granted, which it does by default when the project uses cookies. A
//     consentv2 with ad_Storage denied queued BEFORE the tag is inserted reaches Clarity right
//     after its start and before that callback, so the sync never fires. The site runs no
//     Microsoft advertising; analytics_Storage granted is the visitor's consent (explicit, or the
//     default regime outside the EEA, the UK and Switzerland).
//   - consentv2 with analytics_Storage denied does not stop Clarity: it deletes the cookies,
//     stops and RESTARTS it cookieless 250 ms later, with one more upload. This file never sends
//     it. "Rechazar" is stop() and forget().
//   - Every URL it sends (the page, each upload's envelope, a clicked link) goes through its
//     `drop` list, which leaves those query parameters' values as "*na*". The tag's start call
//     gets the site's private parameters added to it: a token or the reference address never
//     leaves in a URL, not even as the destination of a back/forward step, which the browser
//     writes before any listener can stop Clarity.
//   - Calls made while the site stopped it are dropped: an event from /cuenta must not land on
//     the next recorded page.

import {
  CLARITY_PRIVATE_QUERY_PARAMS,
  clarityEventName,
  clarityForgetCookies,
  clarityTagValue,
} from '../utils/clarityValues'

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[]; v?: unknown }
type ClarityHost = { clarity?: ClarityFunction }

/** Clarity project ids are short lowercase alphanumerics (10 characters today). */
const PROJECT_ID = /^[a-z\d]{6,32}$/i
const TAG_URL = 'https://www.clarity.ms/tag/'
/** A version on an inert global makes the tag and clarity.js bail out ("Multiple Clarity tags"). */
const ABORTED = 'aborted-by-site'
/** A parked Clarity's upload target: the payload goes nowhere. */
const SINK = (): void => {}

type Phase = 'idle' | 'loading' | 'live' | 'aborted'
let phase: Phase = 'idle'
let recording = false
let parked = false
let stub: ClarityFunction | null = null
/** Where the tag told Clarity to upload: given back by start() after a park. */
let uploadTarget: string | null = null
/** The tag's own `drop` list plus the site's private query parameters. */
let dropped: string[] = [...CLARITY_PRIVATE_QUERY_PARAMS]

function host(): ClarityHost | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as ClarityHost)
}

/** clarity.js itself, running: its function carries its version (not the inert one of abort()). */
function running(fn: ClarityFunction | undefined): fn is ClarityFunction & { v: string } {
  return typeof fn === 'function' && typeof fn.v === 'string' && fn.v !== ABORTED
}

/**
 * clarity.js loads unpinned from Microsoft's CDN: nothing it throws may leave this file, or a
 * future release could cancel every navigation (the runtime calls pause() in a router guard),
 * swallow a consent decision or break a click.
 */
function attempt(run: () => void): boolean {
  try {
    run()
    return true
  } catch {
    return false
  }
}

/** The tag's start configuration, with the site's private parameters added to its drop list. */
function adoptTagConfig(config: unknown): unknown {
  if (!config || typeof config !== 'object') return config
  const tag = config as { upload?: unknown; drop?: unknown }
  if (typeof tag.upload === 'string' && tag.upload) uploadTarget = tag.upload
  const own = Array.isArray(tag.drop)
    ? tag.drop.filter((name): name is string => typeof name === 'string')
    : []
  dropped = [...new Set([...own, ...CLARITY_PRIVATE_QUERY_PARAMS])]
  return { ...tag, drop: dropped }
}

/** The official snippet's queue: calls wait in `q` until clarity.js replays them. */
function queueStub(): ClarityFunction {
  const fn: ClarityFunction = (...args: unknown[]) => {
    // Only the tag starts Clarity through this queue, with the project's configuration.
    if (args[0] === 'start') args[1] = adoptTagConfig(args[1])
    ;(fn.q = fn.q || []).push(args)
  }
  return fn
}

export function isLoaded(): boolean {
  return phase === 'loading' || phase === 'live'
}

/** The tag is on its way and clarity.js has not run yet: nothing is recorded so far. */
export function isPending(): boolean {
  return phase === 'loading' && !!stub && host()?.clarity === stub
}

/** What the site wants: Clarity recording this page. */
export function isRecording(): boolean {
  return recording
}

/** What clarity.js does: running right now, also when it restarted on its own while parked. */
export function isRunning(): boolean {
  return running(host()?.clarity)
}

/**
 * Starts Clarity for the first time on this page view. Returns true when a new recorded page
 * begins, so the caller sends its tags; they wait in the queue.
 *
 * Once per page view: after an aborted load (see stop()) the tag or clarity.js may still be in
 * flight, and a second queue would be taken over by the first clarity.js — which never got the
 * tag's start — leaving Clarity loaded and never started. The next full page load tries again.
 */
export function load(projectId: string): boolean {
  const target = host()
  if (!target || typeof document === 'undefined') return false
  if (!PROJECT_ID.test(projectId) || phase !== 'idle') return false
  // A global the site did not create belongs to another Clarity tag: not ours to drive.
  if (target.clarity) return false
  stub = queueStub()
  target.clarity = stub
  // First, before the tag exists: see the header. Never with analytics_Storage denied.
  stub('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' })
  const tag = document.createElement('script')
  tag.async = true
  tag.src = TAG_URL + projectId
  document.head.appendChild(tag)
  phase = 'loading'
  recording = true
  return true
}

/** Stops clarity.js if it is running, reading the global fresh. Its last batch is sent. */
function halt(target: ClarityHost): void {
  const fn = target.clarity
  if (running(fn)) fn('stop')
}

/**
 * Leaves clarity.js stopped with SINK as its upload target (see the header). A start is also the
 * only thing that removes the listeners it sets to wake itself up after pausing, so a Clarity in
 * its own queue mode gets woken here: into the sink, on whatever URL the browser is on.
 */
function park(target: ClarityHost): void {
  if (parked) return
  const queue = target.clarity
  if (typeof queue !== 'function' || running(queue)) return
  queue('start', { upload: SINK })
  halt(target)
  parked = true
}

/** The tag is still loading: make the tag and clarity.js bail out. Final for this page view. */
function abort(target: ClarityHost): void {
  const inert: ClarityFunction = () => {}
  inert.v = ABORTED
  target.clarity = inert
  stub = null
  phase = 'aborted'
}

/**
 * A navigation is about to change the URL, and the next page starts Clarity again within moments
 * (the runtime calls start() or stop() once it has rendered). A running Clarity is just stopped:
 * the page it recorded gets its last batch, and nothing can restart it in between. One in its own
 * queue mode (paused itself, or waiting out its 250 ms restart) would restart by itself on the
 * new URL: that one is parked. While the tag loads, the caller decides (stop() aborts the load).
 */
export function pause(): void {
  const target = host()
  if (!target || !isLoaded() || isPending()) return
  recording = false
  phase = 'live'
  attempt(() => {
    if (running(target.clarity)) halt(target)
    else park(target)
  })
}

/** This page must not be recorded: Clarity stops and stays parked until start(). */
export function stop(): void {
  const target = host()
  if (!target) return
  recording = false
  if (phase === 'loading' && target.clarity === stub) {
    // clarity.js has not run yet: rather than letting it start on a page that must not be
    // recorded, abort the load (see load()).
    abort(target)
    return
  }
  if (!isLoaded()) return
  phase = 'live'
  attempt(() => {
    halt(target)
    park(target)
  })
}

/** Resumes a Clarity this site stopped. Returns true when a new recorded page begins. */
export function start(): boolean {
  const target = host()
  if (!target || recording || phase !== 'live') return false
  // Parked, but the tag never said where Clarity uploads: it cannot be given its target back,
  // so it stays parked for the rest of this page view rather than record into a guess.
  if (parked && !uploadTarget) return false
  const ok = attempt(() => {
    // A restart of its own while the site kept it stopped (parked: it ran into the sink).
    halt(target)
    const queue = target.clarity
    if (typeof queue !== 'function') throw new TypeError('Clarity is gone')
    // With a configuration object: a bare `start` re-runs clarity.js's own queue check, which
    // logs "Error CL001: Multiple Clarity tags detected".
    queue('start', parked ? { upload: uploadTarget, drop: dropped } : { drop: dropped })
  })
  if (!ok) return false
  parked = false
  recording = true
  return true
}

/**
 * Deletes what Clarity keeps in this browser: the `_clck` and `_clsk` cookies on every domain
 * they can have been written on, and the tab id in sessionStorage. CLID, on clarity.ms, is
 * Microsoft's and out of this page's reach.
 */
export function forget(): void {
  if (typeof document === 'undefined' || typeof location === 'undefined') return
  for (const write of clarityForgetCookies(location.hostname)) document.cookie = write
  try {
    sessionStorage.removeItem('_cltk')
  } catch {
    /* Blocked storage holds no tab id either. */
  }
}

function call(method: string, ...args: string[]): void {
  if (!recording) return
  const fn = host()?.clarity
  if (typeof fn === 'function') attempt(() => fn(method, ...args))
}

/** A custom tag on the recorded page (heatmap and recording filters). Closed vocabulary only. */
export function set(key: string, value: string): void {
  const name = clarityTagValue(key)
  const text = clarityTagValue(value)
  if (name && text) call('set', name, text)
}

/** A custom event: its NAME only, never parameters. */
export function event(name: string): void {
  const clean = clarityEventName(name)
  if (clean) call('event', clean)
}

/** Asks Clarity to keep this session's full recording (it matters only in lean mode). */
export function upgrade(reason: string): void {
  const clean = clarityTagValue(reason)
  if (clean) call('upgrade', clean)
}

/** Tests only: back to a page that never loaded Clarity. */
export function resetClarityState(): void {
  phase = 'idle'
  recording = false
  parked = false
  stub = null
  uploadTarget = null
  dropped = [...CLARITY_PRIVATE_QUERY_PARAMS]
}
