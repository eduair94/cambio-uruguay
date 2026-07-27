import { describe, expect, it } from 'vitest'

import {
  ADUANA_FAQ_CATEGORIES,
  ADUANA_FAQ_SOURCES,
  ADUANA_FAQS,
  aduanaFaqGroups,
  aduanaFaqHaystack,
  aduanaFaqSources,
} from '../../utils/aduanaFaq'

describe('aduana FAQ catalogue', () => {
  it('keeps broad Reddit-question coverage without duplicate identifiers', () => {
    expect(ADUANA_FAQS.length).toBeGreaterThanOrEqual(90)

    const ids = ADUANA_FAQS.map(faq => faq.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every answer a valid category, evidence label and resolvable source', () => {
    const categories = new Set(ADUANA_FAQ_CATEGORIES.map(category => category.id))

    for (const faq of ADUANA_FAQS) {
      expect(categories.has(faq.category), `unknown category in ${faq.id}`).toBe(true)
      expect(['norma', 'procedimiento', 'zona-gris']).toContain(faq.basis)
      expect(faq.question).toContain('?')
      expect(faq.shortAnswer.length).toBeGreaterThan(15)
      expect(faq.answer.length).toBeGreaterThan(40)
      expect(faq.tags.length).toBeGreaterThan(0)
      expect(faq.sourceIds.length).toBeGreaterThan(0)
      expect(
        faq.sourceIds.filter(sourceId => !ADUANA_FAQ_SOURCES[sourceId]),
        `missing source in ${faq.id}`
      ).toEqual([])
      expect(aduanaFaqSources(faq)).toHaveLength(faq.sourceIds.length)

      if (faq.related) expect(faq.related.to).toMatch(/^\//)
    }
  })

  it('uses secure, named primary or first-party procedural sources', () => {
    for (const source of Object.values(ADUANA_FAQ_SOURCES)) {
      const url = new URL(source.url)
      expect(url.protocol).toBe('https:')
      expect(source.label).toBeTruthy()
      expect(source.authority).toBeTruthy()
      expect(['norma', 'fuente-oficial', 'operador']).toContain(source.kind)
    }
  })

  it('covers every category and keeps the grouped count exact', () => {
    const groups = aduanaFaqGroups()
    expect(groups.map(group => group.id)).toEqual(
      ADUANA_FAQ_CATEGORIES.map(category => category.id)
    )
    expect(groups.reduce((total, group) => total + group.items.length, 0)).toBe(ADUANA_FAQS.length)
  })

  it('finds recurring questions despite accents and Reddit wording', () => {
    const matchingIds = (query: string) =>
      ADUANA_FAQS.filter(faq => aduanaFaqHaystack(faq).includes(query)).map(faq => faq.id)

    expect(matchingIds('semillas')).toContain('alimentos-semillas-plantas')
    expect(matchingIds('baterias')).toContain('baterias-power-bank')
    expect(matchingIds('tarjeta')).toContain('datos-tarjeta-aduana')
    expect(matchingIds('retenido')).toContain('despacho-simplificado-retenido')
  })

  it('pins the three corrections most likely to drift', () => {
    const byId = new Map(ADUANA_FAQS.map(faq => [faq.id, faq]))

    expect(byId.get('datos-tarjeta-aduana')?.answer).toContain(
      'no recibe del emisor historial de compras'
    )
    expect(byId.get('despacho-simplificado-retenido')?.answer).toContain('Lo solicita el operador')
    expect(byId.get('saldo-franquicia-no-alcanza')?.answer).toContain(
      'No atribuimos esta conclusión al art. 15'
    )
  })
})
