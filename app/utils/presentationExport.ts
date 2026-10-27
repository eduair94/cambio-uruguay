/**
 * El MP4 de la presentación, armado cuadro por cuadro con WebCodecs en vez de grabar la pantalla.
 *
 * Grabar con `MediaRecorder` tarda lo que dura el video y se traba si la pestaña queda atrás
 * (el navegador frena `requestAnimationFrame`). Acá cada cuadro se dibuja en un canvas propio
 * fuera de la pantalla y se codifica a la velocidad que dé la máquina: 40 s de video salen en
 * segundos. La música entra en el mismo archivo. `mediabunny` (el muxer) se descarga recién al
 * primer uso.
 *
 * Devuelve `null` cuando el navegador no puede (sin WebCodecs, sin H.264): el reproductor vuelve
 * a la grabación en tiempo real, que sigue andando donde siempre anduvo.
 */
import type { ListingPresentation } from './listingPresentation'
import {
  drawPresentationFrame,
  PRESENTATION_SIZE,
  type FrameInput,
  type PresentationFormat,
} from './presentationCanvas'

export const PRESENTATION_FPS = 30
/** 2,5 Mbps: a 5 Mbps 39 s pesaban 22,7 MB, demasiado para mandar por WhatsApp. */
export const PRESENTATION_BITRATE = 2_500_000
const AUDIO_BITRATE = 128_000

export interface EncodeOptions {
  presentation: ListingPresentation
  format: PresentationFormat
  images: FrameInput['images']
  focus: FrameInput['focus']
  reducedMotion: boolean
  music: AudioBuffer | null
  onProgress?: (share: number) => void
  signal?: AbortSignal
}

export interface EncodedVideo {
  blob: Blob
  withAudio: boolean
}

export const canEncodeFast = () =>
  typeof window !== 'undefined' &&
  typeof window.VideoEncoder === 'function' &&
  typeof window.VideoFrame === 'function'

/** Cuántos cuadros lleva una presentación. */
export const frameCount = (durationMs: number) =>
  Math.max(1, Math.ceil((durationMs / 1000) * PRESENTATION_FPS))

/**
 * Le devuelve el control al navegador para que pinte el progreso. Con `MessageChannel` y no con
 * `setTimeout`: en una pestaña de fondo los temporizadores se frenan a uno por segundo.
 */
function yieldToBrowser() {
  return new Promise<void>(resolve => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => resolve()
    channel.port2.postMessage(null)
  })
}

const aborted = () => new DOMException('Cancelado', 'AbortError')

export async function encodePresentation(options: EncodeOptions): Promise<EncodedVideo | null> {
  if (!canEncodeFast()) return null
  const { presentation, format, signal } = options
  const { width, height } = PRESENTATION_SIZE[format]
  const media = await import('mediabunny')
  const videoCodec = await media.getFirstEncodableVideoCodec(['avc'], {
    width,
    height,
    bitrate: PRESENTATION_BITRATE,
    frameRate: PRESENTATION_FPS,
  })
  if (!videoCodec) return null
  // AAC o nada: un MP4 con Opus no lo reproducen todos los teléfonos que lo van a recibir.
  const audioCodec = options.music
    ? await media.getFirstEncodableAudioCodec(['aac'], {
        numberOfChannels: options.music.numberOfChannels,
        sampleRate: options.music.sampleRate,
        bitrate: AUDIO_BITRATE,
      })
    : null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const target = new media.BufferTarget()
  const output = new media.Output({
    format: new media.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })
  const video = new media.CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: PRESENTATION_BITRATE,
    keyFrameInterval: 2,
  })
  output.addVideoTrack(video, { frameRate: PRESENTATION_FPS })
  const audio = audioCodec
    ? new media.AudioBufferSource({ codec: audioCodec, bitrate: AUDIO_BITRATE })
    : null
  if (audio) output.addAudioTrack(audio)

  try {
    await output.start()
    // El audio en paralelo: el muxer intercala las pistas y podría esperar al video para seguir.
    const audioDone = audio && options.music ? audio.add(options.music) : Promise.resolve()
    const frames = frameCount(presentation.duration)
    const input = {
      ctx,
      width,
      height,
      images: options.images,
      focus: options.focus,
      reducedMotion: options.reducedMotion,
    }
    for (let index = 0; index < frames; index++) {
      if (signal?.aborted) throw aborted()
      drawPresentationFrame(input, presentation, (index * 1000) / PRESENTATION_FPS)
      await video.add(index / PRESENTATION_FPS, 1 / PRESENTATION_FPS)
      if (index % 15 === 0) {
        options.onProgress?.(index / frames)
        await yieldToBrowser()
      }
    }
    await audioDone
    if (signal?.aborted) throw aborted()
    await output.finalize()
    options.onProgress?.(1)
    const buffer = target.buffer
    return buffer ? { blob: new Blob([buffer], { type: 'video/mp4' }), withAudio: !!audio } : null
  } catch (error) {
    await output.cancel().catch(() => undefined)
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    // Un codificador que falla a mitad de camino no es motivo para quedarse sin video.
    return null
  }
}
