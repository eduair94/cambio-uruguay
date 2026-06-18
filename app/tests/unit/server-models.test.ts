import { describe, it, expect } from 'vitest'
import { FavoriteModel } from '../../server/models/Favorite'
import { SavedItemModel } from '../../server/models/SavedItem'

describe('models', () => {
  it('Favorite requires uid, type, key', () => {
    const doc = new FavoriteModel({})
    const err = doc.validateSync()
    expect(err?.errors.uid).toBeTruthy()
    expect(err?.errors.type).toBeTruthy()
    expect(err?.errors.key).toBeTruthy()
  })

  it('Favorite rejects an unknown type', () => {
    const doc = new FavoriteModel({ uid: 'u', type: 'nope', key: 'k' })
    expect(doc.validateSync()?.errors.type).toBeTruthy()
  })

  it('SavedItem requires uid, kind, toolSlug, title', () => {
    const doc = new SavedItemModel({})
    const err = doc.validateSync()
    expect(err?.errors.uid).toBeTruthy()
    expect(err?.errors.kind).toBeTruthy()
    expect(err?.errors.toolSlug).toBeTruthy()
    expect(err?.errors.title).toBeTruthy()
  })

  it('SavedItem accepts a valid snapshot with rate refs', () => {
    const doc = new SavedItemModel({
      uid: 'u',
      kind: 'conversion',
      toolSlug: 'conversor-de-monedas',
      title: '100 USD',
      inputs: { amount: 100, code: 'USD' },
      result: { buyResult: 4130 },
      snapshot: {
        capturedAt: new Date(),
        rates: [{ label: 'sell', currency: 'USD', rateKind: 'bestBuy', value: 41.3 }],
      },
    })
    expect(doc.validateSync()).toBeUndefined()
  })
})
