import { defineStore } from 'pinia'
import {
  fbAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from './firebaseAuthApi'

interface AuthUser {
  uid: string
  email: string | null
  name: string | null
  photo: string | null
  emailVerified: boolean
}

const MAGIC_LINK_EMAIL_KEY = 'cu_magic_email'

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
      const current = fbAuth().currentUser
      return current ? current.getIdToken() : null
    },

    openDialog() {
      this.error = null
      this.notice = null
      this.dialogOpen = true
    },
    closeDialog() {
      this.dialogOpen = false
    },

    async signInWithGoogle() {
      this.error = null
      try {
        await signInWithPopup(fbAuth(), new GoogleAuthProvider())
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async signInWithEmail(email: string, password: string) {
      this.error = null
      try {
        await signInWithEmailAndPassword(fbAuth(), email, password)
        this.closeDialog()
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async register(email: string, password: string) {
      this.error = null
      try {
        const cred = await createUserWithEmailAndPassword(fbAuth(), email, password)
        await sendEmailVerification(cred.user)
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
        await sendSignInLinkToEmail(fbAuth(), email, { url, handleCodeInApp: true })
        window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email)
        this.notice = 'auth.magicSent'
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async resetPassword(email: string) {
      this.error = null
      try {
        await sendPasswordResetEmail(fbAuth(), email)
        this.notice = 'auth.resetSent'
      } catch (e: any) {
        this.error = e?.code ?? e?.message ?? 'error'
      }
    },

    async logout() {
      await signOut(fbAuth())
      this.user = null
    },
  },
})
