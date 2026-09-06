import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  rememberPushDevice,
  readPushDevice,
  revokeBrowserPush,
} from '../../stores/firebaseMessagingApi'
const h = vi.hoisted(() => ({ supported: vi.fn(), deleteToken: vi.fn(), fetch: vi.fn() }))
vi.mock('firebase/messaging', () => ({
  getMessaging: () => ({}),
  isSupported: h.supported,
  deleteToken: h.deleteToken,
  getToken: vi.fn(),
  onMessage: vi.fn(),
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('window', {
    localStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  })
  vi.stubGlobal('fetch', h.fetch)
  rememberPushDevice({ uid: 'u1', token: 'device-token' })
  h.supported.mockResolvedValue(true)
})
describe('push revocation fallback', () => {
  it('revokes server ownership and local token using the authenticated account', async () => {
    h.fetch.mockResolvedValue({ ok: true })
    h.deleteToken.mockResolvedValue(true)
    expect(await revokeBrowserPush('id-token')).toBe(true)
    expect(h.fetch).toHaveBeenCalledWith(
      '/api/me/fcm-token',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ Authorization: 'Bearer id-token' }),
      })
    )
    expect(readPushDevice()).toBeNull()
  })
  it('uses Firebase revocation if the app request failed, without retaining the device', async () => {
    h.fetch.mockRejectedValue(new Error('offline'))
    h.deleteToken.mockResolvedValue(true)
    expect(await revokeBrowserPush('id-token')).toBe(true)
    expect(readPushDevice()).toBeNull()
  })
  it('retains revocation information and reports failure if neither route succeeded', async () => {
    h.fetch.mockRejectedValue(new Error('offline'))
    h.deleteToken.mockRejectedValue(new Error('offline'))
    expect(await revokeBrowserPush('id-token')).toBe(false)
    expect(readPushDevice()?.uid).toBe('u1')
  })
})
