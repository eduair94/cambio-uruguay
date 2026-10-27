/**
 * Dibuja la presentación de un aviso cuadro por cuadro sobre un `<canvas>`.
 *
 * Todo cuadro es función de (guion, milisegundo): no hay estado entre cuadros, así que adelantar,
 * pausar y grabar son lo mismo que reproducir. El mismo canvas lo graba `MediaRecorder` para la
 * descarga, por eso las fotos tienen que venir con CORS (ver `listingPresentation.ts`).
 */
import type {
  CompareScene,
  CoverScene,
  DeclaredScene,
  DropScene,
  ListingPresentation,
  OutroScene,
  PhotoScene,
  PresentationScene,
} from './listingPresentation'
import { coverPlacement, MAX_EXTRA_ZOOM, type PhotoFocus } from './presentationFocus'

export type PresentationFormat = 'landscape' | 'portrait'

export const PRESENTATION_SIZE: Record<PresentationFormat, { width: number; height: number }> = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 },
}

/** Fundido entre escenas. */
export const PRESENTATION_FADE_MS = 450

const FONT = '"Open Sans", system-ui, -apple-system, "Segoe UI", sans-serif'
const NAVY = '#0d1a2d'
const INK = '#ffffff'
const ACCENT = '#8cbcff'
const BAND = 'rgba(92, 151, 255, 0.55)'
const GOOD = '#43d39e'
const WARN = '#f3b545'

export interface FrameInput {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  images: ReadonlyMap<string, CanvasImageSource & { width: number; height: number }>
  /** El punto focal de cada foto (`presentationFocus.ts`); sin él, el recorte va centrado. */
  focus?: ReadonlyMap<string, PhotoFocus>
  reducedMotion: boolean
}

/** Qué escena corre en el milisegundo `elapsed` y cuánto lleva. */
export function sceneAt(presentation: Pick<ListingPresentation, 'scenes'>, elapsed: number) {
  let start = 0
  const scenes = presentation.scenes
  for (let index = 0; index < scenes.length; index++) {
    const duration = scenes[index]!.duration
    if (elapsed < start + duration || index === scenes.length - 1)
      return { index, local: Math.max(0, Math.min(duration, elapsed - start)), start }
    start += duration
  }
  return { index: 0, local: 0, start: 0 }
}

/** El milisegundo en que empieza la escena `index`. */
export function sceneStart(presentation: Pick<ListingPresentation, 'scenes'>, index: number) {
  return presentation.scenes.slice(0, index).reduce((sum, item) => sum + item.duration, 0)
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const ease = (value: number) => 1 - (1 - clamp(value)) ** 3

/**
 * El efecto Ken Burns: un acercamiento lento con paneo. La dirección sale de la semilla (la escena)
 * para que dos fotos seguidas no se muevan igual. Con movimiento reducido, la foto queda quieta.
 */
export function kenBurns(progress: number, seed: number, reducedMotion: boolean) {
  if (reducedMotion) return { scale: 1, dx: 0, dy: 0 }
  const p = clamp(progress)
  const zoomIn = seed % 2 === 0
  // Piso de 1,04: el paneo corre hasta 1,75 % del ancho por lado, y una foto a escala 1 dejaría
  // ese borde vacío al final del alejamiento.
  const scale = zoomIn ? 1.04 + 0.12 * p : 1.16 - 0.12 * p
  const angle = ((seed * 137) % 360) * (Math.PI / 180)
  const travel = 0.035 * (p - 0.5)
  return { scale, dx: Math.cos(angle) * travel, dy: Math.sin(angle) * travel }
}

/**
 * Parte un texto en renglones que entran en `maxWidth`, con puntos suspensivos si sobra. `measure`
 * es `ctx.measureText(...).width`, así se prueba sin canvas.
 */
export function wrapLines(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  // Sólo el espacio común parte: el duro (U+00A0) mantiene juntos "69 m²" o "2 dormitorios", y
  // `\s` lo contaría como espacio.
  const words = text
    .trim()
    .split(/[ \t\n]+/)
    .filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (let index = 0; index < words.length; index++) {
    const word = words[index]!
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate) <= maxWidth || !current) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
    if (lines.length === maxLines) {
      // lo que no entró se resume en el último renglón
      let last = lines[maxLines - 1]!
      while (last && measure(`${last}…`) > maxWidth) last = last.replace(/\s*\S+$/, '')
      lines[maxLines - 1] = `${last}…`
      return lines
    }
  }
  if (current) lines.push(current)
  // una sola palabra más ancha que el renglón se corta a lo bruto
  return lines.map(line => {
    if (measure(line) <= maxWidth) return line
    let cut = line
    while (cut.length > 1 && measure(`${cut}…`) > maxWidth) cut = cut.slice(0, -1)
    return `${cut}…`
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

interface Frame extends FrameInput {
  /** Unidad: 1 en el lado corto de 720 px. Todo tamaño se escribe en múltiplos de esto. */
  u: number
  pad: number
  portrait: boolean
}

function font(frame: Frame, size: number, weight = 400, style = '') {
  frame.ctx.font = `${style} ${weight} ${Math.round(size * frame.u)}px ${FONT}`.trim()
}

function text(
  frame: Frame,
  value: string,
  x: number,
  y: number,
  options: { color?: string; align?: CanvasTextAlign; alpha?: number } = {}
) {
  const { ctx } = frame
  ctx.save()
  ctx.globalAlpha *= options.alpha ?? 1
  ctx.fillStyle = options.color ?? INK
  ctx.textAlign = options.align ?? 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = 12 * frame.u
  ctx.fillText(value, x, y)
  ctx.restore()
}

function lines(frame: Frame, value: string, maxWidth: number, maxLines: number) {
  return wrapLines(word => frame.ctx.measureText(word).width, value, maxWidth, maxLines)
}

function seedOf(scene: PresentationScene) {
  let hash = 0
  for (const char of scene.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

type Image = CanvasImageSource & { width: number; height: number }

/**
 * Una foto vertical en un video horizontal (o al revés) recortada "cover" pierde la mitad: se la
 * muestra entera sobre una copia oscurecida de sí misma.
 */
function contained(frame: Frame, image: Image) {
  const imageRatio = image.width / image.height
  const canvasRatio = frame.width / frame.height
  return Math.max(imageRatio / canvasRatio, canvasRatio / imageRatio) > 1.45
}

/**
 * Dónde va el texto de una escena con foto. Abajo, salvo que el sujeto esté en la mitad de abajo
 * de la foto Y arriba haya lugar libre (un auto bajo un cielo enorme, el caso típico): ahí el
 * texto va arriba, sobre el cielo, que es lo que sobra, y la foto se encuadra con el sujeto
 * debajo del texto. Medido sobre siete autos de Mercado Libre: con cielo libre el tercio de
 * arriba lleva 5-14 % de la energía de bordes; con la camioneta llenando la foto, 16-33 % —y
 * ahí el texto arriba le tapaba el techo a una Ranger.
 */
const TOP_TEXT_MAX_SHARE = 0.18

/** Hay lugar libre arriba (cielo, pared lisa): la foto se puede mover sin cortarle nada al sujeto. */
const calmTop = (focus: PhotoFocus) => (focus.topShare ?? 1) < TOP_TEXT_MAX_SHARE

export type TextAnchor = 'top' | 'bottom'

function textAnchor(frame: Frame, url: string | null): TextAnchor {
  const image = url ? frame.images.get(url) : undefined
  const focus = url ? frame.focus?.get(url) : undefined
  if (!image || !focus || contained(frame, image)) return 'bottom'
  return focus.y > 0.55 && calmTop(focus) ? 'top' : 'bottom'
}

function drawPhoto(
  frame: Frame,
  url: string | null,
  progress: number,
  seed: number,
  dim = 0,
  targetY = 0.5,
  maxExtraZoom = 1
) {
  const { ctx, width, height } = frame
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, width, height)
  const image = url ? frame.images.get(url) : undefined
  if (!image || !image.width || !image.height) {
    const glow = ctx.createRadialGradient(
      width * 0.3,
      height * 0.2,
      0,
      width * 0.3,
      height * 0.2,
      width
    )
    glow.addColorStop(0, 'rgba(92, 151, 255, 0.28)')
    glow.addColorStop(1, 'rgba(13, 26, 45, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
    return
  }
  const motion = kenBurns(progress, seed, frame.reducedMotion)
  // En vertical la foto sólo se mueve si arriba hay lugar libre. Con el vehículo llenando la foto
  // (o sin detección), subirla le cortaba el techo a una Ranger: queda el recorte de siempre, y a
  // lo ancho sólo el corrimiento suave hacia el foco.
  const found = url ? frame.focus?.get(url) : undefined
  const follow = !!found && calmTop(found)
  const focus = found ? { x: found.x, y: follow ? found.y : 0.5 } : { x: 0.5, y: 0.5 }
  const verticalTarget = follow ? targetY : 0.5
  const drawCover = (zoom: number, dx: number, dy: number, target: PhotoFocus) => {
    const place = coverPlacement(
      image.width,
      image.height,
      width,
      height,
      focus,
      target,
      zoom,
      { dx, dy },
      maxExtraZoom
    )
    ctx.drawImage(image, place.left, place.top, place.width, place.height)
  }
  if (contained(frame, image)) {
    drawCover(1.08, 0, 0, { x: 0.5, y: 0.5 })
    ctx.fillStyle = 'rgba(13, 26, 45, 0.72)'
    ctx.fillRect(0, 0, width, height)
    const base = Math.min(width / image.width, height / image.height) * 0.96 * motion.scale
    const w = image.width * base
    const h = image.height * base
    ctx.drawImage(
      image,
      (width - w) / 2 + motion.dx * w * 0.5,
      (height - h) / 2 + motion.dy * h * 0.5,
      w,
      h
    )
  } else {
    drawCover(motion.scale, motion.dx, motion.dy, { x: 0.5, y: verticalTarget })
  }
  if (dim > 0) {
    ctx.fillStyle = `rgba(13, 26, 45, ${dim})`
    ctx.fillRect(0, 0, width, height)
  }
}

function bottomShade(frame: Frame, from = 0.42) {
  const { ctx, width, height } = frame
  const shade = ctx.createLinearGradient(0, height * from, 0, height)
  // Una foto clara (cielo, pared blanca) se comía el texto con una rampa lineal: la mitad de
  // abajo ya tiene que estar oscura cuando empiezan los renglones.
  shade.addColorStop(0, 'rgba(8, 15, 28, 0)')
  shade.addColorStop(0.4, 'rgba(8, 15, 28, 0.72)')
  shade.addColorStop(1, 'rgba(8, 15, 28, 0.94)')
  ctx.fillStyle = shade
  ctx.fillRect(0, height * from, width, height * (1 - from))
}

/** El espejo de `bottomShade` para el texto de arriba: oscuro en el borde, se abre hacia `to`. */
function topShade(frame: Frame, to = 0.58) {
  const { ctx, width, height } = frame
  const shade = ctx.createLinearGradient(0, 0, 0, height * to)
  shade.addColorStop(0, 'rgba(8, 15, 28, 0.94)')
  shade.addColorStop(0.6, 'rgba(8, 15, 28, 0.72)')
  shade.addColorStop(1, 'rgba(8, 15, 28, 0)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, width, height * to)
}

/** En una píldora oscura, a la altura del contador: sobre un cielo blanco el texto solo se perdía. */
function watermark(frame: Frame) {
  pill(frame, 'cambio-uruguay.com', frame.pad - 14 * frame.u, frame.pad - 18 * frame.u, {
    fill: 'rgba(8, 15, 28, 0.55)',
  })
}

function pill(
  frame: Frame,
  value: string,
  x: number,
  y: number,
  options: { fill?: string; color?: string; align?: 'left' | 'right' } = {}
) {
  const { ctx, u } = frame
  font(frame, 22, 700)
  const w = ctx.measureText(value).width + 28 * u
  const h = 40 * u
  const left = options.align === 'right' ? x - w : x
  ctx.save()
  ctx.fillStyle = options.fill ?? 'rgba(255, 255, 255, 0.16)'
  roundRect(ctx, left, y, w, h, h / 2)
  ctx.fill()
  ctx.restore()
  text(frame, value, left + 14 * u, y + 28 * u, { color: options.color })
  return w
}

/** Entra con un fundido y un deslizamiento corto, escalonado por `delay`. */
function appear(frame: Frame, local: number, delay: number, draw: (offset: number) => void) {
  const t = frame.reducedMotion ? (local >= delay ? 1 : 0) : ease((local - delay) / 500)
  if (t <= 0) return
  frame.ctx.save()
  frame.ctx.globalAlpha *= t
  draw((1 - t) * 24 * frame.u)
  frame.ctx.restore()
}

function drawCover(frame: Frame, scene: CoverScene, local: number) {
  const { width, height, pad, u } = frame
  const anchor = textAnchor(frame, scene.photo)
  // Sólo se acerca de más cuando el auto está abajo y el texto pasó arriba: es el caso que lo
  // necesita, y en los demás acercar recorta un vehículo que ya llena el cuadro.
  const zoom = anchor === 'top' ? MAX_EXTRA_ZOOM : 1
  drawPhoto(
    frame,
    scene.photo,
    local / scene.duration,
    seedOf(scene),
    0,
    anchor === 'top' ? 0.68 : 0.38,
    zoom
  )
  if (anchor === 'top') topShade(frame, frame.portrait ? 0.62 : 0.7)
  else bottomShade(frame, frame.portrait ? 0.35 : 0.28)
  watermark(frame)
  const maxWidth = width - pad * 2
  font(frame, frame.portrait ? 46 : 44, 800)
  const titleLines = lines(frame, scene.title, maxWidth, 2)
  const titleLead = (frame.portrait ? 54 : 52) * u
  const blocks = [
    scene.location ? 36 * u : 0,
    titleLines.length * titleLead,
    86 * u,
    scene.priceNote ? 36 * u : 0,
    scene.chips.length ? 60 * u : 0,
  ]
  // Arriba, el bloque arranca debajo de la píldora de la marca.
  let y =
    anchor === 'top' ? pad + 44 * u : height - pad - blocks.reduce((sum, value) => sum + value, 0)
  if (scene.location) {
    const top = y
    appear(frame, local, 100, offset => {
      font(frame, 24, 600)
      text(frame, scene.location.toUpperCase(), pad, top + 26 * u + offset, { color: ACCENT })
    })
    y += blocks[0]!
  }
  const titleTop = y
  appear(frame, local, 250, offset => {
    font(frame, frame.portrait ? 46 : 44, 800)
    titleLines.forEach((line, index) =>
      text(frame, line, pad, titleTop + (index + 1) * titleLead - 10 * u + offset)
    )
  })
  y += blocks[1]!
  const priceTop = y
  appear(frame, local, 550, offset => {
    font(frame, 72, 800)
    text(frame, scene.price, pad, priceTop + 72 * u + offset)
  })
  y += blocks[2]!
  if (scene.priceNote) {
    const top = y
    appear(frame, local, 700, offset => {
      font(frame, 24, 600)
      text(frame, scene.priceNote!, pad, top + 26 * u + offset, { alpha: 0.88 })
    })
    y += blocks[3]!
  }
  if (scene.chips.length) {
    const top = y + 14 * u
    appear(frame, local, 850, offset => {
      let x = pad
      for (const chip of scene.chips) x += pill(frame, chip, x, top + offset) + 10 * u
    })
  }
}

function drawPhotoScene(frame: Frame, scene: PhotoScene, local: number) {
  const { width, height, pad, u } = frame
  const anchor = scene.label ? textAnchor(frame, scene.photo) : 'bottom'
  const targetY = !scene.label ? 0.5 : anchor === 'top' ? 0.64 : 0.42
  const zoom = scene.label && anchor === 'top' ? MAX_EXTRA_ZOOM : 1
  drawPhoto(frame, scene.photo, local / scene.duration, seedOf(scene), 0, targetY, zoom)
  if (scene.label && anchor === 'top') topShade(frame, 0.5)
  else if (scene.label) bottomShade(frame, 0.5)
  watermark(frame)
  pill(frame, scene.counter, width - pad, pad - 18 * u, {
    align: 'right',
    fill: 'rgba(8, 15, 28, 0.55)',
  })
  if (!scene.label) return
  font(frame, frame.portrait ? 44 : 46, 800)
  const labelLines = lines(frame, scene.label, width - pad * 2, 2)
  const lead = 54 * u
  // `bottom` es la línea de base del último renglón; arriba se cuenta desde debajo de la marca:
  // primero el rótulo chico y después los renglones.
  const bottom =
    anchor === 'top'
      ? pad + 44 * u + (scene.detail ? 34 * u : 0) + labelLines.length * lead
      : height - pad
  appear(frame, local, 200, offset => {
    font(frame, frame.portrait ? 44 : 46, 800)
    labelLines.forEach((line, index) =>
      text(frame, line, pad, bottom - (labelLines.length - 1 - index) * lead + offset)
    )
    if (scene.detail) {
      font(frame, 22, 700)
      text(
        frame,
        scene.detail.toUpperCase(),
        pad,
        bottom - labelLines.length * lead - 6 * u + offset,
        {
          color: ACCENT,
        }
      )
    }
  })
}

function drawCompare(frame: Frame, scene: CompareScene, local: number) {
  const { ctx, width, height, pad, u } = frame
  drawPhoto(frame, scene.photo, 1, seedOf(scene), 0.84)
  watermark(frame)
  const maxWidth = width - pad * 2
  font(frame, frame.portrait ? 40 : 38, 800)
  const headingLines = lines(frame, scene.heading, maxWidth, 3)
  const headingTop = frame.portrait ? height * 0.24 : height * 0.2
  appear(frame, local, 100, offset => {
    font(frame, 22, 700)
    text(frame, '¿CÓMO ESTÁ EL PRECIO?', pad, headingTop + offset, { color: ACCENT })
    font(frame, frame.portrait ? 40 : 38, 800)
    headingLines.forEach((line, index) =>
      text(frame, line, pad, headingTop + (index + 1) * 48 * u + offset)
    )
  })

  const span = scene.p75 - scene.p25 || scene.median * 0.2
  const lo = Math.min(scene.p25, scene.value) - span * 0.35
  const hi = Math.max(scene.p75, scene.value) + span * 0.35
  const x = (value: number) => pad + ((value - lo) / (hi - lo)) * maxWidth
  const barY = frame.portrait ? height * 0.52 : height * 0.56
  const barH = 18 * u
  appear(frame, local, 400, () => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
    roundRect(ctx, pad, barY, maxWidth, barH, barH / 2)
    ctx.fill()
    ctx.fillStyle = BAND
    roundRect(ctx, x(scene.p25), barY, x(scene.p75) - x(scene.p25), barH, barH / 2)
    ctx.fill()
    ctx.fillStyle = INK
    ctx.fillRect(x(scene.median) - 2 * u, barY - 10 * u, 4 * u, barH + 20 * u)
    font(frame, 20, 600)
    const medianLabel = `Mediana ${scene.format(scene.median)}`
    const medianAlign: CanvasTextAlign =
      x(scene.median) < pad + 140 * u
        ? 'left'
        : x(scene.median) > width - pad - 140 * u
          ? 'right'
          : 'center'
    text(frame, medianLabel, x(scene.median), barY + barH + 40 * u, {
      align: medianAlign,
      alpha: 0.9,
    })
  })
  // El marcador del aviso sale de la mediana y viaja hasta su precio.
  const travel = frame.reducedMotion ? 1 : ease((local - 800) / 900)
  if (local >= 800 || frame.reducedMotion) {
    const position = x(scene.median + (scene.value - scene.median) * travel)
    const color = scene.value < scene.p25 ? GOOD : scene.value > scene.p75 ? WARN : ACCENT
    ctx.save()
    ctx.fillStyle = color
    ctx.strokeStyle = NAVY
    ctx.lineWidth = 4 * u
    ctx.beginPath()
    ctx.arc(position, barY + barH / 2, 17 * u, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    font(frame, 24, 800)
    const label = `Este aviso ${scene.format(scene.value)}`
    const align: CanvasTextAlign =
      position < pad + 160 * u ? 'left' : position > width - pad - 160 * u ? 'right' : 'center'
    text(frame, label, position, barY - 30 * u, { align, color })
  }
  appear(frame, local, 1600, offset => {
    font(frame, frame.portrait ? 32 : 30, 800)
    const verdict = lines(frame, scene.verdict, maxWidth, 3)
    const top = barY + barH + 110 * u
    verdict.forEach((line, index) => text(frame, line, pad, top + index * 40 * u + offset))
    font(frame, 20, 400)
    const note = lines(frame, scene.note, maxWidth, 3)
    note.forEach((line, index) =>
      text(frame, line, pad, top + verdict.length * 40 * u + 20 * u + index * 28 * u + offset, {
        alpha: 0.78,
      })
    )
  })
}

function shortDate(iso: string | null) {
  if (!iso) return null
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
  if (!Number.isFinite(date.getTime())) return null
  return new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Montevideo',
  }).format(date)
}

function drawDrop(frame: Frame, scene: DropScene, local: number) {
  const { ctx, width, height, pad, u } = frame
  drawPhoto(frame, scene.photo, local / scene.duration, seedOf(scene), 0.6)
  watermark(frame)
  const centerY = height * 0.5
  appear(frame, local, 100, offset => {
    font(frame, 24, 700)
    text(frame, 'BAJÓ DE PRECIO', pad, centerY - 110 * u + offset, { color: GOOD })
  })
  appear(frame, local, 350, offset => {
    font(frame, 44, 700)
    const y = centerY - 40 * u + offset
    text(frame, scene.from, pad, y, { alpha: 0.75 })
    const w = ctx.measureText(scene.from).width
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 4 * u
    ctx.beginPath()
    ctx.moveTo(pad, y - 15 * u)
    ctx.lineTo(pad + w, y - 15 * u)
    ctx.stroke()
    ctx.restore()
  })
  appear(frame, local, 800, offset => {
    font(frame, frame.portrait ? 72 : 80, 800)
    text(frame, scene.to, pad, centerY + 60 * u + offset, { color: GOOD })
    const since = shortDate(scene.since)
    if (since) {
      font(frame, 24, 600)
      text(frame, `Precio nuevo desde el ${since}`, pad, centerY + 110 * u + offset, {
        alpha: 0.85,
      })
    }
  })
  void width
}

function drawDeclared(frame: Frame, scene: DeclaredScene, local: number) {
  const { ctx, width, height, pad, u } = frame
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = WARN
  ctx.fillRect(0, 0, 10 * u, height)
  watermark(frame)
  const maxWidth = width - pad * 2
  let y = frame.portrait ? height * 0.22 : pad + 110 * u
  appear(frame, local, 100, offset => {
    font(frame, 22, 700)
    text(frame, 'ANTES DE SEÑAR', pad, y + offset, { color: WARN })
    font(frame, 40, 800)
    text(frame, 'Lo que dice el propio aviso', pad, y + 52 * u + offset)
  })
  y += 120 * u
  scene.items.forEach((item, index) => {
    const top = y
    font(frame, 26, 400, 'italic')
    const quote = item.quote ? lines(frame, `“${item.quote}”`, maxWidth, 2) : []
    appear(frame, local, 500 + index * 450, offset => {
      font(frame, 30, 800)
      text(frame, item.label, pad, top + offset, { color: WARN })
      font(frame, 26, 400, 'italic')
      quote.forEach((line, row) =>
        text(frame, line, pad, top + 40 * u + row * 34 * u + offset, { alpha: 0.9 })
      )
    })
    y += 56 * u + quote.length * 34 * u
  })
  appear(frame, local, 600 + scene.items.length * 450, offset => {
    font(frame, 22, 600)
    text(
      frame,
      'Lo dice el vendedor, no nosotros. Pedí los certificados antes de pagar.',
      pad,
      height - pad + offset,
      {
        alpha: 0.8,
      }
    )
  })
}

function drawOutro(frame: Frame, scene: OutroScene, local: number) {
  const { width, height, pad, u } = frame
  drawPhoto(frame, scene.photo, local / scene.duration, seedOf(scene), 0.78)
  const cx = width / 2
  const cy = height / 2
  appear(frame, local, 100, offset => {
    font(frame, 26, 600)
    text(frame, 'El aviso completo está en', cx, cy - 70 * u + offset, {
      align: 'center',
      alpha: 0.88,
    })
    font(frame, 60, 800)
    text(frame, scene.source, cx, cy + 4 * u + offset, { align: 'center' })
  })
  appear(frame, local, 600, offset => {
    font(frame, 34, 800)
    text(frame, 'cambio-uruguay.com', cx, cy + 80 * u + offset, { align: 'center', color: ACCENT })
    font(frame, 20, 400)
    lines(frame, scene.note, width - pad * 2, 2).forEach((line, index) =>
      text(frame, line, cx, cy + 130 * u + index * 28 * u + offset, {
        align: 'center',
        alpha: 0.78,
      })
    )
  })
}

function drawScene(frame: Frame, scene: PresentationScene, local: number) {
  if (scene.kind === 'cover') drawCover(frame, scene, local)
  else if (scene.kind === 'photo') drawPhotoScene(frame, scene, local)
  else if (scene.kind === 'compare') drawCompare(frame, scene, local)
  else if (scene.kind === 'drop') drawDrop(frame, scene, local)
  else if (scene.kind === 'declared') drawDeclared(frame, scene, local)
  else drawOutro(frame, scene, local)
}

/** Dibuja el cuadro del milisegundo `elapsed`, con el fundido desde la escena anterior. */
export function drawPresentationFrame(
  input: FrameInput,
  presentation: ListingPresentation,
  elapsed: number
) {
  const frame: Frame = {
    ...input,
    u: Math.min(input.width, input.height) / 720,
    pad: Math.round(Math.min(input.width, input.height) * 0.067),
    portrait: input.height > input.width,
  }
  const { ctx } = frame
  ctx.save()
  ctx.globalAlpha = 1
  const { index, local } = sceneAt(presentation, elapsed)
  const current = presentation.scenes[index]
  if (!current) {
    ctx.fillStyle = NAVY
    ctx.fillRect(0, 0, input.width, input.height)
    ctx.restore()
    return
  }
  const previous = presentation.scenes[index - 1]
  if (previous && local < PRESENTATION_FADE_MS) {
    drawScene(frame, previous, previous.duration)
    ctx.globalAlpha = ease(local / PRESENTATION_FADE_MS)
  }
  drawScene(frame, current, local)
  ctx.restore()
}
