// El proxy que le da a la UI las pizarras quietas.
//
// Devuelve un MAPA y no el array crudo a propósito: /avanzado pinta ~200 filas y hacer un `find()`
// por cada una sobre el array sería trabajo al pedo en cada render.
//
// Y el caso que de verdad protege este archivo es el último: si el backend se cae, la advertencia
// tiene que desaparecer sin llevarse la página. Una cotización sin su chip sigue siendo útil; una
// portada rota, no.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('defineCachedEventHandler', (fn: unknown) => fn)
const { useRuntimeConfig } = installNitroGlobals()

const mod = await import('../../server/api/frozen-quotes.get')
const handler = mod.default
const { frozenKey } = mod

beforeEach(() => {
  fetchMock.mockReset()
  useRuntimeConfig.mockReturnValue({ public: { apiBase: 'https://api.example' } })
})

const quote = (over: Record<string, unknown> = {}) => ({
  origin: 'baluma_cambio',
  code: 'USD',
  type: '',
  buy: 37.15,
  sell: 39.55,
  daysFrozen: 58,
  capped: true,
  extreme: 'min-sell',
  groupMedianDays: 4,
  ...over,
})

describe('/api/frozen-quotes', () => {
  it('indexa por origen, moneda y tipo', async () => {
    fetchMock.mockResolvedValue({ generatedAt: '2026-09-04T13:21:59.799Z', quotes: [quote()] })
    const res = await handler({} as any)

    expect(res.generatedAt).toBe('2026-09-04T13:21:59.799Z')
    expect(res.entries[frozenKey('baluma_cambio', 'USD', '')]).toEqual({
      days: 58,
      capped: true,
      extreme: 'min-sell',
    })
  })

  it('no confunde el mostrador con el eBROU de la misma casa', async () => {
    fetchMock.mockResolvedValue({
      quotes: [
        quote({ origin: 'brou', daysFrozen: 30, type: '', extreme: null }),
        quote({ origin: 'brou', daysFrozen: 90, type: 'EBROU', extreme: null }),
      ],
    })
    const res = await handler({} as any)
    expect(res.entries[frozenKey('brou', 'USD', '')].days).toBe(30)
    expect(res.entries[frozenKey('brou', 'USD', 'EBROU')].days).toBe(90)
  })

  it('descarta filas incompletas en vez de publicar una advertencia sin numero', async () => {
    fetchMock.mockResolvedValue({
      quotes: [
        quote({ daysFrozen: undefined }),
        quote({ origin: '', code: 'USD' }),
        quote({ origin: 'valida', daysFrozen: 12, extreme: null }),
      ],
    })
    const res = await handler({} as any)
    expect(Object.keys(res.entries)).toEqual([frozenKey('valida', 'USD', '')])
  })

  it('si el backend se cae devuelve un mapa vacio, no una excepcion', async () => {
    fetchMock.mockRejectedValue(new Error('502'))
    const res = await handler({} as any)
    expect(res).toEqual({ generatedAt: null, entries: {} })
  })

  it('aguanta una respuesta sin `quotes`', async () => {
    fetchMock.mockResolvedValue({})
    const res = await handler({} as any)
    expect(res.entries).toEqual({})
  })
})
