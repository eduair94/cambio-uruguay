import { describe, expect, it } from 'vitest'
import {
  firstRentalBudget,
  rentalAmount,
  type FirstRentalBudgetInput,
} from '../../utils/firstRental'

const full: FirstRentalBudgetInput = {
  rent: 25000,
  monthly: 4000,
  bimonthly: 2400,
  entry: 35000,
  cgn: true,
}

describe('first rental reserve', () => {
  it('adds only the tenant CGN fee and reserves half of a two-month bill', () => {
    expect(firstRentalBudget(full)).toMatchObject({
      fee: 750,
      monthly: 30950,
      entryReserve: 65950,
      missing: [],
      invalid: [],
    })
  })

  it('does not charge CGN when another guarantee is selected', () => {
    expect(firstRentalBudget({ ...full, cgn: false })).toMatchObject({
      fee: 0,
      monthly: 30200,
      entryReserve: 65200,
    })
  })

  it('keeps unknown rent and entry costs distinct from explicit zero', () => {
    expect(firstRentalBudget({ ...full, rent: '' })).toMatchObject({
      fee: null,
      monthly: null,
      entryReserve: null,
      missing: ['rent'],
    })
    expect(firstRentalBudget({ ...full, entry: null })).toMatchObject({
      entryReserve: null,
      missing: ['entry'],
    })
    expect(firstRentalBudget({ ...full, monthly: '', bimonthly: 0, entry: 0 })).toMatchObject({
      monthly: 25750,
      entryReserve: 25750,
      missing: ['monthly'],
    })
  })

  it('rejects negative, nonfinite and excessive input and rounds money to cents', () => {
    for (const amount of [-1, Infinity, NaN, 'invalid', '1.000.000', 1_000_000_001]) {
      expect(rentalAmount(amount)).toBeNull()
    }
    expect(firstRentalBudget({ ...full, rent: '-2' }).invalid).toEqual(['rent'])
    expect(
      firstRentalBudget({ rent: '12345.67', monthly: 0, bimonthly: '100.01', entry: 0, cgn: true })
    ).toMatchObject({ fee: 370.37, monthly: 12766.05, entryReserve: 12766.05 })
  })
})
