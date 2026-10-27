/**
 * Dónde está lo que importa en una foto de aviso, sin IA: el recorte inteligente clásico.
 *
 * Un auto, un living o una fachada tienen bordes y color; el cielo, el asfalto y una pared lisa no.
 * Así que se mide la energía de bordes (y un poco la saturación) sobre una copia chiquita de la
 * foto y se busca la franja que concentra más. Medido sobre las fotos de Mercado Libre: el auto
 * está casi siempre en la mitad de abajo, debajo de mucho cielo, y el recorte centrado de 4:3 a
 * 16:9 lo dejaba pegado al borde inferior, debajo del rótulo.
 *
 * La copia chica además borra los cables de luz (que en una foto grande son la línea con más
 * contraste de todo el cuadro): a 96 px de ancho un cable de 3 px desaparece en el promedio.
 */

export interface PhotoFocus {
  /** 0 = borde izquierdo, 1 = derecho. */
  x: number
  /** 0 = arriba, 1 = abajo. */
  y: number
  /**
   * Qué parte de la energía de bordes cae en el tercio de arriba de la foto (0–1). Bajo = cielo o
   * pared lisa, lugar libre para el texto; alto = el sujeto llena la foto hasta arriba.
   */
  topShare?: number
}

export const FOCUS_SAMPLE = 96
/** Diferencias de luminancia menores son ruido de JPEG o el degradé del cielo, no un borde. */
const NOISE = 10

/** La franja de `size` posiciones con más energía, y el centro de masa dentro de ella. */
function bestBand(energy: Float64Array, size: number): number | null {
  const n = energy.length
  const band = Math.max(1, Math.min(n, size))
  let sum = 0
  for (let index = 0; index < band; index++) sum += energy[index]!
  let best = sum
  let start = 0
  for (let index = band; index < n; index++) {
    sum += energy[index]! - energy[index - band]!
    if (sum > best) {
      best = sum
      start = index - band + 1
    }
  }
  if (!(best > 0)) return null
  let weighted = 0
  for (let index = start; index < start + band; index++) weighted += energy[index]! * (index + 0.5)
  return weighted / best / n
}

/**
 * El punto focal de una imagen RGBA de `width` × `height` (la copia chica). Una imagen lisa, sin
 * nada que destaque, devuelve el centro.
 */
export function focusFromPixels(
  data: ArrayLike<number>,
  width: number,
  height: number
): PhotoFocus {
  if (width < 3 || height < 3) return { x: 0.5, y: 0.5 }
  const luma = new Float64Array(width * height)
  const sat = new Float64Array(width * height)
  for (let index = 0; index < width * height; index++) {
    const r = data[index * 4]!
    const g = data[index * 4 + 1]!
    const b = data[index * 4 + 2]!
    luma[index] = 0.299 * r + 0.587 * g + 0.114 * b
    sat[index] = (Math.max(r, g, b) - Math.min(r, g, b)) / 255
  }
  const rows = new Float64Array(height)
  const cols = new Float64Array(width)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const at = y * width + x
      const gradient =
        Math.abs(luma[at + 1]! - luma[at - 1]!) + Math.abs(luma[at + width]! - luma[at - width]!)
      const edge = Math.max(0, gradient - NOISE)
      if (!edge) continue
      const value = edge * (0.6 + sat[at]!)
      rows[y] += value
      cols[x] += value
    }
  }
  // Leve preferencia por el centro a lo ancho: el sujeto de un aviso rara vez está en un costado,
  // y un poste o un árbol en el borde no deberían arrastrar el encuadre.
  for (let x = 0; x < width; x++) {
    const offset = (x + 0.5) / width - 0.5
    cols[x] *= 1 - 1.2 * offset * offset
  }
  let total = 0
  let top = 0
  const third = Math.round(height / 3)
  for (let y = 0; y < height; y++) {
    total += rows[y]!
    if (y < third) top += rows[y]!
  }
  return {
    x: bestBand(cols, Math.round(width * 0.45)) ?? 0.5,
    y: bestBand(rows, Math.round(height * 0.4)) ?? 0.5,
    topShare: total > 0 ? top / total : 0,
  }
}

/** Mide una foto ya cargada. `null` si el navegador no deja leer sus píxeles (sin CORS). */
export function imageFocus(image: HTMLImageElement): PhotoFocus | null {
  const iw = image.naturalWidth
  const ih = image.naturalHeight
  if (!iw || !ih || typeof document === 'undefined') return null
  const scale = FOCUS_SAMPLE / Math.max(iw, ih)
  const width = Math.max(3, Math.round(iw * scale))
  const height = Math.max(3, Math.round(ih * scale))
  try {
    // Dos pasos: bajar de 1200 px a 96 de un saque saltea píxeles en vez de promediarlos.
    const mid = document.createElement('canvas')
    mid.width = width * 4
    mid.height = height * 4
    mid.getContext('2d')!.drawImage(image, 0, 0, mid.width, mid.height)
    const small = document.createElement('canvas')
    small.width = width
    small.height = height
    const ctx = small.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(mid, 0, 0, width, height)
    return focusFromPixels(ctx.getImageData(0, 0, width, height).data, width, height)
  } catch {
    return null
  }
}

export interface CoverPlacement {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Cuánto hay que acercar, por encima del encuadre mínimo, para que el foco pueda caer a la altura
 * de `target` sin dejar bordes vacíos; topado en `maxExtra` (más de 1,2 ya se nota el grano).
 *
 * Sólo mira el eje vertical, que es el del problema (el auto bajo el cielo). Medido sobre siete
 * autos de Mercado Libre: acercar también para centrar a lo ancho recortaba la trompa de una
 * Hilux y de una Ranger que ya llenaban el cuadro.
 *
 * Depende sólo de la foto y del destino, no del cuadro de la animación: así es constante en toda
 * la escena y el acercamiento lento del efecto Ken Burns sigue siendo continuo, sin saltos.
 */
export const MAX_EXTRA_ZOOM = 1.2

export function extraZoom(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  focus: PhotoFocus,
  target: PhotoFocus,
  maxExtra = MAX_EXTRA_ZOOM
): number {
  const base = Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
  // Para que el foco quede a `t` del borde, la foto escalada tiene que medir al menos
  // t/f del cuadro hacia arriba y (1 - t)/(1 - f) hacia abajo.
  const f = focus.y
  const t = target.y
  // Un foco por encima del destino pediría bajar la foto, y eso no se hace (ver `coverPlacement`):
  // acercar para nada sólo recortaría.
  if (f <= t) return 1
  const scale =
    (frameHeight * Math.max(t / Math.max(f, 0.01), (1 - t) / Math.max(1 - f, 0.01))) / imageHeight
  return Math.min(Math.max(1, maxExtra), Math.max(1, scale / base))
}

/**
 * A lo ancho el foco se sigue a medias: un poste o el auto de al lado en un costado no deberían
 * llevarse el encuadre, y un auto que ya llena la foto no necesita que lo corran.
 */
const HORIZONTAL_FOLLOW = 0.6

/**
 * Dónde dibujar una foto que llena el cuadro ("cover") para que su punto focal caiga en `target`
 * (fracciones del cuadro), con el acercamiento y el paneo del efecto Ken Burns encima. La posición
 * final se limita siempre a lo que la foto cubre: nunca queda un borde vacío, por más lejos que
 * esté el foco; en ese caso el foco queda lo más cerca posible del destino.
 */
export function coverPlacement(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  focus: PhotoFocus,
  target: PhotoFocus,
  zoom = 1,
  pan: { dx: number; dy: number } = { dx: 0, dy: 0 },
  maxExtra = MAX_EXTRA_ZOOM
): CoverPlacement {
  const base = Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
  const extra = extraZoom(imageWidth, imageHeight, frameWidth, frameHeight, focus, target, maxExtra)
  const scale = base * extra * zoom
  const width = imageWidth * scale
  const height = imageHeight * scale
  const focusX = 0.5 + (focus.x - 0.5) * HORIZONTAL_FOLLOW
  const clampTo = (value: number, min: number) => Math.min(0, Math.max(min, value))
  // El foco sólo puede SUBIR la foto, nunca dejarla más baja que sin foco (centro de la foto en el
  // destino) ni que el recorte centrado. El problema es siempre el auto pegado abajo, y el
  // detector se equivoca para el otro lado: una hilera de árboles contra el cielo tiene más
  // contraste que una camioneta gris (medido en una Hilux 2014, que el foco "encontraba" en los
  // árboles y bajaba). Con esta regla, el peor caso es el encuadre sin detección.
  const centeredTop = (frameHeight - height) / 2
  const top = Math.min(
    frameHeight * target.y - focus.y * height,
    frameHeight * target.y - 0.5 * height,
    centeredTop
  )
  return {
    width,
    height,
    left: clampTo(frameWidth * target.x - focusX * width + pan.dx * frameWidth, frameWidth - width),
    top: clampTo(top + pan.dy * frameHeight, frameHeight - height),
  }
}
