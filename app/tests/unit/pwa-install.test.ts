import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, shallowRef } from 'vue'

let browser: EventTarget
let displayMode: EventTarget & { matches: boolean }
let dispose: () => void
beforeEach(() => {
  vi.resetModules()
  browser = new EventTarget()
  displayMode = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('window', Object.assign(browser, { matchMedia: () => displayMode }))
  vi.stubGlobal('navigator', { userAgent: 'Chrome', platform: 'Win32', maxTouchPoints: 0 })
  vi.stubGlobal('defineNuxtPlugin', (setup: unknown) => setup)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('shallowRef', shallowRef)
  vi.stubGlobal('computed', computed)
})
afterEach(() => {
  dispose?.()
  vi.unstubAllGlobals()
})
async function boot() {
  const setup = (await import('../../plugins/pwa-install.client')).default
  return setup({
    vueApp: {
      onUnmount: (cleanup: () => void) => {
        dispose = cleanup
      },
    },
  } as any).provide.pwaInstall
}
function offer(outcome: 'accepted' | 'dismissed' = 'dismissed') {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  })
}

describe('installation requires an explicit action', () => {
  it('captures the browser event without prompting on load, scroll or interaction', async () => {
    const installer = await boot()
    expect(installer.available.value).toBe(false)
    const event = offer()
    browser.dispatchEvent(event)
    browser.dispatchEvent(new Event('scroll'))
    browser.dispatchEvent(new Event('pointerdown'))
    expect(event.defaultPrevented).toBe(true)
    expect(event.prompt).not.toHaveBeenCalled()
    expect(installer.available.value).toBe(true)
  })
  it('invokes the native prompt once and respects dismissal', async () => {
    const installer = await boot()
    const event = offer()
    browser.dispatchEvent(event)
    await expect(installer.install()).resolves.toBe('dismissed')
    await expect(installer.install()).resolves.toBe('unavailable')
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(installer.available.value).toBe(false)
  })
  it('hides the invitation after installation and ignores subsequent offers', async () => {
    const installer = await boot()
    browser.dispatchEvent(offer('accepted'))
    await expect(installer.install()).resolves.toBe('accepted')
    browser.dispatchEvent(offer())
    expect(installer.available.value).toBe(false)
  })
  it('recognizes an installation performed outside the website button', async () => {
    const installer = await boot()
    const event = offer()
    browser.dispatchEvent(event)
    browser.dispatchEvent(new Event('appinstalled'))
    await expect(installer.install()).resolves.toBe('unavailable')
    expect(event.prompt).not.toHaveBeenCalled()
  })
  it('offers instructions on iOS only in response to an explicit action', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 })
    const installer = await boot()
    expect(installer.available.value).toBe(true)
    await expect(installer.install()).resolves.toBe('instructions')
  })
  it('does not offer installation inside an installed web app', async () => {
    displayMode.matches = true
    const installer = await boot()
    browser.dispatchEvent(offer())
    expect(installer.available.value).toBe(false)
  })
  it('releases a failed prompt without retrying it automatically', async () => {
    const installer = await boot()
    const event = offer()
    event.prompt.mockRejectedValue(new Error('dismissed by browser'))
    browser.dispatchEvent(event)
    await expect(installer.install()).rejects.toThrow()
    expect(installer.busy.value).toBe(false)
    await expect(installer.install()).resolves.toBe('unavailable')
    expect(event.prompt).toHaveBeenCalledTimes(1)
  })
  it('removes listeners when the app is disposed', async () => {
    const installer = await boot()
    dispose()
    const event = offer()
    browser.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(installer.available.value).toBe(false)
  })
})
