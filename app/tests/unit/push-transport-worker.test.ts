import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendPushNotification, sendPush, internalPushUrl } from '../../server/utils/push'
const h = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ send: h.send }) }))
vi.mock('../../server/utils/firebaseAdmin', () => ({ adminApp: () => ({}) }))

beforeEach(() => {
  h.send.mockReset()
})
describe('push transport and existing single service worker', () => {
  it('bounds a stalled provider call and treats the outcome as uncertain, without retry', async () => {
    vi.useFakeTimers()
    try {
      h.send.mockImplementation(() => new Promise(() => {}))
      const result = sendPushNotification('token', 'title', 'body', {
        url: '/cuenta',
        tag: 'd1',
        dataOnly: true,
      })
      await vi.advanceTimersByTimeAsync(30_000)
      expect(await result).toEqual({ token: 'token', status: 'uncertain' })
      expect(h.send).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
  it('sends data-only without a second auto-display payload', async () => {
    await sendPushNotification('token', 'title', 'body', {
      url: '/alquileres-uruguay',
      tag: 'd1',
      dataOnly: true,
    })
    const payload = h.send.mock.calls[0]![0]
    expect(payload).toMatchObject({
      data: {
        title: 'title',
        body: 'body',
        url: 'https://cambio-uruguay.com/alquileres-uruguay',
        tag: 'd1',
      },
    })
    expect(payload.notification).toBeUndefined()
    expect(payload.webpush.notification).toBeUndefined()
    expect(payload.webpush.fcmOptions).toBeUndefined()
  })
  it('keeps the legacy signature but does not delete a device for invalid payload', async () => {
    h.send.mockRejectedValue({ code: 'messaging/invalid-argument' })
    expect(await sendPush(['token'], 'title', 'body')).toEqual([])
    h.send.mockRejectedValue({ code: 'messaging/registration-token-not-registered' })
    expect(await sendPush(['token'], 'title', 'body')).toEqual(['token'])
  })
  it.each([
    'https://evil.example/path',
    '//evil.example',
    'javascript:alert(1)',
    'https://user@cambio-uruguay.com/',
  ])('rejects external/credentialed notification links', value => {
    expect(internalPushUrl(value)).toBe('https://cambio-uruguay.com/cuenta')
  })
  it('registers click handling before FCM, displays each payload once and safely opens links', async () => {
    let background: (payload: any) => any = () => {}
    let click: (event: any) => any = () => {}
    const showNotification = vi.fn()
    const openWindow = vi.fn()
    const order: string[] = []
    runInNewContext(
      readFileSync(new URL('../../public/firebase-messaging-extra.js', import.meta.url), 'utf8'),
      {
        URL,
        importScripts: () => order.push('import'),
        firebase: {
          initializeApp: vi.fn(),
          messaging: () => ({
            onBackgroundMessage: (fn: typeof background) => {
              background = fn
            },
          }),
        },
        self: {
          location: { origin: 'https://cambio-uruguay.com' },
          addEventListener: (_: string, fn: typeof click) => {
            click = fn
            order.push('click')
          },
          registration: { showNotification },
        },
        clients: { matchAll: async () => [], openWindow },
      }
    )
    expect(order[0]).toBe('click')
    await background({ notification: { title: 'legacy', body: 'body' } })
    expect(showNotification).not.toHaveBeenCalled()
    await background({
      data: { title: 'new', body: 'body', url: 'https://evil.example', tag: 'event1' },
    })
    expect(showNotification).toHaveBeenCalledTimes(1)
    expect(showNotification.mock.calls[0]![1]).toMatchObject({
      tag: 'event1',
      data: { url: 'https://cambio-uruguay.com/cuenta' },
    })
    let waiting: Promise<unknown> | undefined
    click({
      notification: { close: vi.fn(), data: { cuRentalAlert: true, url: '//evil.example' } },
      stopImmediatePropagation: vi.fn(),
      waitUntil: (promise: Promise<unknown>) => {
        waiting = promise
      },
    })
    await waiting
    expect(openWindow).toHaveBeenCalledWith('https://cambio-uruguay.com/cuenta')
  })
})
