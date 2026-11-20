import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rentalMessages } from '../../utils/rentalMessages'

// Los filtros que sólo ven lo que el aviso declara (rentals-voice-04): sólo el 7,9 % de los avisos
// declara mascotas. Cada línea nombra su filtro, porque la de mascotas va debajo de una fila que
// también tiene "Con garaje" y un "lo" suelto se leía como si fuera ése.
const filters = readFileSync(
  resolve(__dirname, '../../components/rentals/SearchFilters.vue'),
  'utf8'
)

describe('declared-only filter hints', () => {
  it('names the filter each line is about, in every language', () => {
    const names = {
      es: ['Mascotas', 'Dueño directo y garantías'],
      en: ['Pets', 'Owner-direct and guarantees'],
      pt: ['Animais de estimação', 'Dono direto e garantias'],
    } as const
    for (const locale of ['es', 'en', 'pt'] as const) {
      expect(rentalMessages[locale].petsDeclaredHint, locale).toMatch(
        new RegExp(`^${names[locale][0]}: `)
      )
      expect(rentalMessages[locale].conditionsDeclaredHint, locale).toMatch(
        new RegExp(`^${names[locale][1]}: `)
      )
    }
  })

  it('puts each line right under its filters', () => {
    const at = (text: string) => {
      const index = filters.indexOf(text)
      expect(index, text).toBeGreaterThan(-1)
      return index
    }
    const petsHint = at("t('petsDeclaredHint')")
    expect(petsHint).toBeGreaterThan(at('v-model="draft.pets"'))
    expect(petsHint).toBeGreaterThan(at('v-model="draft.parking"'))
    expect(petsHint).toBeLessThan(at('v-model="draft.amenities"'))
    const conditionsHint = at("t('conditionsDeclaredHint')")
    expect(conditionsHint).toBeGreaterThan(at('v-model="draft.owner"'))
    expect(conditionsHint).toBeGreaterThan(at('v-model="draft.guarantees"'))
  })
})
