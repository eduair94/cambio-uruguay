import { describe, expect, it } from 'vitest'
import {
  currentPairs,
  discountPairKey,
  groupByBank,
  newPairs,
  notificationFor,
  parsePairKey,
  trimSeen,
  MAX_SEEN_PAIRS,
} from '../../utils/bankosAlerts'

const BANK_NAMES: Record<string, string> = { itau: 'Itaú', brou: 'BROU', oca: 'OCA' }
const BRAND_NAMES: Record<string, string> = {
  superx: 'Super X',
  cafey: 'Café Y',
  barz: 'Bar Z',
  farmaw: 'Farmacia W',
}
const bankName = (id: string) => BANK_NAMES[id] ?? id
const brandName = (id: string) => BRAND_NAMES[id] ?? id

describe('discount pair keys', () => {
  it('round-trips a bank and a brand', () => {
    const key = discountPairKey('itau', 'superx')
    expect(parsePairKey(key)).toEqual({ bankId: 'itau', brandId: 'superx' })
  })

  it('survives a brandId that itself contains a colon', () => {
    const key = discountPairKey('brou', 'weird::brand')
    expect(parsePairKey(key)).toEqual({ bankId: 'brou', brandId: 'weird::brand' })
  })

  it('rejects malformed keys instead of inventing a pair', () => {
    expect(parsePairKey('nope')).toBeNull()
    expect(parsePairKey('::orphan')).toBeNull()
  })

  it('lists every (bank, brand) in the catalog', () => {
    const pairs = currentPairs({ itau: { superx: {}, cafey: {} }, brou: { superx: {} } })
    expect(pairs.sort()).toEqual(['brou::superx', 'itau::cafey', 'itau::superx'])
  })
})

describe('detecting what is new', () => {
  it('returns only pairs missing from the seen set', () => {
    expect(newPairs(['a::1', 'b::2', 'c::3'], ['b::2'])).toEqual(['a::1', 'c::3'])
  })

  it('returns nothing when the catalog has not moved', () => {
    expect(newPairs(['a::1', 'b::2'], ['b::2', 'a::1'])).toEqual([])
  })

  it('never treats a REMOVED discount as news', () => {
    expect(newPairs(['a::1'], ['a::1', 'gone::9'])).toEqual([])
  })

  it('groups by issuer, biggest first', () => {
    const groups = groupByBank(['itau::superx', 'brou::cafey', 'itau::barz'])
    expect(groups[0]).toEqual({ bankId: 'itau', brandIds: ['barz', 'superx'] })
    expect(groups[1]).toEqual({ bankId: 'brou', brandIds: ['cafey'] })
  })
})

describe('what a subscriber gets told', () => {
  const news = groupByBank(['itau::superx', 'itau::cafey', 'brou::barz'])

  it('says nothing when none of the news touches the cards they hold', () => {
    expect(notificationFor(news, ['oca'], bankName, brandName)).toBeNull()
    expect(notificationFor([], ['itau'], bankName, brandName)).toBeNull()
  })

  it('mentions only the issuers that user actually carries', () => {
    const msg = notificationFor(news, ['brou'], bankName, brandName)!
    expect(msg.title).toBe('Nuevo descuento con BROU')
    expect(msg.body).toContain('Bar Z')
    expect(msg.body).not.toContain('Super X') // Itaú news is not theirs
  })

  it('pluralises and joins issuers when several of theirs moved', () => {
    const msg = notificationFor(news, ['itau', 'brou'], bankName, brandName)!
    expect(msg.title).toBe('3 descuentos nuevos con Itaú y BROU')
  })

  it('caps the brands it names and counts the rest', () => {
    const many = groupByBank([
      'itau::superx',
      'itau::cafey',
      'itau::barz',
      'itau::farmaw',
      'itau::extra',
    ])
    const msg = notificationFor(many, ['itau'], bankName, brandName, 3)!
    expect(msg.title).toBe('5 descuentos nuevos con Itaú')
    expect(msg.body).toMatch(/ y 2 más\.$/)
  })
})

describe('the seen ledger stays bounded', () => {
  it('dedupes', () => {
    expect(trimSeen(['a::1', 'a::1', 'b::2'])).toEqual(['a::1', 'b::2'])
  })

  it('keeps the most recent entries when it overflows', () => {
    const many = Array.from({ length: MAX_SEEN_PAIRS + 10 }, (_, i) => `b::${i}`)
    const trimmed = trimSeen(many)
    expect(trimmed).toHaveLength(MAX_SEEN_PAIRS)
    expect(trimmed.at(-1)).toBe(`b::${MAX_SEEN_PAIRS + 9}`)
  })
})
