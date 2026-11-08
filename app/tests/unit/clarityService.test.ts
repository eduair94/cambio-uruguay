import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as clarity from '../../services/clarity'

// How the site drives Clarity once it is on the page. The rules come from clarity-js 0.8.x itself:
// the library replaces the stub with its own function (carrying `v`, its version) when it runs,
// swaps a queue back in when it stops, and replays queued calls at its next start.
type Fn = ((...args: unknown[]) => void) & { q?: unknown[][]; v?: unknown }

const host: { clarity?: Fn } = {}
const cookieWrites: string[] = []
const removeItem = vi.fn()
let scripts = 0

/** clarity.js running: its own function, with a version, recording every call. */
function libraryTakesOver(): unknown[][] {
  const calls: unknown[][] = []
  host.clarity = Object.assign((...args: unknown[]) => void calls.push(args), { v: '0.8.77' })
  return calls
}

beforeEach(() => {
  clarity.resetClarityState()
  delete host.clarity
  cookieWrites.length = 0
  removeItem.mockReset()
  scripts = 0
  vi.stubGlobal('window', host)
  vi.stubGlobal('location', { hostname: 'cambio-uruguay.com' })
  vi.stubGlobal('sessionStorage', { removeItem })
  const document = {
    createElement: () => ({}),
    head: { appendChild: () => void scripts++ },
  }
  Object.defineProperty(document, 'cookie', {
    get: () => '',
    set: (value: string) => void cookieWrites.push(value),
  })
  vi.stubGlobal('document', document)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('before Clarity loads', () => {
  it('every call is a no-op and creates no global', () => {
    clarity.stop()
    clarity.set('template', 'inicio')
    clarity.event('feedback_view')
    clarity.upgrade('feedback')
    expect(clarity.start()).toBe(false)
    expect(host.clarity).toBeUndefined()
    expect(scripts).toBe(0)
  })
})

describe('while the tag is loading', () => {
  it('queues tags and events behind the consent', () => {
    clarity.load('3t0wlogvdz')
    clarity.set('family', 'alquileres')
    clarity.event('feedback_si')
    expect(host.clarity!.q).toEqual([
      ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }],
      ['set', 'family', 'alquileres'],
      ['event', 'feedback_si'],
    ])
  })

  it('is pending until clarity.js replaces the stub', () => {
    expect(clarity.isPending()).toBe(false)
    clarity.load('3t0wlogvdz')
    expect(clarity.isPending()).toBe(true)
    libraryTakesOver()
    expect(clarity.isPending()).toBe(false)
    expect(clarity.isLoaded()).toBe(true)
  })

  it('a stop aborts the load: the tag and clarity.js find a version and bail out', () => {
    clarity.load('3t0wlogvdz')
    clarity.stop()
    expect(typeof host.clarity).toBe('function')
    expect(host.clarity!.v).toBeTruthy()
    expect(clarity.isLoaded()).toBe(false)
    expect(clarity.isRecording()).toBe(false)
    // Calls after the abort go nowhere.
    clarity.event('feedback_no')
    expect(host.clarity!.q).toBeUndefined()
    // Final for this page view: a clarity.js still in flight would take over a second queue
    // without the tag's start. The next full page load tries again.
    expect(clarity.load('3t0wlogvdz')).toBe(false)
    expect(clarity.start()).toBe(false)
    expect(scripts).toBe(1)
  })
})

describe('once clarity.js runs', () => {
  it('stop and start drive the library, and nothing is queued while the site stopped it', () => {
    clarity.load('3t0wlogvdz')
    const calls = libraryTakesOver()
    clarity.set('template', 'alquileres-key')
    clarity.stop()
    clarity.event('feedback_view')
    clarity.set('ads', 'normal')
    expect(clarity.start()).toBe(true)
    expect(clarity.start()).toBe(false)
    clarity.event('cta_rental-feedback-si')
    expect(calls).toEqual([
      ['set', 'template', 'alquileres-key'],
      ['stop'],
      ['start', {}],
      ['event', 'cta_rental-feedback-si'],
    ])
  })

  it('wakes a Clarity that paused itself before stopping it, while the URL is still the recorded page', () => {
    clarity.load('3t0wlogvdz')
    libraryTakesOver()
    // Five idle minutes: clarity-js stops itself and puts a queue (no version) back.
    const queued: unknown[][] = []
    host.clarity = (...args: unknown[]) => void queued.push(args)
    clarity.stop()
    expect(queued).toEqual([['start', {}], ['stop']])
  })

  it('sends event names and tags only in the shapes the site writes', () => {
    clarity.load('3t0wlogvdz')
    const calls = libraryTakesOver()
    clarity.event('Bulevar Artigas 1234, apto 5')
    clarity.set('ref', 'a@b.com')
    clarity.set('feedback', 'en-parte')
    clarity.upgrade('feedback')
    expect(calls).toEqual([
      ['set', 'feedback', 'en-parte'],
      ['upgrade', 'feedback'],
    ])
  })
})

describe('forget()', () => {
  it('deletes _clck and _clsk with and without the parent domain, and the tab id', () => {
    clarity.forget()
    expect(cookieWrites).toEqual([
      '_clck=; Max-Age=0; path=/',
      '_clck=; Max-Age=0; path=/; domain=.cambio-uruguay.com',
      '_clsk=; Max-Age=0; path=/',
      '_clsk=; Max-Age=0; path=/; domain=.cambio-uruguay.com',
    ])
    expect(removeItem).toHaveBeenCalledWith('_cltk')
  })
})
