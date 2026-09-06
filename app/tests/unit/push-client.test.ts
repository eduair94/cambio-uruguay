import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePushNotifications } from '../../composables/usePushNotifications'
const h = vi.hoisted(() => ({
  supported: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  remember: vi.fn(),
  revoke: vi.fn(),
  requestPermission: vi.fn(),
  post: vi.fn(),
  stop: vi.fn(),
  show: vi.fn(),
  order: [] as string[],
}))
vi.mock('../../stores/firebaseMessagingApi', () => ({
  isSupported: h.supported,
  getMessaging: () => ({}),
  getToken: h.getToken,
  onMessage: h.onMessage,
  rememberPushDevice: h.remember,
  revokeBrowserPush: h.revoke,
}))
let auth: { user: { uid: string } | null; getToken: ReturnType<typeof vi.fn> }
beforeEach(() => {
  vi.resetAllMocks()
  h.order.length = 0
  auth = { user: { uid: 'u1' }, getToken: vi.fn().mockResolvedValue('id-token') }
  h.supported.mockImplementation(async () => {
    h.order.push('support')
    return true
  })
  h.requestPermission.mockImplementation(async () => {
    h.order.push('permission')
    return 'granted'
  })
  h.getToken.mockResolvedValue('fcm-token')
  h.onMessage.mockReturnValue(h.stop)
  h.show.mockResolvedValue(undefined)
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: h.requestPermission })
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ showNotification: h.show }) },
  })
  vi.stubGlobal('window', { location: { origin: 'https://cambio-uruguay.com' } })
  vi.stubGlobal('useAuthFetch', () => ({ authFetch: h.post }))
  vi.stubGlobal('$fetch', h.post)
  vi.stubGlobal('useAuthStore', () => auth)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { fcmVapidKey: 'public-vapid' } }))
  vi.stubGlobal('useNuxtApp', () => ({}))
})
describe('push permission and device lifecycle UI', () => {
  it('read-only support check does not request permission or register a token', async () => {
    expect(await usePushNotifications().getPushSupport()).toEqual({
      supported: true,
      configured: true,
      permission: 'default',
    })
    expect(h.requestPermission).not.toHaveBeenCalled()
    expect(h.getToken).not.toHaveBeenCalled()
    expect(h.post).not.toHaveBeenCalled()
  })
  it('requests from the click before asynchronous Firebase checks and keeps one foreground handler', async () => {
    const push = usePushNotifications()
    expect(await push.enablePush()).toBe('granted')
    expect(h.order[0]).toBe('permission')
    await push.enablePush()
    expect(h.stop).toHaveBeenCalled()
    expect(h.remember).toHaveBeenCalledWith({ uid: 'u1', token: 'fcm-token' })
  })
  it('does not create or persist a token when permission is denied', async () => {
    h.requestPermission.mockResolvedValue('denied')
    expect(await usePushNotifications().enablePush()).toBe('denied')
    expect(h.getToken).not.toHaveBeenCalled()
    expect(h.post).not.toHaveBeenCalled()
  })

  it('retains device revocation information when a registration response is lost', async () => {
    h.post.mockRejectedValue(new Error('response lost'))
    await expect(usePushNotifications().enablePush()).rejects.toThrow('response lost')
    expect(h.remember).toHaveBeenCalledWith({ uid: 'u1', token: 'fcm-token' })
    expect(h.remember.mock.invocationCallOrder[0]).toBeLessThan(h.post.mock.invocationCallOrder[0]!)
  })

  it('does not register for a different account after asynchronous permission work', async () => {
    h.getToken.mockImplementation(async () => {
      auth.user = { uid: 'u2' }
      return 'fcm-token'
    })
    await expect(usePushNotifications().enablePush()).rejects.toThrow('auth/account-changed')
    expect(h.post).not.toHaveBeenCalled()
  })
  it('foreground messages use the SW API, reject hostile links and ignore a different account', async () => {
    await usePushNotifications().enablePush()
    vi.stubGlobal('Notification', { permission: 'granted' })
    const handler = h.onMessage.mock.calls[0]![1]
    handler({ data: { title: 'Title', body: 'Body', url: '//evil.example', tag: 'd1' } })
    expect(h.show).toHaveBeenCalledWith(
      'Title',
      expect.objectContaining({
        data: { url: 'https://cambio-uruguay.com/cuenta', cuRentalAlert: true },
      })
    )
    auth.user = { uid: 'u2' }
    handler({ data: { title: 'Old', body: 'Body' } })
    expect(h.show).toHaveBeenCalledTimes(1)
  })
  it('disabling does not request permission or create a new token', async () => {
    h.revoke.mockResolvedValue(true)
    expect(await usePushNotifications().disablePush()).toBe(true)
    expect(h.revoke).toHaveBeenCalledWith('id-token')
    expect(h.requestPermission).not.toHaveBeenCalled()
    expect(h.getToken).not.toHaveBeenCalled()
  })
})
