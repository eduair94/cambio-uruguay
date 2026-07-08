import { describe, it, expect } from 'vitest'
import { MoveExplanationModel } from '../../server/models/MoveExplanation'

describe('MoveExplanation model', () => {
  it('requires currency, date, pctChange, direction', () => {
    const doc = new MoveExplanationModel({})
    const err = doc.validateSync()
    expect(err?.errors.currency).toBeTruthy()
    expect(err?.errors.date).toBeTruthy()
    expect(err?.errors.pctChange).toBeTruthy()
    expect(err?.errors.direction).toBeTruthy()
  })

  it('rejects an unknown direction', () => {
    const doc = new MoveExplanationModel({
      currency: 'USD',
      date: '2026-06-01',
      pctChange: 1.2,
      direction: 'sideways',
    })
    expect(doc.validateSync()?.errors.direction).toBeTruthy()
  })

  it('accepts a full valid document with drivers/narrative/headlines', () => {
    const doc = new MoveExplanationModel({
      currency: 'USD',
      date: '2026-06-01',
      pctChange: 1.2,
      direction: 'up',
      drivers: [{ key: 'brl', dayMovePct: 0.9 }],
      narrative: 'El dólar subió por el real brasileño.',
      headlines: [{ title: 't', source: 's', link: 'l' }],
    })
    expect(doc.validateSync()).toBeUndefined()
  })

  it('defaults narrative to null and headlines/drivers to empty arrays', () => {
    const doc = new MoveExplanationModel({
      currency: 'USD',
      date: '2026-06-01',
      pctChange: 1.2,
      direction: 'up',
    })
    expect(doc.validateSync()).toBeUndefined()
    expect(doc.narrative).toBeNull()
    expect(doc.drivers).toEqual([])
    expect(doc.headlines).toEqual([])
  })
})
