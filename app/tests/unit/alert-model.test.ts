import { describe, it, expect } from 'vitest'
import { AlertModel } from '../../server/models/Alert'

describe('Alert model', () => {
  it('requires uid, currency, kind, op, target', () => {
    const err = new AlertModel({}).validateSync()
    expect(err?.errors.uid).toBeTruthy()
    expect(err?.errors.currency).toBeTruthy()
    expect(err?.errors.kind).toBeTruthy()
    expect(err?.errors.op).toBeTruthy()
    expect(err?.errors.target).toBeTruthy()
  })

  it('rejects an invalid op and an invalid kind', () => {
    expect(
      new AlertModel({
        uid: 'u',
        currency: 'USD',
        kind: 'bestBuy',
        op: '!=',
        target: 40,
      }).validateSync()?.errors.op
    ).toBeTruthy()
    expect(
      new AlertModel({
        uid: 'u',
        currency: 'USD',
        kind: 'nope',
        op: '<',
        target: 40,
      }).validateSync()?.errors.kind
    ).toBeTruthy()
  })

  it('accepts a valid alert with defaults', () => {
    const doc = new AlertModel({ uid: 'u', currency: 'USD', kind: 'bestBuy', op: '>=', target: 41 })
    expect(doc.validateSync()).toBeUndefined()
    expect(doc.origin).toBe('any')
    expect(doc.active).toBe(true)
    expect(doc.armed).toBe(true)
    expect(doc.channels.push).toBe(true)
  })
})
