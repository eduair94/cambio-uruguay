import { describe, expect, it } from 'vitest'
import {
  buildSearchMatch,
  buildSearchSort,
  shapeFacets,
} from '../../server/utils/charruadevsSearch'
import { normalizeSearchQuery } from '../../utils/charruadevs'

describe('charruadevs search', () => {
  it('the default search only returns public, on-topic texts', () => {
    expect(buildSearchMatch(normalizeSearchQuery({}))).toEqual({
      rel: true,
      gone: false,
      stance: { $ne: null },
    })
  })

  it('maps every filter to its field', () => {
    const m = buildSearchMatch(
      normalizeSearchQuery({
        q: 'ia',
        s: '-2,-1',
        k: 'comment',
        t: 'ia',
        ia: 'amenaza',
        ev: 'busca',
        desde: '2025',
        hasta: '2026',
      })
    )
    expect(m).toEqual({
      rel: true,
      gone: false,
      $text: { $search: 'ia', $language: 'spanish' },
      stance: { $in: [-2, -1] },
      kind: 'comment',
      themes: 'ia',
      ai: 'amenaza',
      event: 'busca',
      createdAt: { $gte: new Date('2025-01-01T00:00:00Z'), $lt: new Date('2027-01-01T00:00:00Z') },
    })
  })

  it('sorts by date, votes or text score', () => {
    expect(buildSearchSort(normalizeSearchQuery({}))).toEqual({ createdAt: -1 })
    expect(buildSearchSort(normalizeSearchQuery({ orden: 'votes' }))).toEqual({
      score: -1,
      createdAt: -1,
    })
    expect(buildSearchSort(normalizeSearchQuery({ q: 'ia', orden: 'relevance' }))).toEqual({
      ts: { $meta: 'textScore' },
      createdAt: -1,
    })
  })

  it('shapes the facets and survives an empty result', () => {
    expect(
      shapeFacets({
        total: [{ n: 5 }],
        stance: [
          { _id: -2, n: 2 },
          { _id: 1, n: 3 },
        ],
        byYear: [
          { _id: { y: 2025, s: -1 }, n: 2 },
          { _id: { y: 2025, s: 1 }, n: 3 },
        ],
      })
    ).toEqual({
      total: 5,
      stance: { '-2': 2, '-1': 0, '0': 0, '1': 3, '2': 0 },
      byYear: [{ y: 2025, neg: 2, neu: 0, pos: 3 }],
    })
    expect(shapeFacets(undefined)).toEqual({
      total: 0,
      stance: { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 },
      byYear: [],
    })
  })
})
