import { describe, expect, it } from 'vitest'
import {
  coverPlacement,
  extraZoom,
  focusFromPixels,
  MAX_EXTRA_ZOOM,
} from '../../utils/presentationFocus'

/** Una imagen RGBA sintética: `paint(x, y)` devuelve [r, g, b]. */
function image(width: number, height: number, paint: (x: number, y: number) => number[]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y)
      data.set([r!, g!, b!, 255], (y * width + x) * 4)
    }
  return data
}

const SKY = [200, 220, 240]
const checker = (x: number, y: number) => ((x + y) % 2 ? [40, 40, 40] : [210, 60, 50])
// Bloques de 3 px: un damero de 1 px tiene gradiente centrado nulo (los vecinos a ±1 son iguales).
const blocks = (x: number, y: number) =>
  (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? [40, 40, 40] : [210, 60, 50]

describe('focusFromPixels', () => {
  it('un auto bajo un cielo liso: el foco cae abajo', () => {
    const data = image(48, 36, (x, y) => (y > 22 && x > 12 && x < 36 ? checker(x, y) : SKY))
    const focus = focusFromPixels(data, 48, 36)
    expect(focus.y).toBeGreaterThan(0.65)
    expect(focus.x).toBeGreaterThan(0.4)
    expect(focus.x).toBeLessThan(0.6)
  })

  it('el degradé del cielo no es un borde', () => {
    const data = image(48, 36, (x, y) =>
      y > 26 ? checker(x, y) : [180 + Math.round(y * 1.5), 200, 230]
    )
    expect(focusFromPixels(data, 48, 36).y).toBeGreaterThan(0.7)
  })

  it('una imagen lisa devuelve el centro, sin nada arriba', () => {
    expect(
      focusFromPixels(
        image(40, 30, () => SKY),
        40,
        30
      )
    ).toEqual({
      x: 0.5,
      y: 0.5,
      topShare: 0,
    })
  })

  it('mide cuánto del detalle está en el tercio de arriba', () => {
    const lowCar = image(48, 36, (x, y) => (y > 22 ? checker(x, y) : SKY))
    const fullFrame = image(48, 36, blocks)
    expect(focusFromPixels(lowCar, 48, 36).topShare).toBeLessThan(0.18)
    expect(focusFromPixels(fullFrame, 48, 36).topShare).toBeGreaterThan(0.25)
  })

  it('el sujeto a la derecha corre el foco a la derecha, frenado por la preferencia al centro', () => {
    const data = image(48, 36, (x, y) => (x > 26 ? checker(x, y) : SKY))
    const { x } = focusFromPixels(data, 48, 36)
    expect(x).toBeGreaterThan(0.53)
    expect(x).toBeLessThan(0.8)
  })
})

describe('coverPlacement', () => {
  const W = 1280
  const H = 720

  it('sin foco ni destino propio, recorta centrado como antes', () => {
    const place = coverPlacement(1200, 900, W, H, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })
    expect(place.width).toBeCloseTo(1280)
    expect(place.top).toBeCloseTo((H - place.height) / 2)
  })

  it('sube un auto que está abajo de la foto, sin dejar bordes vacíos', () => {
    const focus = { x: 0.5, y: 0.75 }
    const centered = coverPlacement(1200, 900, W, H, focus, { x: 0.5, y: 0.5 }, 1)
    const placed = coverPlacement(1200, 900, W, H, focus, { x: 0.5, y: 0.42 })
    const screenY = (p: typeof placed) => (p.top + focus.y * p.height) / H
    expect(screenY(placed)).toBeLessThan(screenY({ ...centered, top: (H - centered.height) / 2 }))
    expect(placed.top).toBeLessThanOrEqual(0)
    expect(placed.top + placed.height).toBeGreaterThanOrEqual(H - 1e-6)
  })

  it('nunca baja la foto: un foco equivocado arriba (árboles contra el cielo) no empeora nada', () => {
    const target = { x: 0.5, y: 0.38 }
    const wrong = coverPlacement(1200, 900, W, H, { x: 0.5, y: 0.2 }, target)
    const none = coverPlacement(1200, 900, W, H, { x: 0.5, y: 0.5 }, target)
    expect(wrong.top).toBeCloseTo(none.top)
    expect(none.top).toBeLessThanOrEqual((H - none.height) / 2)
    expect(extraZoom(1200, 900, W, H, { x: 0.5, y: 0.2 }, target)).toBe(1)
  })

  it('nunca deja un borde vacío, para cualquier foco, destino, acercamiento y paneo', () => {
    for (const fx of [0, 0.2, 0.5, 0.9, 1])
      for (const fy of [0, 0.3, 0.8, 1])
        for (const ty of [0.38, 0.5, 0.68])
          for (const zoom of [1.04, 1.16])
            for (const dx of [-0.02, 0.02]) {
              const p = coverPlacement(1200, 800, W, H, { x: fx, y: fy }, { x: 0.5, y: ty }, zoom, {
                dx,
                dy: -dx,
              })
              expect(p.left).toBeLessThanOrEqual(1e-6)
              expect(p.top).toBeLessThanOrEqual(1e-6)
              expect(p.left + p.width).toBeGreaterThanOrEqual(W - 1e-6)
              expect(p.top + p.height).toBeGreaterThanOrEqual(H - 1e-6)
            }
  })

  it('el acercamiento extra está topado y no depende del cuadro de la animación', () => {
    const focus = { x: 0.5, y: 0.95 }
    const extra = extraZoom(1200, 900, W, H, focus, { x: 0.5, y: 0.4 })
    expect(extra).toBe(MAX_EXTRA_ZOOM)
    // continuo en el tiempo: dos cuadros seguidos del Ken Burns casi no se mueven
    const a = coverPlacement(1200, 900, W, H, focus, { x: 0.5, y: 0.4 }, 1.1)
    const b = coverPlacement(1200, 900, W, H, focus, { x: 0.5, y: 0.4 }, 1.1005)
    expect(Math.abs(a.top - b.top)).toBeLessThan(2)
    expect(Math.abs(a.width - b.width)).toBeLessThan(2)
  })
})
