// The /asistente-ia chat: Gemini runs in the visitor's browser with THEIR free API key,
// and the tools come from our MCP server. Nothing here touches our backend: the key goes
// only to generativelanguage.googleapis.com, tool calls go to mcp.cambio-uruguay.com.
// Pure functions over an injected fetch, so the loop is testable without a network.

export const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta'
// Only the search toolsets: every declaration is resent on each model call and the visitor pays those
// tokens from their own free quota, so the 7 exchange-rate tools stay out.
export const CHAT_MCP_URL = 'https://mcp.cambio-uruguay.com/mcp?toolsets=alquileres,autos,productos'
export const GEMINI_KEY_STORAGE = 'cu_gemini_key'
export const MAX_TOOL_ROUNDS = 8

/** Said instead of failing when the model is still calling tools at the round limit. */
export const ROUND_LIMIT_TEXT =
  'Hice varias búsquedas y no llegué a cerrar una respuesta. Probá con un pedido más concreto: un barrio, una dirección con número de puerta o un presupuesto.'

type Fetch = typeof fetch

export interface GeminiPart {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string }
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string }
}
export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}
export interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}
export interface FunctionDeclaration {
  name: string
  description: string
  parametersJsonSchema: Record<string, unknown>
}

/** Plain JSON or a Streamable-HTTP SSE body → the JSON-RPC message it carries. */
export function parseRpcBody(text: string): { result?: unknown; error?: { message?: string } } {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const data = trimmed
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
    .filter(Boolean)
  if (!data.length) throw new Error('Respuesta vacía del buscador')
  return JSON.parse(data[data.length - 1]!)
}

export function createMcpClient(fetchImpl: Fetch, url = CHAT_MCP_URL) {
  let id = 0
  async function rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    })
    if (!res.ok) throw new Error(`El buscador de cambio-uruguay.com respondió ${res.status}`)
    const message = parseRpcBody(await res.text())
    if (message.error) throw new Error(message.error.message || 'Error del buscador')
    return message.result as T
  }
  return {
    async initialize(): Promise<{ instructions: string }> {
      const result = await rpc<{ instructions?: string }>('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'cambio-uruguay-asistente', version: '1.0.0' },
      })
      return { instructions: result?.instructions ?? '' }
    },
    async listTools(): Promise<McpTool[]> {
      return (await rpc<{ tools?: McpTool[] }>('tools/list')).tools ?? []
    },
    async callTool(
      name: string,
      args: Record<string, unknown>
    ): Promise<{ text: string; isError: boolean }> {
      const result = await rpc<{
        content?: Array<{ type: string; text?: string }>
        isError?: boolean
      }>('tools/call', {
        name,
        arguments: args,
      })
      const text = (result?.content ?? [])
        .map(part => part.text ?? '')
        .join('\n')
        .trim()
      return { text: text || '(sin resultados)', isError: !!result?.isError }
    },
  }
}
export type McpClient = ReturnType<typeof createMcpClient>

/** MCP tools → Gemini function declarations (JSON Schema, minus the `$schema` marker). */
export function toFunctionDeclarations(tools: McpTool[]): FunctionDeclaration[] {
  return tools.map(tool => {
    const { $schema: _schema, ...schema } = (tool.inputSchema ?? {}) as Record<string, unknown>
    return {
      name: tool.name,
      description: (tool.description ?? tool.name).slice(0, 2000),
      parametersJsonSchema: schema.type ? schema : { type: 'object', properties: {} },
    }
  })
}

const version = (name: string) => Number(/gemini-(\d+(?:\.\d+)?)-flash/.exec(name)?.[1] ?? 0)

/**
 * Which models to try, best first. Model ids come and go (gemini-2.5-flash stopped being offered to
 * new keys mid-2026), so the rolling alias leads and the list of THIS key fills the rest: newest
 * stable Flash, then Flash-Lite. Pro is left out: the free tier does not include it.
 */
export function pickModels(available: string[]): string[] {
  const names = available.map(name => name.replace(/^models\//, ''))
  const stable = (lite: boolean) =>
    names
      .filter(n => /^gemini-\d+(?:\.\d+)?-flash(?:-lite)?$/.test(n) && n.endsWith('-lite') === lite)
      .sort((a, b) => version(b) - version(a))
  const ordered = [
    'gemini-flash-latest',
    ...stable(false),
    'gemini-flash-lite-latest',
    ...stable(true),
  ]
  return [...new Set(ordered)].filter(n => names.includes(n))
}

/** An HTTP failure of the Gemini API, phrased for the person using the chat. */
export class GeminiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly modelUnavailable = false
  ) {
    super(message)
  }
}

export function geminiError(status: number, body: string): GeminiError {
  const text = body.toLowerCase()
  if (text.includes('api_key_invalid') || text.includes('api key not valid'))
    return new GeminiError(
      status,
      'La clave de Gemini no es válida. Revisala o creá una nueva en Google AI Studio.'
    )
  if (status === 429)
    return new GeminiError(
      status,
      'Llegaste al límite gratuito de Gemini (por minuto o por día). Esperá un minuto y volvé a intentar; si es el límite diario, mañana se renueva.'
    )
  if (
    status === 404 ||
    (status === 400 && /not found|not supported|no longer available/.test(text))
  )
    return new GeminiError(status, 'Ese modelo de Gemini no está disponible para tu clave.', true)
  if (status === 403)
    return new GeminiError(
      status,
      'Google rechazó la clave para este uso (permisos o región). Probá con una clave nueva de AI Studio.'
    )
  if (status >= 500)
    return new GeminiError(
      status,
      'Gemini está con problemas en este momento; probá en unos minutos.'
    )
  return new GeminiError(status, `Gemini respondió un error (${status}).`)
}

/** The model ids a key can use for chat, best first. Also validates the key. */
export async function listGeminiModels(fetchImpl: Fetch, apiKey: string): Promise<string[]> {
  const res = await fetchImpl(`${GEMINI_API}/models?pageSize=200`, {
    headers: { 'x-goog-api-key': apiKey },
  })
  const body = await res.text()
  if (!res.ok) throw geminiError(res.status, body)
  const models = (JSON.parse(body).models ?? []) as Array<{
    name: string
    supportedGenerationMethods?: string[]
  }>
  return pickModels(
    models.filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name)
  )
}

export const TOOL_STATUS: Record<string, string> = {
  search_rentals: 'Buscando alquileres',
  rank_rentals_for_household: 'Rankeando alquileres para tu hogar (puede tardar hasta un minuto)',
  get_rental: 'Abriendo la ficha del alquiler',
  rental_market_stats: 'Mirando precios del mercado de alquiler',
  estimate_fair_rent: 'Tasando el alquiler',
  compare_neighborhoods: 'Comparando barrios',
  find_property_opportunities: 'Buscando oportunidades',
  geocode_uy_address: 'Ubicando la dirección',
  search_used_cars: 'Buscando autos',
  find_car_opportunities: 'Buscando oportunidades de autos',
  get_car: 'Abriendo la ficha del auto',
  car_model_prices: 'Mirando precios del modelo',
  car_declared_risks: 'Revisando riesgos declarados',
  car_market_report: 'Consultando el informe del mercado de autos',
  search_products: 'Buscando productos',
  plan_home_setup: 'Armando la canasta para equipar la casa',
  check_online_store: 'Revisando la tienda',
  supermarket_prices: 'Mirando precios de supermercado',
}

export const CHAT_INSTRUCTIONS = [
  'Sos el asistente de búsqueda de cambio-uruguay.com. Ayudás a encontrar alquiler, auto usado o productos en Uruguay usando SOLAMENTE las herramientas disponibles.',
  'Respondé en español rioplatense, claro y breve, en markdown. Links siempre como [texto](url): el aviso original y la ficha del sitio.',
  'Si faltan datos para buscar bien, preguntá todo lo que falte en UN solo mensaje; si alcanza, buscá sin preguntar.',
  'Nunca inventes avisos, precios, teléfonos ni disponibilidad. Si una herramienta falla, decilo y sugerí otra forma.',
].join('\n')

export interface ChatTurnOptions {
  fetch: Fetch
  apiKey: string
  /** Candidate model ids, best first (see pickModels). Unavailable ones are dropped in place. */
  models: string[]
  history: GeminiContent[]
  userText: string
  systemInstruction: string
  declarations: FunctionDeclaration[]
  callTool: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ text: string; isError: boolean }>
  onStatus?: (status: string) => void
  maxRounds?: number
}

export interface ChatTurnResult {
  history: GeminiContent[]
  text: string
  model: string
  tools: string[]
}

interface GenerateResponse {
  candidates?: Array<{ content?: GeminiContent; finishReason?: string }>
  promptFeedback?: { blockReason?: string }
}

async function generate(
  opts: ChatTurnOptions,
  contents: GeminiContent[],
  allowTools: boolean
): Promise<{ response: GenerateResponse; model: string }> {
  while (opts.models.length) {
    const model = opts.models[0]!
    // Called without a receiver: window.fetch invoked as opts.fetch() throws "Illegal invocation".
    const doFetch = opts.fetch
    const res = await doFetch(`${GEMINI_API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemInstruction }] },
        contents,
        tools: [{ functionDeclarations: opts.declarations }],
        toolConfig: { functionCallingConfig: { mode: allowTools ? 'AUTO' : 'NONE' } },
      }),
    })
    const body = await res.text()
    if (res.ok) return { response: JSON.parse(body) as GenerateResponse, model }
    const error = geminiError(res.status, body)
    if (!error.modelUnavailable || opts.models.length === 1) throw error
    opts.models.shift()
  }
  throw new GeminiError(404, 'No hay un modelo de Gemini disponible para tu clave.')
}

/**
 * One user message: call Gemini, run every function call it asks for against the MCP, feed the
 * results back, repeat until it answers in text. The model turn is stored exactly as returned
 * (thinking models attach a thoughtSignature that must travel back unchanged).
 */
export async function runChatTurn(opts: ChatTurnOptions): Promise<ChatTurnResult> {
  const contents: GeminiContent[] = [
    ...opts.history,
    { role: 'user', parts: [{ text: opts.userText }] },
  ]
  const tools: string[] = []
  const maxRounds = opts.maxRounds ?? MAX_TOOL_ROUNDS
  for (let round = 0; round <= maxRounds; round++) {
    opts.onStatus?.(round === 0 ? 'Pensando' : 'Leyendo los resultados')
    const { response, model } = await generate(opts, contents, round < maxRounds)
    const content = response.candidates?.[0]?.content
    if (!content?.parts?.length) {
      const reason = response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason
      throw new GeminiError(
        400,
        `Gemini no devolvió respuesta${reason ? ` (${reason})` : ''}. Probá reformular el pedido.`
      )
    }
    contents.push({ role: 'model', parts: content.parts })
    const calls = content.parts.filter(part => part.functionCall)
    if (calls.length && round === maxRounds) {
      // A function call left without its response would poison the next turn: drop it.
      contents.pop()
      const said = content.parts
        .filter(part => part.text && !part.thought)
        .map(part => part.text)
        .join('')
        .trim()
      return { history: contents, text: said || ROUND_LIMIT_TEXT, model, tools }
    }
    if (!calls.length) {
      const text = content.parts
        .filter(part => part.text && !part.thought)
        .map(part => part.text)
        .join('')
        .trim()
      return { history: contents, text, model, tools }
    }
    const responses: GeminiPart[] = []
    for (const part of calls) {
      const call = part.functionCall!
      tools.push(call.name)
      opts.onStatus?.(TOOL_STATUS[call.name] ?? `Consultando ${call.name}`)
      let result: { text: string; isError: boolean }
      try {
        result = await opts.callTool(call.name, call.args ?? {})
      } catch (error) {
        result = { text: error instanceof Error ? error.message : String(error), isError: true }
      }
      responses.push({
        functionResponse: {
          name: call.name,
          ...(call.id ? { id: call.id } : {}),
          response: result.isError ? { error: result.text } : { output: result.text },
        },
      })
    }
    contents.push({ role: 'user', parts: responses })
  }
  throw new GeminiError(500, 'La búsqueda dio demasiadas vueltas; probá un pedido más concreto.')
}
