import { describe, expect, it } from 'vitest'
import { checkoutRequestError } from '../../server/utils/adFreeCheckout'

const both = { mercadopago: true, paypal: true }
const person = { anonymous: false }

describe('checkoutRequestError', () => {
  it('refuses a guest session before anything is created', () => {
    expect(checkoutRequestError({ anonymous: true }, { provider: 'mercadopago', amount: 400 }, both))
      .toMatchObject({ status: 403 })
  })

  it('refuses an unknown provider', () => {
    expect(checkoutRequestError(person, { provider: 'stripe', amount: 400 }, both)).toMatchObject({
      status: 400,
    })
    expect(checkoutRequestError(person, null, both)).toMatchObject({ status: 400 })
  })

  it('answers 503 for a provider without credentials', () => {
    expect(
      checkoutRequestError(
        person,
        { provider: 'mercadopago', amount: 400 },
        { mercadopago: false, paypal: true }
      )
    ).toMatchObject({ status: 503 })
  })

  it('refuses an amount outside the provider limits', () => {
    expect(checkoutRequestError(person, { provider: 'mercadopago', amount: 100 }, both)).toMatchObject(
      { status: 400 }
    )
    expect(checkoutRequestError(person, { provider: 'paypal', amount: 501 }, both)).toMatchObject({
      status: 400,
    })
  })

  it('lets a valid request through', () => {
    expect(checkoutRequestError(person, { provider: 'mercadopago', amount: 400 }, both)).toBeNull()
    expect(checkoutRequestError(person, { provider: 'paypal', amount: '10' }, both)).toBeNull()
  })
})
