import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyIdToken = vi.fn()
vi.mock('../../server/utils/firebaseAdmin', () => ({ adminAuth: () => ({ verifyIdToken }) }))

const { requireUser } = await import('../../server/utils/auth')

const event = (token: string) =>
  ({ node: { req: { headers: { authorization: `Bearer ${token}` } } } }) as any

beforeEach(() => verifyIdToken.mockReset())

// Quien crea una clave de la API tiene que ser alguien: las rutas que lo exigen necesitan saber si la
// sesión es de invitado (Firebase anónimo) y si el correo está verificado.
describe('requireUser: identidad de la sesión', () => {
  it('marca la sesión de invitado', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'g1', firebase: { sign_in_provider: 'anonymous' } })
    expect(await requireUser(event('t'))).toEqual({
      uid: 'g1',
      email: null,
      emailVerified: false,
      anonymous: true,
    })
  })

  it('una cuenta de Google con correo verificado', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: 'u1',
      email: 'ana@empresa.uy',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    })
    expect(await requireUser(event('t'))).toEqual({
      uid: 'u1',
      email: 'ana@empresa.uy',
      emailVerified: true,
      anonymous: false,
    })
  })
})
