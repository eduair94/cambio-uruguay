import { describe, expect, it } from 'vitest'
import { mergeCarts, sanitizeStoredCart, type StoredCart } from '../../utils/cartMerge'

const cart = (items: Array<{ id: string; priceUsd?: number }>, settings = {}): StoredCart => ({
  items: items.map(i => ({
    id: i.id,
    name: `n-${i.id}`,
    priceUsd: i.priceUsd ?? 10,
    qty: 1,
    categoryId: 'general',
  })),
  settings,
})

describe('mergeCarts', () => {
  it('keeps the local cart when the account cart is empty', () => {
    const local = cart([{ id: 'a' }], { regime: 'courier' })
    const r = mergeCarts(local, cart([]))
    expect(r.items.map(i => i.id)).toEqual(['a'])
    expect(r.settings).toEqual({ regime: 'courier' })
  })

  it('keeps the account cart and its settings when local is empty', () => {
    const remote = cart([{ id: 'b' }], { regime: 'general' })
    const r = mergeCarts(cart([], { regime: 'courier' }), remote)
    expect(r.items.map(i => i.id)).toEqual(['b'])
    expect(r.settings).toEqual({ regime: 'general' })
  })

  it('unions by id with the account winning on conflict and local extras appended', () => {
    const local = cart([{ id: 'a', priceUsd: 1 }, { id: 'c' }])
    const remote = cart([{ id: 'a', priceUsd: 99 }, { id: 'b' }], { regime: 'general' })
    const r = mergeCarts(local, remote)
    expect(r.items.map(i => i.id)).toEqual(['a', 'b', 'c']) // remote order first, then local-only
    expect(r.items.find(i => i.id === 'a')!.priceUsd).toBe(99) // account wins
    expect(r.settings).toEqual({ regime: 'general' }) // account has items -> account settings
  })
})

describe('sanitizeStoredCart', () => {
  it('drops invalid items and coerces structure', () => {
    const r = sanitizeStoredCart({
      items: [
        { id: 'a', name: 'Echo', priceUsd: 49.99, qty: 2, categoryId: 'electronica' },
        { id: 'b' }, // no name/price
        null,
        'x',
      ],
      settings: { regime: 'courier' },
    })
    expect(r.items).toHaveLength(1)
    expect(r.items[0]).toMatchObject({ id: 'a', name: 'Echo', priceUsd: 49.99, qty: 2 })
    expect(r.settings).toEqual({ regime: 'courier' })
  })

  it('returns an empty cart for garbage input', () => {
    expect(sanitizeStoredCart(null)).toEqual({ items: [], settings: {} })
    expect(sanitizeStoredCart('nope')).toEqual({ items: [], settings: {} })
    expect(sanitizeStoredCart({ items: 'no' })).toEqual({ items: [], settings: {} })
  })
})
