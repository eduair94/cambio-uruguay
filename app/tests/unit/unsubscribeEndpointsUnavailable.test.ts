import { beforeEach, describe, expect, it, vi } from 'vitest'

// Review, 2026-11-08: when Mongo failed while an unsubscribe link was open, the handler threw
// before setting its CSP. Nitro then logged the URL (token included) and Nuxt rendered its full
// error page at that address, where GA starts and sends the address bar. Both endpoints now set
// their headers first and answer a self-contained 503 page instead of throwing.
const TOKEN = 'ab'.repeat(32)
const mocks = vi.hoisted(() => ({
  rateInfo: vi.fn(),
  rateUnsubscribe: vi.fn(),
  rentalFindOne: vi.fn(),
  headers: {} as Record<string, string>,
  status: 200,
  cspWhenFirstRead: null as string | null | undefined,
}))
vi.mock('../../server/utils/rateAlertUnsubscribe', () => ({
  validRateAlertUnsubscribeToken: (t: unknown) => typeof t === 'string' && /^[a-f\d]{64}$/.test(t),
  rateAlertUnsubscribeInfo: mocks.rateInfo,
  unsubscribeRateAlertEmail: mocks.rateUnsubscribe,
}))
vi.mock('../../server/models/RentalAlert', () => ({
  RentalAlertModel: { findOne: mocks.rentalFindOne, updateOne: vi.fn() },
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../server/utils/rentalAlertLease', () => ({ withRentalAlertLease: vi.fn() }))

let query: Record<string, unknown> = {}
vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('createError', (e: { statusCode: number; statusMessage: string }) =>
  Object.assign(new Error(e.statusMessage), e)
)
vi.stubGlobal('getQuery', () => query)
vi.stubGlobal('setResponseHeader', (_e: unknown, name: string, value: string) => {
  mocks.headers[name.toLowerCase()] = value
})
vi.stubGlobal('setResponseStatus', (_e: unknown, code: number) => {
  mocks.status = code
})

const rate = (await import('../../server/api/alerts/unsubscribe')).default as (
  e: unknown
) => Promise<string>
const rental = (await import('../../server/api/rental-alerts/unsubscribe')).default as (
  e: unknown
) => Promise<string>

const failing = () => {
  mocks.cspWhenFirstRead = mocks.headers['content-security-policy']
  throw new Error('MongoServerSelectionError: connection refused')
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.headers = {}
  mocks.status = 200
  mocks.cspWhenFirstRead = undefined
  query = { token: TOKEN }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('unsubscribe endpoints when the database is down', () => {
  it.each(['GET', 'POST'])(
    'rate alerts: %s answers its own 503 page, CSP set first',
    async method => {
      mocks.rateInfo.mockImplementation(async () => failing())
      const page = await rate({ method })
      expect(mocks.status).toBe(503)
      expect(mocks.cspWhenFirstRead).toContain("default-src 'none'")
      expect(mocks.headers['content-type']).toContain('text/html')
      expect(page).toContain('No pudimos procesar el enlace')
      expect(page).not.toContain('method="post"')
      expect(mocks.rateUnsubscribe).not.toHaveBeenCalled()
      // The log line says what failed, never the address (which carries the token).
      expect(JSON.stringify((console.error as any).mock.calls)).not.toContain(TOKEN)
    }
  )

  it('rate alerts: a failed POST does not claim it unsubscribed', async () => {
    mocks.rateInfo.mockResolvedValue({ _id: 'a', uid: 'u', channels: { email: true } })
    mocks.rateUnsubscribe.mockImplementation(async () => failing())
    const page = await rate({ method: 'POST' })
    expect(mocks.status).toBe(503)
    expect(page).not.toContain('Correos cancelados')
  })

  it('rental alerts: GET answers its own 503 page, CSP set first', async () => {
    mocks.rentalFindOne.mockImplementation(() => ({
      select: () => ({ lean: async () => failing() }),
    }))
    const page = await rental({ method: 'GET' })
    expect(mocks.status).toBe(503)
    expect(mocks.cspWhenFirstRead).toContain("default-src 'none'")
    expect(page).toContain('No pudimos procesar el enlace')
  })

  it('the normal paths are unchanged', async () => {
    mocks.rateInfo.mockResolvedValue({ _id: 'a', uid: 'u', channels: { email: true } })
    expect(await rate({ method: 'GET' })).toContain(
      `action="/api/alerts/unsubscribe?token=${TOKEN}"`
    )
    expect(mocks.status).toBe(200)
    mocks.rateInfo.mockResolvedValue(null)
    await rate({ method: 'GET' })
    expect(mocks.status).toBe(404)
  })

  // With the strict CSP now set first, a thrown 400 rendered Nuxt's error page without its
  // stylesheets or scripts (review, 2026-11-08): a mangled link gets the endpoint's own page.
  it.each([
    ['rate alerts', () => rate],
    ['rental alerts', () => rental],
  ])('%s: a mangled link answers its own 400 page', async (_name, handler) => {
    query = { token: TOKEN.slice(1) }
    const page = await handler()({ method: 'GET' })
    expect(mocks.status).toBe(400)
    expect(mocks.headers['content-security-policy']).toContain("default-src 'none'")
    expect(page).toContain('Este enlace ya no está disponible')
    expect(page).not.toContain('method="post"')
    expect(mocks.rateInfo).not.toHaveBeenCalled()
    expect(mocks.rentalFindOne).not.toHaveBeenCalled()
  })

  // The page says what is known: before the write nothing changed; once the write was attempted
  // (and in rentals the lease is released after it), whether it went through is not known.
  it('says nothing changed when the failure came before any write', async () => {
    mocks.rateInfo.mockImplementation(async () => failing())
    expect(await rate({ method: 'GET' })).toContain('no se cambió nada')
    expect(await rate({ method: 'POST' })).toContain('no se cambió nada')
  })

  it('says it does not know once the write was attempted', async () => {
    mocks.rateInfo.mockResolvedValue({ _id: 'a', uid: 'u', channels: { email: true } })
    mocks.rateUnsubscribe.mockImplementation(async () => failing())
    const page = await rate({ method: 'POST' })
    expect(page).toContain('No sabemos si se llegó a aplicar')
    expect(page).not.toContain('no se cambió nada')
  })
})
