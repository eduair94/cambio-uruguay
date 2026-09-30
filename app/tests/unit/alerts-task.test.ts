import { describe, it, expect, vi } from 'vitest'
import { runAlertsCheck } from '../../server/utils/alertRunner'

function makeDeps(over: Partial<any> = {}) {
  return {
    loadActiveAlerts: vi.fn().mockResolvedValue([]),
    fetchRates: vi.fn().mockResolvedValue([]),
    bestRate: vi.fn().mockReturnValue(41.5),
    getUserContacts: vi
      .fn()
      .mockResolvedValue({ email: 'a@b.com', fcmTokens: ['t1'], telegramChatId: null }),
    persistAlert: vi.fn().mockResolvedValue(undefined),
    claimAlert: vi.fn().mockResolvedValue(true),
    pruneTokens: vi.fn().mockResolvedValue(undefined),
    push: vi.fn().mockResolvedValue([]),
    email: vi.fn().mockResolvedValue(undefined),
    telegram: vi.fn().mockResolvedValue(true),
    now: 1_000_000_000_000,
    ...over,
  }
}

describe('runAlertsCheck', () => {
  it('fires push + email for a met, armed alert and disarms it', async () => {
    const alert = {
      _id: 'a1',
      uid: 'u1',
      currency: 'USD',
      kind: 'bestBuy',
      op: '>=',
      target: 41,
      origin: 'any',
      armed: true,
      lastFiredAt: null,
      channels: { push: true, email: true },
    }
    const deps = makeDeps({ loadActiveAlerts: vi.fn().mockResolvedValue([alert]) })
    const res = await runAlertsCheck(deps as any)
    expect(deps.push).toHaveBeenCalledWith(['t1'], expect.any(String), expect.any(String))
    expect(deps.email).toHaveBeenCalledWith('a@b.com', expect.any(String), expect.any(String))
    // Se desarma ANTES de enviar (reclamo atómico), no después.
    expect(deps.claimAlert).toHaveBeenCalledWith('a1', expect.any(Date))
    expect(res).toEqual({ checked: 1, fired: 1 })
  })

  it('re-arms without firing when condition is unmet', async () => {
    const alert = {
      _id: 'a2',
      uid: 'u1',
      currency: 'USD',
      kind: 'bestBuy',
      op: '>=',
      target: 41,
      origin: 'any',
      armed: false,
      lastFiredAt: new Date(0),
      channels: { push: true, email: false },
    }
    const deps = makeDeps({
      loadActiveAlerts: vi.fn().mockResolvedValue([alert]),
      bestRate: vi.fn().mockReturnValue(40.0),
    })
    const res = await runAlertsCheck(deps as any)
    expect(deps.push).not.toHaveBeenCalled()
    expect(deps.persistAlert).toHaveBeenCalledWith('a2', { armed: true })
    expect(res).toEqual({ checked: 1, fired: 0 })
  })

  it('prunes invalid tokens returned by push', async () => {
    const alert = {
      _id: 'a3',
      uid: 'u1',
      currency: 'USD',
      kind: 'bestBuy',
      op: '>=',
      target: 41,
      origin: 'any',
      armed: true,
      lastFiredAt: null,
      channels: { push: true, email: false },
    }
    const deps = makeDeps({
      loadActiveAlerts: vi.fn().mockResolvedValue([alert]),
      push: vi.fn().mockResolvedValue(['t1']),
    })
    await runAlertsCheck(deps as any)
    expect(deps.pruneTokens).toHaveBeenCalledWith('u1', ['t1'])
  })

  it('fires a Telegram message when channels.telegram + telegramChatId', async () => {
    const alert = {
      _id: 'a4',
      uid: 'u1',
      currency: 'USD',
      kind: 'bestBuy',
      op: '>=',
      target: 41,
      origin: 'any',
      armed: true,
      lastFiredAt: null,
      channels: { push: false, email: false, telegram: true },
    }
    const telegram = vi.fn().mockResolvedValue(true)
    const deps = makeDeps({
      loadActiveAlerts: vi.fn().mockResolvedValue([alert]),
      getUserContacts: vi
        .fn()
        .mockResolvedValue({ email: null, fcmTokens: [], telegramChatId: '77' }),
      telegram,
    })
    await runAlertsCheck(deps as any)
    expect(telegram).toHaveBeenCalledWith('77', expect.any(String))
  })
})

describe('runAlertsCheck: una sola vez y sin cortes', () => {
  const alert = (id: string, over: Record<string, unknown> = {}) => ({
    _id: id,
    uid: 'u1',
    currency: 'USD',
    kind: 'bestBuy',
    op: '>=',
    target: 41,
    origin: 'any',
    armed: true,
    lastFiredAt: null,
    channels: { push: true, email: true, telegram: true },
    ...over,
  })

  it('las dos instancias del cluster corren a la vez y la alerta sale una sola vez', async () => {
    const claimed = new Set<string>()
    const claimAlert = vi.fn(async (id: string) => {
      if (claimed.has(id)) return false
      claimed.add(id)
      return true
    })
    const push = vi.fn().mockResolvedValue([])
    const deps = () =>
      makeDeps({ loadActiveAlerts: vi.fn().mockResolvedValue([alert('a1')]), claimAlert, push })
    const [a, b] = await Promise.all([runAlertsCheck(deps() as any), runAlertsCheck(deps() as any)])
    expect(push).toHaveBeenCalledTimes(1)
    expect(a.fired + b.fired).toBe(1)
  })

  it('un correo que falla no corta los otros canales ni las otras alertas', async () => {
    const email = vi.fn().mockRejectedValue(new Error('smtp caído'))
    const telegram = vi.fn().mockResolvedValue(true)
    const deps = makeDeps({
      loadActiveAlerts: vi.fn().mockResolvedValue([alert('a1'), alert('a2')]),
      getUserContacts: vi
        .fn()
        .mockResolvedValue({ email: 'a@b.com', fcmTokens: [], telegramChatId: '99' }),
      email,
      telegram,
    })
    const res = await runAlertsCheck(deps as any)
    expect(res.fired).toBe(2)
    expect(telegram).toHaveBeenCalledTimes(2)
    expect(deps.claimAlert).toHaveBeenCalledTimes(2)
  })

  it('el texto de Telegram escapa el guión bajo de las casas (Markdown)', async () => {
    const telegram = vi.fn().mockResolvedValue(true)
    const deps = makeDeps({
      loadActiveAlerts: vi.fn().mockResolvedValue([alert('a1', { origin: 'la_favorita' })]),
      getUserContacts: vi
        .fn()
        .mockResolvedValue({ email: null, fcmTokens: [], telegramChatId: '99' }),
      telegram,
    })
    await runAlertsCheck(deps as any)
    expect(telegram.mock.calls[0][1]).toContain('la\\_favorita')
  })
})
