import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ADUANA_FAQ_CARGOS_OPERADOR_VERIFIED_AT,
  ADUANA_FAQ_CATEGORIES,
  ADUANA_FAQ_IDENTIDAD_Y_TRIBUTOS_VERIFIED_AT,
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
    // Every partial stamp has to be in the max, or the day it was written is the day the page
    // stops telling the truth. A new constant that nobody folds in here is the original bug.
    expect(modified >= ADUANA_FAQ_IDENTIDAD_Y_TRIBUTOS_VERIFIED_AT).toBe(true)
    expect(modified >= ADUANA_FAQ_CARGOS_OPERADOR_VERIFIED_AT).toBe(true)
    expect(modified).toBe(
      [
        ADUANA_FAQ_LAST_REVIEWED,
        ADUANA_FAQ_POSTAL_VERIFIED_AT,
        ADUANA_FAQ_IDENTIDAD_Y_TRIBUTOS_VERIFIED_AT,
        ADUANA_FAQ_CARGOS_OPERADOR_VERIFIED_AT,
      ]
        .sort()
        .at(-1)
    )
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

  // The catalogue answered "no podés usar la franquicia de otra persona" six different ways and
  // said nothing to the person whose franquicia somebody else used — grep for suplantación /
  // usurpación / robo de identidad returned zero across the repo. The victim's side must stay
  // reachable by the words a victim actually types.
  it('answers the victim of an identity misuse, not only the person borrowing a cédula', () => {
    const matchingIds = (query: string) =>
      ADUANA_FAQS.filter(faq => aduanaFaqHaystack(faq).includes(query)).map(faq => faq.id)

    for (const query of ['suplantacion', 'usurpacion', 'usaron mi cedula', 'cupo consumido']) {
      expect(matchingIds(query), `nothing matches "${query}"`).toContain(
        'franquicias-usadas-que-no-hice'
      )
    }

    const victima = ADUANA_FAQS.find(faq => faq.id === 'franquicias-usadas-que-no-hice')!

    // The absence IS the answer here: no published way to get a consumed cupo back. If a future
    // pass finds the procedure, this assertion is what forces the answer to be rewritten instead
    // of leaving the "no existe" standing next to a link that now exists.
    expect(victima.answer).toContain(
      'no localizamos ningún procedimiento publicado para que te devuelvan un cupo'
    )
    expect(victima.basis).toBe('zona-gris')
    // Grounded in the DNA's own case and its own procedures, never in a press summary.
    expect(victima.sourceIds).toContain('dna-caso-60-cedulas')
    expect(victima.sourceIds).toContain('dna-denuncias-tramite')
    expect(victima.sourceIds).toContain('dna-franquicias-utilizadas')
    // The data-protection channel is reused for the victim's case, not only for card privacy.
    expect(victima.answer).toContain('DatosPersonales@aduanas.gub.uy')
    // The 2023 page it cites is from the PREVIOUS regime and must be labelled as such, or the
    // reader takes a superseded lever for a current one.
    expect(ADUANA_FAQ_SOURCES['dna-cupo-orden-llegada']!.label).toContain('régimen anterior')
    // It must not promise the victim gets sanctioned, nor that she is safe: neither is sourced.
    expect(victima.answer).toContain('No decimos que se sancione a la víctima')
  })

  it('maps Mercado Libre to the same franquicia, and to its own cancel-and-refund rule', () => {
    const ml = ADUANA_FAQS.find(faq => faq.id === 'mercado-libre-internacional')!

    expect(ml.category).toBe('correo-courier-plataformas')
    expect(ml.sourceIds).toContain('ml-compra-internacional')
    // The failure mode is a shipment that never arrives, not a surprise bill — ML's own words.
    expect(ml.answer).toContain('la compra se canceló')
    expect(ml.sourceIds).toContain('ml-paquete-cancelado')
    // Amazon's checkout takes a deposit; here the operator liquidates and pays before delivery.
    expect(ml.answer).toContain('hasta haber acreditado dicho pago')
    // Absent from the DNA registry, with the reason — the registry only gates the US IVA relief.
    expect(ml.answer).toMatch(/no figura en la nómina de vendedores extranjeros registrados/)
    expect(ml.answer).toContain('desde China')
    // The 5-unit cap is the platform's, and the answer must not launder it into the norm — the
    // catalogue elsewhere states there is no official number.
    expect(ml.answer).toContain('es una regla de la plataforma, no de la norma')
  })

  it('refuses to promise a tax refund on returns, and counts the warranty replacement', () => {
    const dev = ADUANA_FAQS.find(faq => faq.id === 'devolver-lo-importado-reembolso')!

    expect(dev.answer).toContain('no localizamos ningún régimen que te reintegre los tributos')
    // art. 152 is about goods that were EXPORTED and come back — the trap this answer defuses.
    expect(dev.sourceIds).toContain('carou-152')
    expect(dev.answer).toContain('antes de su exportación definitiva')
    // The relief that does exist is "no volver a pagar", never "recuperar lo pagado".
    expect(dev.sourceIds).toContain('carou-159')
    expect(dev.answer).toContain('sin el pago de tributos')
    expect(dev.answer).toContain('es no volver a pagar, no recuperar lo pagado')
    // The honest negative the 24-comment thread never got: the replacement consumes a franquicia.
    expect(dev.answer).toContain('independientemente de sus respectivos montos y características')
  })

  it('splits the books answer by regime instead of exempting them everywhere', () => {
    const libros = ADUANA_FAQS.find(faq => faq.id === 'libros-cd-dvd-iva')!

    // Under the 60% the exemption buys nothing: the prestación única substitutes the IVA itself.
    // Stating the exemption flatly would contradict importTax.ts, which applies the rate blind to
    // product type — and importTax.ts is right.
    expect(libros.answer).toContain('en sustitución a toda tributación')
    expect(libros.answer).toContain('el 60% se aplica plano')
    expect(libros.sourceIds).toContain('ley-20446-627')
    // The bridge from the enajenación exemption to the IMPORT is a specific literal; without it
    // the whole answer is an assumption.
    expect(libros.sourceIds).toContain('todgi-t10-38')
    expect(libros.answer).toContain('Bienes cuya enajenación se exonera por este artículo')
    // CD/DVD ride on lit. P, and it is the WORK that qualifies, not the disc.
    expect(libros.answer).toContain('Obras de carácter musical y cinematográfico')
    expect(libros.answer).toContain('no son obra musical ni cinematográfica')
    // The US$ 800 carve-out reaches the amount only, and names books — not discs.
    expect(libros.answer).toContain('Exceptúa del MONTO, no de la cuenta de tres envíos')
    // The courier line item that reads like a tax break and is not one.
    expect(libros.answer).toContain('TARIFA DE FLETE')
    expect(libros.answer).toContain('no una exoneración de Aduana ni un beneficio fiscal')
  })

  it('states the US$ 20 minimum in the direction the norm states it', () => {
    const libros = ADUANA_FAQS.find(faq => faq.id === 'libros-cd-dvd-iva')!

    // art. 13-T10 lit. B says the minimum ALWAYS applies "salvo que el envío postal esté integrado
    // exclusivamente por bienes cuya importación se encuentra exonerada". The answer used to glue
    // that "salvo que" onto a negation — «trae su propia salvedad y no se aplica "salvo que…"» —
    // which reads as the exact opposite: the minimum would only bite the all-books parcel. The very
    // next sentence ("Un paquete de puros libros no paga ni ese mínimo") contradicted it.
    expect(libros.answer).toContain('no se aplica cuando el envío está')
    expect(libros.answer).not.toMatch(/no se aplica\s*"?salvo que/i)
    // Positive restatement, so a future rewrite cannot flip the polarity silently.
    expect(libros.answer).toContain('el mínimo corre siempre, salvo en ese caso')
    expect(libros.answer).toContain('Un paquete de puros libros no paga ni ese mínimo')
    expect(libros.sourceIds).toContain('todgi-t10-13')

    // The same point in the ML answer was already written correctly; both must stay aligned.
    const ml = ADUANA_FAQS.find(faq => faq.id === 'mercado-libre-internacional')!
    expect(ml.answer).toContain('no se aplica cuando el envío está')
  })

  it('publishes the books IVA exemption next to the sources that omit it', () => {
    const libros = ADUANA_FAQS.find(faq => faq.id === 'libros-cd-dvd-iva')!

    // The normative chain (art. 38 num. 1 lit. H/P + num. 3 lit. B) holds and stays: when the DNA's
    // table and the statute disagree, the statute wins. But "cero" was published flat, with basis
    // `norma` and no warning, while every administrative source the reader can reach says 22% —
    // leaving them with nothing to say when the postal operator liquidates it anyway.
    expect(libros.answer).toContain('es la diferencia entre cero y 60%')
    expect(libros.answer).toContain('ninguna fuente administrativa publica esta exoneración')
    expect(libros.answer).toContain(
      'Se tributa IVA por estas compras salvo, las siguientes situaciones que están exoneradas'
    )
    expect(libros.answer).toContain('no nombra libros ni CD ni DVD')
    expect(libros.answer).toContain('No localizamos ningún pronunciamiento de la DNA sobre libros')
    // Who actually charges it is the whole reason the caveat matters (Dec. 50/026 art. 8).
    expect(libros.answer).toContain('hasta haber acreditado dicho pago')
    // And the reader leaves with a move, not just a doubt.
    expect(libros.answer).toContain('pedí la liquidación discriminada')

    // Every leg of the counterpoint has to be clickable, exactly like the conclusion.
    for (const id of ['dna-franquicia', 'mef-faq', 'ml-compra-internacional']) {
      expect(libros.sourceIds, `counterpoint source ${id} missing`).toContain(id)
    }
    expect(ADUANA_FAQ_SOURCES['dna-franquicia']!.authority).toBe('Dirección Nacional de Aduanas')
    expect(ADUANA_FAQ_SOURCES['mef-faq']!.authority).toBe('Ministerio de Economía y Finanzas')
  })

  it('lets the reader open the export regimes the returns answer rules out', () => {
    const dev = ADUANA_FAQS.find(faq => faq.id === 'devolver-lo-importado-reembolso')!

    // "no localizamos ningún régimen que te reintegre los tributos" rested on a one-line aside about
    // devolución a la exportación and Drawback that cited nothing: none of the six sources mentioned
    // either, and `dna-regimen-general` was listed without the text ever using it.
    expect(dev.sourceIds).toContain('dna-devolucion-tributos-exportacion')
    expect(dev.sourceIds).toContain('ley-18184-drawback')
    expect(ADUANA_FAQ_SOURCES['dna-devolucion-tributos-exportacion']!.url).toBe(
      'https://www.aduanas.gub.uy/innovaportal/v/5644/3/innova.front/'
    )
    expect(ADUANA_FAQ_SOURCES['ley-18184-drawback']!.url).toBe(
      'https://www.impo.com.uy/bases/leyes/18184-2007/1'
    )
    // A source nobody's text uses is noise on the evidence strip; it left with the fix.
    expect(dev.sourceIds).not.toContain('dna-regimen-general')

    // The reason the two regimes do not reach the consumer must be the norm's own words.
    expect(dev.answer).toContain('los titulares de actividades industriales')
    expect(dev.answer).toContain('Ninguno de los dos alcanza al consumidor')
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
