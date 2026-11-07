import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// The Firebase SDK must not load for a visitor who never signs in (services/firebaseLazy.ts): it
// was ~130 KB of the entry chunk and, on mobile, ~140 KB more of auth iframe + gapi per page.
// One static import from code that runs on page load puts it all back, with no failing test and
// no visible change — so this guards where each Firebase-facing module may be imported from.
const ROOT = join(__dirname, '..', '..')
const SKIP = new Set(['node_modules', 'tests', 'server', 'public', '.nuxt', '.output'])

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sources(path, out)
    else if (/\.(?:ts|vue)$/.test(name) && !name.endsWith('.d.ts')) out.push(path)
  }
  return out
}

const files = sources(ROOT).map(path => ({
  path: relative(ROOT, path).split(sep).join('/'),
  text: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ''),
}))

/** Files with a static (non-type) import of a module matching `target`. */
function staticImporters(target: RegExp): string[] {
  // The first quote after `import ` opens the specifier (bindings hold no quotes); `import(` is a
  // dynamic import and does not match.
  const re = /^\s*import(?!\s+type\b)\s[^'"]*['"]([^'"]+)['"]/gm
  return files
    .filter(file => [...file.text.matchAll(re)].some(m => target.test(m[1] ?? '')))
    .map(file => file.path)
    .sort()
}

describe('the Firebase SDK stays off the page-load path', () => {
  // Both wrappers live in services/, which Nuxt does not auto-import. In stores/ (where they
  // were), unimport injected `getToken` from firebase/messaging into stores/auth.ts because of
  // the store's own getToken() method, and `signOut` into utils/puterChat.ts because of a type
  // signature: the usage tree-shakes away, the SDK's side effects stay in the chunk.
  it('only the two thin wrappers import firebase/* directly', () => {
    expect(staticImporters(/^firebase\//)).toEqual([
      'services/firebaseAuthApi.ts',
      'services/firebaseMessagingApi.ts',
    ])
  })

  it('nothing imports the auth wrapper statically: it goes through loadFirebaseAuth()', () => {
    expect(staticImporters(/firebaseAuthApi$/)).toEqual([])
  })

  it('the messaging wrapper is only imported by code that is itself loaded on demand', () => {
    expect(staticImporters(/firebaseMessagingApi$/)).toEqual([
      'composables/usePushNotifications.ts',
      'services/firebaseAuthSync.ts',
    ])
  })

  it('no plugin or layout reaches push notifications or the auth-state sync statically', () => {
    const offenders = files.filter(
      file =>
        /^(?:plugins|layouts)\//.test(file.path) &&
        (/^\s*import(?!\s+type\b)\s[^'"]*['"][^'"]*(?:usePushNotifications|firebaseAuthSync)['"]/m.test(
          file.text
        ) ||
          // usePushNotifications is also a Nuxt auto-import: a bare call is a static import too.
          /(?<![.\w])usePushNotifications\s*\(/.test(file.text.replace(/import\([^)]*\)/g, '')))
    )
    expect(offenders.map(file => file.path)).toEqual([])
  })

  it('the login dialog and the alert dialog are loaded on first open', () => {
    const layout = files.find(file => file.path === 'layouts/default.vue')!
    expect(layout.text).toMatch(/<LazyAuthDialog v-if="authDialogActivated"/)
    expect(staticImporters(/RentalAlertDialog\.vue$/)).toEqual([])
  })
})
