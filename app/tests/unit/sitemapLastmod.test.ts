import { describe, expect, it } from 'vitest'

import { isSitemapDay, previousSitemapDays, sitemapDay } from '../../utils/sitemapLastmod'

// Las filas de cotización se guardan por día de Montevideo, así que el `lastmod` del sitemap es ese
// día y no el instante en que se armó el archivo: un `lastmod` que cambia cada hora le enseña al
// rastreador a ignorarlo.
describe('sitemapDay', () => {
  it('is the Montevideo calendar day, not the UTC one', () => {
    // 02:30 UTC = 23:30 del día anterior en Montevideo (UTC-3).
    expect(sitemapDay(new Date('2026-11-20T02:30:00Z'))).toBe('2026-11-19')
    expect(sitemapDay(new Date('2026-11-20T03:30:00Z'))).toBe('2026-11-20')
  })

  it('is a date, never a timestamp', () => {
    expect(isSitemapDay(sitemapDay())).toBe(true)
  })
})

describe('previousSitemapDays', () => {
  it('lists the days before today, newest first', () => {
    expect(previousSitemapDays(4, new Date('2026-11-20T12:00:00Z'))).toEqual([
      '2026-11-19',
      '2026-11-18',
      '2026-11-17',
      '2026-11-16',
    ])
  })

  it('counts from the Montevideo day and crosses month and year boundaries', () => {
    // 01:00 UTC del 1/12 todavía es 30/11 en Montevideo.
    expect(previousSitemapDays(2, new Date('2026-12-01T01:00:00Z'))).toEqual([
      '2026-11-29',
      '2026-11-28',
    ])
    expect(previousSitemapDays(2, new Date('2027-01-01T12:00:00Z'))).toEqual([
      '2026-12-31',
      '2026-12-30',
    ])
    expect(previousSitemapDays(1, new Date('2028-03-01T12:00:00Z'))).toEqual(['2028-02-29'])
  })

  it('is empty for zero days', () => {
    expect(previousSitemapDays(0)).toEqual([])
  })
})

describe('isSitemapDay', () => {
  it('accepts a bare date and nothing else', () => {
    expect(isSitemapDay('2026-11-20')).toBe(true)
    expect(isSitemapDay('2026-11-20T04:34:57.000Z')).toBe(false)
    expect(isSitemapDay(undefined)).toBe(false)
    expect(isSitemapDay('')).toBe(false)
    expect(isSitemapDay(20261120)).toBe(false)
  })
})
