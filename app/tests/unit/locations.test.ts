import { describe, it, expect } from 'vitest'
import { projectBackendBranch, buildLocations, type MapBranch } from '../../server/utils/locations'

const raw = {
  origin: 'brou', id: '1001-1', name: 'Sucursal Centro', dept: 'MONTEVIDEO',
  locality: 'Montevideo', address: '18 de Julio 1000', phone: '1234', hours: 'L-V 13-18',
  lat: -34.9, lng: -56.18, mapUrl: 'https://maps/x',
}

describe('projectBackendBranch', () => {
  it('projects a valid branch and tags source bcu', () => {
    const b = projectBackendBranch(raw)
    expect(b).not.toBeNull()
    expect(b!.origin).toBe('brou')
    expect(b!.name).toBe('Sucursal Centro')
    expect(b!.lat).toBeCloseTo(-34.9)
    expect(b!.source).toBe('bcu')
  })

  it('returns null when coords are missing or zero', () => {
    expect(projectBackendBranch({ ...raw, lat: 0, lng: 0 })).toBeNull()
    expect(projectBackendBranch({ ...raw, lat: undefined })).toBeNull()
  })
})

describe('buildLocations', () => {
  const extraFar: MapBranch = {
    origin: 'gales', id: 'osm-1', name: 'OSM Gales', dept: '', locality: '', address: '',
    phone: '', hours: '', lat: -34.0, lng: -55.0, mapUrl: '', source: 'osm',
  }
  const extraDup: MapBranch = {
    origin: 'brou', id: 'osm-2', name: 'OSM dup of Centro', dept: '', locality: '', address: '',
    phone: '', hours: '', lat: -34.9001, lng: -56.1801, mapUrl: '', source: 'osm',
  }

  it('keeps backend branches plus far-away extras', () => {
    const out = buildLocations([raw], [extraFar])
    expect(out).toHaveLength(2)
    expect(out.find(b => b.id === 'osm-1')).toBeTruthy()
  })

  it('drops an extra that duplicates a same-origin backend branch by proximity', () => {
    const out = buildLocations([raw], [extraDup])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1001-1')
  })

  it('skips invalid backend rows', () => {
    const out = buildLocations([{ ...raw, lat: 0, lng: 0 }], [extraFar])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('osm-1')
  })
})
