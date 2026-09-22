// The one-button path of /asistente-ia: Puter.js "user-pays". The visitor clicks, signs in with
// Puter in a popup (Google, Microsoft or Apple) and every AI call is charged to THEIR Puter
// account, which comes with a free monthly allowance. The site pays nothing and never holds a key.
// Tools still come from our MCP (utils/geminiChat.ts has the client and the status labels).

import {
  MAX_TOOL_ROUNDS,
  ROUND_LIMIT_TEXT,
  TOOL_STATUS,
  toFunctionDeclarations,
  type McpTool,
} from './geminiChat'

export const PUTER_SCRIPT = 'https://js.puter.com/v2/'

/**
 * Best first. Flash-Lite 3.5 searched and answered well in the same loop; 2.5 Flash-Lite, cheaper,
 * asked questions instead of searching (measured 2026-09-21), so it is not offered.
 */
export const PUTER_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gpt-5-nano']

export interface OpenAiToolCall {
  id: string
  type?: 'function'
  function: { name: string; arguments: string }
  /** Gemini 3 through the OpenAI-compatible API: `{ google: { thought_signature } }`. */
  extra_content?: { google?: { thought_signature?: string } }
}
/** Text, or a Puter-native tool_use block (see prepareForModel). */
export interface OpenAiContentBlock {
  type?: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  extra_content?: { google?: { thought_signature?: string } }
}
export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null | OpenAiContentBlock[]
  tool_calls?: OpenAiToolCall[]
  tool_call_id?: string
}
export interface OpenAiTool {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}
export interface PuterUser {
  username?: string
  is_temp?: boolean
}
export interface PuterLike {
  auth: {
    isSignedIn(): boolean
    signIn(options?: { attempt_temp_user_creation?: boolean }): Promise<PuterUser>
    getUser(): Promise<PuterUser>
    signOut(): void
  }
  ai: {
    chat(
      messages: OpenAiMessage[],
      testMode: boolean,
      options: { model: string; tools?: OpenAiTool[] }
    ): Promise<{ message?: OpenAiMessage }>
  }
}

export function toOpenAiTools(tools: McpTool[]): OpenAiTool[] {
  return toFunctionDeclarations(tools).map(declaration => ({
    type: 'function',
    function: {
      name: declaration.name,
      description: declaration.description,
      parameters: declaration.parametersJsonSchema,
    },
  }))
}

export function messageText(message: OpenAiMessage | undefined): string {
  const content = message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content))
    return content
      .map(part => part.text ?? '')
      .join('')
      .trim()
  return ''
}

/** A Puter failure, phrased for the visitor. `modelUnavailable` lets the loop try the next model. */
export class PuterChatError extends Error {
  constructor(
    message: string,
    readonly modelUnavailable = false
  ) {
    super(message)
  }
}

export function puterError(error: unknown): PuterChatError {
  const raw = error as
    | { message?: string; code?: string; error?: { message?: string; code?: string } }
    | string
  const text = (
    typeof raw === 'string'
      ? raw
      : [raw?.message, raw?.code, raw?.error?.message, raw?.error?.code].filter(Boolean).join(' ')
  ).toLowerCase()
  if (/insufficient|funds|credit|allowance|usage.?limit|quota|payment/.test(text))
    return new PuterChatError(
      'Se terminó el cupo gratuito de tu cuenta de Puter por este mes. Podés sumar crédito en Puter o usar tu propia clave gratuita de Gemini (opción de abajo).'
    )
  if (/closed|cancel|popup|window/.test(text))
    return new PuterChatError(
      'Se cerró la ventana de ingreso. Tocá «Empezar» para intentar de nuevo.'
    )
  if (/not.?signed|unauthori[sz]ed|\b401\b|sign.?in|session/.test(text))
    return new PuterChatError('Tu sesión de Puter se cerró. Tocá «Empezar» para volver a entrar.')
  if (/upstream|all ai providers|provider/.test(text))
    return new PuterChatError(
      'La IA no pudo responder esta vez. Probá de nuevo en un momento.',
      true
    )
  if (/model|not.?found|unsupported|unavailable/.test(text))
    return new PuterChatError('Ese modelo no está disponible en Puter en este momento.', true)
  return new PuterChatError(
    `La IA no respondió${text ? ` (${text.slice(0, 120)})` : ''}. Probá de nuevo en un momento.`
  )
}

let loading: Promise<PuterLike> | null = null

/** Injects puter.js once, only on the page that uses it. */
export function loadPuter(): Promise<PuterLike> {
  const scope = window as unknown as { puter?: PuterLike }
  if (scope.puter) return Promise.resolve(scope.puter)
  loading ??= new Promise<PuterLike>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PUTER_SCRIPT
    script.async = true
    script.onload = () =>
      scope.puter ? resolve(scope.puter) : reject(new PuterChatError('Puter no terminó de cargar.'))
    script.onerror = () => {
      loading = null
      reject(
        new PuterChatError(
          'No se pudo cargar Puter. Revisá tu conexión o si un bloqueador de anuncios lo está frenando.'
        )
      )
    }
    document.head.appendChild(script)
  })
  return loading
}

export interface PuterTurnOptions {
  puter: PuterLike
  /** Candidate models, best first; unavailable ones are dropped in place. */
  models: string[]
  /** The conversation so far (empty on the first turn). */
  messages: OpenAiMessage[]
  userText: string
  system: string
  tools: OpenAiTool[]
  callTool: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ text: string; isError: boolean }>
  onStatus?: (status: string) => void
  maxRounds?: number
}

export interface PuterTurnResult {
  messages: OpenAiMessage[]
  text: string
  model: string
  tools: string[]
}

/**
 * Gemini 3 rejects a function call sent back without its thought signature (HTTP 400). Puter's API
 * turns OpenAI `tool_calls` into its own `tool_use` blocks copying only id, name and arguments
 * (`normalize_single_message` in its Messages.js), so a signature in `tool_calls[].extra_content`
 * never reaches Google — and the arguments string gets JSON-encoded a second time on the way out.
 * Puter keeps a block's own `extra_content` and serialises an object `input` once, so assistant
 * turns go in THAT shape. When the signature did not come back (it does not, through puter.js),
 * the first call of the batch carries the placeholder Google documents for this case. Reproduced
 * and verified by running Puter's two transformations in front of Google's endpoint.
 */
export const PLACEHOLDER_SIGNATURE = 'skip_thought_signature_validator'

export function prepareForModel(conversation: OpenAiMessage[], model: string): OpenAiMessage[] {
  const gemini = /gemini/i.test(model)
  return conversation.map(message => {
    if (message.role !== 'assistant' || !message.tool_calls?.length) return message
    const text = messageText(message)
    const blocks: OpenAiContentBlock[] = message.tool_calls.map((call, index) => {
      const signature =
        call.extra_content?.google?.thought_signature ??
        (index === 0 ? PLACEHOLDER_SIGNATURE : undefined)
      return {
        type: 'tool_use',
        id: call.id,
        name: call.function?.name ?? '',
        input: parseArgs(call.function?.arguments ?? ''),
        ...(gemini && signature
          ? { extra_content: { google: { thought_signature: signature } } }
          : {}),
      }
    })
    return { role: 'assistant', content: [...(text ? [{ type: 'text', text }] : []), ...blocks] }
  })
}

async function chat(opts: PuterTurnOptions, conversation: OpenAiMessage[], allowTools: boolean) {
  while (opts.models.length) {
    const model = opts.models[0]!
    try {
      const response = await opts.puter.ai.chat(prepareForModel(conversation, model), false, {
        model,
        ...(allowTools ? { tools: opts.tools } : {}),
      })
      return { message: response?.message, model }
    } catch (error) {
      // Puter explains which providers it tried and why; keep it in the console for diagnosis.
      const detail = error as { attempts?: unknown; fields?: { attempts?: unknown } }
      console.warn(
        '[asistente] Puter',
        model,
        JSON.stringify(detail?.attempts ?? detail?.fields?.attempts ?? error)?.slice(0, 3000)
      )
      const failure = error instanceof PuterChatError ? error : puterError(error)
      if (!failure.modelUnavailable || opts.models.length === 1) throw failure
      opts.models.shift()
    }
  }
  throw new PuterChatError('No hay un modelo disponible en Puter en este momento.')
}

const parseArgs = (raw: string): Record<string, unknown> => {
  try {
    const value = JSON.parse(raw || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

/** One user message with Puter: the same tool loop as runChatTurn, in OpenAI message format. */
export async function runPuterTurn(opts: PuterTurnOptions): Promise<PuterTurnResult> {
  const conversation: OpenAiMessage[] = opts.messages.length
    ? [...opts.messages]
    : [{ role: 'system', content: opts.system }]
  conversation.push({ role: 'user', content: opts.userText })
  const tools: string[] = []
  const maxRounds = opts.maxRounds ?? MAX_TOOL_ROUNDS
  for (let round = 0; round <= maxRounds; round++) {
    opts.onStatus?.(round === 0 ? 'Pensando' : 'Leyendo los resultados')
    const { message, model } = await chat(opts, conversation, round < maxRounds)
    if (!message)
      throw new PuterChatError('La IA no devolvió respuesta. Probá reformular el pedido.')
    const calls = message.tool_calls ?? []
    if (calls.length && round === maxRounds)
      return {
        messages: conversation,
        text: messageText(message) || ROUND_LIMIT_TEXT,
        model,
        tools,
      }
    conversation.push({
      role: 'assistant',
      content: messageText(message) || null,
      ...(calls.length ? { tool_calls: calls } : {}),
    })
    if (!calls.length) return { messages: conversation, text: messageText(message), model, tools }
    for (const call of calls) {
      const name = call.function?.name ?? ''
      tools.push(name)
      opts.onStatus?.(TOOL_STATUS[name] ?? `Consultando ${name}`)
      let result: { text: string; isError: boolean }
      try {
        result = await opts.callTool(name, parseArgs(call.function?.arguments))
      } catch (error) {
        result = { text: error instanceof Error ? error.message : String(error), isError: true }
      }
      conversation.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result.isError ? `Error: ${result.text}` : result.text,
      })
    }
  }
  return { messages: conversation, text: ROUND_LIMIT_TEXT, model: opts.models[0] ?? '', tools }
}
