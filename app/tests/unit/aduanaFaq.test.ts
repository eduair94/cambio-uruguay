import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ADUANA_FAQ_CATEGORIES,
  ADUANA_FAQ_LAST_REVIEWED,
  ADUANA_FAQ_POSTAL_VERIFIED_AT,
  ADUANA_FAQ_SOURCES,
  ADUANA_FAQS,
  aduanaFaqGroups,
  aduanaFaqHaystack,
  aduanaFaqLastModified,
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
    // The acronym people read on the invoice is TSPU; the official one is TFSPU. Both must hit.
    expect(matchingIds('tspu')).toContain('que-es-la-tspu')
    expect(matchingIds('tfspu')).toContain('que-es-la-tspu')
    expect(matchingIds('operador postal')).toContain('courier-habilitado-operador-postal')
  })

  it('defines the TSPU instead of leaving it as a bare acronym', () => {
    const tspu = ADUANA_FAQS.find(faq => faq.id === 'que-es-la-tspu')!

    expect(tspu.answer).toContain('Tasa de Financiamiento del Servicio Postal Universal')
    expect(tspu.answer).toContain('10% del precio del envío o servicio postal excluido el IVA')
    expect(tspu.basis).toBe('norma')
    // The 10% has a statute behind it, so the norm — not just URSEC's explainer — must be cited.
    expect(tspu.sourceIds).toContain('ley-19009-15')
    expect(ADUANA_FAQ_SOURCES['ley-19009-15']!.url).toBe(
      'https://www.impo.com.uy/bases/leyes/19009-2012/15'
    )
  })

  it('never claims the TFSPU is the only charge on the invoice with a statutory rate', () => {
    const tspu = ADUANA_FAQS.find(faq => faq.id === 'que-es-la-tspu')!

    // It used to close with "el único recargo con alícuota fijada por ley". None of its three
    // sources says that, and the invoice disproves it: the VAT the courier adds to its own handling
    // fee ("manejo US$5+IVA" in courierShipping.ts) is a below-the-freight charge whose rate is also
    // set by statute. What the norm supports is what the tax IS, not a ranking of the other lines.
    expect(tspu.answer).not.toMatch(/único\s+(recargo|cargo)/i)
    expect(tspu.answer).not.toMatch(/el único.*alícuota fijada por ley/i)

    // Replaced by something the cited sources do support, and that the reader can act on.
    expect(tspu.answer).toContain('discriminada, clara y legible')
    expect(tspu.answer).toContain('Res. URSEC 315/2024, art. 17 lit. i')
    expect(tspu.sourceIds).toContain('ursec-obligaciones-operadores')
    // The statutory rate must not be read as a cap on the operator's own prices.
    expect(tspu.answer).toContain('precio libre')
  })

  it('publishes a dateModified that covers partial passes, not just the full review', () => {
    // ADUANA_FAQ_POSTAL_VERIFIED_AT existed but nothing consumed it, so the page fed the FAQPage
    // schema ADUANA_FAQ_LAST_REVIEWED and told Google the catalogue was untouched since 2026-07-26
    // while two answers had been rewritten later. Modified ≠ reviewed-in-full.
    const modified = aduanaFaqLastModified()

    expect(modified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(modified >= ADUANA_FAQ_LAST_REVIEWED).toBe(true)
    expect(modified >= ADUANA_FAQ_POSTAL_VERIFIED_AT).toBe(true)
    expect(modified).toBe([ADUANA_FAQ_LAST_REVIEWED, ADUANA_FAQ_POSTAL_VERIFIED_AT].sort().at(-1))
    // While a partial pass is more recent, the two must not collapse into the same date.
    if (ADUANA_FAQ_POSTAL_VERIFIED_AT > ADUANA_FAQ_LAST_REVIEWED) {
      expect(modified).not.toBe(ADUANA_FAQ_LAST_REVIEWED)
    }
  })

  it('actually feeds that date to the page, in the schema and on screen', () => {
    // The helper above existed and nothing imported it: the page kept publishing
    // `dateModified: ADUANA_FAQ_LAST_REVIEWED` to Google and "revisadas el 26 de julio" to the
    // reader while two answers carried a later stamp. A correct helper nobody calls fixes nothing.
    const page = readFileSync(
      fileURLToPath(
        new URL('../../pages/preguntas-frecuentes-aduana-uruguay.vue', import.meta.url)
      ),
      'utf8'
    )

    expect(page).toContain('aduanaFaqLastModified')
    expect(page).not.toMatch(/dateModified:\s*ADUANA_FAQ_LAST_REVIEWED/)
    expect(page).toMatch(/dateModified:\s*lastModified\b/)
    // The visible label must show it too — but never INSTEAD of the full-review date, which would
    // claim all 90+ answers were re-read on the day only the postal block was.
    expect(page).toContain('lastModifiedLabel')
    expect(page).toContain('lastReviewedLabel')
  })

  it('stops the courier-charges answer from omitting the one surcharge with a statute', () => {
    const cargos = ADUANA_FAQS.find(faq => faq.id === 'cargos-courier-vs-tributos')!

    expect(cargos.answer).toContain('TSPU')
    expect(cargos.answer).toContain('discriminada, clara y legible')
    expect(cargos.sourceIds).toContain('ley-19009-15')

    // The caveat must END on the private services. "…salvo la TFSPU, que tiene alícuota fijada por
    // ley, no localizamos una tarifa máxima…" put the tax back inside "esos servicios privados",
    // the exact set the same paragraph had just taken it out of, and smuggled back in a quieter
    // register the "único con alícuota fijada por ley" claim removed as unfounded — the IVA and the
    // 60% have statutory rates too.
    expect(cargos.answer).not.toMatch(/salvo la TFSPU/i)
    expect(cargos.answer).not.toMatch(/alícuota fijada por ley/i)
    expect(cargos.answer).toMatch(
      /no localizamos una tarifa máxima general para esos servicios privados\.$/
    )
  })

  it('sends the habilitación check to the live URSEC registry, never to a frozen list', () => {
    const habilitado = ADUANA_FAQS.find(faq => faq.id === 'courier-habilitado-operador-postal')!

    expect(habilitado.sourceIds).toContain('ursec-listado-operadores')
    expect(ADUANA_FAQ_SOURCES['ursec-listado-operadores']!.authority).toBe('URSEC')
    expect(habilitado.answer).toContain('Registro General de Prestadores del Servicio Postal')
    // A per-courier boolean is the bug this answer exists to avoid: it must not name operators.
    const named = ['Gripper', 'Aerobox', 'DHL', 'UPS', 'Urubox']
    expect(named.filter(name => habilitado.answer.includes(name))).toEqual([])
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
