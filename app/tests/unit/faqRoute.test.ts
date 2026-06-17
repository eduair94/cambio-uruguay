import { describe, expect, it, vi } from 'vitest'
import { appendContext, normalizeFaqLang } from '../../server/api/faq.get'

// Stub Nitro auto-imports so the module-level `defineCachedEventHandler` call
// in the route file does not throw when loaded by plain Vitest.
// vi.hoisted runs these stubs before any module in this file is evaluated,
// so they are in effect when ../../server/api/faq.get is imported above.
vi.hoisted(() => {
  vi.stubGlobal('defineCachedEventHandler', (_h: unknown, _o?: unknown) => _h)
  vi.stubGlobal('getQuery', (_event: unknown) => ({}))
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '' } }))
  vi.stubGlobal('$fetch', async () => [])
})

describe('normalizeFaqLang', () => {
  it('accepts the three supported locales', () => {
    expect(normalizeFaqLang('es')).toBe('es')
    expect(normalizeFaqLang('en')).toBe('en')
    expect(normalizeFaqLang('pt')).toBe('pt')
  })
  it('falls back to es for anything else', () => {
    expect(normalizeFaqLang('fr')).toBe('es')
    expect(normalizeFaqLang(undefined)).toBe('es')
    expect(normalizeFaqLang(123)).toBe('es')
  })
})

describe('appendContext', () => {
  const item = { id: 'rate-USD', question: 'Q', answer: 'Base answer.' }
  it('appends a trimmed sentence when present', () => {
    const out = appendContext(item, 'El mercado está estable.')
    expect(out.answer).toBe('Base answer. El mercado está estable.')
  })
  it('returns the item unchanged when sentence is null/empty', () => {
    expect(appendContext(item, null).answer).toBe('Base answer.')
    expect(appendContext(item, '   ').answer).toBe('Base answer.')
  })
})
