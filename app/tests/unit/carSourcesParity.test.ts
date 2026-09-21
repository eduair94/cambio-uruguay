import { describe, expect, it } from 'vitest'
import { CAR_SOURCES } from '../../../classes/autos/sources/registry'
import { CAR_SOURCE_RULES, CAR_SOURCES_PUBLIC } from '../../utils/cars'

// The backend decides which URLs a row may carry when it publishes; the API re-checks them when it
// reads. Two copies of the same rules: they must never drift.
describe('used-car source rules', () => {
  it('mirror the backend registry', () => {
    expect([...CAR_SOURCES_PUBLIC].sort()).toEqual(Object.keys(CAR_SOURCES).sort())
    for (const source of CAR_SOURCES_PUBLIC) {
      expect(CAR_SOURCE_RULES[source].name).toBe(CAR_SOURCES[source].name)
      expect(CAR_SOURCE_RULES[source].permalink.source).toBe(CAR_SOURCES[source].permalink.source)
      expect(CAR_SOURCE_RULES[source].pictureHost.source).toBe(
        CAR_SOURCES[source].pictureHost.source
      )
      // The contact API accepts a dealer's number only if it came from exactly this page.
      expect(CAR_SOURCE_RULES[source].contactPage).toBe(CAR_SOURCES[source].contactPage)
    }
  })
})
