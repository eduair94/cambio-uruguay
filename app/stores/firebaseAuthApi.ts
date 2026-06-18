// Thin re-export layer over firebase/auth so the store can be mocked in tests
// and the rest of the app imports auth primitives from one place.
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

export function fbAuth(): Auth {
  return getAuth()
}
