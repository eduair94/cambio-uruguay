<template>
  <VCard variant="flat" class="chat-card pa-4">
    <!-- 1. Sin clave: cómo conseguirla -->
    <div v-if="!connected">
      <div class="text-subtitle-1 font-weight-bold mb-2">Conectá tu clave gratuita de Gemini</div>
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
          con tu cuenta de Google.
        </li>
        <li class="text-body-2">
          Tocá «Create API key» (crear clave). Es gratis y no pide tarjeta.
        </li>
        <li class="text-body-2">Copiala y pegala acá abajo.</li>
      </ol>
      <form class="d-flex flex-column ga-2" @submit.prevent="connect">
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
            color="primary"
            :loading="connecting"
            :disabled="keyInput.trim().length < 20"
            prepend-icon="mdi-connection"
          >
            Conectar
          </VBtn>
        </div>
      </form>
    </div>

    <!-- 2. El chat -->
    <div v-else>
      <div class="d-flex flex-wrap align-center ga-2 mb-3">
        <span class="text-caption text-medium-emphasis"
          >Conectado · {{ model }} · {{ toolCount }} herramientas</span
        >
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
        <VBtn
          size="small"
          variant="text"
          prepend-icon="mdi-key-remove"
          :disabled="busy"
          @click="forget"
        >
          Olvidar mi clave
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
} from '~/utils/geminiChat'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  html?: string
}

// The key lives in memory; "remember" copies it to this browser only. It is sent to Google and
// nowhere else. Storage can throw (private mode, blocked site data): every access is guarded.
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
const keyInput = ref('')
const remember = ref(true)
const apiKey = ref('')
const models = ref<string[]>([])
const declarations = ref<FunctionDeclaration[]>([])
const instructions = ref('')
const connecting = ref(false)
const busy = ref(false)
const statusText = ref('')
const error = ref('')
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const log = ref<HTMLElement | null>(null)
let history: GeminiContent[] = []

const connected = computed(
  () => !!apiKey.value && models.value.length > 0 && declarations.value.length > 0
)
const model = computed(() => models.value[0] ?? '')
const toolCount = computed(() => declarations.value.length)
const suggestions = AI_PROMPT_EXAMPLES.filter((_, i) => [0, 2, 4, 6].includes(i)).map(e => e.text)

async function connect(key = keyInput.value.trim()) {
  if (!key) return
  connecting.value = true
  error.value = ''
  try {
    const [available, init, tools] = await Promise.all([
      listGeminiModels(browserFetch, key),
      mcp.initialize(),
      mcp.listTools(),
    ])
    if (!available.length)
      throw new Error('Tu clave no tiene acceso a ningún modelo Flash de Gemini.')
    models.value = available
    instructions.value = `${CHAT_INSTRUCTIONS}\n\n${init.instructions}`
    declarations.value = toFunctionDeclarations(tools)
    apiKey.value = key
    keyInput.value = ''
    if (remember.value) writeStored(key)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    // A remembered key Google now rejects would fail on every visit; a network hiccup would not.
    if (e instanceof GeminiError && [400, 401, 403].includes(e.status) && key === readStored())
      writeStored(null)
  } finally {
    connecting.value = false
  }
}

async function send(text = draft.value) {
  const userText = text.trim()
  if (!userText || busy.value) return
  draft.value = ''
  error.value = ''
  messages.value.push({ role: 'user', text: userText })
  busy.value = true
  scrollDown()
  try {
    const result = await runChatTurn({
      fetch: browserFetch,
      apiKey: apiKey.value,
      models: models.value,
      history,
      userText,
      systemInstruction: instructions.value,
      declarations: declarations.value,
      callTool: (name, args) => mcp.callTool(name, args),
      onStatus: status => (statusText.value = status),
    })
    history = result.history
    const answer = result.text || 'No tengo una respuesta para eso; probá reformularlo.'
    messages.value.push({ role: 'assistant', text: answer, html: renderChatMarkdown(answer) })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    // The question stays in the box so a retry after a rate limit is one click.
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
  history = []
  messages.value = []
  error.value = ''
}

function forget() {
  writeStored(null)
  apiKey.value = ''
  models.value = []
  reset()
}

onMounted(() => {
  const stored = readStored()
  if (stored) connect(stored)
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
