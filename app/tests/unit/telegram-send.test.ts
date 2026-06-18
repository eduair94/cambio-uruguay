import { describe, it, expect, vi, beforeEach } from 'vitest'

const cfg = { telegram: { token: 'T', secret: 's', username: 'b' } }
;(globalThis as any).useRuntimeConfig = () => cfg
const { sendTelegram } = await import('../../server/utils/telegram')

beforeEach(() => {
  cfg.telegram.token = 'T'
})

describe('sendTelegram', () => {
  it('returns false when the token is missing', async () => {
    cfg.telegram.token = ''
    const ok = await sendTelegram('123', 'hi', vi.fn())
    expect(ok).toBe(false)
  })

  it('posts to sendMessage and returns true on ok', async () => {
    const f = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) })
    const ok = await sendTelegram('123', 'hi', f as any)
    expect(ok).toBe(true)
    expect(f).toHaveBeenCalledWith(
      expect.stringContaining('/botT/sendMessage'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns false when Telegram responds not-ok', async () => {
    const f = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: false }) })
    expect(await sendTelegram('1', 'x', f as any)).toBe(false)
  })
})
