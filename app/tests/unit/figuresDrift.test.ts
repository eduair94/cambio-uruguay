import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UyFigures } from '../../server/utils/uyFiguresFallback'

class FakeStorage {
  data = new Map<string, unknown>()
  async getItem<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null
  }
  async setItem(key: string, value: unknown): Promise<void> {
    this.data.set(key, value)
  }
}

const fakeStorage = new FakeStorage()
const useStorage = vi.fn(() => fakeStorage)
vi.stubGlobal('useStorage', useStorage)

const cfg = { telegram: { adminChatId: '123' } }
const useRuntimeConfig = vi.fn(() => cfg)
vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)

const sendTelegram = vi.fn()
vi.mock('../../server/utils/telegram', () => ({
  sendTelegram: (...a: unknown[]) => sendTelegram(...a),
}))

function figures(over: Partial<UyFigures> = {}): UyFigures {
  return {
    salarioMinimo: 25383,
    bpc: 6864,
    boletoStm: 52,
    inflacionAnual: 4.3,
    asOf: new Date().toISOString(),
    updated: [],
    sources: [],
    ...over,
  }
}

beforeEach(() => {
  fakeStorage.data = new Map()
  sendTelegram.mockReset()
  sendTelegram.mockResolvedValue(true)
  cfg.telegram.adminChatId = '123'
})

afterEach(() => {
  vi.resetModules()
})

describe('checkFiguresDrift', () => {
  it('detects a >3% drift on a live-updated field and notifies the admin', async () => {
    const { checkFiguresDrift } = await import('../../server/utils/figuresDrift')
    const out = await checkFiguresDrift(figures({ salarioMinimo: 27000, updated: ['salarioMinimo'] }))
    expect(out.drift).toHaveLength(1)
    expect(out.notified).toBe(true)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('ignores a field that drifted but was not live-updated this cycle', async () => {
    const { checkFiguresDrift } = await import('../../server/utils/figuresDrift')
    const out = await checkFiguresDrift(figures({ salarioMinimo: 27000, updated: [] }))
    expect(out.drift).toEqual([])
    expect(out.notified).toBe(false)
    expect(sendTelegram).not.toHaveBeenCalled()
  })

  it('notifies the same distinct drift only once', async () => {
    const { checkFiguresDrift } = await import('../../server/utils/figuresDrift')
    const first = await checkFiguresDrift(figures({ salarioMinimo: 27000, updated: ['salarioMinimo'] }))
    expect(first.notified).toBe(true)

    const second = await checkFiguresDrift(figures({ salarioMinimo: 27000, updated: ['salarioMinimo'] }))
    expect(second.drift).toHaveLength(1) // still reported...
    expect(second.notified).toBe(false) // ...but not re-notified
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('re-notifies when the distinct drift changes', async () => {
    const { checkFiguresDrift } = await import('../../server/utils/figuresDrift')
    await checkFiguresDrift(figures({ salarioMinimo: 27000, updated: ['salarioMinimo'] }))
    const out = await checkFiguresDrift(
      figures({ salarioMinimo: 27000, bpc: 7500, updated: ['salarioMinimo', 'bpc'] })
    )
    expect(out.drift).toHaveLength(2)
    expect(out.notified).toBe(true)
    expect(sendTelegram).toHaveBeenCalledTimes(2)
  })

  it('does not notify without an admin chat id, but still reports the drift', async () => {
    cfg.telegram.adminChatId = ''
    const { checkFiguresDrift } = await import('../../server/utils/figuresDrift')
    const out = await checkFiguresDrift(figures({ salarioMinimo: 27000, updated: ['salarioMinimo'] }))
    expect(out.drift).toHaveLength(1)
    expect(out.notified).toBe(false)
    expect(sendTelegram).not.toHaveBeenCalled()
  })

  it('reports no drift when the live value is within tolerance', async () => {
    const { checkFiguresDrift } = await import('../../server/utils/figuresDrift')
    const out = await checkFiguresDrift(figures({ salarioMinimo: 25500, updated: ['salarioMinimo'] }))
    expect(out.drift).toEqual([])
    expect(out.notified).toBe(false)
  })
})
