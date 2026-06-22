import { describe, it, expect } from 'vitest'
;(globalThis as any).useRuntimeConfig = () => ({ telegram: { secret: 's3cret' } })
const { requireBotSecret } = await import('../../server/utils/telegramAuth')

function ev(secret?: string) {
  return { node: { req: { headers: secret ? { 'x-telegram-secret': secret } : {} } } } as any
}

describe('requireBotSecret', () => {
  it('rejects a missing/wrong secret', () => {
    expect(() => requireBotSecret(ev())).toThrow()
    expect(() => requireBotSecret(ev('nope'))).toThrow()
  })
  it('passes with the right secret', () => {
    expect(() => requireBotSecret(ev('s3cret'))).not.toThrow()
  })
})
