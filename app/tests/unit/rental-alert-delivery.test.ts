import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentalAlertDoc } from '../../server/models/RentalAlert'
import type { RentalAlertCandidate } from '../../utils/rentalAlerts'
import {
  deliverRentalAlertChannel,
  rentalAlertEmail,
  smtpFailureStatus,
} from '../../server/utils/rentalAlertDelivery'

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  sendMail: vi.fn(),
  configured: vi.fn(),
  active: vi.fn(),
  devices: vi.fn(),
  owned: vi.fn(),
  sendPush: vi.fn(),
  revoke: vi.fn(),
}))
vi.mock('../../server/utils/firebaseAdmin', () => ({ adminAuth: () => ({ getUser: h.getUser }) }))
vi.mock('../../server/utils/mailer', () => ({
  sendMail: h.sendMail,
  isMailerConfigured: h.configured,
}))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))
vi.mock('../../server/models/RentalAlert', () => ({ RentalAlertModel: { exists: h.active } }))
vi.mock('../../server/models/PushRegistration', () => ({
  PushRegistrationModel: {
    exists: h.owned,
    find: () => ({ sort: () => ({ limit: () => ({ lean: h.devices }) }) }),
  },
}))
vi.mock('../../server/utils/push', () => ({ sendPushNotification: h.sendPush }))
vi.mock('../../server/utils/pushRegistrations', () => ({ unregisterPushToken: h.revoke }))

const alert = {
  _id: 'alert1',
  uid: 'u1',
  active: true,
  revision: 2,
  kind: 'rental-search',
  filters: { department: 'Montevideo' },
  channels: { email: true, push: true },
  locale: 'es',
  emailAddress: 'me@example.com',
  unsubscribeToken: 'a'.repeat(64),
} as unknown as RentalAlertDoc
const candidate = {
  id: 'infocasas:1',
  propertyKey: 'montevideo-cordon-1',
  title: '<script>alert(1)</script> Casa',
  department: 'Montevideo',
  neighborhood: 'Cordón',
  price: { amount: 25000, currency: 'UYU' },
  expenses: null,
  url: 'https://evil.example',
  bedrooms: 1,
  image: null,
} as RentalAlertCandidate
const input = (channel: 'push' | 'email' = 'email') => ({
  channel,
  alert,
  candidates: [candidate],
  deliveryId: 'digest1',
})

beforeEach(() => {
  vi.resetAllMocks()
  h.active.mockResolvedValue(true)
  h.getUser.mockResolvedValue({
    email: 'me@example.com',
    emailVerified: true,
    disabled: false,
    providerData: [{ providerId: 'password' }],
  })
  h.configured.mockReturnValue(true)
  h.devices.mockResolvedValue([{ _id: 'hash1', uid: 'u1', token: 'token1' }])
  h.owned.mockResolvedValue(true)
  h.sendPush.mockResolvedValue({ status: 'sent' })
})

describe('rental alert transport without network sends', () => {
  it('supports authenticated custom-provider accounts with no linked Firebase provider for push', async () => {
    h.getUser.mockResolvedValue({
      disabled: false,
      providerData: [],
      email: null,
      emailVerified: false,
    })
    expect(await deliverRentalAlertChannel(input('push'))).toEqual({ status: 'sent' })
    expect(h.sendPush).toHaveBeenCalledOnce()
  })
  it.each([
    { email: 'me@example.com', emailVerified: false, providerData: [{}] },
    { email: 'someone@example.com', emailVerified: true, providerData: [{}] },
    { email: 'me@example.com', emailVerified: true, providerData: [{}], disabled: true },
    { providerData: [], emailVerified: false },
  ])('rejects unverified, changed, disabled or anonymous destinations', async account => {
    h.getUser.mockResolvedValue(account)
    expect((await deliverRentalAlertChannel(input())).status).toBe('unavailable')
    expect(h.sendMail).not.toHaveBeenCalled()
  })
  it('checks current subscription status/revision before contacting providers', async () => {
    h.active.mockResolvedValue(false)
    expect(await deliverRentalAlertChannel(input())).toMatchObject({
      status: 'unavailable',
      reason: 'subscription_changed',
    })
    expect(h.getUser).not.toHaveBeenCalled()
    expect(h.sendMail).not.toHaveBeenCalled()
  })
  it('escapes HTML, limits cards to ten, keeps full count, links the Spanish-only detail page and localizes the search', () => {
    const result = rentalAlertEmail(
      { ...alert, locale: 'en', kind: 'rental-opportunity' },
      Array.from({ length: 12 }, () => candidate),
      'id\r\nevil'
    )
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
    expect(result.html.match(/<li>/g)).toHaveLength(10)
    expect(result.html).toContain('12 new listings')
    // La ficha existe sólo en español (defineI18nRoute en pages/alquileres/[key].vue); el catálogo
    // que enlaza "ver más" sí conserva el espejo del idioma del suscriptor.
    expect(result.html).toContain('https://cambio-uruguay.com/alquileres/montevideo-cordon-1')
    expect(result.html).not.toContain('/en/alquileres/')
    expect(result.html).toContain('/en/oportunidades-inmobiliarias-uruguay')
    expect(result.html).toContain('operation=rent')
    expect(result.html).not.toContain('evil.example')
    expect(result.html).toContain('not guaranteed savings')
    expect(result.listUnsubscribeUrl).toContain('/api/rental-alerts/unsubscribe?token=')
    expect(result.messageId).toMatch(/^<rental-[a-f0-9]{64}@cambio-uruguay.com>$/)
  })
  it('asks Spanish rental subscribers for the survey, by the alert id and never by its token', () => {
    const id = '6512aa0b1c2d3e4f5a6b7c8d'
    const survey = (doc: RentalAlertDoc) => {
      const out = rentalAlertEmail(doc, [candidate], 'd1')
      const link = [...out.html.matchAll(/href="([^"]+)"/g)]
        .map(m => m[1]!.replace(/&amp;/g, '&'))
        .find(href => href.includes('/opinion-alquileres'))
      return { out, link }
    }
    const es = survey({ ...alert, _id: id } as unknown as RentalAlertDoc)
    expect(es.link).toBe(`https://cambio-uruguay.com/opinion-alquileres?origen=alerta&a=${id}`)
    expect(es.out.text).toContain(es.link!)
    expect(es.link).not.toContain(alert.unsubscribeToken)
    // The survey is in Spanish and about rentals: not for other locales, not for car/moto/sale alerts.
    expect(
      survey({ ...alert, _id: id, locale: 'en' } as unknown as RentalAlertDoc).link
    ).toBeUndefined()
    expect(
      survey({
        ...alert,
        _id: id,
        kind: 'car-search',
        filters: { brand: 'citroen' },
      } as unknown as RentalAlertDoc).link
    ).toBeUndefined()
  })

  it('describes a used-car drop with the previous price and links the car page', () => {
    const car = {
      id: 'car:ml-MLU123456~drop~USD~9000~10000',
      propertyKey: 'car:ml-MLU123456',
      title: 'Citroën Xsara 1.6',
      url: '/autos-usados-uruguay/ml-MLU123456',
      price: { amount: 9000, currency: 'USD' },
      previousPrice: { amount: 10000, currency: 'USD' },
      expenses: null,
      department: 'Montevideo',
      neighborhood: '',
      bedrooms: null,
      image: null,
      facts: ['2011', '150.000 km', 'Montevideo'],
    } as RentalAlertCandidate
    const result = rentalAlertEmail(
      { ...alert, kind: 'car-search', filters: { brand: 'citroen' } },
      [car],
      'digest-car'
    )
    expect(result.subject).toBe('Novedades en tu búsqueda de autos usados')
    expect(result.html).toContain('https://cambio-uruguay.com/autos-usados-uruguay/ml-MLU123456')
    expect(result.text).toContain('2011 · 150.000 km · Montevideo')
    expect(result.text).toMatch(/Antes US\$\s?10\.000 \(−10 %\)/)
    expect(result.text).toContain('1 bajó de precio')
    expect(result.text).not.toContain('Gastos comunes')
    expect(result.html).toContain('https://cambio-uruguay.com/autos-usados-uruguay?brand=citroen')
  })
  it('names new-only digests by directory and links motos to the original advert or the search', () => {
    const moto = {
      id: 'moto:ml-MLU1',
      propertyKey: 'moto:ml-MLU1',
      title: 'Honda Wave',
      url: '/motos-usadas-uruguay',
      price: { amount: 1500, currency: 'USD' },
      expenses: null,
      department: '',
      neighborhood: '',
      bedrooms: null,
      image: null,
    } as RentalAlertCandidate
    const linked = { ...moto, id: 'moto:ml-MLU2', link: 'https://moto.mercadolibre.com.uy/MLU-2' }
    const forged = { ...moto, id: 'moto:ml-MLU3', link: 'https://evil.example/MLU-3' }
    const result = rentalAlertEmail(
      { ...alert, kind: 'moto-search', filters: {} },
      [moto, linked, forged],
      'digest-moto'
    )
    expect(result.subject).toBe('Nuevas motos usadas para tu búsqueda')
    expect(result.html).toContain('https://moto.mercadolibre.com.uy/MLU-2')
    expect(result.html).not.toContain('evil.example')
    expect(result.html).toContain('href="https://cambio-uruguay.com/motos-usadas-uruguay"')
    expect(result.text).toContain('3 avisos nuevos')
  })
  it('counts new adverts and drops in the push body without naming any advert', async () => {
    const drop = {
      ...candidate,
      id: 'x~drop~UYU~1~2',
      previousPrice: { amount: 2, currency: 'UYU' },
    }
    await deliverRentalAlertChannel({
      ...input('push'),
      candidates: [candidate, candidate, drop] as RentalAlertCandidate[],
    })
    expect(h.sendPush.mock.calls[0]![2]).toBe('2 avisos nuevos · 1 bajó de precio')
  })
  it('uses the verified current address and stable Message-ID', async () => {
    expect(await deliverRentalAlertChannel(input())).toEqual({ status: 'sent' })
    expect(h.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'me@example.com',
        messageId: rentalAlertEmail(alert, [candidate], 'digest1').messageId,
      })
    )
  })
  it.each([
    [{ code: 'ETIMEDOUT', command: 'DATA' }, 'uncertain'],
    [{ code: 'ESOCKET' }, 'uncertain'],
    [{ responseCode: 451, command: 'DATA' }, 'failed'],
    [{ code: 'EAUTH' }, 'failed'],
    [{ code: 'ETIMEDOUT', command: 'CONN' }, 'failed'],
  ])('classifies SMTP ambiguity without claiming exactly once', async (error, status) => {
    expect(smtpFailureStatus(error)).toBe(status)
    h.sendMail.mockRejectedValue(error)
    expect((await deliverRentalAlertChannel(input())).status).toBe(status)
  })
  it('does not deliver to a device reassigned after the initial batch read', async () => {
    h.owned.mockResolvedValue(false)
    expect((await deliverRentalAlertChannel(input('push'))).status).toBe('unavailable')
    expect(h.sendPush).not.toHaveBeenCalled()
  })
  it('uses a generic lock-screen message and one data-only display path', async () => {
    await deliverRentalAlertChannel(input('push'))
    expect(h.sendPush).toHaveBeenCalledWith(
      'token1',
      expect.any(String),
      expect.not.stringContaining('Cordón'),
      expect.objectContaining({ dataOnly: true, url: '/alquileres-uruguay?department=Montevideo' })
    )
  })
  it('does not repeat accepted devices when another fails or cleanup fails', async () => {
    h.devices.mockResolvedValue([
      { _id: '1', token: 'token1' },
      { _id: '2', token: 'token2' },
    ])
    h.sendPush
      .mockResolvedValueOnce({ status: 'sent' })
      .mockResolvedValueOnce({ status: 'invalid' })
    h.revoke.mockRejectedValue(new Error('db unavailable'))
    expect(await deliverRentalAlertChannel(input('push'))).toEqual({
      status: 'sent',
      reason: 'partial_push',
    })
  })
})
