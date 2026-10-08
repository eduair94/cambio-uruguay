import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import { rentalMessages } from '../../utils/rentalMessages'

// The directory's cards said "1 dormitorios" and "1 baños", and the exact-bedrooms chip
// "1 Dormitorios" (2026-10-08): a number glued to the plural label.
describe('bedroom and bathroom counts on the rental directory', () => {
  const t = (locale: 'es' | 'en' | 'pt') =>
    createI18n({ legacy: false, locale, messages: rentalMessages as never }).global.t

  it('agree with their number in every language', () => {
    expect(t('es')('bedroomCount', { n: 1 }, 1)).toBe('1 dormitorio')
    expect(t('es')('bedroomCount', { n: 3 }, 3)).toBe('3 dormitorios')
    expect(t('es')('bathroomCount', { n: 1 }, 1)).toBe('1 baño')
    expect(t('es')('bathroomCount', { n: 2 }, 2)).toBe('2 baños')
    expect(t('es')('bedroomsAtLeast', { n: 2 })).toBe('2+ dormitorios')
    expect(t('en')('bedroomCount', { n: 1 }, 1)).toBe('1 bedroom')
    expect(t('pt')('bathroomCount', { n: 1 }, 1)).toBe('1 banheiro')
  })

  it('are never built by gluing a number to the plural label again', () => {
    const page = readFileSync(
      new URL('../../pages/alquileres-uruguay.vue', import.meta.url),
      'utf8'
    )
    expect(page).not.toMatch(/\}\s*\$\{t\('(?:bedrooms|bathrooms)'\)/)
  })
})
