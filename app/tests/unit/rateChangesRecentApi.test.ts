// El proxy cacheado que alimenta «Últimos cambios de <casa> en <moneda>» en
// /historico/<casa>/<moneda>.
//
// Es aparte de /api/rate-changes a propósito: aquel lo consulta /ultimos-cambios
// cada 15 s como tablero en vivo y no se cachea; este lo pide el render de
// servidor de la familia con más impresiones del sitio, y el ledger sólo cambia
// cuando corre el sync (5 min). Y el caso que de verdad protege este archivo es el
// último: si el backend se cae, el bloque desaparece sin llevarse la página.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)
let cacheOptions: { maxAge?: number; name?: string; getKey?: (event: unknown) => string } = {}
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options: typeof cacheOptions) => {
  cacheOptions = options
  return fn
})
const { getQuery, useRuntimeConfig } = installNitroGlobals()

const mod = await import('../../server/api/rate-changes-recent.get')
const handler = mod.default as unknown as (event: unknown) => Promise<{
  asOf: string
  changes: unknown[]
}>
const { recentChangesFilter, recentChangesKey } = mod

beforeEach(() => {
  fetchMock.mockReset()
  getQuery.mockReset()
  useRuntimeConfig.mockReturnValue({
    apiBaseServer: 'https://api.example',
    public: { apiBase: 'https://public.example' },
  })
})

describe('recentChangesFilter', () => {
  it('normaliza origen, moneda y tipo, y acota el límite a 1..20 (8 por defecto)', () => {
    expect(
      recentChangesFilter({ origin: ' BROU ', code: 'usd', type: 'ebrou', limit: '5' })
    ).toEqual({
      origin: 'brou',
      code: 'USD',
      type: 'EBROU',
      limit: 5,
    })
    expect(recentChangesFilter({ origin: 'brou', code: 'USD' })).toEqual({
      origin: 'brou',
      code: 'USD',
      type: undefined,
      limit: 8,
    })
    expect(recentChangesFilter({ origin: 'brou', code: 'USD', type: '' })?.type).toBeUndefined()
    expect(recentChangesFilter({ origin: 'brou', code: 'USD', limit: '500' })?.limit).toBe(20)
    expect(recentChangesFilter({ origin: 'brou', code: 'USD', limit: '0' })?.limit).toBe(1)
    expect(recentChangesFilter({ origin: 'brou', code: 'USD', limit: 'x' })?.limit).toBe(8)
  })

  it('rechaza lo que no es un id de casa ni un código de moneda', () => {
    expect(recentChangesFilter({ origin: '../x', code: 'USD' })).toBeNull()
    expect(recentChangesFilter({ origin: 'brou', code: 'dólar' })).toBeNull()
    expect(recentChangesFilter({ origin: 'brou' })).toBeNull()
    expect(recentChangesFilter({})).toBeNull()
    expect(recentChangesFilter(undefined)).toBeNull()
  })
})

describe('/api/rate-changes-recent', () => {
  it('cachea 5 minutos por casa, moneda, tipo y límite: la cadencia del sync', () => {
    expect(cacheOptions.maxAge).toBe(300)
    expect(cacheOptions.name).toBe('rate-changes-recent')
    expect(recentChangesKey({ origin: 'brou', code: 'usd' })).toBe('brou:USD:*:8')
    expect(recentChangesKey({ origin: 'brou', code: 'usd', type: 'billete', limit: 5 })).toBe(
      'brou:USD:BILLETE:5'
    )
    expect(recentChangesKey({})).toBe('invalid')
    getQuery.mockReturnValue({ origin: 'itau', code: 'eur' })
    expect(cacheOptions.getKey?.({})).toBe('itau:EUR:*:8')
  })

  it('proxea al backend con el filtro validado y recorta al límite', async () => {
    getQuery.mockReturnValue({ origin: 'brou', code: 'usd', limit: '2' })
    fetchMock.mockResolvedValue({
      asOf: '2026-09-22T12:00:00.000Z',
      changes: [1, 2, 3].map(n => ({ observedAt: `2026-09-2${n}T12:00:00.000Z` })),
    })
    const res = await handler({})
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example/changes',
      expect.objectContaining({
        query: { origin: 'brou', code: 'USD', type: undefined, limit: 2 },
      })
    )
    expect(res.asOf).toBe('2026-09-22T12:00:00.000Z')
    expect(res.changes).toHaveLength(2)
  })

  it('sin un filtro válido no sale al backend', async () => {
    getQuery.mockReturnValue({ origin: 'brou' })
    expect(await handler({})).toEqual({ asOf: '', changes: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('si el backend falla devuelve la lista vacía en vez de romper la página', async () => {
    getQuery.mockReturnValue({ origin: 'brou', code: 'USD' })
    fetchMock.mockRejectedValue(new Error('backend down'))
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await handler({})).toEqual({ asOf: '', changes: [] })
    quiet.mockRestore()
  })

  it('una respuesta sin `changes` también es una lista vacía', async () => {
    getQuery.mockReturnValue({ origin: 'brou', code: 'USD' })
    fetchMock.mockResolvedValue({ asOf: '2026-09-22T12:00:00.000Z' })
    expect(await handler({})).toEqual({ asOf: '2026-09-22T12:00:00.000Z', changes: [] })
  })
})
