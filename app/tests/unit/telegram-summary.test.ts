import { describe, it, expect } from 'vitest'
import { buildSummary } from '../../server/utils/telegramSummary'

describe('buildSummary', () => {
  it('greets and lists favorite casas', () => {
    const txt = buildSummary([{ type: 'casa', key: 'brou', label: 'BROU' }], [])
    expect(txt).toContain('BROU')
  })

  it('handles no favorites gracefully', () => {
    expect(buildSummary([], [])).toContain('favoritos')
  })
})
