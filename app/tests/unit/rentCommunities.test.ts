import { describe, expect, it } from 'vitest'
import {
  AUDIENCE_LABEL,
  CHANNEL_GROUPS,
  KIND_LABEL,
  RENT_CHANNELS,
  RENT_REGIONS,
  RISK_META,
  channelsByGroup,
  facebookGroupsByRegion,
  type ChannelAudience,
  type ChannelGroupId,
  type ChannelKind,
  type ChannelRisk,
  type RegionId,
} from '../../utils/rentCommunities'

const RISKS = new Set<ChannelRisk>(['bajo', 'medio', 'alto'])
const AUDIENCES = new Set<ChannelAudience>([
  'buscar',
  'publicar',
  'ambos',
  'roommates',
  'estudiantes',
])
const KINDS = new Set<ChannelKind>([
  'reddit',
  'facebook-group',
  'facebook-page',
  'facebook-search',
  'plataforma',
  'institucional',
])
const GROUP_IDS = new Set<ChannelGroupId>(CHANNEL_GROUPS.map(g => g.id))
const REGION_IDS = new Set<RegionId>(RENT_REGIONS.map(r => r.id))

describe('rentCommunities - data integrity', () => {
  it('has a solid, comprehensive set of channels', () => {
    expect(RENT_CHANNELS.length).toBeGreaterThanOrEqual(30)
  })

  it('every channel has a name, honest note and https url', () => {
    for (const c of RENT_CHANNELS) {
      expect(c.name.trim().length).toBeGreaterThan(2)
      expect(c.note.trim().length).toBeGreaterThan(40)
      expect(c.url).toMatch(/^https:\/\/\S+$/)
    }
  })

  it('every channel uses declared enums', () => {
    for (const c of RENT_CHANNELS) {
      expect(RISKS.has(c.risk)).toBe(true)
      expect(AUDIENCES.has(c.audience)).toBe(true)
      expect(KINDS.has(c.kind)).toBe(true)
      expect(GROUP_IDS.has(c.group)).toBe(true)
    }
  })

  it('has no duplicate urls', () => {
    const urls = RENT_CHANNELS.map(c => c.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('facebook channels declare a valid department; others do not', () => {
    for (const c of RENT_CHANNELS) {
      if (c.group === 'facebook') {
        expect(c.department).toBeDefined()
        expect(REGION_IDS.has(c.department as RegionId)).toBe(true)
      } else {
        expect(c.department).toBeUndefined()
      }
    }
  })

  it('metadata maps cover every used enum value', () => {
    for (const c of RENT_CHANNELS) {
      expect(RISK_META[c.risk]).toBeDefined()
      expect(AUDIENCE_LABEL[c.audience]).toBeTruthy()
      expect(KIND_LABEL[c.kind]).toBeTruthy()
    }
  })
})

describe('rentCommunities - grouping', () => {
  it('channelsByGroup partitions every channel exactly once', () => {
    const total = CHANNEL_GROUPS.reduce((n, g) => n + channelsByGroup(g.id).length, 0)
    expect(total).toBe(RENT_CHANNELS.length)
  })

  it('every declared group has at least one channel', () => {
    for (const g of CHANNEL_GROUPS) expect(channelsByGroup(g.id).length).toBeGreaterThan(0)
  })

  it('facebookGroupsByRegion covers every facebook channel exactly once', () => {
    const fbTotal = RENT_CHANNELS.filter(c => c.group === 'facebook').length
    const grouped = facebookGroupsByRegion().reduce((n, g) => n + g.channels.length, 0)
    expect(grouped).toBe(fbTotal)
    expect(fbTotal).toBeGreaterThanOrEqual(20)
  })

  it('facebookGroupsByRegion preserves the declared region order and drops empties', () => {
    const groups = facebookGroupsByRegion()
    for (const g of groups) expect(g.channels.length).toBeGreaterThan(0)
    const order = RENT_REGIONS.map(r => r.id)
    const groupedOrder = groups.map(g => g.region.id)
    let i = 0
    for (const id of groupedOrder) {
      i = order.indexOf(id, i)
      expect(i).toBeGreaterThanOrEqual(0)
      i++
    }
  })

  it('covers the interior, not just Montevideo', () => {
    const regionsWithGroups = new Set(facebookGroupsByRegion().map(g => g.region.id))
    for (const id of ['maldonado', 'litoral', 'norte', 'pais'] as const) {
      expect(regionsWithGroups.has(id)).toBe(true)
    }
  })
})
