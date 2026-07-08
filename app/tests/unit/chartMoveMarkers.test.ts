import { describe, it, expect } from 'vitest'
import { markPoints } from '../../utils/chartMoveMarkers'

describe('markPoints', () => {
  it('highlights a date that matches a move, keeping others at default', () => {
    const dates = [
      '2026-06-01T00:00:00.000Z',
      '2026-06-02T00:00:00.000Z',
      '2026-06-03T00:00:00.000Z',
    ]
    const moves = [{ date: '2026-06-02', direction: 'up' as const }]
    const out = markPoints(dates, moves, 'rgb(75, 192, 192)')
    expect(out.pointRadius).toEqual([3, 6, 3])
    expect(out.pointBackgroundColor).toEqual(['rgb(75, 192, 192)', '#16c784', 'rgb(75, 192, 192)'])
  })

  it('colors a down move red', () => {
    const out = markPoints(
      ['2026-06-02T00:00:00.000Z'],
      [{ date: '2026-06-02', direction: 'down' }],
      'rgb(255, 99, 132)'
    )
    expect(out.pointBackgroundColor).toEqual(['#ea3943'])
  })

  it('a flat move highlights radius but keeps the default color', () => {
    const out = markPoints(
      ['2026-06-02T00:00:00.000Z'],
      [{ date: '2026-06-02', direction: 'flat' }],
      'rgb(75, 192, 192)'
    )
    expect(out.pointRadius).toEqual([6])
    expect(out.pointBackgroundColor).toEqual(['rgb(75, 192, 192)'])
  })

  it('matches by calendar day regardless of the chart date carrying a full ISO timestamp', () => {
    const out = markPoints(['2026-06-02T03:00:00.000Z'], [{ date: '2026-06-02', direction: 'up' }], '#000')
    expect(out.pointRadius).toEqual([6])
  })

  it('returns all defaults when there are no moves, or dates is empty', () => {
    expect(markPoints(['2026-06-01T00:00:00.000Z'], [], '#abc')).toEqual({
      pointRadius: [3],
      pointBackgroundColor: ['#abc'],
    })
    expect(markPoints([], [{ date: '2026-06-01', direction: 'up' }], '#abc')).toEqual({
      pointRadius: [],
      pointBackgroundColor: [],
    })
  })

  it('respects custom default/highlight radius', () => {
    const out = markPoints(
      ['2026-06-01T00:00:00.000Z'],
      [{ date: '2026-06-01', direction: 'up' }],
      '#abc',
      2,
      9
    )
    expect(out.pointRadius).toEqual([9])
  })
})
