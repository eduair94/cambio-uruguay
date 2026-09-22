import { describe, expect, it } from 'vitest'
import { rentalValidKey } from '../../utils/rentals'

describe('rentalValidKey', () => {
  it.each([
    'montevideo-cordon-1',
    'uy-1a2b3c',
    'canelones-ciudad-de-la-costa-avenida-giannattasio-x9f2',
    'pilot',
    'a',
  ])('accepts the <slug>-<hash> shape the backend mints: %s', key => {
    expect(rentalValidKey(key)).toBe(true)
  })

  // Lo que llegaba a producción por enlaces rotos del cliente y corría el pipeline entero de la
  // ficha antes de terminar en 404.
  it.each([
    'null',
    'undefined',
    '',
    '   ',
    'Montevideo-Cordon',
    'cordon 1',
    '-cordon',
    'cordón-1',
    'a'.repeat(182),
    'x'.repeat(513),
    null,
    undefined,
    42,
  ])('rejects what cannot be a listing key: %j', value => {
    expect(rentalValidKey(value)).toBe(false)
  })
})
