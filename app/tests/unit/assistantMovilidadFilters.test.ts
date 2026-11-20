import { describe, expect, it } from 'vitest'
import { ASSISTANT_FILTER_TOPICS, assistantCtaMessages } from '../../utils/assistantCtaMessages'
import { assistantFilterList, assistantLink } from '../../utils/assistantPrompt'
import {
  EQUIPAR_PRODUCTOS_EMPTY_FACETS,
  equiparProductosChips,
  equiparProductosNormalize,
  equiparProductosWithout,
} from '../../utils/equiparProductos'

describe('mobility directory filters in assistant questions', () => {
  const cases = [
    ['monopatines', 'monopatin-electrico'],
    ['bicicletas', 'bicicleta-electrica'],
  ] as const

  it.each(cases)('%s keeps the active search criteria in every language', (topic, categoria) => {
    const query = equiparProductosNormalize(
      {
        categoria,
        variante: 'urbano',
        condicion: 'nuevo',
        fuente: 'tienda',
        marca: 'xiaomi',
        vendedor: 'delcar',
        precioMin: '15000',
        precioMax: '30000',
        q: 'plegable',
        orden: 'reciente',
        page: '3',
        referenceAddress: 'Dirección privada que no es un filtro',
      },
      'movilidad'
    )
    const chips = equiparProductosChips(
      query,
      {
        ...EQUIPAR_PRODUCTOS_EMPTY_FACETS,
        variantes: [{ slug: 'urbano', name: 'Urbano', count: 2 }],
        marcas: [{ slug: 'xiaomi', name: 'Xiaomi', count: 2 }],
        vendedores: [{ slug: 'delcar', name: 'Delcar', count: 2 }],
      },
      categoria
    )
    const filters = assistantFilterList(chips.map(chip => chip.label))

    expect(ASSISTANT_FILTER_TOPICS.has(topic)).toBe(true)
    for (const locale of ['es', 'en', 'pt'] as const) {
      const prompt = assistantCtaMessages[locale].qf[topic].replace('{filters}', filters)
      const writtenQuestion = assistantLink(prompt).query?.q
      expect(writtenQuestion).toContain('Urbano')
      expect(writtenQuestion).toContain('Nuevo')
      expect(writtenQuestion).toContain('Tiendas')
      expect(writtenQuestion).toContain('Xiaomi')
      expect(writtenQuestion).toContain('Delcar')
      expect(writtenQuestion).toContain('Desde $ 15.000')
      expect(writtenQuestion).toContain('Hasta $ 30.000')
      expect(writtenQuestion).toContain('plegable')
      expect(writtenQuestion).not.toContain('Dirección privada')
      expect(writtenQuestion).not.toContain('reciente')
      expect(writtenQuestion).not.toContain('page')
    }
  })

  it.each(cases)(
    '%s drops cleared filters and leaves the category to the topic',
    (_, categoria) => {
      const query = equiparProductosNormalize(
        { categoria, condicion: 'usado', precioMax: '20000' },
        'movilidad'
      )
      const cleared = equiparProductosWithout(query, ['condicion', 'precioMax'])
      const chips = equiparProductosChips(cleared, undefined, categoria)

      expect(assistantFilterList(chips.map(chip => chip.label))).toBe('')
    }
  )
})
