import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RENTAL_LAYOUT,
  RENTAL_LAYOUT_STORAGE_KEY,
  normalizeRentalLayout,
  readRentalLayout,
  writeRentalLayout,
} from '../../utils/rentalLayout'

function stubStorage(store: Record<string, string>, broken = false) {
  const storage = {
    getItem: (key: string) => {
      if (broken) throw new Error('storage blocked')
      return key in store ? store[key] : null
    },
    setItem: (key: string, value: string) => {
      if (broken) throw new Error('storage blocked')
      store[key] = value
    },
  }
  vi.stubGlobal('window', { localStorage: storage })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rental list layout preference', () => {
  it('falls back to the mosaic for anything that is not the row layout', () => {
    expect(DEFAULT_RENTAL_LAYOUT).toBe('mosaico')
    expect(normalizeRentalLayout('lista')).toBe('lista')
    expect(normalizeRentalLayout('mosaico')).toBe('mosaico')
    expect(normalizeRentalLayout('grid')).toBe('mosaico')
    expect(normalizeRentalLayout(null)).toBe('mosaico')
    expect(normalizeRentalLayout(undefined)).toBe('mosaico')
    expect(normalizeRentalLayout(2)).toBe('mosaico')
  })

  it('reads and writes the stored choice', () => {
    const store: Record<string, string> = {}
    stubStorage(store)

    expect(readRentalLayout()).toBe('mosaico')

    writeRentalLayout('lista')
    expect(store[RENTAL_LAYOUT_STORAGE_KEY]).toBe('lista')
    expect(readRentalLayout()).toBe('lista')

    writeRentalLayout('mosaico')
    expect(readRentalLayout()).toBe('mosaico')
  })

  it('ignores a value someone else left in the key', () => {
    stubStorage({ [RENTAL_LAYOUT_STORAGE_KEY]: 'mapa' })
    expect(readRentalLayout()).toBe('mosaico')
  })

  // Ventana privada o almacenamiento bloqueado: la preferencia se pierde, la página no.
  it('survives storage that throws', () => {
    stubStorage({}, true)
    expect(readRentalLayout()).toBe('mosaico')
    expect(() => writeRentalLayout('lista')).not.toThrow()
  })

  it('does nothing on the server', () => {
    vi.stubGlobal('window', undefined)
    expect(readRentalLayout()).toBe('mosaico')
    expect(() => writeRentalLayout('lista')).not.toThrow()
  })
})
