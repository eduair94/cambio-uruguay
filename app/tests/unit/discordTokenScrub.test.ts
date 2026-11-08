import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// Adversarial review, 2026-11-08: the plugin removed ?ct=<Firebase custom token> with a raw
// history.replaceState, which left it in vue-router's current route; the next navigation wrote
// /cuenta?ct=<token> back into that history entry and Back brought it to the address bar, where
// GA's history listener sent it in a page_view. It must leave through the router.
//
// Leaving through the router runs the `auth` middleware of /cuenta: a signed-out visitor is sent
// to / with the login dialog, and opening the dialog clears store.error. Measured in production
// the same day: an invalid token ended on / with a login dialog that never said Discord failed.
// The mock router below does what that middleware does when the auth store is ready.
type Auth = {
  error: string | null
  dialogOpen: boolean
  isLoggedIn: boolean
  openDialog: () => void
}

async function boot(
  search: string,
  signIn: () => Promise<unknown>,
  options: { storeReady?: boolean } = {}
) {
  const storeReady = options.storeReady ?? true
  const file = resolve(__dirname, '../../plugins/discordToken.client.ts')
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.server', 'false')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const replaced: Array<Record<string, unknown>> = []
  const rawReplaceState: unknown[] = []
  const auth: Auth = {
    error: null,
    dialogOpen: false,
    isLoggedIn: false,
    // stores/auth.ts: opening the dialog starts it clean.
    openDialog() {
      this.error = null
      this.dialogOpen = true
    },
  }
  const route = {
    path: '/cuenta',
    query: Object.fromEntries(new URLSearchParams(search)),
    hash: '',
  }
  const context: Record<string, any> = {
    exports: {},
    require: (name: string) => {
      if (name === '~/services/firebaseLazy')
        return {
          loadFirebaseAuth: async () => ({
            fbAuth: () => ({}),
            // A successful sign-in reaches the store (onAuthStateChanged → setUser) before the
            // promise the plugin awaits settles.
            signInWithCustomToken: async () => {
              const result = await signIn()
              auth.isLoggedIn = true
              return result
            },
          }),
        }
      throw new Error(`Unexpected import: ${name}`)
    },
    defineNuxtPlugin: (plugin: unknown) => plugin,
    useAuthStore: () => auth,
    useRouter: () => ({
      currentRoute: { value: route },
      replace: async (to: { query: Record<string, unknown> }) => {
        replaced.push(to.query)
        route.query = to.query as Record<string, string>
        // middleware/auth.ts
        if (storeReady && !auth.isLoggedIn) {
          auth.openDialog()
          route.path = '/'
        }
      },
    }),
    onNuxtReady: (cb: () => void) => cb(),
    window: {
      location: { href: `https://cambio-uruguay.com/cuenta${search}` },
      history: { replaceState: (...args: unknown[]) => rawReplaceState.push(args) },
    },
    URL,
  }
  runInNewContext(outputText, context)
  context.exports.default.setup()
  for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0))
  return { replaced, rawReplaceState, auth, route }
}

describe('Discord hand-off leaves the address bar through the router', () => {
  it('removes ct after signing in, keeping the other parameters', async () => {
    const { replaced, rawReplaceState, auth, route } = await boot(
      '?ct=SECRET&tab=alertas',
      async () => ({})
    )
    expect(replaced.at(-1)).toEqual({ tab: 'alertas' })
    expect(rawReplaceState).toHaveLength(0)
    // Signed in: the account page stays, with no dialog and no error.
    expect(route.path).toBe('/cuenta')
    expect(auth.dialogOpen).toBe(false)
    expect(auth.error).toBeNull()
  })

  it('removes ct even when the sign-in fails, and authError at once', async () => {
    const failed = await boot('?ct=SECRET', async () => {
      throw new Error('auth/invalid-custom-token')
    })
    expect(failed.replaced.at(-1)).toEqual({})
    const refused = await boot('?authError=discord', async () => ({}))
    expect(refused.replaced.at(-1)).toEqual({})
  })
})

describe('a failed Discord login says so in the login dialog', () => {
  it('keeps the error the middleware dialog would clear', async () => {
    const failed = await boot('?ct=SECRET', async () => {
      throw new Error('auth/invalid-custom-token')
    })
    expect(failed.auth.dialogOpen).toBe(true)
    expect(failed.auth.error).toBe('discord-login-failed')
    const refused = await boot('?authError=discord', async () => ({}))
    expect(refused.auth.dialogOpen).toBe(true)
    expect(refused.auth.error).toBe('auth.discordError')
  })

  it('says why an existing, unverified account was not linked', async () => {
    const refused = await boot('?authError=discord-unverified', async () => ({}))
    expect(refused.replaced.at(-1)).toEqual({})
    expect(refused.auth.dialogOpen).toBe(true)
    expect(refused.auth.error).toBe('auth.discordUnverified')
  })

  it('opens the dialog itself when the middleware let the page through', async () => {
    // The auth store not resolved yet when the URL is cleaned: the middleware does nothing.
    const failed = await boot(
      '?ct=SECRET',
      async () => {
        throw new Error('auth/invalid-custom-token')
      },
      { storeReady: false }
    )
    expect(failed.route.path).toBe('/cuenta')
    expect(failed.auth.dialogOpen).toBe(true)
    expect(failed.auth.error).toBe('discord-login-failed')
  })
})
