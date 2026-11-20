import { describe, expect, it, vi } from 'vitest'
import {
  drawPresentationFrame,
  kenBurns,
  posterElapsed,
  sceneAt,
  sceneStart,
  wrapLines,
} from '../../utils/presentationCanvas'
import { buildPresentation, type ListingPresentation } from '../../utils/listingPresentation'
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

/** Un contexto que no dibuja: guarda cada texto y dónde cayó cada imagen. */
function spyContext() {
  const placed: { image: unknown; x: number; y: number; w: number; h: number }[] = []
  const texts: { value: string; x: number }[] = []
  const gradient = { addColorStop: vi.fn() }
  const ctx = new Proxy(
    {
      measureText: (value: string) => ({ width: value.length * 12 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      fillText: (value: string, x: number) => texts.push({ value, x }),
      drawImage: (image: unknown, x: number, y: number, w: number, h: number) =>
        placed.push({ image, x, y, w, h }),
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
  return { ctx, placed, texts }
}

const TALL = 'https://http2.mlstatic.com/tall.jpg'
const photoOnly = (label: string | null): ListingPresentation => ({
  kind: 'car',
  title: 'x',
  duration: 4000,
  scenes: [
    {
      id: 'photo-1',
      kind: 'photo',
      photo: TALL,
      label,
      detail: 'Caja y combustible',
      counter: '2 / 3',
      narration: '',
      duration: 4000,
    },
  ],
})

describe('foto que no llena el cuadro', () => {
  const tall = new Map([[TALL, { width: 600, height: 800 } as unknown as HTMLImageElement]])

  it('con texto, en horizontal se corre a la derecha y el texto no la pisa', () => {
    const { ctx, placed, texts } = spyContext()
    drawPresentationFrame(
      { ctx, width: 1280, height: 720, images: tall, reducedMotion: false },
      photoOnly('Manual · Nafta'),
      3000
    )
    const photo = placed.at(-1)!
    expect(photo.x + photo.w).toBeLessThanOrEqual(1280 - 48 + 1)
    expect(photo.x).toBeGreaterThan(640)
    const label = texts.find(item => item.value === 'Manual · Nafta')!
    expect(label.x + label.value.length * 12).toBeLessThan(photo.x)
  })

  it('sin texto, sigue centrada', () => {
    const { ctx, placed } = spyContext()
    drawPresentationFrame(
      { ctx, width: 1280, height: 720, images: tall, reducedMotion: true },
      photoOnly(null),
      3000
    )
    const photo = placed.at(-1)!
    expect(photo.x + photo.w / 2).toBeCloseTo(640, 0)
  })

  it('en vertical, una foto apaisada sube y deja la mitad de abajo al texto', () => {
    const wide = new Map([[TALL, { width: 800, height: 600 } as unknown as HTMLImageElement]])
    const { ctx, placed } = spyContext()
    drawPresentationFrame(
      { ctx, width: 720, height: 1280, images: wide, reducedMotion: false },
      photoOnly('Manual · Nafta'),
      3900
    )
    const photo = placed.at(-1)!
    expect(photo.y).toBeGreaterThanOrEqual(48 + 44 - 1)
    expect(photo.y + photo.h).toBeLessThan(1280 * 0.65)
  })
})

describe('escena de lista', () => {
  it('dibuja cada renglón en los dos formatos', () => {
    const presentation: ListingPresentation = {
      kind: 'rental',
      title: 'x',
      duration: 6000,
      scenes: [
        {
          id: 'nearby',
          kind: 'list',
          photo: null,
          eyebrow: 'A menos de 1 km',
          heading: 'Lo que hay cerca',
          rows: [
            { label: 'Parada', value: 'a unos 100 m', note: null },
            { label: 'Supermercado', value: 'a unos 400 m', note: 'Tienda Inglesa' },
            { label: 'Farmacia', value: 'a unos 250 m', note: 'Farmashop' },
          ],
          footnote: 'En línea recta.',
          narration: 'Cerca.',
          duration: 6000,
        },
      ],
    }
    for (const [width, height] of [
      [1280, 720],
      [720, 1280],
    ] as const) {
      const { ctx, texts } = spyContext()
      drawPresentationFrame(
        { ctx, width, height, images: new Map(), reducedMotion: true },
        presentation,
        5900
      )
      const values = texts.map(item => item.value)
      for (const expected of ['PARADA', 'a unos 400 m', 'Farmashop', 'En línea recta.'])
        expect(values).toContain(expected)
    }
  })
})

describe('posterElapsed', () => {
  it('toma la portada ya entera, sin pasarse de la escena', () => {
    expect(posterElapsed({ scenes: [{ duration: 5200 }] } as never)).toBe(2400)
    expect(posterElapsed({ scenes: [{ duration: 2000 }] } as never)).toBe(1999)
    expect(posterElapsed({ scenes: [] } as never)).toBe(0)
  })
})
