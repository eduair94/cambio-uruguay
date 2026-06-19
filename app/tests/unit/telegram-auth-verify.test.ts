import { describe, it, expect } from 'vitest'
import { createHash, createHmac } from 'node:crypto'
import { verifyTelegramAuth, type TelegramAuthData } from '../../server/utils/telegramAuth'

const TOKEN = '123456:TEST_BOT_TOKEN_abcdef'

// Compute a valid Telegram widget hash the same way Telegram does, so the test
// is self-consistent without a live bot.
function sign(data: Record<string, unknown>, token: string): string {
  const dcs = Object.keys(data)
    .filter(k => k !== 'hash' && data[k] != null)
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n')
  const secret = createHash('sha256').update(token).digest()
  return createHmac('sha256', secret).update(dcs).digest('hex')
}

function validPayload(now = Math.floor(Date.now() / 1000)): TelegramAuthData {
  const base = {
    id: 4242,
    first_name: 'Ada',
    username: 'ada',
    auth_date: now,
  }
  return { ...base, hash: sign(base, TOKEN) }
}

describe('verifyTelegramAuth', () => {
  it('accepts a correctly signed, fresh payload', () => {
    expect(verifyTelegramAuth(validPayload(), TOKEN)).toBe(true)
  })

  it('rejects a tampered field (id changed after signing)', () => {
    const p = validPayload()
    p.id = 9999
    expect(verifyTelegramAuth(p, TOKEN)).toBe(false)
  })

  it('rejects a wrong/garbage hash', () => {
    const p = validPayload()
    p.hash = 'deadbeef'
    expect(verifyTelegramAuth(p, TOKEN)).toBe(false)
  })

  it('rejects a missing hash', () => {
    const p = validPayload() as any
    delete p.hash
    expect(verifyTelegramAuth(p, TOKEN)).toBe(false)
  })

  it('rejects a stale auth_date beyond maxAgeSeconds', () => {
    const old = Math.floor(Date.now() / 1000) - 100_000
    expect(verifyTelegramAuth(validPayload(old), TOKEN)).toBe(false)
  })

  it('accepts a stale auth_date when within an explicit larger window', () => {
    const old = Math.floor(Date.now() / 1000) - 100_000
    expect(verifyTelegramAuth(validPayload(old), TOKEN, 200_000)).toBe(true)
  })

  it('rejects when the bot token is empty', () => {
    expect(verifyTelegramAuth(validPayload(), '')).toBe(false)
  })

  it('is signed with a DIFFERENT token -> rejected', () => {
    expect(verifyTelegramAuth(validPayload(), 'other:token')).toBe(false)
  })
})
