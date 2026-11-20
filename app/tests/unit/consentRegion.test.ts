import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

// GET /api/consent-region: whether an undecided visitor waits for "Aceptar" before Microsoft
// Clarity loads. The answer is per visitor, so it must never be cached by Cloudflare or the browser.
const headers = new Map<string, string>()
const setResponseHeaders = vi.fn()
installNitroGlobals()
vi.stubGlobal('setResponseHeaders', setResponseHeaders)
vi.stubGlobal('getRequestHeader', (_event: unknown, name: string) => headers.get(name))

const handler = (await import('../../server/api/consent-region.get')).default as (
  event: unknown
) => { strict: boolean }

function ask(country?: string) {
  headers.clear()
  if (country !== undefined) headers.set('cf-ipcountry', country)
  return handler({})
}

describe('/api/consent-region', () => {
  beforeEach(() => setResponseHeaders.mockReset())

  it('is strict in the EEA (DE) and not in Uruguay (UY)', () => {
    expect(ask('DE')).toEqual({ strict: true })
    expect(ask('UY')).toEqual({ strict: false })
  })

  it('is strict when the country cannot be told: no header, XX or Tor', () => {
    expect(ask()).toEqual({ strict: true })
    expect(ask('XX')).toEqual({ strict: true })
    expect(ask('T1')).toEqual({ strict: true })
  })

  it('always answers private, no-store', () => {
    for (const country of ['DE', 'UY', undefined]) {
      setResponseHeaders.mockReset()
      ask(country)
      expect(setResponseHeaders).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ 'cache-control': 'private, no-store' })
      )
    }
  })
})
