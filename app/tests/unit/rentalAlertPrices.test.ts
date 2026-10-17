import { describe, expect, it } from 'vitest'
import {
  parseRentalAlertDropId,
  rentalAlertDropId,
  rentalAlertPriceStep,
} from '../../server/utils/rentalAlertPrices'

const usd = (amount: number) => ({ amount, currency: 'USD' as const })

describe('price-drop ledger step', () => {
  it('records the first observation silently', () => {
    expect(rentalAlertPriceStep(null, usd(10000))).toEqual({
      next: { amount: 10000, currency: 'USD', low: 10000 },
      drop: null,
      changed: true,
    })
  })
  it('reports a drop of at least 1 % below the lowest price seen, with the last price', () => {
    const step = rentalAlertPriceStep({ ...usd(10000), low: 10000 }, usd(9800))
    expect(step.drop).toEqual(usd(10000))
    expect(step.next).toEqual({ amount: 9800, currency: 'USD', low: 9800 })
  })
  it('does not report a cut under 1 %, but lowers the floor', () => {
    const step = rentalAlertPriceStep({ ...usd(10000), low: 10000 }, usd(9950))
    expect(step.drop).toBeNull()
    expect(step.next.low).toBe(9950)
  })
  it('treats a fall of more than half as a reading error and records it silently', () => {
    const step = rentalAlertPriceStep({ ...usd(10000), low: 10000 }, usd(4000))
    expect(step.drop).toBeNull()
    expect(step.next).toEqual({ amount: 4000, currency: 'USD', low: 4000 })
  })
  it('recovers from a misread price instead of keeping it as the floor forever', () => {
    let seen = rentalAlertPriceStep({ ...usd(150000), low: 150000 }, usd(15000)).next
    const back = rentalAlertPriceStep(seen, usd(150000))
    expect(back.drop).toBeNull()
    expect(back.next).toEqual({ amount: 150000, currency: 'USD', low: 150000 })
    seen = back.next
    expect(rentalAlertPriceStep(seen, usd(140000)).drop).toEqual(usd(150000))
  })
  it('does not report a drop from a misread price far above the floor', () => {
    const up = rentalAlertPriceStep({ ...usd(10000), low: 10000 }, usd(100000)).next
    expect(rentalAlertPriceStep(up, usd(9500)).drop).toBeNull()
  })
  it('resets silently when the currency changes (Facebook currency is sometimes deduced)', () => {
    const step = rentalAlertPriceStep(
      { ...usd(10000), low: 10000 },
      {
        amount: 9000,
        currency: 'UYU',
      }
    )
    expect(step.drop).toBeNull()
    expect(step.next).toEqual({ amount: 9000, currency: 'UYU', low: 9000 })
  })
  it('ignores a rise and fall back to a price already seen', () => {
    let seen = rentalAlertPriceStep({ ...usd(10000), low: 10000 }, usd(11000)).next
    const back = rentalAlertPriceStep(seen, usd(10500))
    expect(back.drop).toBeNull()
    seen = back.next
    const real = rentalAlertPriceStep(seen, usd(9800))
    expect(real.drop).toEqual(usd(10500))
  })
  it('does not rewrite an unchanged price', () => {
    expect(rentalAlertPriceStep({ ...usd(10000), low: 9000 }, usd(10000)).changed).toBe(false)
  })
})

describe('price-drop event ids', () => {
  it('round-trips the base advert, the new price and the previous one', () => {
    const id = rentalAlertDropId('car:ml-MLU123', usd(9800), usd(10500))
    expect(id).toBe('car:ml-MLU123~drop~USD~9800~10500')
    expect(parseRentalAlertDropId(id)).toEqual({
      base: 'car:ml-MLU123',
      price: usd(9800),
      previous: usd(10500),
    })
  })
  it('rejects anything that is not a well-formed drop id', () => {
    expect(parseRentalAlertDropId('car:ml-MLU123')).toBeNull()
    expect(parseRentalAlertDropId('car:x~drop~EUR~1~2')).toBeNull()
    expect(parseRentalAlertDropId('car:x~drop~USD~-1~2')).toBeNull()
  })
})
