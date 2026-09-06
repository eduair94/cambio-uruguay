import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const registerPushToken = vi.fn()
const unregisterPushToken = vi.fn()
vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/pushRegistrations', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/utils/pushRegistrations')>()),
  registerPushToken,
  unregisterPushToken,
}))

const { readBody } = installNitroGlobals()
const handler = (await import('../../server/api/me/fcm-token.post')).default
const remove = (await import('../../server/api/me/fcm-token.delete')).default

beforeEach(() => {
  ;[requireUser, registerPushToken, unregisterPushToken, readBody].forEach(m => m.mockReset())
  requireUser.mockResolvedValue({ uid: 'u1', email: null })
})

describe('POST /api/me/fcm-token', () => {
  it('rejects an empty token', async () => {
    readBody.mockResolvedValueOnce({ token: '' })
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('adds the token to the user (idempotent)', async () => {
    readBody.mockResolvedValueOnce({ token: 'tok-123456789012345' })
    const res = await handler({} as any)
    expect(registerPushToken).toHaveBeenCalledWith('u1', 'tok-123456789012345')
    expect(res).toEqual({ ok: true })
  })

  it.each([{}, [], 'a'.repeat(4097), 'token with whitespace', 123])(
    'rejects malformed/bounded input %j',
    async token => {
      readBody.mockResolvedValue({ token })
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 })
      expect(registerPushToken).not.toHaveBeenCalled()
    }
  )

  it('DELETE only revokes for the authenticated UID, ignoring supplied UID', async () => {
    readBody.mockResolvedValue({ token: 'tok-123456789012345', uid: 'victim' })
    await remove({} as any)
    expect(unregisterPushToken).toHaveBeenCalledWith('u1', 'tok-123456789012345')
  })
})
