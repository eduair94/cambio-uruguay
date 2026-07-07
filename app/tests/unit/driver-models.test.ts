import { describe, it, expect } from 'vitest'
import { DriverSnapshotModel } from '../../server/models/DriverSnapshot'
import { PriceNewsModel } from '../../server/models/PriceNews'

describe('DriverSnapshot model', () => {
  it('requires a date', () => {
    const doc = new DriverSnapshotModel({})
    expect(doc.validateSync()?.errors.date).toBeTruthy()
  })
  it('accepts a date with a values map', () => {
    const doc = new DriverSnapshotModel({ date: '2026-06-01', values: { dxy: 104.2 } })
    expect(doc.validateSync()).toBeUndefined()
    expect(doc.values.get('dxy')).toBe(104.2)
  })
})

describe('PriceNews model', () => {
  it('requires date and currency', () => {
    const doc = new PriceNewsModel({})
    const err = doc.validateSync()
    expect(err?.errors.date).toBeTruthy()
    expect(err?.errors.currency).toBeTruthy()
  })
  it('accepts a headlines array', () => {
    const doc = new PriceNewsModel({
      date: '2026-06-01',
      currency: 'USD',
      headlines: [{ title: 't', source: 's', link: 'l', pubDate: 'p' }],
    })
    expect(doc.validateSync()).toBeUndefined()
  })
})
