import { describe, it, expect } from 'vitest'
import { parseFredCsv } from '../../utils/drivers/fredCsv'

describe('parseFredCsv', () => {
  it('parses observation_date + value, dropping the header, sorted by date', () => {
    const csv = ['observation_date,DGS10', '2026-07-06,4.48', '2026-07-02,4.49'].join('\n')
    expect(parseFredCsv(csv)).toEqual([
      { date: '2026-07-02', value: 4.49 },
      { date: '2026-07-06', value: 4.48 },
    ])
  })
  it('skips rows with an empty value field (FRED missing-data marker)', () => {
    const csv = 'observation_date,DGS10\n2026-07-02,4.49\n2026-07-03,\n2026-07-06,4.48'
    expect(parseFredCsv(csv)).toEqual([
      { date: '2026-07-02', value: 4.49 },
      { date: '2026-07-06', value: 4.48 },
    ])
  })
  it('skips non-numeric and non-positive values', () => {
    const csv = 'observation_date,X\n2026-07-02,.\n2026-07-03,0\n2026-07-04,-1\n2026-07-05,101.4'
    expect(parseFredCsv(csv)).toEqual([{ date: '2026-07-05', value: 101.4 }])
  })
  it('tolerates empty / malformed input', () => {
    expect(parseFredCsv('')).toEqual([])
    expect(parseFredCsv('garbage')).toEqual([])
  })
})
