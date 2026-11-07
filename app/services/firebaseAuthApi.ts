// Thin re-export layer over firebase/auth so the store can be mocked in tests
// and the rest of the app imports auth primitives from one place.
//
// Never import this module statically from code that runs on page load: it is the Firebase
// SDK. Go through loadFirebaseAuth() in ./firebaseLazy, which loads it on first use.
import { getApps, initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInAnonymously,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

export interface FirebasePublicConfig {
  apiKey: string
  authDomain?: string
  projectId?: string
  appId?: string
  messagingSenderId?: string
}

export function initFirebaseApp(cfg: FirebasePublicConfig): void {
  if (getApps().length) return
  initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    appId: cfg.appId,
    messagingSenderId: cfg.messagingSenderId,
  })
}

export function fbAuth(): Auth {
  return getAuth()
}
