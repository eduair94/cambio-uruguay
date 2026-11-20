import { describe, expect, it, vi } from 'vitest'

// Every rate-alert email carries its alert's one-click unsubscribe: a visible link and the
// List-Unsubscribe / List-Unsubscribe-Post headers (sendMail adds them from listUnsubscribeUrl).
const TOKEN = 'ab'.repeat(32)
const mocks = vi.hoisted(() => ({
  deps: null as null | {
    email: (to: string, subject: string, text: string, alertId: string) => Promise<void>
  },
  sendMail: vi.fn(),
  token: vi.fn(),
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/Alert', () => ({ AlertModel: {} }))
vi.mock('../../server/models/User', () => ({ UserModel: {} }))
vi.mock('../../server/utils/rates', () => ({ fetchCurrentRates: vi.fn(), bestRateFor: vi.fn() }))
vi.mock('../../server/utils/push', () => ({ sendPush: vi.fn() }))
vi.mock('../../server/utils/mailer', () => ({ sendMail: mocks.sendMail }))
vi.mock('../../server/utils/telegram', () => ({ sendTelegram: vi.fn() }))
vi.mock('../../server/utils/firebaseAdmin', () => ({ adminAuth: () => ({}) }))
vi.mock('../../server/utils/rateAlertUnsubscribe', () => ({
  rateAlertUnsubscribeToken: mocks.token,
}))
vi.mock('../../server/utils/alertRunner', () => ({
  runAlertsCheck: async (deps: typeof mocks.deps) => {
    mocks.deps = deps
    return {}
  },
}))
vi.stubGlobal('defineTask', (task: unknown) => task)

async function email(text: string) {
  const { default: task } = await import('../../server/tasks/alerts/check')
  await (task as { run: () => Promise<unknown> }).run()
  mocks.sendMail.mockClear()
  await mocks.deps!.email('a@example.com', 'USD compra < 39', text, 'alert-1')
  return mocks.sendMail.mock.calls[0]![0] as {
    to: string
    text: string
    html: string
    listUnsubscribeUrl?: string
  }
}

describe('rate alert emails', () => {
  it('carry the alert one-click unsubscribe as a link and as headers', async () => {
    mocks.token.mockResolvedValue(TOKEN)
    const sent = await email('La compra de USD está en 38.9 (objetivo < 39).')
    const url = `https://cambio-uruguay.com/api/alerts/unsubscribe?token=${TOKEN}`
    expect(mocks.token).toHaveBeenCalledWith('alert-1')
    expect(sent.listUnsubscribeUrl).toBe(url)
    expect(sent.text).toContain(url)
    expect(sent.html).toContain(`href="${url}"`)
    expect(sent.html).toContain('href="https://cambio-uruguay.com/cuenta?tab=alerts"')
  })

  it('still go out, without the link, when the token cannot be read', async () => {
    mocks.token.mockResolvedValue(null)
    const sent = await email('La compra de USD está en 38.9 (objetivo < 39).')
    expect(sent.to).toBe('a@example.com')
    expect(sent.listUnsubscribeUrl).toBeUndefined()
    expect(sent.html).not.toContain('/api/alerts/unsubscribe')
  })

  it('escape the alert text in the HTML part', async () => {
    mocks.token.mockResolvedValue(TOKEN)
    const sent = await email('La compra de USD en <b>x</b> & co está en 38.9 (objetivo < 39).')
    expect(sent.html).toContain('&lt;b&gt;x&lt;/b&gt; &amp; co')
    expect(sent.html).not.toContain('<b>x</b>')
  })
})
