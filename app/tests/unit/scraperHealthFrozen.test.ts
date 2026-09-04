// El estado que faltaba en /estado: la pizarra que no se rompió, se quedó quieta.
//
// Los cuatro estados que ya existían miran ESTA corrida. `frozen` es el único que compara al origen
// contra su propio pasado, y por eso es el único que veía a baluma_cambio: HTTP 200, fila de hoy,
// compra menor que venta y dentro de la banda del grupo — o sea, verde en esta misma página —
// mientras publicaba 37,15 / 39,55 desde hacía 57 días.
//
// El caso que más importa es el último de este archivo: una pizarra quieta deriva al extremo de la
// distribución a medida que el mercado se mueve, y como la portada ordena por "más barato", la sube
// al titular. Por eso el tablero de salud tiene que seguir mostrando el precio que el sitio
// PUBLICA, congelado incluido: si acá lo saneáramos, la página que existe para ver el defecto sería
// justo la que lo esconde.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)
// La ruta se exporta envuelta en la caché de Nitro. Acá la desenvolvemos: lo que se prueba es la
// clasificación, y una caché de 5 minutos en un test sólo serviría para que la segunda aserción
// leyera la respuesta de la primera.
vi.stubGlobal('defineCachedEventHandler', (fn: unknown) => fn)
const { useRuntimeConfig } = installNitroGlobals()

const handler = (await import('../../server/api/scraper-health.get')).default

interface Row {
  origin: string
  code: string
  type?: string
  buy?: number
  sell?: number
  date?: string
}

const TODAY = '2026-09-04T12:00:00.000Z'

function setup(opts: {
  rates: Row[]
  frozen?: {
    origin: string
    code: string
    type: string
    daysFrozen: number
    capped?: boolean
    extreme?: string | null
  }[]
  origins?: { origin: string; status: string; duration?: number; error?: string }[]
  frozenFails?: boolean
}) {
  const localData: Record<string, { name: string }> = {}
  for (const r of opts.rates) localData[r.origin] = { name: r.origin.toUpperCase() }

  fetchMock.mockImplementation((path: string) => {
    if (path === '/health') {
      return Promise.resolve({
        sync: {
          lastSync: TODAY,
          minutesAgo: 1,
          originResults: {
            origins:
              opts.origins ??
              [...new Set(opts.rates.map(r => r.origin))].map(origin => ({
                origin,
                status: 'success',
                duration: 100,
              })),
          },
        },
      })
    }
    if (path === '/') return Promise.resolve(opts.rates)
    if (path === '/localData') return Promise.resolve(localData)
    if (path === '/frozen-quotes') {
      if (opts.frozenFails) return Promise.reject(new Error('boom'))
      return Promise.resolve({ generatedAt: TODAY, quotes: opts.frozen ?? [] })
    }
    return Promise.resolve({})
  })
}

const usd = (origin: string, buy: number, sell: number): Row => ({
  origin,
  code: 'USD',
  type: '',
  buy,
  sell,
  date: TODAY,
})

beforeEach(() => {
  fetchMock.mockReset()
  useRuntimeConfig.mockReturnValue({ public: { apiBase: 'https://api.example' } })
})

describe('/api/scraper-health — estado frozen', () => {
  it('marca frozen a la casa que publica fresco pero no mueve el precio', async () => {
    setup({
      rates: [
        usd('brou', 39.05, 41.45),
        usd('itau', 39.2, 41.5),
        usd('baluma_cambio', 37.15, 39.55),
      ],
      frozen: [
        {
          origin: 'baluma_cambio',
          code: 'USD',
          type: '',
          daysFrozen: 57,
          capped: true,
          extreme: 'min-sell',
        },
      ],
    })
    const res: any = await handler({} as any)

    const baluma = res.scrapers.find((s: any) => s.origin === 'baluma_cambio')
    expect(baluma.status).toBe('frozen')
    expect(baluma.frozenDays).toBe(57)
    expect(baluma.frozenExtreme).toBe('min-sell')
    expect(res.summary.frozen).toBe(1)
    // Y no puede seguir contando como sana: era exactamente el número que decía "todo bien".
    expect(res.scrapers.find((s: any) => s.origin === 'brou').status).toBe('live')
    expect(res.summary.live).toBe(2)
  })

  it('el detalle nombra los días Y que encabeza el ranking, porque no pesan igual', async () => {
    setup({
      rates: [
        usd('brou', 39.05, 41.45),
        usd('itau', 39.2, 41.5),
        usd('baluma_cambio', 37.15, 39.55),
      ],
      frozen: [
        { origin: 'baluma_cambio', code: 'USD', type: '', daysFrozen: 57, extreme: 'min-sell' },
      ],
    })
    const res: any = await handler({} as any)
    const issue = res.insights.issues.find((i: any) => i.origin === 'baluma_cambio')
    expect(issue.status).toBe('frozen')
    expect(issue.detail).toContain('57 días')
    expect(issue.detail).toContain('la venta más barata')
  })

  it('una rota gana sobre una congelada: un scraper que no corre es un problema mayor', async () => {
    setup({
      rates: [usd('brou', 39.05, 41.45), usd('itau', 39.2, 41.5)],
      origins: [
        { origin: 'brou', status: 'success', duration: 100 },
        { origin: 'itau', status: 'error', duration: 50, error: 'HTTP 403' },
      ],
      frozen: [{ origin: 'itau', code: 'USD', type: '', daysFrozen: 40, extreme: null }],
    })
    const res: any = await handler({} as any)
    expect(res.scrapers.find((s: any) => s.origin === 'itau').status).toBe('error')
  })

  it('ignora las puntas que la portada no ordena: EBROU quieto no ensucia el mostrador', async () => {
    setup({
      rates: [usd('brou', 39.05, 41.45), usd('itau', 39.2, 41.5)],
      frozen: [{ origin: 'brou', code: 'USD', type: 'EBROU', daysFrozen: 90, extreme: null }],
    })
    const res: any = await handler({} as any)
    expect(res.scrapers.find((s: any) => s.origin === 'brou').status).toBe('live')
    expect(res.summary.frozen).toBe(0)
  })

  it('si /frozen-quotes se cae, el tablero sigue entero', async () => {
    setup({ rates: [usd('brou', 39.05, 41.45), usd('itau', 39.2, 41.5)], frozenFails: true })
    const res: any = await handler({} as any)
    expect(res.summary.total).toBe(2)
    expect(res.summary.frozen).toBe(0)
    expect(res.scrapers.every((s: any) => s.frozenDays === null)).toBe(true)
  })

  it('el precio publicado sigue siendo el publicado: una congelada no se saca del rango ni del mejor precio', async () => {
    // Este es el caso real y el que da sentido a toda la guarda. Si la sacáramos del cálculo, esta
    // página mostraría "el más barato es BROU 41,45" mientras la portada muestra Baluma 39,55, y el
    // tablero de salud diría que no pasa nada.
    setup({
      rates: [
        usd('brou', 39.05, 41.45),
        usd('itau', 39.2, 41.5),
        usd('baluma_cambio', 37.15, 39.55),
      ],
      frozen: [
        { origin: 'baluma_cambio', code: 'USD', type: '', daysFrozen: 57, extreme: 'min-sell' },
      ],
    })
    const res: any = await handler({} as any)
    expect(res.insights.usdSellRange.minOrigin).toBe('baluma_cambio')
    expect(res.insights.bestUsdBuy.origin).toBe('baluma_cambio')
  })
})
