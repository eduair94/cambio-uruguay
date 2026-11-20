import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rentalPublicPropertyProjection } from '../../server/utils/rentalDetail'
import { rentalMessages } from '../../utils/rentalMessages'
import { rentalPageMessages } from '../../utils/rentalPageMessages'

// Los gastos comunes leídos del TEXTO del aviso (backend `RENTALS_GC_FROM_TEXT`, que marca la oferta
// con `commonExpensesSource: 'description'`) se publican con su origen al lado. Inerte hasta que el
// backend prenda la bandera, y por eso nada más lo vería romperse: un campo que la proyección no
// deja pasar desaparece en silencio entre Mongo y la página.
const read = (file: string) => readFileSync(resolve(__dirname, '../..', file), 'utf8')

describe('gastos comunes read from the advert text', () => {
  it('travels in the public projection, for every advert and for the matching one', () => {
    expect(rentalPublicPropertyProjection).toHaveProperty(['offers.commonExpensesSource'], 1)
    expect(rentalPublicPropertyProjection).toHaveProperty(['matchingOffer.commonExpensesSource'], 1)
  })

  it('is labelled next to the amount on the ficha and on the directory card', () => {
    for (const file of ['pages/alquileres/[key].vue', 'pages/alquileres-uruguay.vue']) {
      const source = read(file)
      expect(source, file).toContain("commonExpensesSource === 'description'")
      expect(source, file).toContain("t('expensesFromDescription')")
    }
  })

  it('has its label in the three languages of both message sets', () => {
    for (const locale of ['es', 'en', 'pt'] as const) {
      expect(rentalMessages[locale].expensesFromDescription, locale).toBeTruthy()
      expect(
        (rentalPageMessages[locale] as Record<string, string>).expensesFromDescription,
        locale
      ).toBeTruthy()
    }
    expect(rentalMessages.es.expensesFromDescription).toBe('según la descripción del aviso')
  })
})
