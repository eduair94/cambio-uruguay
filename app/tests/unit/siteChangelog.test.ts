import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHANGE_KINDS,
  CHANGE_ORIGINS,
  SITE_CHANGES,
  changesByMonth,
  formatChangeDate,
  formatChangeMonth,
} from '../../utils/siteChangelog'

const APP = join(__dirname, '..', '..')

/** A route is real when its page file exists (static or `index.vue`). */
const pageExists = (to: string) => {
  const path = to.replace(/^\//, '')
  return (
    existsSync(join(APP, 'pages', `${path}.vue`)) ||
    existsSync(join(APP, 'pages', path, 'index.vue'))
  )
}

describe('/novedades: the public changelog', () => {
  it('lists the newest change first, with real calendar dates', () => {
    for (const change of SITE_CHANGES) {
      expect(change.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(`${change.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(change.date)
    }
    const dates = SITE_CHANGES.map(change => change.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('uses only the declared kinds and origins', () => {
    for (const change of SITE_CHANGES) {
      expect(CHANGE_KINDS).toContain(change.kind)
      if (change.origin) expect(CHANGE_ORIGINS).toContain(change.origin)
    }
  })

  it('never repeats an entry and keeps titles short enough to scan', () => {
    const keys = SITE_CHANGES.map(change => `${change.date}|${change.title}`)
    expect(new Set(keys).size).toBe(keys.length)
    for (const change of SITE_CHANGES) {
      expect(change.title.length).toBeLessThanOrEqual(70)
      expect(change.body.length).toBeGreaterThan(20)
    }
  })

  // A link to a page that does not exist is a 404 on the one page that says we fix things.
  it('links only to pages that exist', () => {
    const missing = SITE_CHANGES.filter(change => change.to && !pageExists(change.to)).map(
      change => change.to
    )
    expect(missing).toEqual([])
  })

  // The repo is public and so is this page: no revenue, no dollars earned, no internal tooling.
  it('says nothing about income or internal plumbing', () => {
    const forbidden = /ingreso|rpm|adsense|factur|mongo|pm2|cron|commit|PR #|#\d{3}/i
    const offenders = SITE_CHANGES.filter(change =>
      forbidden.test(`${change.title} ${change.body}`)
    )
    expect(offenders.map(change => change.title)).toEqual([])
  })

  it('groups consecutive entries by month, in order', () => {
    const groups = changesByMonth([
      { date: '2026-11-21', kind: 'nuevo', title: 'a', body: 'x'.repeat(30) },
      { date: '2026-11-02', kind: 'mejora', title: 'b', body: 'x'.repeat(30) },
      { date: '2026-10-30', kind: 'arreglo', title: 'c', body: 'x'.repeat(30) },
    ])
    expect(groups.map(group => [group.month, group.items.length])).toEqual([
      ['2026-11', 2],
      ['2026-10', 1],
    ])
  })

  // Read in UTC at noon: the edge serves one copy, and a local-time date could flip a day between
  // the server HTML and the hydrated page.
  it('formats dates without depending on the time zone', () => {
    expect(formatChangeDate('2026-11-01')).toMatch(/^1 de noviembre$/)
    expect(formatChangeMonth('2026-11')).toBe('Noviembre de 2026')
  })
})
