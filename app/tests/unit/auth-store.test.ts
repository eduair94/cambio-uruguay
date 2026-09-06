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
  currentUser: null as any,
  revokeBrowserPush: vi.fn(),
}))
vi.mock('../../stores/firebaseMessagingApi', () => ({ revokeBrowserPush: h.revokeBrowserPush }))

vi.mock('../../stores/firebaseAuthApi', () => ({
  fbAuth: () => ({ currentUser: h.currentUser }),
  GoogleAuthProvider: vi.fn(),
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
  Object.values(h).forEach(m => {
    if (typeof m === 'function') m.mockReset()
  })
  h.currentUser = null
  vi.unstubAllGlobals()
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

  it('refreshes verification and forces a fresh ID token before remapping the account', async () => {
    h.currentUser = {
      uid: 'u1',
      email: 'a@b.com',
      emailVerified: false,
      reload: vi.fn(async () => {
        h.currentUser.emailVerified = true
      }),
      getIdToken: vi.fn(),
    }
    const store = useAuthStore()
    await store.refreshUser()
    expect(h.currentUser.reload).toHaveBeenCalledOnce()
    expect(h.currentUser.getIdToken).toHaveBeenCalledWith(true)
    expect(store.user?.emailVerified).toBe(true)
  })

  it('verification requires a non-anonymous mailbox and is explicit', async () => {
    const store = useAuthStore()
    expect(await store.verifyEmail()).toBe(false)
    h.currentUser = { uid: 'u1', email: 'a@b.com', isAnonymous: false }
    expect(await store.verifyEmail()).toBe(true)
    expect(h.sendEmailVerification).toHaveBeenCalledWith(h.currentUser)
  })

  it('does not claim logout completed when both device revocation routes failed', async () => {
    vi.stubGlobal('window', {})
    h.currentUser = { getIdToken: vi.fn().mockResolvedValue('id-token') }
    h.revokeBrowserPush.mockResolvedValue(false)
    const store = useAuthStore()
    store.setUser({ uid: 'u1' })
    await expect(store.logout()).rejects.toThrow('push/revocation-failed')
    expect(h.signOut).not.toHaveBeenCalled()
    expect(store.user?.uid).toBe('u1')
  })
})
