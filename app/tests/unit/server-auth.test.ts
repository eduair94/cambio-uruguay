import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebaseAdmin so requireUser doesn't need real credentials.
const verifyIdToken = vi.fn()
vi.mock('../../server/utils/firebaseAdmin', () => ({
  adminAuth: () => ({ verifyIdToken }),
}))

import { requireUser } from '../../server/utils/auth'

function fakeEvent(authHeader?: string) {
  return {
    node: { req: { headers: authHeader ? { authorization: authHeader } : {} } },
  } as any
}

describe('requireUser', () => {
  beforeEach(() => verifyIdToken.mockReset())

  it('rejects when no Authorization header', async () => {
    await expect(requireUser(fakeEvent())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a malformed header', async () => {
    await expect(requireUser(fakeEvent('Token abc'))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects when verifyIdToken throws', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('bad token'))
    await expect(requireUser(fakeEvent('Bearer xyz'))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns uid + email on a valid token', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.com' })
    await expect(requireUser(fakeEvent('Bearer good'))).resolves.toEqual({
      uid: 'u1',
      email: 'a@b.com',
    })
  })
})
