import { describe, expect, it, vi } from 'vitest'
import { renderChatMarkdown } from '../../utils/chatMarkdown'
import {
  createMcpClient,
  geminiError,
  parseRpcBody,
  pickModels,
  runChatTurn,
  toFunctionDeclarations,
  type ChatTurnOptions,
} from '../../utils/geminiChat'

const json = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })

describe('MCP client', () => {
  it('reads SSE and plain JSON bodies', () => {
    expect(
      parseRpcBody('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":1}}\n\n')
    ).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { ok: 1 },
    })
    expect(parseRpcBody('{"result":2}')).toEqual({ result: 2 })
  })

  it('lists and calls tools over JSON-RPC', async () => {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const { method } = JSON.parse(String(init.body))
      if (method === 'tools/list')
        return json(
          200,
          `data: ${JSON.stringify({ result: { tools: [{ name: 'search_rentals' }] } })}`
        )
      return json(200, {
        result: { content: [{ type: 'text', text: '3 viviendas' }], isError: false },
      })
    })
    const mcp = createMcpClient(fetch as unknown as typeof globalThis.fetch, 'https://mcp.test/mcp')
    expect(await mcp.listTools()).toEqual([{ name: 'search_rentals' }])
    expect(await mcp.callTool('search_rentals', { bedrooms: 2 })).toEqual({
      text: '3 viviendas',
      isError: false,
    })
    const body = JSON.parse(String(fetch.mock.calls[1]![1].body))
    expect(body).toMatchObject({
      method: 'tools/call',
      params: { name: 'search_rentals', arguments: { bedrooms: 2 } },
    })
  })
})

describe('declarations and models', () => {
  it('turns MCP schemas into Gemini declarations', () => {
    const [decl, empty] = toFunctionDeclarations([
      {
        name: 'a',
        description: 'A',
        inputSchema: { $schema: 'x', type: 'object', properties: { q: { type: 'string' } } },
      },
      { name: 'b' },
    ])
    expect(decl).toEqual({
      name: 'a',
      description: 'A',
      parametersJsonSchema: { type: 'object', properties: { q: { type: 'string' } } },
    })
    expect(empty!.parametersJsonSchema).toEqual({ type: 'object', properties: {} })
  })

  it('prefers the rolling Flash alias, then the newest stable Flash, never Pro', () => {
    expect(
      pickModels([
        'models/gemini-2.5-flash',
        'models/gemini-3.8-flash',
        'models/gemini-flash-latest',
        'models/gemini-2.5-pro',
        'models/gemini-3.5-flash-lite',
        'models/gemini-3-flash-preview',
      ])
    ).toEqual([
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-3.5-flash-lite',
    ])
  })

  it('explains the free-tier limit and a bad key', () => {
    expect(geminiError(429, '').message).toContain('límite gratuito')
    expect(
      geminiError(400, '{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}').message
    ).toContain('no es válida')
    expect(geminiError(404, 'models/x is not found').modelUnavailable).toBe(true)
  })
})

function turnOptions(
  fetch: ReturnType<typeof vi.fn>,
  over: Partial<ChatTurnOptions> = {}
): ChatTurnOptions {
  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    apiKey: 'k',
    models: ['gemini-flash-latest', 'gemini-3.8-flash'],
    history: [],
    userText: 'Busco apto 2 dorm en Pocitos',
    systemInstruction: 'sys',
    declarations: [
      {
        name: 'search_rentals',
        description: 'd',
        parametersJsonSchema: { type: 'object', properties: {} },
      },
    ],
    callTool: async () => ({ text: '2 viviendas: ...', isError: false }),
    ...over,
  }
}

describe('runChatTurn', () => {
  it('runs the function call against the MCP and returns the final text', async () => {
    const callPart = {
      functionCall: { name: 'search_rentals', args: { bedrooms: 2 } },
      thoughtSignature: 'sig',
    }
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json(200, { candidates: [{ content: { role: 'model', parts: [callPart] } }] })
      )
      .mockResolvedValueOnce(
        json(200, {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: 'razonando', thought: true }, { text: 'Encontré **2**.' }],
              },
            },
          ],
        })
      )
    const callTool = vi.fn(async () => ({ text: '2 viviendas', isError: false }))
    const statuses: string[] = []
    const out = await runChatTurn(turnOptions(fetch, { callTool, onStatus: s => statuses.push(s) }))
    expect(callTool).toHaveBeenCalledWith('search_rentals', { bedrooms: 2 })
    expect(out.text).toBe('Encontré **2**.')
    expect(out.tools).toEqual(['search_rentals'])
    expect(statuses).toContain('Buscando alquileres')
    const second = JSON.parse(String(fetch.mock.calls[1]![1].body))
    expect(second.contents[1].parts[0].thoughtSignature).toBe('sig')
    expect(second.contents[2]).toEqual({
      role: 'user',
      parts: [
        { functionResponse: { name: 'search_rentals', response: { output: '2 viviendas' } } },
      ],
    })
    expect(fetch.mock.calls[0]![1].headers['x-goog-api-key']).toBe('k')
  })

  it('falls back to the next model when one is unavailable for the key', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(404, 'models/gemini-flash-latest is not found'))
      .mockResolvedValueOnce(
        json(200, { candidates: [{ content: { role: 'model', parts: [{ text: 'hola' }] } }] })
      )
    const models = ['gemini-flash-latest', 'gemini-3.8-flash']
    const out = await runChatTurn(turnOptions(fetch, { models }))
    expect(out.model).toBe('gemini-3.8-flash')
    expect(models).toEqual(['gemini-3.8-flash'])
    expect(String(fetch.mock.calls[1]![0])).toContain('gemini-3.8-flash:generateContent')
  })

  it('stops looping and forces a text answer after the round limit', async () => {
    const call = json(200, {
      candidates: [
        { content: { role: 'model', parts: [{ functionCall: { name: 'search_rentals' } }] } },
      ],
    })
    const fetch = vi.fn(async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body))
      return body.toolConfig.functionCallingConfig.mode === 'NONE'
        ? json(200, {
            candidates: [{ content: { role: 'model', parts: [{ text: 'con lo que tengo…' }] } }],
          })
        : call.clone()
    })
    const out = await runChatTurn(turnOptions(fetch, { maxRounds: 2 }))
    expect(out.text).toBe('con lo que tengo…')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('surfaces the free-tier limit', async () => {
    const fetch = vi.fn().mockResolvedValue(json(429, 'RESOURCE_EXHAUSTED'))
    await expect(runChatTurn(turnOptions(fetch))).rejects.toThrow(/límite gratuito/)
  })
})

describe('renderChatMarkdown', () => {
  it('renders links safely and drops raw HTML, images and script links', () => {
    const html = renderChatMarkdown(
      '## Hola\n[aviso](https://x.test/1?a="b) <script>alert(1)</script> <img src=x onerror=alert(1)> [mal](javascript:alert(1)) **2**'
    )
    expect(html).toContain('<h3>Hola</h3>')
    expect(html).toContain(
      '<a href="https://x.test/1?a=&quot;b" target="_blank" rel="noopener noreferrer nofollow">aviso</a>'
    )
    expect(html).toContain('<strong>2</strong>')
    expect(html).not.toMatch(/<script|<img|javascript:|onerror/)
  })
})

describe('browser fetch binding', () => {
  it('never calls fetch with the options object as `this`', async () => {
    const fetch = vi.fn(function (this: unknown) {
      if (this !== undefined) throw new TypeError('Illegal invocation')
      return Promise.resolve(
        json(200, { candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] } }] })
      )
    })
    const out = await runChatTurn(turnOptions(fetch))
    expect(out.text).toBe('ok')
  })
})
