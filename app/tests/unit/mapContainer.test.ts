import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mapContainerAvailable } from '../../utils/mapContainer'

describe('mapContainerAvailable', () => {
  it('accepts only an attached element that no Leaflet map owns yet', () => {
    expect(mapContainerAvailable({ isConnected: true })).toBe(true)
    // Unmounted while Leaflet loaded: the ref went null (Sentry CAMBIO-URUGUAY-BACKEND-17).
    expect(mapContainerAvailable(null)).toBe(false)
    expect(mapContainerAvailable(undefined)).toBe(false)
    expect(mapContainerAvailable({ isConnected: false })).toBe(false)
    // Another init got there first: Leaflet would throw "already initialized".
    expect(mapContainerAvailable({ isConnected: true, _leaflet_id: 12 })).toBe(false)
  })
})

describe('LocationsMap lazy init', () => {
  const source = readFileSync(resolve(__dirname, '../../components/map/LocationsMap.vue'), 'utf8')
  const init = source.slice(source.indexOf('async function init()'))

  it('re-checks its container after the Leaflet imports and before L.map', () => {
    const lastImport = init.indexOf(
      "import('leaflet.markercluster/dist/MarkerCluster.Default.css')"
    )
    const guard = init.indexOf('mapContainerAvailable(container)')
    const create = init.indexOf('L.map(container')
    expect(lastImport).toBeGreaterThan(0)
    expect(guard).toBeGreaterThan(lastImport)
    expect(create).toBeGreaterThan(guard)
    expect(init.slice(guard - 80, guard)).toContain('run !== lifecycle')
  })

  it('invalidates a pending init when the component unmounts', () => {
    const unmount = source.slice(source.indexOf('onBeforeUnmount('))
    expect(unmount.slice(0, 80)).toContain('lifecycle++')
  })
})
