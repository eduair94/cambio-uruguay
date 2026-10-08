import { describe, expect, it } from 'vitest'
import {
  RENTAL_SAVED_CHANGE_KEYS_LIMIT,
  rentalSavedChange,
  rentalSavedChangeKeys,
} from '../../utils/rentalSavedChanges'
import { rentalSavedMessages } from '../../utils/rentalSavedMessages'

const offer = (url: string, price: number, currency: 'UYU' | 'USD' = 'UYU') => ({
  source: 'infocasas' as const,
  url,
  price,
  currency,
  priceUyu: currency === 'USD' ? price * 41 : price,
  commonExpenses: null,
  commonExpensesCurrency: null,
})
const favorite = (offers: ReturnType<typeof offer>[]) => ({
  price: offers[0]!.price,
  currency: offers[0]!.currency,
  offers,
})
const now = (offers: Array<{ url: string; price: number; currency?: 'UYU' | 'USD' }>) => ({
  key: 'k',
  offers: offers.map(row => ({ source: 'infocasas' as const, currency: 'UYU' as const, ...row })),
})

// The saved list was a snapshot: someone tracking four apartments had to open each one to learn
// that two had dropped and one was gone (2026-10-08).
describe('what became of a saved property', () => {
  it('reports a drop or a rise of the same advert, in its currency', () => {
    const saved = favorite([offer('https://a/1', 25_000)])
    expect(rentalSavedChange(saved, now([{ url: 'https://a/1', price: 23_000 }]))).toEqual({
      status: 'down',
      from: 25_000,
      to: 23_000,
      currency: 'UYU',
    })
    expect(rentalSavedChange(saved, now([{ url: 'https://a/1', price: 26_000 }]))).toMatchObject({
      status: 'up',
    })
    expect(rentalSavedChange(saved, now([{ url: 'https://a/1', price: 25_000 }]))).toEqual({
      status: 'same',
    })
  })

  it('never reads a cheaper second advert or a currency switch as a drop', () => {
    const saved = favorite([offer('https://a/1', 25_000)])
    expect(rentalSavedChange(saved, now([{ url: 'https://b/2', price: 20_000 }]))).toEqual({
      status: 'unknown',
    })
    expect(
      rentalSavedChange(saved, now([{ url: 'https://a/1', price: 600, currency: 'USD' }]))
    ).toEqual({ status: 'unknown' })
  })

  it('follows the saved headline advert when several are still published', () => {
    const saved = favorite([offer('https://a/1', 25_000), offer('https://b/2', 27_000)])
    const result = rentalSavedChange(
      saved,
      now([
        { url: 'https://b/2', price: 22_000 },
        { url: 'https://a/1', price: 24_000 },
      ])
    )
    expect(result).toMatchObject({ status: 'down', from: 25_000, to: 24_000 })
  })

  it('calls a property the public directory no longer returns gone', () => {
    expect(rentalSavedChange(favorite([offer('https://a/1', 25_000)]), undefined)).toEqual({
      status: 'gone',
    })
  })

  it('asks only for valid, unique keys, at most the saved-list limit', () => {
    const many = Array.from({ length: 80 }, (_, i) => `montevideo-pocitos-${i}`)
    expect(rentalSavedChangeKeys(['a-1', 'a-1', '', 'null', 'NO VALE', 5])).toEqual(['a-1'])
    expect(rentalSavedChangeKeys(many)).toHaveLength(RENTAL_SAVED_CHANGE_KEYS_LIMIT)
  })

  it('has its lines in every language', () => {
    for (const locale of ['es', 'en', 'pt'] as const)
      for (const key of ['changeDown', 'changeUp', 'changeGone'])
        expect(rentalSavedMessages[locale]).toHaveProperty(key)
  })
})
