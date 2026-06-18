import { describe, it, expect } from 'vitest'
import { TelegramLinkModel } from '../../server/models/TelegramLink'
import { AlertModel } from '../../server/models/Alert'

describe('telegram models', () => {
  it('TelegramLink requires code + uid', () => {
    const err = new TelegramLinkModel({}).validateSync()
    expect(err?.errors.code).toBeTruthy()
    expect(err?.errors.uid).toBeTruthy()
  })

  it('Alert channels include telegram with default false', () => {
    const a = new AlertModel({ uid: 'u', currency: 'USD', kind: 'bestBuy', op: '>=', target: 41 })
    expect(a.channels.telegram).toBe(false)
  })
})
