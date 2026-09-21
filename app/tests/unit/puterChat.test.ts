import { describe, expect, it, vi } from 'vitest'
import { ROUND_LIMIT_TEXT } from '../../utils/geminiChat'
import {
  messageText,
  puterError,
  runPuterTurn,
  toOpenAiTools,
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
