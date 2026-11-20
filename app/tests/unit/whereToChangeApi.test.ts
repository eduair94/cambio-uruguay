import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('defineCachedEventHandler', (fn: unknown) => fn)
const { getQuery, useRuntimeConfig } = installNitroGlobals()
const { default: handler } = await import('../../server/api/where-to-change.get')

beforeEach(() => {
  fetchMock.mockReset()
  getQuery.mockReturnValue({ currency: 'USD', op: 'buy', lang: 'es' })
  useRuntimeConfig.mockReturnValue({ public: { apiBase: 'https://api.example' } })
})

describe('where-to-change recommendation', () => {
  it('grounds its prose in the same eligible quotes as the visible ranking', async () => {
    const market = [
      ...Array.from({ length: 20 }, (_, i) => ({
        origin: `casa-${i}`,
        code: 'USD',
        type: '',
        buy: 39,
        sell: 41.45,
      })),
      { origin: 'prex', code: 'USD', type: '', buy: 39.82, sell: 40.63 },
      { origin: 'baluma_cambio', code: 'USD', type: '', buy: 37.15, sell: 39.55 },
      { origin: 'bcu', code: 'USD', type: '', buy: 39, sell: 39 },
    ]
    fetchMock.mockResolvedValueOnce(market).mockResolvedValueOnce({
      insight: 'Te conviene cambiar en Prex según la pizarra publicada.',
    })

    await handler({} as any)

    const prompt = fetchMock.mock.calls[1]?.[1]?.body?.customPrompt as string
    expect(prompt).toContain('1. Prex: venta 40.63 UYU')
    expect(prompt).not.toContain('Baluma')
    expect(prompt).not.toContain('Bcu')
    expect(prompt).not.toContain('39.55')
  })

  it('does not request a recommendation when the source has no rates', async () => {
    fetchMock.mockResolvedValueOnce([])
    expect(await handler({} as any)).toEqual({ recommendation: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
