import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useAuthStore } from '../../stores/auth'

// Hoisted so the vi.mock factory (also hoisted) can reference these safely.
const h = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(),
}))

vi.mock('../../stores/firebaseAuthApi', () => ({
  fbAuth: () => ({ currentUser: null }),
  GoogleAuthProvider: class {},
  signInWithPopup: h.signInWithPopup,
  signInWithEmailAndPassword: h.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: h.createUserWithEmailAndPassword,
  sendSignInLinkToEmail: h.sendSignInLinkToEmail,
  sendPasswordResetEmail: h.sendPasswordResetEmail,
  signOut: h.signOut,
  sendEmailVerification: h.sendEmailVerification,
}))

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(h).forEach(m => m.mockReset())
})

describe('auth store', () => {
  it('starts logged out', () => {
    const s = useAuthStore()
    expect(s.isLoggedIn).toBe(false)
  })

  it('setUser maps a firebase user', () => {
    const s = useAuthStore()
    s.setUser({ uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: 'p', emailVerified: true })
    expect(s.isLoggedIn).toBe(true)
    expect(s.user).toMatchObject({ uid: 'u1', email: 'a@b.com', name: 'A', emailVerified: true })
  })

  it('signInWithEmail records an error message on failure', async () => {
    h.signInWithEmailAndPassword.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/wrong-password' })
    )
    const s = useAuthStore()
    await s.signInWithEmail('a@b.com', 'bad')
    expect(s.error).toBe('auth/wrong-password')
  })

  it('logout clears the user', async () => {
    h.signOut.mockResolvedValueOnce(undefined)
    const s = useAuthStore()
    s.setUser({ uid: 'u1', email: null, displayName: null, photoURL: null, emailVerified: false })
    await s.logout()
    expect(s.user).toBeNull()
  })
})
