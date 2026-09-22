import { describe, expect, it, vi } from 'vitest'
import { ROUND_LIMIT_TEXT } from '../../utils/geminiChat'
import {
  PLACEHOLDER_SIGNATURE,
  messageText,
  prepareForModel,
  puterError,
  runPuterTurn,
  toOpenAiTools,
  type OpenAiContentBlock,
  type OpenAiMessage,
  type PuterLike,
  type PuterTurnOptions,
} from '../../utils/puterChat'

function fakePuter(replies: Array<{ message?: OpenAiMessage } | Error>) {
  const seen: OpenAiMessage[][] = []
  const chat = vi.fn(async (...args: unknown[]) => {
    seen.push(structuredClone(args[0] as OpenAiMessage[]))
    const next = replies.shift()
    if (!next) throw new Error('no more replies')
    if (next instanceof Error) throw next
    return next
  })
  const puter = { auth: {} as PuterLike['auth'], ai: { chat } } as PuterLike
  return { puter, chat, seen }
}

const opts = (puter: PuterLike, over: Partial<PuterTurnOptions> = {}): PuterTurnOptions => ({
  puter,
  models: ['gemini-3.5-flash-lite', 'gpt-5-nano'],
  messages: [],
  userText: 'Busco auto automático hasta US$ 14.000',
  system: 'sys',
  tools: toOpenAiTools([
    { name: 'search_used_cars', inputSchema: { $schema: 'x', type: 'object', properties: {} } },
  ]),
  callTool: async () => ({ text: '3 autos', isError: false }),
  ...over,
})

describe('toOpenAiTools', () => {
  it('wraps MCP schemas as OpenAI functions', () => {
    expect(
      toOpenAiTools([
        {
          name: 'a',
          description: 'A',
          inputSchema: { $schema: 'x', type: 'object', properties: {} },
        },
      ])
    ).toEqual([
      {
        type: 'function',
        function: { name: 'a', description: 'A', parameters: { type: 'object', properties: {} } },
      },
    ])
  })
})

describe('runPuterTurn', () => {
  it('runs tool calls through the MCP and returns the final text', async () => {
    const { puter, chat, seen } = fakePuter([
      {
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'c1',
              type: 'function',
              function: { name: 'search_used_cars', arguments: '{"priceMaxUsd":14000}' },
            },
          ],
        },
      },
      { message: { role: 'assistant', content: [{ type: 'text', text: 'Encontré **3**.' }] } },
    ])
    const callTool = vi.fn(async () => ({ text: '3 autos', isError: false }))
    const out = await runPuterTurn(opts(puter, { callTool }))
    expect(callTool).toHaveBeenCalledWith('search_used_cars', { priceMaxUsd: 14000 })
    expect(out.text).toBe('Encontré **3**.')
    const [, testMode, options] = chat.mock.calls[1]! as [
      OpenAiMessage[],
      boolean,
      { model: string; tools?: unknown[] },
    ]
    const messages = seen[1]!
    expect(testMode).toBe(false)
    expect(options.model).toBe('gemini-3.5-flash-lite')
    expect(messages.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'tool'])
    expect(messages[3]).toEqual({ role: 'tool', tool_call_id: 'c1', content: '3 autos' })
  })

  it('moves to the next model when one is unavailable', async () => {
    const { puter, chat } = fakePuter([
      new Error('Model not found'),
      { message: { role: 'assistant', content: 'hola' } },
    ])
    const models = ['gemini-3.5-flash-lite', 'gpt-5-nano']
    const out = await runPuterTurn(opts(puter, { models }))
    expect(out.model).toBe('gpt-5-nano')
    expect((chat.mock.calls[1]![2] as { model: string }).model).toBe('gpt-5-nano')
  })

  it('stops at the round limit without leaving an unanswered tool call', async () => {
    const call = () => ({
      message: {
        role: 'assistant' as const,
        content: null,
        tool_calls: [{ id: 'x', function: { name: 'search_used_cars', arguments: '{}' } }],
      },
    })
    const { puter, chat } = fakePuter([call(), call(), call()])
    const out = await runPuterTurn(opts(puter, { maxRounds: 2 }))
    expect(out.text).toBe(ROUND_LIMIT_TEXT)
    expect(out.messages.at(-1)!.role).toBe('tool')
    expect((chat.mock.calls[2]![2] as { tools?: unknown }).tools).toBeUndefined()
  })

  it('explains an exhausted free allowance', async () => {
    const { puter } = fakePuter([
      Object.assign(new Error('insufficient_funds'), { code: 'insufficient_funds' }),
    ])
    await expect(runPuterTurn(opts(puter))).rejects.toThrow(/cupo gratuito de tu cuenta de Puter/)
  })
})

describe('helpers', () => {
  it('reads string or block content and maps session errors', () => {
    expect(messageText({ role: 'assistant', content: ' hola ' })).toBe('hola')
    expect(puterError({ error: { message: 'User not signed in' } }).message).toContain(
      'volver a entrar'
    )
  })
})

describe('Gemini thought signatures through Puter', () => {
  const withCall = (extra?: object): OpenAiMessage => ({
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'a',
        type: 'function',
        function: { name: 'x', arguments: '{"q":1}' },
        ...(extra ? { extra_content: extra } : {}),
      },
      { id: 'b', type: 'function', function: { name: 'y', arguments: '{}' } },
    ],
  })
  const blocks = (m: OpenAiMessage) => m.content as OpenAiContentBlock[]

  it('sends assistant tool turns as Puter tool_use blocks with an object input', () => {
    const [msg] = prepareForModel([withCall()], 'gemini-3.5-flash-lite')
    expect(msg!.tool_calls).toBeUndefined()
    expect(blocks(msg!)[0]).toMatchObject({ type: 'tool_use', id: 'a', name: 'x', input: { q: 1 } })
    expect(blocks(msg!)[0]!.extra_content).toEqual({
      google: { thought_signature: PLACEHOLDER_SIGNATURE },
    })
    expect(blocks(msg!)[1]!.extra_content).toBeUndefined()
  })

  it('keeps a real signature and leaves the field out for other vendors', () => {
    const real = { google: { thought_signature: 'sig' } }
    expect(
      blocks(prepareForModel([withCall(real)], 'gemini-3.8-flash')[0]!)[0]!.extra_content
    ).toEqual(real)
    expect(
      blocks(prepareForModel([withCall(real)], 'gpt-5-nano')[0]!)[0]!.extra_content
    ).toBeUndefined()
  })

  // Puter's own request path, ported from its source (Messages.js normalize_single_message, then
  // OpenAIUtil.js process_input_messages). Sending OpenAI tool_calls through it loses the signature
  // and double-encodes the arguments; that is what production hit as upstream_failed.
  function puterWire(message: OpenAiMessage): Record<string, unknown> {
    const m = structuredClone(message) as Record<string, any>
    if (!m.content && m.tool_calls) {
      m.content = m.tool_calls.map((c: any) => ({
        type: 'tool_use',
        id: c.id,
        name: c.function.name,
        input: c.function.arguments,
      }))
      delete m.tool_calls
    }
    const toolCalls = (m.content as any[])
      .filter(b => b.type === 'tool_use')
      .map(b => ({
        id: b.id,
        function: { name: b.name, arguments: JSON.stringify(b.input) },
        ...(b.extra_content ? { extra_content: b.extra_content } : {}),
      }))
    return { role: m.role, tool_calls: toolCalls }
  }

  it('survives Puter normalization: signature present and arguments encoded once', () => {
    const naive = puterWire(withCall({ google: { thought_signature: 'sig' } })) as any
    expect(naive.tool_calls[0].extra_content).toBeUndefined()
    expect(naive.tool_calls[0].function.arguments).toBe('"{\\"q\\":1}"')
    const [prepared] = prepareForModel(
      [withCall({ google: { thought_signature: 'sig' } })],
      'gemini-3.5-flash-lite'
    )
    const wire = puterWire(prepared!) as any
    expect(wire.tool_calls[0].extra_content).toEqual({ google: { thought_signature: 'sig' } })
    expect(wire.tool_calls[0].function.arguments).toBe('{"q":1}')
  })

  it('sends the tool results back with a signature, and retries another model on upstream_failed', async () => {
    const { puter, seen, chat } = fakePuter([
      {
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{ id: 'c1', function: { name: 'search_used_cars', arguments: '{}' } }],
        },
      },
      Object.assign(new Error('All AI providers failed'), { code: 'upstream_failed' }),
      { message: { role: 'assistant', content: 'listo' } },
    ])
    const out = await runPuterTurn(opts(puter, { models: ['gemini-3.5-flash-lite', 'gpt-5-nano'] }))
    expect(blocks(seen[1]![2]!)[0]!.extra_content).toEqual({
      google: { thought_signature: PLACEHOLDER_SIGNATURE },
    })
    expect((chat.mock.calls[2]![2] as { model: string }).model).toBe('gpt-5-nano')
    expect(blocks(seen[2]![2]!)[0]!.extra_content).toBeUndefined()
    expect(out.text).toBe('listo')
  })
})
