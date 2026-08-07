import { describe, expect, it } from 'vitest'
import {
  ONLINE_ORIGINS,
  channelForOrigin,
  matchesChannel,
  normalizeChannelFilter,
} from '../../utils/exchangeChannel'

describe('channelForOrigin', () => {
  it('classifies banks and fintechs as online', () => {
    for (const origin of ['brou', 'itau', 'bbva', 'santander', 'scotiabank', 'oca', 'prex']) {
      expect(channelForOrigin(origin)).toBe('online')
      expect(ONLINE_ORIGINS.has(origin)).toBe(true)
    }
  })

  it('defaults every other origin (walk-in casas) to presencial', () => {
    for (const origin of ['cambio_minas', 'aeromar', 'gales', 'cambio_sir', 'unknown_casa']) {
      expect(channelForOrigin(origin)).toBe('presencial')
    }
  })
})

describe('matchesChannel', () => {
  it('lets every origin through when the filter is all', () => {
    expect(matchesChannel('brou', 'all')).toBe(true)
    expect(matchesChannel('cambio_minas', 'all')).toBe(true)
  })

  it('keeps only same-channel origins for a specific filter', () => {
    expect(matchesChannel('prex', 'online')).toBe(true)
    expect(matchesChannel('prex', 'presencial')).toBe(false)
    expect(matchesChannel('cambio_minas', 'presencial')).toBe(true)
    expect(matchesChannel('cambio_minas', 'online')).toBe(false)
  })
})

describe('normalizeChannelFilter', () => {
  it('accepts the two channel values', () => {
    expect(normalizeChannelFilter('online')).toBe('online')
    expect(normalizeChannelFilter('presencial')).toBe('presencial')
  })

  it('falls back to all for anything else', () => {
    expect(normalizeChannelFilter('all')).toBe('all')
    expect(normalizeChannelFilter('')).toBe('all')
    expect(normalizeChannelFilter(undefined)).toBe('all')
    expect(normalizeChannelFilter('ONLINE')).toBe('all')
  })
})
