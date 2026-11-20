import { describe, expect, it } from 'vitest'
import { guideSlugs } from '../../utils/guides'

describe('the lightweight editorial measurement allowlist', () => {
  // This test is the generator. After adding/removing a guide, regenerate with:
  // npx vitest run tests/unit/guideMeasurementSlugs.test.ts -u
  it('matches every catalog slug without shipping guide bodies in global plugins', async () => {
    const slugs = guideSlugs().sort()
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.every(slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true)
    await expect(`${JSON.stringify(slugs, null, 2)}\n`).toMatchFileSnapshot(
      '../../utils/guideMeasurementSlugs.json'
    )
  })

  it('keeps the global analytics manifest small', () => {
    expect(JSON.stringify(guideSlugs()).length).toBeLessThan(15_000)
  })
})
