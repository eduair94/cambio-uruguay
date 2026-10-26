import { describe, expect, it, vi } from 'vitest'
import {
  drawPresentationFrame,
  kenBurns,
  sceneAt,
  sceneStart,
  wrapLines,
} from '../../utils/presentationCanvas'
import { buildPresentation } from '../../utils/listingPresentation'
import type { PublicCarListing } from '../../utils/carsPublic'

const scenes = [{ duration: 1000 }, { duration: 2000 }, { duration: 500 }]

describe('sceneAt', () => {
  it('ubica el milisegundo en su escena', () => {
    expect(sceneAt({ scenes } as never, 0)).toMatchObject({ index: 0, local: 0 })
    expect(sceneAt({ scenes } as never, 999)).toMatchObject({ index: 0, local: 999 })
    expect(sceneAt({ scenes } as never, 1000)).toMatchObject({ index: 1, local: 0 })
    expect(sceneAt({ scenes } as never, 3200)).toMatchObject({ index: 2, local: 200 })
  })
  it('pasado el final se queda en el último cuadro', () => {
    expect(sceneAt({ scenes } as never, 99_999)).toMatchObject({ index: 2, local: 500 })
  })
  it('sabe dónde empieza cada escena', () => {
    expect(sceneStart({ scenes } as never, 2)).toBe(3000)
  })
})

describe('kenBurns', () => {
  it('con movimiento reducido la foto queda quieta', () => {
    expect(kenBurns(0.7, 3, true)).toEqual({ scale: 1, dx: 0, dy: 0 })
  })
  it('acerca o aleja según la semilla, nunca deja un borde vacío', () => {
    expect(kenBurns(1, 2, false).scale).toBeCloseTo(1.16)
    expect(kenBurns(1, 3, false).scale).toBeCloseTo(1.04)
    for (const seed of [0, 1, 7, 42])
      for (const p of [0, 0.5, 1]) {
        const { scale, dx, dy } = kenBurns(p, seed, false)
        // el paneo nunca supera el margen que deja el acercamiento: (escala - 1) / 2 por lado
        expect(Math.abs(dx)).toBeLessThanOrEqual((scale - 1) / 2)
        expect(Math.abs(dy)).toBeLessThanOrEqual((scale - 1) / 2)
      }
  })
})

describe('wrapLines', () => {
  const measure = (text: string) => text.length * 10
  it('parte en renglones que entran', () => {
    expect(wrapLines(measure, 'uno dos tres cuatro', 90, 3)).toEqual(['uno dos', 'tres', 'cuatro'])
  })
  it('resume con puntos suspensivos lo que no entra', () => {
    const result = wrapLines(measure, 'uno dos tres cuatro cinco seis', 90, 2)
    expect(result).toHaveLength(2)
    expect(result[1]!.endsWith('…')).toBe(true)
  })
  it('corta una palabra más larga que el renglón', () => {
    expect(wrapLines(measure, 'otorrinolaringólogo', 50, 1)[0]).toBe('otor…')
  })
})

describe('drawPresentationFrame', () => {
  it('dibuja todas las escenas de un auto sin romperse, en los dos formatos', () => {
    const presentation = buildPresentation({
      kind: 'car',
      car: {
        key: 'ml-1',
        source: 'mercadolibre',
        sourceName: 'Mercado Libre',
        brand: 'Fiat',
        model: 'Uno',
        title: 'Fiat Uno Way',
        year: 2015,
        km: 90000,
        price: 6000,
        listedPrice: null,
        currency: 'USD',
        priceUsd: 6000,
        picture: 'https://http2.mlstatic.com/a.jpg',
        pictures: ['https://http2.mlstatic.com/a.jpg', 'https://http2.mlstatic.com/b.jpg'],
        priceDrop: { from: 6500, currency: 'USD', since: '2026-10-01' },
        risks: [{ category: 'deuda', severity: 'high', quote: 'debe patente', from: 'title' }],
        flags: [],
        specs: null,
        sellerType: 'dealer',
        dealerName: 'Automotora X',
      } as unknown as PublicCarListing,
      cohort: {
        year: 2015,
        trim: null,
        engine: null,
        transmission: null,
        n: 10,
        sellers: 9,
        p25: 5800,
        median: 6400,
        p75: 7000,
        kmMedian: 100000,
      },
    })
    const calls = { fillText: 0, drawImage: 0 }
    const gradient = { addColorStop: vi.fn() }
    const ctx = new Proxy(
      {
        measureText: (value: string) => ({ width: value.length * 12 }),
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        fillText: () => calls.fillText++,
        drawImage: () => calls.drawImage++,
        globalAlpha: 1,
      } as Record<string | symbol, unknown>,
      {
        get: (target, prop) => (prop in target ? target[prop] : () => {}),
        set: (target, prop, value) => {
          target[prop] = value
          return true
        },
      }
    ) as unknown as CanvasRenderingContext2D
    const image = { width: 800, height: 600 } as unknown as HTMLImageElement
    const images = new Map([
      ['https://http2.mlstatic.com/a.jpg', image],
      [
        'https://http2.mlstatic.com/b.jpg',
        { width: 400, height: 900 } as unknown as HTMLImageElement,
      ],
    ])
    for (const [width, height] of [
      [1280, 720],
      [720, 1280],
    ] as const) {
      for (let t = 0; t <= presentation.duration; t += 250)
        drawPresentationFrame({ ctx, width, height, images, reducedMotion: false }, presentation, t)
    }
    expect(calls.fillText).toBeGreaterThan(100)
    expect(calls.drawImage).toBeGreaterThan(10)
  })
})
