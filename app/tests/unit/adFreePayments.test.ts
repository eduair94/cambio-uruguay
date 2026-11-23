import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  bestDonationStatus,
  checkAgainstOrder,
  mapMpPayment,
  mapPpCapture,
  mpNotificationPaymentId,
  ppCaptureIdFromEvent,
  verifyMpSignature,
} from '../../server/utils/adFreeMapping'

const SECRET = 'test-webhook-secret'
const sign = (manifest: string) => createHmac('sha256', SECRET).update(manifest).digest('hex')

describe('verifyMpSignature', () => {
  const ts = '1700000000'
  const v1 = sign(`id:abc123;request-id:req-1;ts:${ts};`)

  it('accepts the signature Mercado Pago computes over id, request id and timestamp', () => {
    expect(
      verifyMpSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: 'req-1',
        dataId: 'abc123',
        secret: SECRET,
      })
    ).toBe(true)
  })

  it('lowercases an alphanumeric data id before signing, as the docs require', () => {
    expect(
      verifyMpSignature({
        xSignature: `ts=${ts}, v1=${v1}`,
        xRequestId: 'req-1',
        dataId: 'ABC123',
        secret: SECRET,
      })
    ).toBe(true)
  })

  it('leaves the request id out of the manifest when the header is missing', () => {
    const noRequest = sign(`id:98765;ts:${ts};`)
    expect(
      verifyMpSignature({
        xSignature: `ts=${ts},v1=${noRequest}`,
        xRequestId: null,
        dataId: '98765',
        secret: SECRET,
      })
    ).toBe(true)
  })

  it('rejects a wrong signature, a missing v1, an empty secret or another id', () => {
    const base = { xRequestId: 'req-1', dataId: 'abc123', secret: SECRET }
    expect(verifyMpSignature({ ...base, xSignature: `ts=${ts},v1=${'0'.repeat(64)}` })).toBe(false)
    expect(verifyMpSignature({ ...base, xSignature: `ts=${ts}` })).toBe(false)
    expect(verifyMpSignature({ ...base, xSignature: null })).toBe(false)
    expect(verifyMpSignature({ ...base, secret: '', xSignature: `ts=${ts},v1=${v1}` })).toBe(false)
    expect(verifyMpSignature({ ...base, dataId: 'abc124', xSignature: `ts=${ts},v1=${v1}` })).toBe(
      false
    )
  })
})

describe('mpNotificationPaymentId', () => {
  it('reads the webhook format from the query and from the body', () => {
    expect(mpNotificationPaymentId({ 'data.id': '123', type: 'payment' }, null)).toBe('123')
    expect(mpNotificationPaymentId({}, { type: 'payment', data: { id: 456 } })).toBe('456')
  })

  it('reads the older IPN format', () => {
    expect(mpNotificationPaymentId({ topic: 'payment', id: '789' }, null)).toBe('789')
  })

  it('ignores notifications that are not about a payment', () => {
    expect(mpNotificationPaymentId({ topic: 'merchant_order', id: '1' }, null)).toBeNull()
    expect(mpNotificationPaymentId({ type: 'payment' }, {})).toBeNull()
  })
})

describe('mapMpPayment', () => {
  const raw = {
    id: 1234567890,
    status: 'approved',
    status_detail: 'accredited',
    external_reference: 'order-1',
    transaction_amount: 400,
    currency_id: 'UYU',
    date_approved: '2026-11-23T13:00:00.000-03:00',
  }

  it('maps an approved payment', () => {
    expect(mapMpPayment(raw)).toEqual({
      id: 'mp:1234567890',
      orderId: 'order-1',
      provider: 'mercadopago',
      amount: 400,
      currency: 'UYU',
      status: 'approved',
      statusDetail: 'accredited',
      approvedAt: new Date('2026-11-23T16:00:00.000Z'),
    })
  })

  it.each([
    ['pending', 'pending'],
    ['in_process', 'pending'],
    ['authorized', 'pending'],
    ['in_mediation', 'approved'],
    ['rejected', 'rejected'],
    ['cancelled', 'cancelled'],
    ['refunded', 'refunded'],
    ['charged_back', 'charged_back'],
  ])('maps Mercado Pago status %s to %s', (from, to) => {
    expect(mapMpPayment({ ...raw, status: from })?.status).toBe(to)
  })

  it('refuses a payment without an id, an order reference or a known status', () => {
    expect(mapMpPayment({ ...raw, id: undefined })).toBeNull()
    expect(mapMpPayment({ ...raw, external_reference: null })).toBeNull()
    expect(mapMpPayment({ ...raw, status: 'something_new' })).toBeNull()
  })
})

describe('mapPpCapture', () => {
  const raw = {
    id: '3C679366HH908993F',
    status: 'COMPLETED',
    amount: { currency_code: 'USD', value: '10.00' },
    custom_id: 'order-2',
    create_time: '2026-11-23T16:00:00Z',
  }

  it('maps a completed capture', () => {
    expect(mapPpCapture(raw)).toEqual({
      id: 'pp:3C679366HH908993F',
      orderId: 'order-2',
      provider: 'paypal',
      amount: 10,
      currency: 'USD',
      status: 'approved',
      statusDetail: null,
      approvedAt: new Date('2026-11-23T16:00:00Z'),
    })
  })

  it.each([
    ['PENDING', 'pending'],
    ['DECLINED', 'rejected'],
    ['FAILED', 'rejected'],
    ['REFUNDED', 'refunded'],
    ['PARTIALLY_REFUNDED', 'approved'],
    ['REVERSED', 'charged_back'],
  ])('maps PayPal capture status %s to %s', (from, to) => {
    expect(mapPpCapture({ ...raw, status: from })?.status).toBe(to)
  })

  it('takes the order from the caller when the capture does not carry custom_id', () => {
    expect(mapPpCapture({ ...raw, custom_id: undefined }, 'order-9')?.orderId).toBe('order-9')
    expect(mapPpCapture({ ...raw, custom_id: undefined })).toBeNull()
  })

  it('keeps the pending reason as the status detail', () => {
    expect(
      mapPpCapture({ ...raw, status: 'PENDING', status_details: { reason: 'UNILATERAL' } })
        ?.statusDetail
    ).toBe('UNILATERAL')
  })
})

describe('ppCaptureIdFromEvent', () => {
  it('takes the capture itself for capture events', () => {
    expect(
      ppCaptureIdFromEvent({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP1' } })
    ).toBe('CAP1')
  })

  it('follows the refund up to its capture', () => {
    expect(
      ppCaptureIdFromEvent({
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        resource: {
          id: 'REFUND1',
          links: [
            { rel: 'self', href: 'https://api-m.paypal.com/v2/payments/refunds/REFUND1' },
            { rel: 'up', href: 'https://api-m.paypal.com/v2/payments/captures/CAP2' },
          ],
        },
      })
    ).toBe('CAP2')
  })

  it('is null for events that are not about a capture', () => {
    expect(
      ppCaptureIdFromEvent({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'O' } })
    ).toBeNull()
  })
})

describe('checkAgainstOrder', () => {
  const order = { _id: 'order-1', amount: 400, currency: 'UYU' as const }
  const payment = mapMpPayment({
    id: 1,
    status: 'approved',
    external_reference: 'order-1',
    transaction_amount: 400,
    currency_id: 'UYU',
  })!

  it('accepts a payment that matches the order', () => {
    expect(checkAgainstOrder(order, payment)).toBe(true)
  })

  it('refuses another currency, another amount or another order', () => {
    expect(checkAgainstOrder(order, { ...payment, currency: 'USD' })).toBe(false)
    expect(checkAgainstOrder(order, { ...payment, amount: 150 })).toBe(false)
    expect(checkAgainstOrder(order, { ...payment, orderId: 'order-2' })).toBe(false)
  })
})

describe('bestDonationStatus', () => {
  it('reports the most useful state among the payments of an order', () => {
    expect(bestDonationStatus(['rejected', 'approved', 'pending'])).toBe('approved')
    expect(bestDonationStatus(['rejected', 'pending'])).toBe('pending')
    expect(bestDonationStatus(['rejected', 'cancelled'])).toBe('rejected')
    expect(bestDonationStatus(['refunded'])).toBe('refunded')
    expect(bestDonationStatus([])).toBe('none')
  })
})
