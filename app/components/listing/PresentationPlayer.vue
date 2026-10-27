<!--
THESIS: El resumen de un aviso en 30–45 segundos, que además se puede mandar por WhatsApp.
FORM: Un reproductor: el cuadro arriba, una barra partida por escena, y debajo los controles y la
transcripción. El video se arma acá mismo, en el navegador, con los datos que la ficha ya tiene:
ni servidor, ni tokens. Ver docs/superpowers/specs/2026-10-26-presentacion-de-avisos-design.md.
-->
<script setup lang="ts">
import {
  formatPresentationLength,
  presentationFileName,
  presentationPhotos,
  withoutBrokenPhotos,
  type ListingPresentation,
} from '~/utils/listingPresentation'
import {
  drawPresentationFrame,
  PRESENTATION_SIZE,
  sceneAt,
  sceneStart,
  type PresentationFormat,
} from '~/utils/presentationCanvas'
import { imageFocus, type PhotoFocus } from '~/utils/presentationFocus'

const props = defineProps<{ presentation: ListingPresentation }>()
const emit = defineEmits<{ close: [] }>()
const track = useTrack()

type Status = 'loading' | 'ready' | 'playing' | 'paused' | 'ended'
const status = ref<Status>('loading')
const active = shallowRef<ListingPresentation | null>(null)
const elapsed = ref(0)
const format = ref<PresentationFormat>('landscape')
const narrate = ref(true)
const canvas = ref<HTMLCanvasElement | null>(null)
const root = ref<{ $el?: HTMLElement } | null>(null)
const images = new Map<string, HTMLImageElement>()
// Se mide una vez por foto al cargarla, no por cuadro: son 96 px y ~1 ms, pero 60 veces por
// segundo durante 40 s ya no sería gratis.
const focus = new Map<string, PhotoFocus>()
let reducedMotion = false
let frame = 0
let playStartedAt = 0
let playOffset = 0
let spokenScene = -1

const VOICE_STORAGE = 'cu_presentation_voice'
const synth = import.meta.client && 'speechSynthesis' in window ? window.speechSynthesis : null
const canSpeak = ref(false)
let voice: SpeechSynthesisVoice | null = null

const current = computed(() => (active.value ? sceneAt(active.value, elapsed.value) : null))
const segments = computed(() => {
  const presentation = active.value
  if (!presentation) return []
  const now = current.value
  return presentation.scenes.map((scene, index) => ({
    id: scene.id,
    grow: scene.duration,
    fill: !now ? 0 : index < now.index ? 1 : index > now.index ? 0 : now.local / scene.duration,
  }))
})
const transcript = computed(() =>
  (active.value?.scenes ?? []).map(scene => scene.narration).filter(Boolean)
)
const remaining = computed(() =>
  active.value ? formatPresentationLength(Math.max(0, active.value.duration - elapsed.value)) : ''
)

// ------------------------------------------------------------------------------- voz del sistema

function pickVoice() {
  if (!synth) return
  const voices = synth.getVoices()
  const preference = ['es-UY', 'es-AR', 'es-419', 'es-US', 'es-MX', 'es-ES']
  voice =
    preference
      .map(lang =>
        voices.find(item => item.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
      )
      .find(Boolean) ??
    voices.find(item => item.lang.toLowerCase().startsWith('es')) ??
    null
  canSpeak.value = !!voice || voices.length === 0
}

function speak(text: string) {
  if (!synth || !narrate.value || recording.value || !text) return
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice?.lang ?? 'es-UY'
  if (voice) utterance.voice = voice
  utterance.rate = 1.05
  synth.speak(utterance)
}

function hush() {
  synth?.cancel()
}

watch(narrate, value => {
  try {
    localStorage.setItem(VOICE_STORAGE, value ? '1' : '0')
  } catch {
    // preferencia de comodidad: si el navegador no guarda, vale para esta vez
  }
  if (!value) hush()
  else if (status.value === 'playing' && current.value && active.value)
    speak(active.value.scenes[current.value.index]!.narration)
})

// ------------------------------------------------------------------------------------- dibujo

function draw() {
  const element = canvas.value
  const presentation = active.value
  const ctx = element?.getContext('2d')
  if (!element || !ctx || !presentation) return
  drawPresentationFrame(
    { ctx, width: element.width, height: element.height, images, focus, reducedMotion },
    presentation,
    elapsed.value
  )
}

function tick(now: number) {
  frame = 0
  const presentation = active.value
  if (!presentation || status.value !== 'playing') return
  elapsed.value = Math.min(presentation.duration, playOffset + (now - playStartedAt))
  const { index } = sceneAt(presentation, elapsed.value)
  if (index !== spokenScene) {
    spokenScene = index
    speak(presentation.scenes[index]!.narration)
  }
  draw()
  if (elapsed.value >= presentation.duration) {
    status.value = 'ended'
    track('listing_presentation', { action: 'complete', kind: presentation.kind })
    if (recording.value) finishRecording()
    return
  }
  frame = requestAnimationFrame(tick)
}

function play() {
  const presentation = active.value
  if (!presentation) return
  if (status.value === 'ended') elapsed.value = 0
  playOffset = elapsed.value
  playStartedAt = performance.now()
  // Al reanudar a mitad de escena no se repite la frase: se espera a la próxima.
  const { index, local } = sceneAt(presentation, elapsed.value)
  spokenScene = local < 600 ? -1 : index
  status.value = 'playing'
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(tick)
}

function pause() {
  if (status.value !== 'playing' || recording.value) return
  status.value = 'paused'
  cancelAnimationFrame(frame)
  hush()
}

function toggle() {
  if (recording.value) return
  if (status.value === 'playing') pause()
  else if (status.value !== 'loading') play()
}

function seek(index: number) {
  const presentation = active.value
  if (!presentation || recording.value) return
  const target = Math.max(0, Math.min(presentation.scenes.length - 1, index))
  elapsed.value = sceneStart(presentation, target)
  hush()
  if (status.value === 'playing') play()
  else {
    if (status.value === 'ended') status.value = 'paused'
    draw()
  }
}

function onKey(event: KeyboardEvent) {
  if (event.key === ' ' || event.key === 'k') {
    event.preventDefault()
    toggle()
  } else if (event.key === 'ArrowRight') seek((current.value?.index ?? 0) + 1)
  else if (event.key === 'ArrowLeft') seek((current.value?.index ?? 0) - 1)
}

watch(format, value => {
  const element = canvas.value
  if (!element) return
  element.width = PRESENTATION_SIZE[value].width
  element.height = PRESENTATION_SIZE[value].height
  draw()
})

// ------------------------------------------------------------------------------------- fotos

function load(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image()
    // CORS o nada: una foto sin permiso mancha el canvas y la descarga del video falla entera.
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'
    image.decoding = 'async'
    const timer = setTimeout(() => resolve(null), 8000)
    image.onload = () => {
      clearTimeout(timer)
      resolve(image.naturalWidth ? image : null)
    }
    image.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    image.src = url
  })
}

async function prepare() {
  const urls = presentationPhotos(props.presentation)
  const broken = new Set<string>()
  const fonts =
    import.meta.client && document.fonts
      ? Promise.all(
          ['400', '600', '700', '800'].map(weight =>
            document.fonts.load(`${weight} 40px "Open Sans"`).catch(() => null)
          )
        )
      : Promise.resolve()
  await Promise.all([
    fonts,
    ...urls.map(async url => {
      const image = await load(url)
      if (image) {
        images.set(url, image)
        const point = imageFocus(image)
        if (point) focus.set(url, point)
      } else broken.add(url)
    }),
  ])
  active.value = withoutBrokenPhotos(props.presentation, broken)
  elapsed.value = 0
  await nextTick()
  const element = canvas.value
  if (element) {
    element.width = PRESENTATION_SIZE[format.value].width
    element.height = PRESENTATION_SIZE[format.value].height
  }
  status.value = 'ready'
  draw()
  play()
}

// ---------------------------------------------------------------------------------- grabación

const recording = ref(false)
const recorded = shallowRef<File | null>(null)
const recordedUrl = ref('')
const recordError = ref('')
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []

const recorderMime = computed(() => {
  if (!import.meta.client || typeof MediaRecorder === 'undefined') return null
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null
  return (
    [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find(type => MediaRecorder.isTypeSupported(type)) ?? null
  )
})
const canShareFile = computed(() => {
  const file = recorded.value
  return !!file && import.meta.client && !!navigator.canShare?.({ files: [file] })
})

function startRecording() {
  const element = canvas.value
  const mime = recorderMime.value
  const presentation = active.value
  if (!element || !mime || !presentation) return
  recordError.value = ''
  discardRecording()
  try {
    const stream = element.captureStream(30)
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
  } catch {
    recordError.value = 'Este navegador no pudo grabar el video. Probá con Chrome, Edge o Safari.'
    return
  }
  chunks = []
  recorder.ondataavailable = event => {
    if (event.data.size) chunks.push(event.data)
  }
  recorder.onstop = () => {
    const type = mime.split(';')[0]!
    const blob = new Blob(chunks, { type })
    chunks = []
    recorder?.stream.getTracks().forEach(item => item.stop())
    recorder = null
    if (!blob.size) {
      recordError.value = 'La grabación salió vacía. Probá de nuevo con la pestaña a la vista.'
      return
    }
    const extension = type === 'video/mp4' ? 'mp4' : 'webm'
    recorded.value = new File([blob], presentationFileName(presentation.title, extension), { type })
    recordedUrl.value = URL.createObjectURL(blob)
  }
  hush()
  recording.value = true
  elapsed.value = 0
  status.value = 'paused'
  recorder.start(500)
  track('listing_presentation', { action: 'record', kind: presentation.kind })
  play()
}

function finishRecording() {
  recording.value = false
  if (recorder && recorder.state !== 'inactive') recorder.stop()
}

function cancelRecording() {
  if (recorder) {
    recorder.onstop = null
    if (recorder.state !== 'inactive') recorder.stop()
    recorder.stream.getTracks().forEach(item => item.stop())
    recorder = null
  }
  chunks = []
  recording.value = false
  status.value = 'paused'
  cancelAnimationFrame(frame)
}

function discardRecording() {
  if (recordedUrl.value) URL.revokeObjectURL(recordedUrl.value)
  recordedUrl.value = ''
  recorded.value = null
}

function download() {
  const file = recorded.value
  if (!file || !recordedUrl.value) return
  const link = document.createElement('a')
  link.href = recordedUrl.value
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  track('listing_presentation', { action: 'download', kind: props.presentation.kind })
}

async function share() {
  const file = recorded.value
  if (!file) return
  try {
    // Un clic nuevo, no el del final de la grabación: compartir exige un gesto reciente.
    await navigator.share({ files: [file], title: props.presentation.title, url: location.href })
    track('listing_presentation', { action: 'share', kind: props.presentation.kind })
  } catch {
    // cancelado por la persona o sin permiso: no hay nada que avisar
  }
}

// --------------------------------------------------------------------------------- ciclo de vida

onMounted(() => {
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  // En un teléfono parado el video vertical llena la pantalla; en una compu, el horizontal.
  if (window.matchMedia?.('(max-aspect-ratio: 4/5)').matches) format.value = 'portrait'
  try {
    narrate.value = localStorage.getItem(VOICE_STORAGE) !== '0'
  } catch {
    narrate.value = true
  }
  if (synth) {
    pickVoice()
    synth.addEventListener?.('voiceschanged', pickVoice)
  }
  root.value?.$el?.focus({ preventScroll: true })
  track('listing_presentation', { action: 'open', kind: props.presentation.kind })
  void prepare()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  hush()
  synth?.removeEventListener?.('voiceschanged', pickVoice)
  if (recording.value) cancelRecording()
  discardRecording()
})
</script>

<template>
  <VCard
    ref="root"
    theme="dark"
    class="presentation"
    :class="`presentation--${format}`"
    tabindex="0"
    data-testid="listing-presentation"
    @keydown="onKey"
  >
    <header class="presentation__bar">
      <p class="presentation__title">{{ presentation.title }}</p>
      <VBtn
        icon="mdi-close"
        variant="text"
        aria-label="Cerrar la presentación"
        @click="emit('close')"
      />
    </header>

    <div class="presentation__stage">
      <canvas
        ref="canvas"
        class="presentation__canvas"
        role="img"
        :aria-label="`Presentación en video: ${presentation.title}`"
        :width="PRESENTATION_SIZE[format].width"
        :height="PRESENTATION_SIZE[format].height"
        @click="toggle"
      />
      <div v-if="status === 'loading'" class="presentation__overlay" aria-live="polite">
        <VProgressCircular indeterminate color="white" />
        <span>Preparando la presentación…</span>
      </div>
      <button
        v-else-if="status !== 'playing'"
        type="button"
        class="presentation__overlay presentation__overlay--button"
        :aria-label="status === 'ended' ? 'Ver de nuevo' : 'Reproducir'"
        @click="toggle"
      >
        <VIcon :icon="status === 'ended' ? 'mdi-replay' : 'mdi-play'" size="56" />
      </button>
    </div>

    <div class="presentation__progress" aria-hidden="true">
      <button
        v-for="(segment, index) in segments"
        :key="segment.id"
        type="button"
        tabindex="-1"
        class="presentation__segment"
        :style="{ flexGrow: segment.grow }"
        :disabled="recording"
        @click="seek(index)"
      >
        <span :style="{ transform: `scaleX(${segment.fill})` }" />
      </button>
    </div>

    <div class="presentation__controls">
      <VBtn
        icon="mdi-skip-previous"
        variant="text"
        aria-label="Escena anterior"
        :disabled="recording || status === 'loading'"
        @click="seek((current?.index ?? 0) - 1)"
      />
      <VBtn
        :icon="status === 'playing' ? 'mdi-pause' : status === 'ended' ? 'mdi-replay' : 'mdi-play'"
        variant="tonal"
        color="primary"
        :aria-label="status === 'playing' ? 'Pausar' : 'Reproducir'"
        :disabled="recording || status === 'loading'"
        @click="toggle"
      />
      <VBtn
        icon="mdi-skip-next"
        variant="text"
        aria-label="Escena siguiente"
        :disabled="recording || status === 'loading'"
        @click="seek((current?.index ?? 0) + 1)"
      />
      <span class="presentation__time" aria-live="off">{{ remaining }}</span>
      <VSpacer />
      <VBtn
        v-if="synth && canSpeak"
        :icon="narrate ? 'mdi-volume-high' : 'mdi-volume-off'"
        variant="text"
        :aria-pressed="narrate"
        :aria-label="narrate ? 'Silenciar la narración' : 'Activar la narración'"
        :title="narrate ? 'Narración activada' : 'Narración apagada'"
        @click="narrate = !narrate"
      />
      <VBtnToggle
        v-model="format"
        mandatory
        density="compact"
        variant="outlined"
        divided
        :disabled="recording"
        aria-label="Formato del video"
      >
        <VBtn value="landscape" aria-label="Horizontal" title="Horizontal (16:9)">
          <VIcon icon="mdi-crop-landscape" />
        </VBtn>
        <VBtn value="portrait" aria-label="Vertical, para historias" title="Vertical (9:16)">
          <VIcon icon="mdi-crop-portrait" />
        </VBtn>
      </VBtnToggle>
    </div>

    <div v-if="recorderMime" class="presentation__export">
      <template v-if="recording">
        <VProgressLinear
          :model-value="active ? (elapsed / active.duration) * 100 : 0"
          color="primary"
          height="6"
          rounded
          class="mb-2"
        />
        <p class="presentation__hint">
          Grabando el video… tarda lo mismo que dura. Dejá esta pestaña a la vista.
          <VBtn size="small" variant="text" @click="cancelRecording">Cancelar</VBtn>
        </p>
      </template>
      <template v-else-if="recorded">
        <div class="presentation__actions">
          <VBtn color="primary" prepend-icon="mdi-download" @click="download">
            Descargar video
          </VBtn>
          <VBtn
            v-if="canShareFile"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-share-variant"
            @click="share"
          >
            Compartir
          </VBtn>
          <VBtn variant="text" prepend-icon="mdi-refresh" @click="startRecording">
            Grabar otra vez
          </VBtn>
        </div>
        <p class="presentation__hint">
          Video {{ format === 'portrait' ? 'vertical' : 'horizontal' }} sin sonido, con los datos
          escritos: se entiende igual en WhatsApp con el volumen apagado.
        </p>
      </template>
      <template v-else>
        <VBtn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-movie-open-outline"
          :disabled="status === 'loading'"
          @click="startRecording"
        >
          Crear video para compartir
        </VBtn>
        <p class="presentation__hint">
          Se arma en tu navegador con los datos del aviso; no se sube a ningún lado.
        </p>
      </template>
      <p v-if="recordError" class="presentation__error" role="alert">{{ recordError }}</p>
    </div>

    <details v-if="transcript.length" class="presentation__transcript">
      <summary>Transcripción</summary>
      <ol>
        <li v-for="(line, index) in transcript" :key="index">{{ line }}</li>
      </ol>
    </details>
  </VCard>
</template>

<style scoped>
.presentation {
  display: flex;
  flex-direction: column;
  background: #0d1a2d;
  color: #fff;
  outline: none;
}
.presentation__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 16px;
}
.presentation__title {
  flex: 1;
  margin: 0;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.presentation__stage {
  position: relative;
  display: flex;
  justify-content: center;
  background: #000;
}
.presentation__canvas {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: min(62vh, 720px);
  cursor: pointer;
}
.presentation--portrait .presentation__canvas {
  max-height: min(72vh, 900px);
}
.presentation__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  background: rgba(13, 26, 45, 0.35);
  border: 0;
}
.presentation__overlay--button {
  cursor: pointer;
}
.presentation__overlay--button .v-icon {
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  padding: 36px;
}
.presentation__progress {
  display: flex;
  gap: 3px;
  padding: 10px 16px 0;
}
.presentation__segment {
  flex-basis: 0;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.22);
  overflow: hidden;
  cursor: pointer;
}
.presentation__segment span {
  display: block;
  height: 100%;
  background: #8cbcff;
  transform-origin: left;
}
.presentation__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
}
.presentation__time {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
  min-width: 4.5em;
  padding-left: 4px;
}
.presentation__export {
  padding: 4px 16px 12px;
}
.presentation__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.presentation__hint {
  margin: 8px 0 0;
  font-size: 0.8125rem;
  opacity: 0.78;
}
.presentation__error {
  margin: 8px 0 0;
  color: #ffb4a8;
  font-size: 0.875rem;
}
.presentation__transcript {
  padding: 0 16px 16px;
  font-size: 0.875rem;
}
.presentation__transcript summary {
  cursor: pointer;
  opacity: 0.85;
}
.presentation__transcript ol {
  margin: 8px 0 0;
  padding-left: 20px;
  opacity: 0.88;
}
</style>
