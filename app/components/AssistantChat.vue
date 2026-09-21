<template>
  <VCard variant="flat" class="chat-card pa-4">
    <!-- 1. Todavía sin conectar: un botón, y la clave propia como alternativa plegada -->
    <div v-if="!provider">
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
          Se abre una ventanita para entrar con tu cuenta de Google, Microsoft o Apple. Es gratis y
          no tenés que copiar ninguna clave.
        </p>
      </div>

      <VExpansionPanels variant="accordion" class="mt-4">
        <VExpansionPanel>
          <VExpansionPanelTitle class="text-body-2"
            >¿Preferís usar tu propia clave de Gemini?</VExpansionPanelTitle
          >
          <VExpansionPanelText>
            <ol class="steps mb-3">
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
    <div v-else>
      <div class="d-flex flex-wrap align-center ga-2 mb-3">
        <span class="text-caption text-medium-emphasis">{{ connectionLabel }}</span>
        <VSpacer />
        <VBtn
          size="small"
          variant="text"
          prepend-icon="mdi-restart"
          :disabled="busy"
          @click="reset"
        >
          Nueva conversación
        </VBtn>
        <VBtn size="small" variant="text" prepend-icon="mdi-logout" :disabled="busy" @click="leave">
          Salir
        </VBtn>
      </div>

      <div v-if="!messages.length" class="mb-3">
        <div class="text-body-2 text-medium-emphasis mb-2">
          Probá con alguno de estos o escribí el tuyo:
        </div>
        <div class="d-flex flex-column ga-2">
          <VBtn
            v-for="(s, i) in suggestions"
            :key="i"
            variant="tonal"
            class="suggestion"
            @click="send(s)"
          >
            {{ s }}
          </VBtn>
        </div>
      </div>

      <div ref="log" class="log mb-3" aria-live="polite">
        <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
          <div v-if="m.role === 'user'" class="text-body-2">{{ m.text }}</div>
          <!-- eslint-disable-next-line vue/no-v-html -- renderChatMarkdown drops raw HTML and non-http links -->
          <div v-else class="text-body-2 answer" v-html="m.html" />
        </div>
        <div v-if="busy" class="msg assistant d-flex align-center ga-2">
          <VProgressCircular indeterminate size="16" width="2" color="primary" />
          <span class="text-body-2 text-medium-emphasis">{{ statusText }}…</span>
        </div>
      </div>

      <form class="d-flex ga-2 align-end" @submit.prevent="send()">
        <VTextarea
          v-model="draft"
          label="Contale qué buscás"
          rows="2"
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
      v-if="error"
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
</template>

<script setup lang="ts">
import { AI_PROMPT_EXAMPLES } from '~/utils/aiSearch'
import { renderChatMarkdown } from '~/utils/chatMarkdown'
import {
  CHAT_INSTRUCTIONS,
  GEMINI_KEY_STORAGE,
  GeminiError,
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

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  html?: string
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
const statusText = ref('')
const error = ref('')
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const log = ref<HTMLElement | null>(null)
const puterName = ref('')
const model = ref('')

let puter: PuterLike | null = null
let apiKey = ''
let geminiModels: string[] = []
let puterModels: string[] = [...PUTER_MODELS]
let instructions = ''
let declarations: FunctionDeclaration[] = []
let openAiTools: OpenAiTool[] = []
let geminiHistory: GeminiContent[] = []
let puterHistory: OpenAiMessage[] = []

const suggestions = AI_PROMPT_EXAMPLES.filter((_, i) => [0, 2, 4, 6].includes(i)).map(e => e.text)
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
  draft.value = ''
  error.value = ''
  messages.value.push({ role: 'user', text: userText })
  busy.value = true
  scrollDown()
  const callTool = (name: string, args: Record<string, unknown>) => mcp.callTool(name, args)
  const onStatus = (status: string) => (statusText.value = status)
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
        onStatus,
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
        onStatus,
      })
      geminiHistory = result.history
      model.value = result.model
      answer = result.text
    }
    answer ||= 'No tengo una respuesta para eso; probá reformularlo.'
    messages.value.push({ role: 'assistant', text: answer, html: renderChatMarkdown(answer) })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    // The question stays in the box so a retry after a limit is one click.
    messages.value.pop()
    draft.value = userText
  } finally {
    busy.value = false
    scrollDown()
  }
}

function scrollDown() {
  nextTick(() => log.value?.scrollTo({ top: log.value.scrollHeight, behavior: 'smooth' }))
}

function reset() {
  geminiHistory = []
  puterHistory = []
  messages.value = []
  error.value = ''
}

function leave() {
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
.chat-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
}
.steps {
  padding-left: 1.2rem;
}
.steps li {
  margin-bottom: 4px;
}
.suggestion {
  height: auto !important;
  min-height: 36px;
  padding-block: 8px;
  white-space: normal;
  text-transform: none;
  letter-spacing: normal;
  justify-content: flex-start;
  text-align: left;
}
.log {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.msg {
  border-radius: 12px;
  padding: 10px 14px;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.msg.user {
  align-self: flex-end;
  background: rgba(var(--v-theme-primary), 0.12);
  max-width: 85%;
}
.msg.assistant {
  align-self: flex-start;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.answer :deep(p) {
  margin-bottom: 8px;
}
.answer :deep(ul),
.answer :deep(ol) {
  padding-left: 1.2rem;
  margin-bottom: 8px;
}
.answer :deep(h3),
.answer :deep(h4) {
  font-size: 1rem;
  font-weight: 700;
  margin: 8px 0 4px;
}
.answer :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
  margin-bottom: 8px;
}
.answer :deep(th),
.answer :deep(td) {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  padding: 4px 8px;
}
.answer :deep(a),
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
</style>
