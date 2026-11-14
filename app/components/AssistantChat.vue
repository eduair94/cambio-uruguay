<template>
  <!-- Pantalla completa sin perder la conversación: la tarjeta es UNA sola instancia y el Teleport la
       muda entre su lugar en la página y el diálogo. Un `v-if` por modo la remontaría, y con ella se
       irían los mensajes, el historial del modelo y la sesión. El diálogo pone lo estándar: Esc y el
       botón atrás del celular cierran, el scroll de la página queda bloqueado y el foco, adentro. -->
  <div
    :id="homeId"
    v-bind="$attrs"
    class="chat-home"
    :style="fullscreen && homeHeight ? { minHeight: `${homeHeight}px` } : undefined"
  />
  <Teleport defer :to="`#${fullscreen ? stageId : homeId}`">
    <VCard
      ref="cardRef"
      variant="flat"
      :class="['chat-card', fullscreen ? 'is-fullscreen' : 'pa-4']"
    >
      <!-- 1. Todavía sin conectar: un botón, y la clave propia como alternativa plegada -->
      <div v-if="!provider" class="connect">
        <div v-if="pendingPrompt" class="pending mb-4" data-testid="assistant-pending-prompt">
          <div class="text-caption text-medium-emphasis mb-1">
            Tu pregunta, lista para enviar apenas entres:
          </div>
          <p class="text-body-2 mb-0">«{{ pendingPrompt }}»</p>
        </div>
        <div class="text-center py-2">
          <VBtn
            size="x-large"
            color="primary"
            prepend-icon="mdi-chat-processing-outline"
            :loading="starting"
            @click="startPuter"
          >
            Empezar
          </VBtn>
          <p class="text-body-2 text-medium-emphasis mt-3 mb-0 mx-auto" style="max-width: 46ch">
            Se abre una ventanita para entrar con tu cuenta de Google, Microsoft o Apple. Es gratis
            y no tenés que copiar ninguna clave.
          </p>
        </div>

        <VExpansionPanels variant="accordion" class="mt-4">
          <VExpansionPanel>
            <VExpansionPanelTitle class="text-body-2"
              >¿Preferís usar tu propia clave de Gemini?</VExpansionPanelTitle
            >
            <VExpansionPanelText>
              <ol class="key-steps mb-3">
                <li class="text-body-2">
                  Entrá a
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="cu-link"
                    >Google AI Studio</a
                  >
                  y tocá «Create API key» (gratis, sin tarjeta).
                </li>
                <li class="text-body-2">Copiala y pegala acá.</li>
              </ol>
              <form class="d-flex flex-column ga-2" @submit.prevent="connectGemini()">
                <VTextField
                  v-model="keyInput"
                  label="Clave de Gemini"
                  type="password"
                  autocomplete="off"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
                <VCheckbox
                  v-model="remember"
                  label="Recordarla en este navegador"
                  density="compact"
                  hide-details
                />
                <div>
                  <VBtn
                    type="submit"
                    variant="tonal"
                    :loading="connectingKey"
                    :disabled="keyInput.trim().length < 20"
                  >
                    Usar mi clave
                  </VBtn>
                </div>
              </form>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </div>

      <!-- 2. El chat -->
      <div v-else class="chat">
        <div :class="['chat-bar', { docked: messages.length || busy }]">
          <div class="chat-heading">
            <span v-if="fullscreen" class="chat-title">
              <AssistantMark :size="20" />
              Asistente
            </span>
            <span class="chat-status">
              <span class="chat-status-dot" aria-hidden="true" />
              {{ connectionLabel }}
            </span>
          </div>
          <VSpacer />
          <template v-if="xs">
            <VBtn
              icon="mdi-restart"
              size="small"
              variant="text"
              :disabled="busy"
              aria-label="Nueva conversación"
              title="Nueva conversación"
              @click="reset"
            />
            <VBtn
              icon="mdi-logout"
              size="small"
              variant="text"
              :disabled="busy"
              aria-label="Salir"
              title="Salir"
              @click="leave"
            />
          </template>
          <template v-else>
            <VBtn
              size="small"
              variant="text"
              prepend-icon="mdi-restart"
              :disabled="busy"
              @click="reset"
            >
              Nueva conversación
            </VBtn>
            <VBtn
              size="small"
              variant="text"
              prepend-icon="mdi-logout"
              :disabled="busy"
              @click="leave"
            >
              Salir
            </VBtn>
          </template>
          <VBtn
            ref="toggleRef"
            :icon="fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
            size="small"
            :variant="fullscreen ? 'tonal' : 'text'"
            :aria-label="fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'"
            :aria-pressed="fullscreen"
            :title="fullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'"
            data-testid="assistant-fullscreen-toggle"
            @click="fullscreen ? exitFullscreen() : enterFullscreen()"
          />
        </div>

        <div ref="scrollerRef" class="chat-scroll">
          <!-- Primera vez: qué puede hacer, con una pregunta lista por cada parte del sitio -->
          <div v-if="!messages.length && !busy" class="welcome">
            <div class="welcome-mark">
              <AssistantMark :size="28" />
            </div>
            <h2 class="welcome-title">¿Qué querés resolver?</h2>
            <p class="welcome-lead">
              Busca en los avisos, las cotizaciones y las guías del sitio, y te muestra lo que
              encontró.
            </p>
            <ul class="ideas">
              <li v-for="idea in suggestions" :key="idea.text">
                <button type="button" class="idea" @click="send(idea.text)">
                  <span class="idea-kicker">
                    <VIcon :icon="idea.icon" size="16" />
                    {{ idea.kicker }}
                  </span>
                  <span class="idea-text">{{ idea.text }}</span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Announced: the answer's text, not its carousels — a screen reader would otherwise read every
           card of every carousel the moment it lands. The cards stay in the reading order below. -->
          <div class="d-sr-only" aria-live="polite">{{ announcement }}</div>
          <div class="log">
            <template v-for="(m, i) in messages" :key="i">
              <div v-if="m.role === 'user'" class="turn user">
                <div class="bubble">{{ m.text }}</div>
              </div>
              <div v-else :ref="el => setTurnRef(el, i)" class="turn assistant">
                <div class="avatar" aria-hidden="true">
                  <AssistantMark :size="18" />
                </div>
                <div class="turn-body">
                  <!-- eslint-disable-next-line vue/no-v-html -- renderChatMarkdown drops raw HTML and non-http links -->
                  <div class="answer" v-html="m.html" />
                  <AssistantBlocks v-if="m.blocks?.length" :blocks="m.blocks" class="mt-4" />
                  <div class="turn-actions">
                    <VBtn
                      size="small"
                      variant="text"
                      :prepend-icon="copied === i ? 'mdi-check' : 'mdi-content-copy'"
                      @click="copy(m, i)"
                    >
                      {{ copied === i ? 'Copiado' : 'Copiar' }}
                    </VBtn>
                    <span v-if="m.families?.length" class="consulted">
                      Consultó
                      <VIcon
                        v-for="family in m.families"
                        :key="family"
                        :icon="FAMILY_ICON[family]"
                        size="16"
                        :aria-label="FAMILY_LABEL[family]"
                        :title="FAMILY_LABEL[family]"
                      />
                    </span>
                  </div>
                  <div
                    v-if="i === messages.length - 1 && !busy && m.followUps?.length"
                    class="follow-ups"
                  >
                    <button
                      v-for="question in m.followUps"
                      :key="question"
                      type="button"
                      class="follow-up"
                      @click="send(question)"
                    >
                      {{ question }}
                      <VIcon icon="mdi-arrow-right" size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </template>
            <div v-if="busy" ref="busyRow" class="turn assistant">
              <div class="avatar working" aria-hidden="true">
                <AssistantMark :size="18" />
              </div>
              <div class="turn-body">
                <AssistantSteps :steps="steps" />
              </div>
            </div>
          </div>
        </div>

        <VAlert
          v-if="error"
          type="warning"
          variant="tonal"
          density="compact"
          class="chat-error"
          closable
          @click:close="error = ''"
        >
          {{ error }}
        </VAlert>

        <form :class="['composer', { docked: messages.length || busy }]" @submit.prevent="send()">
          <VTextarea
            ref="draftRef"
            v-model="draft"
            label="Contale qué buscás"
            rows="1"
            auto-grow
            max-rows="6"
            density="comfortable"
            variant="outlined"
            hide-details
            :disabled="busy"
            @keydown.enter.exact.prevent="send()"
          />
          <VBtn
            type="submit"
            color="primary"
            icon="mdi-send"
            :disabled="busy || !draft.trim()"
            aria-label="Enviar"
          />
        </form>
      </div>

      <VAlert
        v-if="error && !provider"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-3"
        closable
        @click:close="error = ''"
      >
        {{ error }}
      </VAlert>
    </VCard>
  </Teleport>
  <VDialog
    v-model="fullscreen"
    fullscreen
    eager
    :close-on-back="false"
    :transition="xs ? 'dialog-bottom-transition' : 'dialog-transition'"
    aria-label="Asistente con IA, pantalla completa"
  >
    <div :id="stageId" class="chat-stage" />
  </VDialog>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { useDisplay } from 'vuetify'
import { AI_PROMPT_EXAMPLES, type AiPromptExample } from '~/utils/aiSearch'
import { renderChatMarkdown } from '~/utils/chatMarkdown'
import {
  FAMILY_ICON,
  buildChatBlocks,
  followUps,
  plainAnswer,
  toolFamily,
  type ChatBlock,
  type ChatStep,
  type ToolCallRecord,
  type ToolFamily,
} from '~/utils/chatResults'
import {
  CHAT_INSTRUCTIONS,
  GEMINI_KEY_STORAGE,
  GeminiError,
  TOOL_STATUS,
  createMcpClient,
  listGeminiModels,
  runChatTurn,
  toFunctionDeclarations,
  type FunctionDeclaration,
  type GeminiContent,
  type McpTool,
} from '~/utils/geminiChat'
import {
  PUTER_MODELS,
  PuterChatError,
  loadPuter,
  puterError,
  runPuterTurn,
  toOpenAiTools,
  type OpenAiMessage,
  type OpenAiTool,
  type PuterLike,
} from '~/utils/puterChat'

const props = withDefaults(defineProps<{ initialPrompt?: string }>(), { initialPrompt: '' })

// The page's `class` goes to the chat's place in the page, which keeps its spacing whichever home the
// card is in.
defineOptions({ inheritAttrs: false })

const { xs } = useDisplay()

// ── Full screen ──
const baseId = useId()
const homeId = `${baseId}-home`
const stageId = `${baseId}-stage`
const fullscreen = ref(false)
/** The card's height when it left: its place keeps it, so the page does not jump back on return. */
const homeHeight = ref(0)
const cardRef = ref<ComponentPublicInstance | null>(null)
const toggleRef = ref<ComponentPublicInstance | null>(null)
const draftRef = ref<{ focus: () => void } | null>(null)
const scrollerRef = ref<HTMLElement | null>(null)
/**
 * On a phone a conversation opens in full screen, the way a messaging app does: inline, the answer
 * shares a narrow column with the page around it and the keyboard. Once the visitor leaves it, the
 * chat respects that and stays in the page.
 */
let autoExpand = true

/**
 * Full screen is a place in the browser's history, the way a phone's modal views are: Back closes it
 * instead of leaving the site. Vuetify's own close-on-back only catches a navigation inside the app,
 * and a visitor who arrived from Google has none before this page — Back took them to Google and the
 * conversation was gone. The entry keeps vue-router's keys, so the router reads it as its own.
 */
let historyEntry = false
const ENTRY_KEY = 'assistantFullscreen'

function enterFullscreen() {
  homeHeight.value = (cardRef.value?.$el as HTMLElement | undefined)?.offsetHeight ?? 0
  fullscreen.value = true
  try {
    window.history.pushState({ ...window.history.state, [ENTRY_KEY]: true }, '')
    historyEntry = true
  } catch {
    /* without the entry, Back leaves the page, as before */
  }
}

function exitFullscreen() {
  fullscreen.value = false
}

/** Back (or a swipe) on the full-screen entry: close it, and the page stays. */
function onPopState(event: PopStateEvent) {
  if (!historyEntry || (event.state as Record<string, unknown> | null)?.[ENTRY_KEY]) return
  historyEntry = false
  fullscreen.value = false
}

onMounted(() => window.addEventListener('popstate', onPopState))
onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))

watch(fullscreen, (on, was) => {
  // Closed some other way (the button, Esc, leaving): take its entry back off the history, so the
  // next Back does what the visitor expects.
  if (was && !on && historyEntry) {
    historyEntry = false
    window.history.back()
  }
  if (was && !on) autoExpand = false
  nextTick(() => {
    if (on) {
      // Where the conversation is, not its first message.
      const scroller = scrollerRef.value
      if (scroller) scroller.scrollTop = scroller.scrollHeight
      // A phone would open its keyboard over the answer.
      if (!xs.value) draftRef.value?.focus()
    } else {
      // Back to the button that opened it, without scrolling the page: the dialog already put the
      // page back where the visitor left it.
      ;(toggleRef.value?.$el as HTMLElement | undefined)?.focus({ preventScroll: true })
    }
  })
})

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  html?: string
  /** What the turn's tools returned, drawn as cards (utils/chatResults.ts). */
  blocks?: ChatBlock[]
  followUps?: string[]
  /** The parts of the site it read, in the order it read them. */
  families?: ToolFamily[]
}

const FAMILY_LABEL: Record<ToolFamily, string> = {
  alquileres: 'alquileres',
  autos: 'autos',
  productos: 'productos',
  cambio: 'cotizaciones',
  sitio: 'guías del sitio',
}

// Storage can throw (private mode, blocked site data): every access is guarded.
const readStored = () => {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || ''
  } catch {
    return ''
  }
}
const writeStored = (value: string | null) => {
  try {
    if (value) localStorage.setItem(GEMINI_KEY_STORAGE, value)
    else localStorage.removeItem(GEMINI_KEY_STORAGE)
  } catch {
    /* storage unavailable: the key simply is not remembered */
  }
}

// window.fetch must not be called with another object as `this`; wrap it once.
const browserFetch: typeof fetch = (input, init) => fetch(input, init)
const mcp = createMcpClient(browserFetch)

const provider = ref<'puter' | 'gemini' | null>(null)
const starting = ref(false)
const connectingKey = ref(false)
const keyInput = ref('')
const remember = ref(true)
const busy = ref(false)
const error = ref('')
const draft = ref('')
const messages = ref<ChatMessage[]>([])
/** The tool calls of the turn being answered, as they happen. */
const steps = ref<ChatStep[]>([])
const copied = ref<number | null>(null)
const announcement = ref('')
const busyRow = ref<HTMLElement | null>(null)
const turnRefs = new Map<number, HTMLElement>()
const setTurnRef = (el: unknown, index: number) => {
  if (el instanceof HTMLElement) turnRefs.set(index, el)
  else turnRefs.delete(index)
}
const puterName = ref('')
const model = ref('')
/** A question brought from a directory (?q=): sent once, as soon as the chat is connected. */
const pendingPrompt = ref(props.initialPrompt)

let puter: PuterLike | null = null
let apiKey = ''
let geminiModels: string[] = []
let puterModels: string[] = [...PUTER_MODELS]
let instructions = ''
let declarations: FunctionDeclaration[] = []
let openAiTools: OpenAiTool[] = []
let geminiHistory: GeminiContent[] = []
let puterHistory: OpenAiMessage[] = []

// One question about the site first: it is what the assistant does that a directory filter cannot.
// Then one per directory, and the market the site is named after.
const KICKER: Record<AiPromptExample['vertical'], { kicker: string; icon: string }> = {
  sitio: { kicker: 'Guías', icon: FAMILY_ICON.sitio },
  alquileres: { kicker: 'Alquileres', icon: FAMILY_ICON.alquileres },
  autos: { kicker: 'Autos', icon: FAMILY_ICON.autos },
  productos: { kicker: 'Productos', icon: FAMILY_ICON.productos },
}
const suggestions = [
  ...[
    AI_PROMPT_EXAMPLES.find(e => e.vertical === 'sitio'),
    ...AI_PROMPT_EXAMPLES.filter((_, i) => [3, 4, 7].includes(i)),
  ].flatMap(e => (e ? [{ text: e.text, ...KICKER[e.vertical] }] : [])),
  {
    text: '¿Dónde conviene comprar dólares hoy, y cómo vino el dólar este mes?',
    kicker: 'Cotizaciones',
    icon: FAMILY_ICON.cambio,
  },
  // Six, so the grid closes on two full rows of three.
  ...AI_PROMPT_EXAMPLES.filter(e => e.vertical === 'sitio')
    .slice(1, 2)
    .map(e => ({ text: e.text, ...KICKER[e.vertical] })),
]
const connectionLabel = computed(() =>
  provider.value === 'puter'
    ? `Conectado${puterName.value ? ` como ${puterName.value}` : ''} · ${model.value}`
    : `Conectado con tu clave de Gemini · ${model.value}`
)

/** Tools and instructions come from the MCP, whichever model answers. */
async function loadTools() {
  if (declarations.length) return
  const [init, tools] = await Promise.all([mcp.initialize(), mcp.listTools()])
  instructions = `${CHAT_INSTRUCTIONS}\n\n${init.instructions}`
  declarations = toFunctionDeclarations(tools as McpTool[])
  openAiTools = toOpenAiTools(tools as McpTool[])
}

/**
 * The one-button path. signIn opens a popup, so it runs straight from the click; puter.js is
 * preloaded on mount so there is nothing to wait for before it.
 */
async function startPuter() {
  starting.value = true
  error.value = ''
  // Which step failed decides the message: a closed popup is not "the AI did not answer".
  let phase: 'load' | 'signin' | 'tools' = 'load'
  try {
    puter ??= await loadPuter()
    phase = 'signin'
    const user = puter.auth.isSignedIn()
      ? await puter.auth.getUser()
      : await puter.auth.signIn({ attempt_temp_user_creation: true })
    puterName.value = user?.is_temp ? '' : user?.username || ''
    phase = 'tools'
    await loadTools()
    model.value = puterModels[0] ?? ''
    provider.value = 'puter'
    sendPending()
  } catch (e) {
    error.value =
      phase === 'signin'
        ? 'No se completó el ingreso. Tocá «Empezar» para intentar de nuevo.'
        : e instanceof PuterChatError || phase === 'tools'
          ? (e as Error).message || 'El buscador no respondió; probá de nuevo.'
          : puterError(e).message
  } finally {
    starting.value = false
  }
}

async function connectGemini(key = keyInput.value.trim()) {
  if (!key) return
  connectingKey.value = true
  error.value = ''
  try {
    const [available] = await Promise.all([listGeminiModels(browserFetch, key), loadTools()])
    if (!available.length)
      throw new Error('Tu clave no tiene acceso a ningún modelo Flash de Gemini.')
    geminiModels = available
    apiKey = key
    model.value = available[0]!
    keyInput.value = ''
    if (remember.value) writeStored(key)
    provider.value = 'gemini'
    sendPending()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    // A remembered key Google now rejects would fail on every visit; a network hiccup would not.
    if (e instanceof GeminiError && [400, 401, 403].includes(e.status) && key === readStored())
      writeStored(null)
  } finally {
    connectingKey.value = false
  }
}

async function send(text = draft.value) {
  const userText = text.trim()
  if (!userText || busy.value || !provider.value) return
  if (xs.value && autoExpand && !fullscreen.value && !messages.value.length) enterFullscreen()
  draft.value = ''
  error.value = ''
  messages.value.push({ role: 'user', text: userText })
  busy.value = true
  steps.value = []
  scrollTo(() => busyRow.value, 'nearest')
  // Every call of the turn is kept twice: as a progress line while it runs, and with its
  // structured result for the cards drawn under the answer.
  const calls: ToolCallRecord[] = []
  const callTool = async (name: string, args: Record<string, unknown>) => {
    const step: ChatStep = {
      name,
      label: TOOL_STATUS[name] ?? `Consultando ${name}`,
      state: 'running',
    }
    steps.value = [...steps.value, step]
    const settle = (state: ChatStep['state']) =>
      (steps.value = steps.value.map(s => (s === step ? { ...s, state } : s)))
    try {
      const result = await mcp.callTool(name, args)
      calls.push({ name, args, data: result.data, isError: result.isError })
      settle(result.isError ? 'error' : 'done')
      return result
    } catch (e) {
      settle('error')
      throw e
    }
  }
  try {
    let answer: string
    if (provider.value === 'puter' && puter) {
      const result = await runPuterTurn({
        puter,
        models: puterModels,
        messages: puterHistory,
        userText,
        system: instructions,
        tools: openAiTools,
        callTool,
      })
      puterHistory = result.messages
      model.value = result.model
      answer = result.text
    } else {
      const result = await runChatTurn({
        fetch: browserFetch,
        apiKey,
        models: geminiModels,
        history: geminiHistory,
        userText,
        systemInstruction: instructions,
        declarations,
        callTool,
      })
      geminiHistory = result.history
      model.value = result.model
      answer = result.text
    }
    answer ||= 'No tengo una respuesta para eso; probá reformularlo.'
    const blocks = buildChatBlocks(calls, answer)
    messages.value.push({
      role: 'assistant',
      text: answer,
      html: renderChatMarkdown(answer),
      blocks,
      followUps: followUps(blocks, userText),
      families: [...new Set(calls.map(call => toolFamily(call.name)))],
    })
    const index = messages.value.length - 1
    const shown = blocks.length
      ? ` Debajo, ${blocks.length === 1 ? 'un bloque' : `${blocks.length} bloques`} con lo que encontró.`
      : ''
    announcement.value = `${plainAnswer(answer)}${shown}`
    // A long answer with cards is read from its top, not from its last line.
    scrollTo(() => turnRefs.get(index) ?? null, 'start')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    // The question stays in the box so a retry after a limit is one click.
    messages.value.pop()
    draft.value = userText
  } finally {
    busy.value = false
    steps.value = []
  }
}

async function copy(message: ChatMessage, index: number) {
  try {
    await navigator.clipboard.writeText(message.text)
    copied.value = index
    setTimeout(() => {
      if (copied.value === index) copied.value = null
    }, 2000)
  } catch {
    error.value = 'No se pudo copiar; seleccioná el texto y copialo a mano.'
  }
}

function sendPending() {
  const text = pendingPrompt.value
  if (!text) return
  pendingPrompt.value = ''
  void send(text)
  // A reload must not ask again on the visitor's quota. history.replaceState keeps the router's
  // state and does not scroll, unlike router.replace.
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('q')) {
      url.searchParams.delete('q')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    }
  } catch {
    /* the address bar keeps the question; nothing else depends on it */
  }
}

/** Bring a turn into view once it renders; instant when the visitor asked for less motion. */
function scrollTo(target: () => HTMLElement | null, block: ScrollLogicalPosition) {
  nextTick(() => {
    const el = target()
    if (!el) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block, behavior: reduced ? 'auto' : 'smooth' })
  })
}

function reset() {
  geminiHistory = []
  puterHistory = []
  messages.value = []
  turnRefs.clear()
  error.value = ''
}

function leave() {
  fullscreen.value = false
  if (provider.value === 'puter') puter?.auth.signOut()
  else writeStored(null)
  apiKey = ''
  puterModels = [...PUTER_MODELS]
  provider.value = null
  reset()
}

onMounted(async () => {
  const stored = readStored()
  if (stored) {
    remember.value = true
    await connectGemini(stored)
    return
  }
  // Preload puter.js so the click can open the sign-in popup at once; a returning visitor who is
  // still signed in goes straight to the chat.
  try {
    puter = await loadPuter()
    if (puter.auth.isSignedIn()) await startPuter()
  } catch {
    /* the button retries the load and shows the error */
  }
})
</script>
<style scoped>
/* A feature surface (16px). Visible overflow: the composer sticks to the bottom of the viewport,
   and a sticky child of an `overflow: hidden` card never sticks. */
.chat-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  overflow: visible;
}
.key-steps {
  padding-left: 1.2rem;
}
.key-steps li {
  margin-bottom: 4px;
}
.pending {
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 8px;
  padding: 12px 16px;
  overflow-wrap: anywhere;
}

/* ── The connected chat ── */
.chat {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.chat-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.chat-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  min-width: 0;
}
.chat-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}
.chat-title :deep(svg) {
  color: rgb(var(--v-theme-link));
}
/* Stuck under the app bar once there is a conversation to scroll, like the composer at the bottom:
   in a long conversation in the page the full-screen button (and «Nueva conversación») would
   otherwise be a long scroll away. */
.chat-bar.docked {
  position: sticky;
  top: var(--v-layout-top, 64px);
  z-index: 2;
  margin-inline: -16px;
  padding: 8px 16px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.chat-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.chat-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
}

.welcome {
  padding: 8px 0 24px;
}
.welcome-mark,
.avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-link));
}
.welcome-mark {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}
.welcome-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
}
.welcome-lead {
  margin: 4px 0 0;
  max-width: 60ch;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.ideas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: 8px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}
.ideas li {
  min-width: 0;
}
.idea {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease-out,
    box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.idea:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}
.idea-kicker {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgb(var(--v-theme-link));
}
.idea-text {
  font-size: 0.875rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.log {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
.log:empty {
  display: none;
}
.turn {
  display: flex;
  gap: 12px;
  min-width: 0;
  scroll-margin-top: 80px;
}
.turn.user {
  justify-content: flex-end;
}
.bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 16px 16px 4px 16px;
  background: rgba(var(--v-theme-primary), 0.12);
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.avatar {
  width: 32px;
  height: 32px;
}
/* Breathing while it works: the only motion in the chat that is not a hover. */
.avatar.working {
  animation: breathe 1.6s ease-in-out infinite;
}
@keyframes breathe {
  50% {
    background: rgba(var(--v-theme-primary), 0.24);
  }
}
.turn-body {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}
.answer {
  max-width: 72ch;
  font-size: 0.95rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.answer :deep(p) {
  margin: 0 0 8px;
}
.answer :deep(p:last-child) {
  margin-bottom: 0;
}
.answer :deep(ul),
.answer :deep(ol) {
  margin: 0 0 8px;
  padding-left: 1.2rem;
}
.answer :deep(li + li) {
  margin-top: 4px;
}
.answer :deep(h3),
.answer :deep(h4) {
  margin: 16px 0 4px;
  font-size: 1rem;
  font-weight: 700;
}
.answer :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}
.answer :deep(th),
.answer :deep(td) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 4px 8px;
}
.answer :deep(a),
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.turn-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.consulted {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.follow-ups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.follow-up {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 8px 16px;
  border: 1px solid rgba(var(--v-theme-primary), 0.4);
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms ease-out;
}
.follow-up:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.chat-error {
  margin-top: 16px;
}

/* Docked to the bottom of the viewport once there is a conversation to scroll; before, it sits
   after the suggestions instead of covering them. */
.composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
.composer.docked {
  position: sticky;
  bottom: 0;
  z-index: 2;
}
/* ── Full screen: a bar, a scrolling conversation and the composer, the way a messaging app is laid
   out. The column keeps the page's reading measure (880px) and the bars span the screen; the gutter
   grows instead of the text, so a wide monitor does not turn every answer into one long line. ── */
.chat-stage {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgb(var(--v-theme-surface));
}
.chat-card.is-fullscreen {
  --gutter: max(16px, calc((100% - 880px) / 2));
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: 0;
  border-radius: 0;
  overflow: hidden;
}
.is-fullscreen .connect {
  overflow-y: auto;
  padding: 24px var(--gutter);
}
.is-fullscreen .chat {
  flex: 1;
  min-height: 0;
}
.is-fullscreen .chat-bar,
.is-fullscreen .chat-bar.docked {
  position: static;
  flex-shrink: 0;
  margin: 0;
  padding: calc(8px + env(safe-area-inset-top, 0px)) var(--gutter) 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.is-fullscreen .chat-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px var(--gutter);
}
.is-fullscreen .turn {
  scroll-margin-top: 16px;
}
.is-fullscreen .chat-error {
  flex-shrink: 0;
  margin: 8px var(--gutter) 0;
}
.is-fullscreen .composer,
.is-fullscreen .composer.docked {
  position: static;
  flex-shrink: 0;
  margin: 0;
  padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom, 0px));
}

@media (max-width: 599.98px) {
  .bubble {
    max-width: 92%;
  }
  /* On a phone the answer and its carousels take the whole width; the mark rides above them. */
  .turn.assistant {
    flex-direction: column;
    gap: 8px;
  }
  .turn.assistant .avatar {
    width: 28px;
    height: 28px;
  }
  .turn-body {
    padding-top: 0;
  }
  .follow-up {
    min-height: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .avatar.working {
    animation: none;
  }
  .idea:hover {
    transform: none;
  }
}
</style>
