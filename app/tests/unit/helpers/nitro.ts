import { vi } from 'vitest'

/**
 * Installs the Nitro/h3 auto-imports that server route handlers rely on as
 * bare globals (they are injected by unimport at build time, but not in the
 * Vitest environment). Call this at the top of a handler test BEFORE the
 * dynamic `import()` of the handler module, so the globals exist when the
 * module's top-level `defineEventHandler(...)` runs.
 *
 * `defineEventHandler` and `createError` are fixed pass-throughs; the request
 * helpers are returned as mocks so each test can drive them.
 */
export function installNitroGlobals() {
  const readBody = vi.fn()
  const getRouterParam = vi.fn()
  const getQuery = vi.fn()
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('createError', (e: { statusCode?: number; statusMessage?: string }) =>
    Object.assign(new Error(e?.statusMessage || 'error'), e)
  )
  vi.stubGlobal('readBody', readBody)
  vi.stubGlobal('getRouterParam', getRouterParam)
  vi.stubGlobal('getQuery', getQuery)
  return { readBody, getRouterParam, getQuery }
}
