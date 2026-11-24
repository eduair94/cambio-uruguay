import { describe, expect, it } from 'vitest'
import { isComplimentaryAdFree, parseEmailList } from '../../server/utils/adFreeOwners'

describe('parseEmailList', () => {
  it('reads comma, semicolon and space separated lists, lowercased', () => {
    expect(parseEmailList(' Owner@Example.com, otro@example.com;tercero@example.com  ')).toEqual([
      'owner@example.com',
      'otro@example.com',
      'tercero@example.com',
    ])
    expect(parseEmailList('')).toEqual([])
    expect(parseEmailList(undefined)).toEqual([])
  })
})

describe('isComplimentaryAdFree', () => {
  const lists = { adminEmails: 'admin@example.com', adFreeEmails: 'owner@example.com' }
  const user = { email: 'owner@example.com', emailVerified: true, anonymous: false }

  it('gives the site owners an account without ads, from either list', () => {
    expect(isComplimentaryAdFree(user, lists)).toBe(true)
    expect(isComplimentaryAdFree({ ...user, email: 'ADMIN@example.com' }, lists)).toBe(true)
  })

  it('never for an unverified email: anyone can type the owner address into a password signup', () => {
    expect(isComplimentaryAdFree({ ...user, emailVerified: false }, lists)).toBe(false)
  })

  it('never for a guest, a missing email or an address on neither list', () => {
    expect(isComplimentaryAdFree({ ...user, anonymous: true }, lists)).toBe(false)
    expect(isComplimentaryAdFree({ ...user, email: null }, lists)).toBe(false)
    expect(isComplimentaryAdFree({ ...user, email: 'visitor@example.com' }, lists)).toBe(false)
    expect(isComplimentaryAdFree(user, { adminEmails: '', adFreeEmails: '' })).toBe(false)
  })
})
