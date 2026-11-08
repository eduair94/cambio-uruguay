// The only code that talks to Microsoft Clarity. Outside Nuxt's auto-imports on purpose, like
// services/firebaseLazy.ts: nothing here runs until plugins/clarity.client.ts calls load(), and
// every other export is a no-op before that — with the project id empty (production today)
// `window.clarity` stays undefined and no request reaches *.clarity.ms.
//
// Three facts about clarity-js 0.8.x shape this file (read in its source, src/clarity.ts,
// src/queue.ts, src/data/metadata.ts, src/core/history.ts):
//   - The tag (www.clarity.ms/tag/<id>) registers a metadata callback that requests
//     c.clarity.ms/c.gif — Microsoft's advertising id sync — the moment Clarity reports
//     ad_Storage granted, which it does by default when the project uses cookies. A consentv2
//     with ad_Storage denied queued BEFORE the tag is inserted reaches Clarity right after its
//     start and before that callback, so the sync never fires. The site runs no Microsoft
//     advertising; analytics_Storage granted is the visitor's consent (explicit, or the default
//     regime outside the EEA, the UK and Switzerland).
//   - consentv2 with analytics_Storage denied does not stop Clarity: it deletes the cookies,
//     stops and RESTARTS it cookieless 250 ms later, with one more upload. This file never sends
//     it. "Rechazar" is stop() and forget().
//   - stop() swaps the global back to a queue, and calls made while stopped are replayed at the
//     next start. Calls made while the site stopped it are dropped instead: an event from
//     /cuenta must not land on the next recorded page.

import { clarityEventName, clarityForgetCookies, clarityTagValue } from '../utils/clarityPolicy'

type ClarityFunction = ((...args: unknown[]) => void) & { q?: unknown[]; v?: unknown }
type ClarityHost = { clarity?: ClarityFunction }

/** Clarity project ids are short lowercase alphanumerics (10 characters today). */
const PROJECT_ID = /^[a-z\d]{6,32}$/i
const TAG_URL = 'https://www.clarity.ms/tag/'
/** A version on an inert global makes the tag and clarity.js bail out ("Multiple Clarity tags"). */
const ABORTED = 'aborted-by-site'

type Phase = 'idle' | 'loading' | 'live' | 'aborted'
let phase: Phase = 'idle'
let recording = false
let stub: ClarityFunction | null = null

function host(): ClarityHost | undefined {
  return typeof window === 'undefined' ? undefined : (window as unknown as ClarityHost)
}

/** The official snippet's queue: calls wait in `q` until clarity.js replays them. */
function queueStub(): ClarityFunction {
  const fn: ClarityFunction = (...args: unknown[]) => {
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

export function isRecording(): boolean {
  return recording
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

/** Resumes a Clarity this site stopped. Returns true when a new recorded page begins. */
export function start(): boolean {
  const clarity = host()?.clarity
  if (recording || phase !== 'live' || typeof clarity !== 'function') return false
  recording = true
  // With a configuration object, so the restart does not re-run clarity.js's own queue check
  // (which warns "Multiple Clarity tags detected" for a plain `start`).
  clarity('start', {})
  return true
}

/** Stops recording. The current page's last batch is sent; nothing after it. */
export function stop(): void {
  const target = host()
  if (!target || !recording) return
  recording = false
  if (phase === 'loading' && target.clarity === stub) {
    // clarity.js has not run yet: make the tag and the library bail out instead of letting them
    // start on a page that must not be recorded. Final for this page view (see load()).
    const inert: ClarityFunction = () => {}
    inert.v = ABORTED
    target.clarity = inert
    stub = null
    phase = 'aborted'
    return
  }
  phase = 'live'
  const clarity = target.clarity
  if (typeof clarity !== 'function') return
  // Without a version the library is in its own queue mode: it paused itself after five idle
  // minutes and will wake on the next mouse move or scroll — on whatever page that is. Waking it
  // here, while the URL is still the recorded page's, lets the stop remove those listeners.
  if (typeof clarity.v !== 'string') clarity('start', {})
  clarity('stop')
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
  const clarity = host()?.clarity
  if (typeof clarity === 'function') clarity(method, ...args)
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
  stub = null
}
