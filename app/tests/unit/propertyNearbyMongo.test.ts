import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import { resolvePropertyNearby } from '../../server/utils/propertyNearby'
import { haversineKm } from '../../utils/nearbyRates'

const uri = process.env.PROPERTY_NEARBY_TEST_MONGO_URI || ''
// Opt-in, read-only local QA. Never attach this integration test to a production URI.
const enabled = /^mongodb:\/\/127\.0\.0\.1:27029\/rental_budget_qa_\d+$/.test(uri)
describe.runIf(enabled)('real geospatial snapshot query (local opt-in)', () => {
  beforeAll(async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ mongoUri: uri }))
    await mongoose.connect(uri)
  })
  afterAll(async () => {
    await mongoose.disconnect()
    vi.unstubAllGlobals()
  })
  it('selects the active snapshot and three nearest points per category with honest distances', async () => {
    const result = await resolvePropertyNearby('rent', 'qa-property-experience-rent')
    expect(result?.status).toBe('ready')
    expect(result?.origin?.precision).toBe('approximate')
    expect(result?.dataAsOf).toBeTruthy()
    expect(result?.categories).toHaveLength(6)
    let total = 0
    for (const category of result!.categories) {
      expect(category.items.length).toBeLessThanOrEqual(3)
      expect(category.items.length).toBeGreaterThan(0)
      expect(category.items.map(item => item.distanceM)).toEqual(
        category.items.map(item => item.distanceM).sort((a, b) => a - b)
      )
      for (const item of category.items) {
        expect(item.distanceM).toBeLessThanOrEqual(1000)
        expect(Math.abs(item.distanceM - haversineKm(result!.origin!, item) * 1000)).toBeLessThan(3)
        expect(Object.keys(item)).not.toContain('tags')
        expect(item.walkingUrl).toContain('travelmode=walking')
      }
      total += category.items.length
    }
    expect(total).toBeGreaterThan(6)
    // Concurrent callers share the same active data; no HTTP upstream or writes are necessary.
    const repeated = await Promise.all(
      Array.from({ length: 4 }, () => resolvePropertyNearby('rent', 'qa-property-experience-rent'))
    )
    for (const item of repeated) expect(item).toEqual(result)
  })
  it('does not let an active service snapshot resurrect an unknown property', async () => {
    expect(await resolvePropertyNearby('rent', 'qa-property-that-never-existed')).toBeNull()
  })
})
