// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://cambio-uruguay.com/dolar-hoy" }
// How the site drives Clarity once it is on the page, against a model of clarity-js's own life
// cycle (helpers/fakeClarity.ts): the global goes stale at every start and stop, the library
// restarts itself, and every upload records where it went. A fake that is just "a function with a
// version" passed the old code, which lost its stop on a Clarity that had paused itself.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as clarity from '../../services/clarity'
import { CLARITY_PRIVATE_QUERY_PARAMS } from '../../utils/clarityValues'
import { TAG_CONFIG, createFakeClarity, type FakeClarity } from './helpers/fakeClarity'

type Fn = ((...args: unknown[]) => void) & { q?: unknown[][]; v?: unknown }
const host = () => window as unknown as { clarity?: Fn }
const tagScripts = () =>
  document.head.querySelectorAll('script[src^="https://www.clarity.ms/tag/"]').length

let fake: FakeClarity

/** load(), then the tag and clarity.js arriving. */
function loadAndRun(tagConfig?: Record<string, unknown>) {
  expect(clarity.load('3t0wlogvdz')).toBe(true)
  fake.runTag(tagConfig)
  fake.runLibrary()
}

beforeEach(() => {
  clarity.resetClarityState()
  delete host().clarity
  document.head.replaceChildren()
  window.history.replaceState({}, '', '/dolar-hoy')
  fake = createFakeClarity()
})
afterEach(() => {
  fake.restore()
  delete host().clarity
  vi.restoreAllMocks()
})

describe('before Clarity loads', () => {
  it('every call is a no-op and creates no global', () => {
    clarity.stop()
    clarity.pause()
    clarity.set('template', 'inicio')
    clarity.event('feedback_view')
    clarity.upgrade('feedback')
    expect(clarity.start()).toBe(false)
    expect(host().clarity).toBeUndefined()
    expect(tagScripts()).toBe(0)
  })
})

describe('while the tag is loading', () => {
  it('queues tags and events behind the consent', () => {
    clarity.load('3t0wlogvdz')
    clarity.set('family', 'alquileres')
    clarity.event('feedback_si')
    expect(host().clarity!.q).toEqual([
      ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }],
      ['set', 'family', 'alquileres'],
      ['event', 'feedback_si'],
    ])
  })

  it('is pending until clarity.js replaces the stub', () => {
    expect(clarity.isPending()).toBe(false)
    clarity.load('3t0wlogvdz')
    expect(clarity.isPending()).toBe(true)
    fake.runTag()
    expect(clarity.isPending()).toBe(true)
    fake.runLibrary()
    expect(clarity.isPending()).toBe(false)
    expect(clarity.isLoaded()).toBe(true)
    expect(clarity.isRunning()).toBe(true)
  })

  it('a stop aborts the load: the tag and clarity.js find a version and bail out', () => {
    clarity.load('3t0wlogvdz')
    clarity.stop()
    expect(clarity.isLoaded()).toBe(false)
    expect(clarity.isRecording()).toBe(false)
    // The tag and the library still arrive, and do nothing.
    fake.runTag()
    fake.runLibrary()
    expect(fake.active).toBe(false)
    expect(fake.uploads).toEqual([])
    // Calls after the abort go nowhere.
    clarity.event('feedback_no')
    expect(host().clarity!.q).toBeUndefined()
    // Final for this page view: a clarity.js still in flight would take over a second queue
    // without the tag's start. The next full page load tries again.
    expect(clarity.load('3t0wlogvdz')).toBe(false)
    expect(clarity.start()).toBe(false)
    expect(tagScripts()).toBe(1)
  })
})

describe('the tag start, as the site adopts it', () => {
  it('keeps the upload target and adds the private query parameters to the drop list', () => {
    loadAndRun({ ...TAG_CONFIG, drop: ['utm_secret'] })
    expect(fake.config.upload).toBe(TAG_CONFIG.upload)
    expect(fake.config.drop).toEqual(['utm_secret', ...CLARITY_PRIVATE_QUERY_PARAMS])
  })

  it('a URL Clarity sends carries a private parameter without its value', () => {
    loadAndRun()
    // A back/forward step to a URL with the reference address: the browser writes the URL first.
    fake.browserGoTo('/alquileres-uruguay?refLat=-34.9&refLabel=Bulevar%20Artigas&orden=precio')
    const last = fake.uploads.at(-1)!
    expect(last.url).toBe(
      'https://cambio-uruguay.com/alquileres-uruguay?refLat=*na*&refLabel=*na*&orden=precio'
    )
  })
})

describe('stop(): this page must not be recorded', () => {
  it('stops a running Clarity, sends its last batch, and parks it', () => {
    loadAndRun()
    clarity.stop()
    expect(fake.active).toBe(false)
    expect(fake.uploads.filter(item => item.to === 'network').at(-1)?.final).toBe(true)
    expect(typeof fake.config.upload).toBe('function')
    expect(clarity.isRecording()).toBe(false)
  })

  it('a Clarity that paused itself is stopped for good: woken into the sink, its wake-up gone', () => {
    loadAndRun()
    // Five idle minutes: clarity-js stops itself and arms listeners to wake on the next touch.
    fake.suspend()
    expect(clarity.isRunning()).toBe(false)
    const before = fake.uploads.length
    clarity.stop()
    expect(fake.active).toBe(false)
    document.dispatchEvent(new Event('mousemove'))
    window.dispatchEvent(new Event('scroll'))
    expect(fake.active).toBe(false)
    expect(fake.uploads.slice(before).every(item => item.to === 'sink')).toBe(true)
  })

  it('a restart clarity-js makes on its own afterwards sends nothing: bfcache', () => {
    loadAndRun()
    clarity.stop()
    const before = fake.uploads.length
    fake.bfcacheRoundTrip()
    expect(fake.active).toBe(true)
    expect(clarity.isRunning()).toBe(true)
    fake.tick()
    clarity.stop()
    expect(fake.active).toBe(false)
    expect(fake.uploads.slice(before).length).toBeGreaterThan(0)
    expect(fake.uploads.slice(before).every(item => item.to === 'sink')).toBe(true)
  })

  it('a restart clarity-js scheduled before the stop sends nothing either: its 250 ms timer', () => {
    loadAndRun()
    // A page syncs its query with history.replaceState: Clarity stops and restarts 250 ms later.
    window.history.replaceState({}, '', '/precio/yerba?orden=precio')
    expect(clarity.isRunning()).toBe(false)
    clarity.stop()
    const before = fake.uploads.length
    window.history.pushState({}, '', '/cuenta')
    fake.runTimers()
    fake.tick()
    expect(fake.uploads.slice(before).every(item => item.to === 'sink')).toBe(true)
  })
})

describe('pause(): a navigation, with the next page moments away', () => {
  it('only stops a running Clarity: no extra page, the real target kept', () => {
    loadAndRun()
    clarity.pause()
    expect(fake.active).toBe(false)
    expect(fake.config.upload).toBe(TAG_CONFIG.upload)
    expect(clarity.start()).toBe(true)
    fake.tick()
    expect(fake.uploads.map(item => item.page)).toEqual([1, 2])
  })

  it('parks a Clarity in its own queue mode, which would otherwise restart on the new URL', () => {
    loadAndRun()
    fake.suspend()
    clarity.pause()
    expect(typeof fake.config.upload).toBe('function')
    document.dispatchEvent(new Event('touchstart'))
    expect(fake.active).toBe(false)
  })

  it('leaves a loading tag alone: the caller decides whether to abort it', () => {
    clarity.load('3t0wlogvdz')
    clarity.pause()
    expect(clarity.isPending()).toBe(true)
    expect(clarity.isRecording()).toBe(true)
  })
})

describe('start(): back to recording', () => {
  it('gives a parked Clarity its real target back, with the drop list', () => {
    loadAndRun()
    clarity.stop()
    expect(clarity.start()).toBe(true)
    expect(clarity.start()).toBe(false)
    expect(fake.config.upload).toBe(TAG_CONFIG.upload)
    expect(fake.config.drop).toEqual([...CLARITY_PRIVATE_QUERY_PARAMS])
    fake.tick()
    expect(fake.uploads.at(-1)!.to).toBe('network')
    // No "Multiple Clarity tags" warning: the restart carries a configuration object.
    expect(fake.warnings).toEqual([])
  })

  it('first stops a restart clarity-js made on its own, into the sink', () => {
    loadAndRun()
    clarity.stop()
    fake.bfcacheRoundTrip()
    const before = fake.uploads.length
    expect(clarity.start()).toBe(true)
    expect(fake.uploads.slice(before)[0]).toMatchObject({ to: 'sink', final: true })
    expect(fake.active).toBe(true)
  })

  it('keeps it parked when the tag never said where it uploads', () => {
    loadAndRun({ projectId: '3t0wlogvdz', track: true })
    clarity.stop()
    expect(clarity.start()).toBe(false)
    expect(fake.active).toBe(false)
  })
})

describe('what reaches the library', () => {
  it('nothing is queued while the site stopped it, and tags land on the page recorded', () => {
    loadAndRun()
    clarity.set('template', 'alquileres-key')
    clarity.stop()
    clarity.event('feedback_view')
    clarity.set('ads', 'normal')
    clarity.start()
    clarity.event('cta_rental-feedback-si')
    expect(fake.calls.map(({ method, args }) => [method, ...args])).toEqual([
      ['set', 'C_IS', '0'],
      ['set', 'template', 'alquileres-key'],
      ['event', 'cta_rental-feedback-si'],
    ])
  })

  it('sends event names and tags only in the shapes the site writes', () => {
    loadAndRun()
    clarity.event('Bulevar Artigas 1234, apto 5')
    clarity.set('ref', 'a@b.com')
    clarity.set('feedback', 'en-parte')
    clarity.upgrade('feedback')
    expect(fake.calls.slice(1).map(({ method, args }) => [method, ...args])).toEqual([
      ['set', 'feedback', 'en-parte'],
      ['upgrade', 'feedback'],
    ])
  })

  it('nothing clarity.js throws leaves the service', () => {
    loadAndRun()
    host().clarity = Object.assign(
      () => {
        throw new Error('a future clarity.js')
      },
      { v: '0.9.0' }
    )
    expect(() => clarity.set('family', 'autos')).not.toThrow()
    expect(() => clarity.pause()).not.toThrow()
    expect(() => clarity.stop()).not.toThrow()
    expect(() => clarity.start()).not.toThrow()
  })
})

describe('forget()', () => {
  it('deletes _clck and _clsk with and without the parent domain, and the tab id', () => {
    const writes: string[] = []
    vi.spyOn(document, 'cookie', 'set').mockImplementation(value => void writes.push(value))
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    clarity.forget()
    expect(writes).toEqual([
      '_clck=; Max-Age=0; path=/',
      '_clck=; Max-Age=0; path=/; domain=.cambio-uruguay.com',
      '_clsk=; Max-Age=0; path=/',
      '_clsk=; Max-Age=0; path=/; domain=.cambio-uruguay.com',
    ])
    expect(removeItem).toHaveBeenCalledWith('_cltk')
  })
})
