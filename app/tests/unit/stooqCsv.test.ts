import { describe, it, expect } from 'vitest'
import { parseStooqCsv } from '../../utils/drivers/stooqCsv'

describe('parseStooqCsv', () => {
  it('parses Date + Close, dropping the header, sorted by date', () => {
    const csv = [
      'Date,Open,High,Low,Close,Volume',
      '2026-06-02,104.1,104.5,103.9,104.4,0',
      '2026-06-01,103.8,104.2,103.6,104.0,0',
    ].join('\n')
    expect(parseStooqCsv(csv)).toEqual([
      { date: '2026-06-01', value: 104.0 },
      { date: '2026-06-02', value: 104.4 },
    ])
  })
  it('skips rows with N/D or non-numeric close', () => {
    const csv = 'Date,Open,High,Low,Close,Volume\n2026-06-01,N/D,N/D,N/D,N/D,N/D\n2026-06-02,1,1,1,42.5,0'
    expect(parseStooqCsv(csv)).toEqual([{ date: '2026-06-02', value: 42.5 }])
  })
  it('tolerates empty / malformed input', () => {
    expect(parseStooqCsv('')).toEqual([])
    expect(parseStooqCsv('garbage')).toEqual([])
  })
})
