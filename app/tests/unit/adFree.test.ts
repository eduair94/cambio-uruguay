import { describe, expect, it } from 'vitest'
import {
  AD_FREE_AMOUNTS,
  addMonths,
  computeAdFreeUntil,
  decideFromHint,
  formatAdFreeAmount,
  isAdFreeActive,
  parseHint,
  sessionVerdict,
  validateAmount,
} from '../../utils/adFree'

const d = (iso: string) => new Date(iso)

describe('addMonths', () => {
  it('adds calendar months', () => {
    expect(addMonths(d('2026-11-23T10:00:00Z'), 12).toISOString()).toBe('2027-11-23T10:00:00.000Z')
  })

  it('clamps to the last day of a shorter month instead of spilling over', () => {
    expect(addMonths(d('2027-01-31T12:00:00Z'), 1).toISOString()).toBe('2027-02-28T12:00:00.000Z')
    expect(addMonths(d('2028-02-29T12:00:00Z'), 12).toISOString()).toBe('2029-02-28T12:00:00.000Z')
  })
})

describe('computeAdFreeUntil', () => {
  it('is null without approved donations', () => {
    expect(computeAdFreeUntil([])).toBeNull()
  })

  it('gives twelve months from the approval of a single donation', () => {
    expect(computeAdFreeUntil([{ approvedAt: d('2026-11-23T10:00:00Z') }])?.toISOString()).toBe(
      '2027-11-23T10:00:00.000Z'
    )
  })

  it('chains a second donation made while the first is still running', () => {
    const until = computeAdFreeUntil([
      { approvedAt: d('2026-11-23T10:00:00Z') },
      { approvedAt: d('2026-11-23T11:00:00Z') },
    ])
    expect(until?.toISOString()).toBe('2028-11-23T10:00:00.000Z')
  })

  it('starts a donation made after the previous period ended on its own date', () => {
    const until = computeAdFreeUntil([
      { approvedAt: d('2024-01-10T00:00:00Z') },
      { approvedAt: d('2026-06-01T00:00:00Z') },
    ])
    expect(until?.toISOString()).toBe('2027-06-01T00:00:00.000Z')
  })

  it('does not depend on the order the donations arrive in', () => {
    const a = { approvedAt: d('2026-01-01T00:00:00Z') }
    const b = { approvedAt: d('2026-03-01T00:00:00Z') }
    expect(computeAdFreeUntil([b, a])?.toISOString()).toBe(
      computeAdFreeUntil([a, b])?.toISOString()
    )
  })
})

describe('isAdFreeActive', () => {
  const now = d('2026-11-23T00:00:00Z')
  it('is true before the end date and false after', () => {
    expect(isAdFreeActive('2027-01-01T00:00:00Z', now)).toBe(true)
    expect(isAdFreeActive(d('2026-11-22T00:00:00Z'), now)).toBe(false)
    expect(isAdFreeActive(null, now)).toBe(false)
    expect(isAdFreeActive('not a date', now)).toBe(false)
  })
})

describe('validateAmount', () => {
  it('keeps the owner-decided limits', () => {
    expect(AD_FREE_AMOUNTS.mercadopago).toMatchObject({
      currency: 'UYU',
      suggested: [200, 400, 800],
      min: 150,
      max: 20000,
      decimals: 0,
    })
    expect(AD_FREE_AMOUNTS.paypal).toMatchObject({
      currency: 'USD',
      suggested: [5, 10, 20],
      min: 4,
      max: 500,
      decimals: 2,
    })
  })

  it('accepts whole pesos within the range, from a number or a numeric string', () => {
    expect(validateAmount('mercadopago', 150)).toEqual({ ok: true, amount: 150 })
    expect(validateAmount('mercadopago', '400')).toEqual({ ok: true, amount: 400 })
    expect(validateAmount('mercadopago', 20000)).toEqual({ ok: true, amount: 20000 })
  })

  it('rejects pesos below the minimum, above the maximum or with cents', () => {
    expect(validateAmount('mercadopago', 149).ok).toBe(false)
    expect(validateAmount('mercadopago', 20001).ok).toBe(false)
    expect(validateAmount('mercadopago', 400.5).ok).toBe(false)
  })

  it('accepts dollars with up to two decimals', () => {
    expect(validateAmount('paypal', 4.5)).toEqual({ ok: true, amount: 4.5 })
    expect(validateAmount('paypal', '10.25')).toEqual({ ok: true, amount: 10.25 })
    expect(validateAmount('paypal', 4.555).ok).toBe(false)
    expect(validateAmount('paypal', 3.99).ok).toBe(false)
  })

  it('rejects anything that is not a finite amount', () => {
    for (const raw of [null, undefined, '', 'abc', Number.NaN, Infinity, -5, '1e3', {}, []]) {
      expect(validateAmount('mercadopago', raw).ok).toBe(false)
    }
  })
})

describe('parseHint', () => {
  it('reads a well-formed hint and drops anything else', () => {
    const hint = { uid: 'u1', until: '2027-01-01T00:00:00.000Z', checkedAt: '2026-11-23T00:00:00Z' }
    expect(parseHint(JSON.stringify(hint))).toEqual(hint)
    expect(parseHint(JSON.stringify({ ...hint, until: null }))?.until).toBeNull()
    expect(parseHint(null)).toBeNull()
    expect(parseHint('{')).toBeNull()
    expect(parseHint(JSON.stringify({ until: null, checkedAt: 'x' }))).toBeNull()
  })
})

describe('decideFromHint', () => {
  const now = d('2026-11-23T12:00:00Z')
  const hours = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()

  it('holds the ads at once for a donor whose period has not ended, and re-checks', () => {
    expect(
      decideFromHint({ uid: 'u', until: '2027-01-01T00:00:00Z', checkedAt: hours(48) }, now)
    ).toEqual({ status: 'free', revalidate: true })
  })

  it('lets the ads in at once for a recently checked non-donor, and re-checks', () => {
    expect(decideFromHint({ uid: 'u', until: null, checkedAt: hours(1) }, now)).toEqual({
      status: 'ads',
      revalidate: true,
    })
    expect(
      decideFromHint({ uid: 'u', until: '2026-01-01T00:00:00Z', checkedAt: hours(1) }, now)
    ).toEqual({ status: 'ads', revalidate: true })
  })

  it('waits for the server when there is no hint or the non-donor check is stale', () => {
    expect(decideFromHint(null, now)).toEqual({ status: 'wait', revalidate: true })
    expect(decideFromHint({ uid: 'u', until: null, checkedAt: hours(13) }, now)).toEqual({
      status: 'wait',
      revalidate: true,
    })
  })
})

describe('formatAdFreeAmount', () => {
  it('writes pesos and dollars the way the site does', () => {
    expect(formatAdFreeAmount(400, 'UYU')).toBe('$ 400')
    expect(formatAdFreeAmount(1200, 'UYU')).toBe('$ 1.200')
    expect(formatAdFreeAmount(10, 'USD')).toBe('US$ 10')
    expect(formatAdFreeAmount(4.5, 'USD')).toBe('US$ 4,50')
  })
})

describe('sessionVerdict', () => {
  it('only calls it signed out once the first auth state is known', () => {
    // A slow phone still restoring the session must not erase a donor's marker.
    expect(sessionVerdict({ ready: false, hasUser: false })).toBe('unknown')
    expect(sessionVerdict({ ready: true, hasUser: false })).toBe('signed-out')
    expect(sessionVerdict({ ready: true, hasUser: true })).toBe('signed-in')
    expect(sessionVerdict({ ready: false, hasUser: true })).toBe('signed-in')
  })
})
