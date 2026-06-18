import { describe, it, expect } from 'vitest'
import { makeLinkCode } from '../../server/utils/telegramLink'

describe('makeLinkCode', () => {
  it('returns an 8-char uppercase base32 code', () => {
    const c = makeLinkCode()
    expect(c).toMatch(/^[A-Z2-7]{8}$/)
  })
  it('is (practically) unique across calls', () => {
    const set = new Set(Array.from({ length: 200 }, () => makeLinkCode()))
    expect(set.size).toBe(200)
  })
})
