import { defineStore } from 'pinia'
import { loadFirebaseAuth, loadedFirebaseAuth } from '~/services/firebaseLazy'

interface AuthUser {
  uid: string
  email: string | null
  name: string | null
  photo: string | null
  emailVerified: boolean
}

const MAGIC_LINK_EMAIL_KEY = 'cu_magic_email'

// Resolves the first time onAuthStateChanged reports in (via setUser), so
// authenticated requests can wait for the session to be restored instead of
// firing with no token on a cold page load.
let resolveReady: (() => void) | null = null
const readyGate = new Promise<void>(resolve => {
  resolveReady = resolve
})

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    ready: false,
    dialogOpen: false,
    error: null as string | null,
    notice: null as string | null,
  }),

  getters: {
    isLoggedIn: state => !!state.user,
  },

  actions: {
    setUser(fb: any | null) {
      this.ready = true
      if (resolveReady) {
        resolveReady()
        resolveReady = null
      }
      this.user = fb
        ? {
            uid: fb.uid,
            email: fb.email ?? null,
            name: fb.displayName ?? null,
            photo: fb.photoURL ?? null,
            emailVerified: !!fb.emailVerified,
          }
        : null
    },

    async getToken(): Promise<string | null> {
      // Wait for the first auth-state resolution (capped) so a cold-load
      // request doesn't fire before the session is restored.
      if (!this.ready) {
        await Promise.race([readyGate, new Promise(resolve => setTimeout(resolve, 3000))])
      }
      // No user means no token: asking for one must not pull the SDK in.
      const fb = this.user ? await loadFirebaseAuth() : loadedFirebaseAuth()
      const current = fb?.fbAuth().currentUser
      return current ? current.getIdToken() : null
    },

    openDialog() {
      this.error = null
      this.notice = null
      this.dialogOpen = true
      // Load the SDK while the visitor reads the dialog, so the sign-in click opens its popup
      // within the click's user activation instead of waiting on a chunk download.
      if (import.meta.client) void loadFirebaseAuth().catch(() => {})
    },
    closeDialog() {
      this.dialogOpen = false
    },

    async signInWithGoogle() {
      this.error = null
      try {
        const fb = await loadFirebaseAuth()
        await fb.signInWithPopup(fb.fbAuth(), new fb.GoogleAuthProvider())
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async signInAsGuest() {
      this.error = null
      try {
        const fb = await loadFirebaseAuth()
        await fb.signInAnonymously(fb.fbAuth())
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async signInWithEmail(email: string, password: string) {
      this.error = null
      try {
        const fb = await loadFirebaseAuth()
        await fb.signInWithEmailAndPassword(fb.fbAuth(), email, password)
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async register(email: string, password: string) {
      this.error = null
      try {
        const fb = await loadFirebaseAuth()
        const cred = await fb.createUserWithEmailAndPassword(fb.fbAuth(), email, password)
        await fb.sendEmailVerification(cred.user)
        this.notice = 'auth.verifySent'
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async sendMagicLink(email: string) {
      this.error = null
      try {
        const url = `${window.location.origin}/cuenta?magic=1`
        const fb = await loadFirebaseAuth()
        await fb.sendSignInLinkToEmail(fb.fbAuth(), email, { url, handleCodeInApp: true })
        window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email)
        this.notice = 'auth.magicSent'
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async resetPassword(email: string) {
      this.error = null
      try {
        const fb = await loadFirebaseAuth()
        await fb.sendPasswordResetEmail(fb.fbAuth(), email)
        this.notice = 'auth.resetSent'
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async refreshUser(): Promise<void> {
      const current = (await loadFirebaseAuth()).fbAuth().currentUser
      if (!current) {
        this.setUser(null)
        return
      }
      await current.reload()
      await current.getIdToken(true)
      this.setUser(current)
    },

    async verifyEmail(): Promise<boolean> {
      this.error = null
      const fb = await loadFirebaseAuth()
      const current = fb.fbAuth().currentUser
      if (!current?.email || current.isAnonymous) {
        this.error = 'auth/required'
        return false
      }
      try {
        await fb.sendEmailVerification(current)
        this.notice = 'auth.verifySent'
        return true
      } catch (error: any) {
        this.error = error?.code ?? 'auth/verification-failed'
        return false
      }
    },

    async logout() {
      if (import.meta.client && typeof window !== 'undefined') {
        const { revokeBrowserPush } = await import('~/services/firebaseMessagingApi')
        if (!(await revokeBrowserPush(await this.getToken()))) {
          this.error = 'push/revocation-failed'
          throw new Error('push/revocation-failed')
        }
      }
      const fb = await loadFirebaseAuth()
      await fb.signOut(fb.fbAuth())
      this.user = null
    },
  },
})
