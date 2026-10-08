import { describe, expect, it } from 'vitest'
import { rentalAdvertiserLine } from '../../utils/rentals'
import { rentalMessages } from '../../utils/rentalMessages'

// ~41.000 of the 62.000 live cards (2026-10-08) printed a bare "Sin informar" — or "Sin informar ·
// Alicia Camoirano" — as their first footnote: the advertiser TYPE was unknown, but nothing said that
// the line was about the advertiser. 28.000 of them are Mercado Libre cards, whose seller name is
// generic and hidden.
const es = (key: string, values: Record<string, unknown> = {}) =>
  String(rentalMessages.es[key as keyof typeof rentalMessages.es]).replace(/\{(\w+)\}/g, (_, k) =>
    String(values[k])
  )

describe('the advertiser line of a rental card', () => {
  it('says the line is about the advertiser when its type is unknown', () => {
    expect(
      rentalAdvertiserLine({ sellerType: 'desconocido', sellerName: 'Mercado Libre' }, es)
    ).toBe('Anunciante sin identificar')
    expect(rentalAdvertiserLine({ sellerType: 'desconocido', sellerName: '' }, es)).toBe(
      'Anunciante sin identificar'
    )
    expect(
      rentalAdvertiserLine({ sellerType: 'desconocido', sellerName: 'Alicia Camoirano' }, es)
    ).toBe('Anunciante: Alicia Camoirano')
    expect(rentalAdvertiserLine(null, es)).toBe('Anunciante sin identificar')
  })

  it('keeps the type when the portal gave it, and the declared owner first', () => {
    expect(
      rentalAdvertiserLine({ sellerType: 'inmobiliaria', sellerName: 'Grupo Avanza' }, es)
    ).toBe('Inmobiliaria · Grupo Avanza')
    expect(rentalAdvertiserLine({ sellerType: 'particular', sellerName: 'particular' }, es)).toBe(
      'Publicado por particular'
    )
    expect(
      rentalAdvertiserLine(
        { sellerType: 'desconocido', sellerName: 'Ana', ownerDirect: { declared: true } as never },
        es
      )
    ).toBe('Dueño directo declarado · Ana')
  })

  it('has the two new lines in every language', () => {
    for (const locale of ['es', 'en', 'pt'] as const) {
      expect(rentalMessages[locale]).toHaveProperty('advertiserUnknown')
      expect(rentalMessages[locale].advertiserNamed).toContain('{name}')
    }
  })
})
