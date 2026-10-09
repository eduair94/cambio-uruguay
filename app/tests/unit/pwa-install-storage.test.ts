import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref } from 'vue'

// CAMBIO-URUGUAY-BACKEND-17: with site storage blocked (Firefox/Chrome "block site data"), the
// module's install prompt read `localStorage` while Nuxt was starting, and the throw aborted the
// app init. This runs the module's real client plugin with the option nuxt.config passes. The
// file lives in node_modules (externalized, so vi.mock cannot reach its imports): its four
// imports are replaced by injected values instead.

afterEach(() => {
  vi.unstubAllGlobals()
})

async function configuredInstallPrompt() {
  vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
  const { default: config } = await import('../../nuxt.config')
  const pwa = config.modules.find(
    module => Array.isArray(module) && module[0] === '@vite-pwa/nuxt'
  ) as unknown as [string, { client: { installPrompt: unknown } }]
  return pwa[1].client.installPrompt
}

type Plugin = { setup: (app: unknown) => { provide: { pwa: object } } }

function loadModulePlugin(installPrompt: unknown): Plugin {
  const file = createRequire(import.meta.url).resolve(
    '@vite-pwa/nuxt/dist/runtime/plugins/pwa.client.js'
  )
  const source = readFileSync(file, 'utf8')
  const imports = source.match(/^import .*$/gm) ?? []
  expect(imports.map(line => line.match(/from "([^"]+)"/)?.[1])).toEqual([
    '#imports',
    'virtual:nuxt-pwa-configuration',
    'virtual:pwa-register/vue',
    'vue',
  ])
  const body = source.replace(/^import .*$/gm, '').replace(/^export default plugin;$/m, '')
  const useRegisterSW = () => ({
    offlineReady: ref(false),
    needRefresh: ref(false),
    updateServiceWorker: async () => {},
  })
  return new Function(
    'defineNuxtPlugin',
    'display',
    'installPrompt',
    'periodicSyncForUpdates',
    'useRegisterSW',
    'nextTick',
    'reactive',
    'ref',
    `${body}\nreturn plugin;`
  )((p: unknown) => p, 'standalone', installPrompt, 0, useRegisterSW, nextTick, reactive, ref)
}

describe('vite-pwa client plugin with site storage blocked', () => {
  it('starts without touching localStorage', async () => {
    const plugin = loadModulePlugin(await configuredInstallPrompt())
    const storageRead = vi.fn(() => {
      throw new Error('SecurityError: The operation is insecure.')
    })
    const window = {
      matchMedia: () => ({ matches: false, addEventListener: () => {} }),
      addEventListener: () => {},
    }
    Object.defineProperty(window, 'localStorage', { get: storageRead })
    vi.stubGlobal('window', window)
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Firefox/157.0' })
    Object.defineProperty(globalThis, 'localStorage', { get: storageRead, configurable: true })
    try {
      const result = plugin.setup({ hook: () => {}, callHook: async () => {} })
      expect(storageRead).not.toHaveBeenCalled()
      // The push composable still finds the worker registration through $pwa.
      expect(result.provide.pwa).toHaveProperty('getSWRegistration')
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})
