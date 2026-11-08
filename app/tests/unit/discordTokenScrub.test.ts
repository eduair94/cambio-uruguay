import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// Adversarial review, 2026-11-08: the plugin removed ?ct=<Firebase custom token> with a raw
// history.replaceState, which left it in vue-router's current route; the next navigation wrote
// /cuenta?ct=<token> back into that history entry and Back brought it to the address bar, where
// GA's history listener sent it in a page_view. It must leave through the router.
async function boot(search: string, signIn: () => Promise<unknown>) {
  const file = resolve(__dirname, '../../plugins/discordToken.client.ts')
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.server', 'false')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const replaced: Array<Record<string, unknown>> = []
  const rawReplaceState: unknown[] = []
  const auth: { error: string | null } = { error: null }
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
          loadFirebaseAuth: async () => ({ fbAuth: () => ({}), signInWithCustomToken: signIn }),
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
  await new Promise(r => setTimeout(r, 0))
  await new Promise(r => setTimeout(r, 0))
  return { replaced, rawReplaceState, auth }
}

describe('Discord hand-off leaves the address bar through the router', () => {
  it('removes ct after signing in, keeping the other parameters', async () => {
    const { replaced, rawReplaceState } = await boot('?ct=SECRET&tab=alertas', async () => ({}))
    expect(replaced.at(-1)).toEqual({ tab: 'alertas' })
    expect(rawReplaceState).toHaveLength(0)
  })

  it('removes ct even when the sign-in fails, and authError at once', async () => {
    const failed = await boot('?ct=SECRET', async () => {
      throw new Error('auth/invalid-custom-token')
    })
    expect(failed.replaced.at(-1)).toEqual({})
    expect(failed.auth.error).toBe('discord-login-failed')
    const refused = await boot('?authError=discord', async () => ({}))
    expect(refused.replaced.at(-1)).toEqual({})
    expect(refused.auth.error).toBe('auth.discordError')
  })
})
