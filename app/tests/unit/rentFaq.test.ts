import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  RENT_FAQ,
  RENT_FAQ_CATEGORIES,
  RENT_FAQ_LAST_REVIEWED,
  rentFaqByCategory,
  type RentFaqCategoryId,
} from '../../utils/rentFaq'

const CAT_IDS = new Set<RentFaqCategoryId>(RENT_FAQ_CATEGORIES.map(c => c.id))
const SOURCE = readFileSync(new URL('../../utils/rentFaq.ts', import.meta.url), 'utf8')

describe('rentFaq - data integrity', () => {
  it('has a solid, comprehensive set of entries', () => {
    expect(RENT_FAQ.length).toBeGreaterThanOrEqual(37)
  })

  it('every entry has a non-empty question and answer', () => {
    for (const e of RENT_FAQ) {
      expect(e.q.trim().length).toBeGreaterThan(8)
      expect(e.a.trim().length).toBeGreaterThan(40)
    }
  })

  it('every entry belongs to a declared category', () => {
    for (const e of RENT_FAQ) expect(CAT_IDS.has(e.cat)).toBe(true)
  })

  it('every source URL is an https link', () => {
    for (const e of RENT_FAQ) {
      if (e.sourceUrl) expect(e.sourceUrl).toMatch(/^https:\/\/\S+$/)
    }
  })

  it('has no duplicate questions', () => {
    const qs = RENT_FAQ.map(e => e.q.trim().toLowerCase())
    expect(new Set(qs).size).toBe(qs.length)
  })

  it('never claims a review date older than its own newest verified entry', () => {
    // El encabezado promete que RENT_FAQ_LAST_REVIEWED es la fecha de revisión
    // del corpus. Si alguien agrega una entrada con "Verificado el <fecha>" más
    // nueva y no toca la constante, la marca del archivo miente por defecto y
    // el próximo que audite se guía por ella. Este test lo impide.
    const verified = [...SOURCE.matchAll(/Verificado el (\d{4}-\d{2}-\d{2})/g)].map(m => m[1]!)
    expect(verified.length).toBeGreaterThan(0)
    for (const date of verified) {
      // ISO date strings compare correctly lexicographically.
      expect(RENT_FAQ_LAST_REVIEWED >= date).toBe(true)
    }
  })
})

describe('rentFaq - reparaciones', () => {
  const whoPays = () =>
    RENT_FAQ.find(e => e.cat === 'reparaciones' && /Quién paga cada reparación/i.test(e.q))

  it('goes past the abstract rule and names the items people ask about', () => {
    // La categoría tenía una sola entrada con la regla abstracta. Los hilos
    // preguntan siempre por el ítem concreto, así que el test exige los ítems.
    expect(RENT_FAQ.filter(e => e.cat === 'reparaciones').length).toBeGreaterThanOrEqual(2)
    const e = whoPays()
    expect(e).toBeDefined()
    const a = e!.a.toLowerCase()
    for (const item of ['cisterna', 'eléctrica', 'vidrios', 'cerradura', 'pintura', 'cañerías'])
      expect(a).toContain(item)
  })

  it('cites the Civil Code articles that hold the enumeration', () => {
    // La enumeración no está en la ley de alquileres (14.219 no la trae): está
    // en el Código Civil, y por eso nadie la encuentra buscando "ley alquiler".
    const e = whoPays()!
    for (const art of ['1798', '1819', '1820', '1822']) expect(e.a).toContain(art)
    expect(e.sourceUrl).toMatch(/^https:\/\/www\.impo\.com\.uy\/bases\/codigo-civil\//)
  })

  it('quotes art. 1820 num. 1 with the pipes on the CONSERVE side of the verb', () => {
    // La norma dice "A conservar la integridad interior de las paredes, azoteas,
    // pavimentos y cañerías, reponiendo las paredes, revoques, baldosas o
    // ladrillos que durante el arrendamiento se destruyan o se desencajen": el
    // objeto de "reponiendo" NO incluye las cañerías. La paráfrasis anterior las
    // pasaba al lado equivocado del verbo y le cargaba al inquilino una cañería
    // rota, contradiciendo a las entradas de habitabilidad y de depósito.
    const a = whoPays()!.a
    expect(a).toMatch(
      /conservar la integridad interior de las paredes, azoteas, pavimentos y cañerías, reponiendo las paredes, revoques, baldosas o ladrillos/
    )
    expect(a).not.toMatch(
      /reponer revoques, baldosas o ladrillos de paredes, azoteas, pavimentos y cañerías/
    )
  })

  it('does not contradict the habitability answer about broken pipes', () => {
    // Las otras dos entradas ('reparaciones' habitabilidad y 'deposito') ponen la
    // cañería en el propietario. Esta entrada tiene que reconciliarlo en su
    // propio texto, no dejar al lector con las dos versiones sin nada en medio.
    const a = whoPays()!.a
    expect(a).toMatch(/cañería[^.]*vetustez[^.]*propietario|cañería[^.]*propietario/)
    expect(a).toMatch(/arts?\. 1798 y 1819/)
    // Y la entrada de habitabilidad tiene que seguir diciendo lo mismo.
    const hab = RENT_FAQ.find(
      e => e.cat === 'reparaciones' && /humedad o una reparación/i.test(e.q)
    )
    expect(hab!.a).toMatch(/cañerías\) son de cargo del propietario/)
  })

  it('stops at "not void under art. 76" and does not declare the paint clause valid', () => {
    // Trampa: guidesReddit dice que la pintura gastada no se te descuenta del
    // DEPÓSITO, y es cierto, pero eso no anula una cláusula de entrega pintada
    // que firmaste: el art. 76 del 14.219 tiene lista cerrada y esa no está.
    // AHORA BIEN: que no esté en esa lista tampoco la vuelve válida — la nulidad
    // puede venir de otro lado y el literal A anula la renuncia anticipada a los
    // derechos de la ley. Lo verificable es la AUSENCIA, no la validez, así que
    // la conclusión categórica "es una obligación que pactaste y vale" no va.
    const a = whoPays()!.a
    expect(a).toMatch(/no figura entre las cláusulas nulas del art\. 76/)
    expect(a).toMatch(/lista cerrada/)
    expect(a).toMatch(/tampoco significa que sea válida/)
    expect(a).not.toMatch(/es una obligación que pactaste y vale/)
  })
})

describe('rentFaq - grouping', () => {
  it('groups every entry exactly once, dropping empty categories', () => {
    const groups = rentFaqByCategory()
    const grouped = groups.reduce((n, g) => n + g.entries.length, 0)
    expect(grouped).toBe(RENT_FAQ.length)
    for (const g of groups) expect(g.entries.length).toBeGreaterThan(0)
  })

  it('preserves the declared category order', () => {
    const groups = rentFaqByCategory()
    const order = RENT_FAQ_CATEGORIES.map(c => c.id)
    const groupedOrder = groups.map(g => g.category.id)
    // groupedOrder must be a subsequence of the declared order
    let i = 0
    for (const id of groupedOrder) {
      i = order.indexOf(id, i)
      expect(i).toBeGreaterThanOrEqual(0)
      i++
    }
  })

  it('answers the commission question people actually ask', () => {
    // El hueco no era la base de cálculo (eso ya estaba, y tres veces): era
    // "¿qué artículo me obliga a pagarla?". La respuesta correcta es la
    // AUSENCIA de norma más la regla supletoria del corretaje, así que si
    // alguien reescribe esta entrada como un porcentaje, el test cae.
    const e = RENT_FAQ.find(x => /obliga al inquilino a pagar la comisión/i.test(x.q))
    expect(e).toBeDefined()
    expect(e!.cat).toBe('costos')
    expect(e!.a).toMatch(/Ninguna norma pone la comisión a cargo del inquilino/)
    expect(e!.a).toMatch(/proporcionalmente por las partes/)
    for (const ref of ['art. 112', '20.380', '14.219', '22%']) expect(e!.a).toContain(ref)
  })

  it('attributes and dates the state of the Ley 20.380 reglamentación instead of concluding it', () => {
    // La nota del MEC (gub.uy, 09/04/2026) dice que sigue el diálogo para
    // redactar la reglamentación. NO dice que el Registro no esté operativo:
    // eso era una inferencia, publicada en presente y sin fuente alcanzable
    // desde la página (el sourceUrl es el art. 112 del Código de Comercio).
    // Lo que sí es normativo y no caduca es el art. 15 de la Ley 20.380.
    const e = RENT_FAQ.find(x => /obliga al inquilino a pagar la comisión/i.test(x.q))!
    expect(e.a).toMatch(/al 9 de abril de 2026 el MEC informaba/)
    expect(e.a).toMatch(/art\. 15 le dio al Poder Ejecutivo 90 días/)
    expect(e.a).not.toMatch(/ese registro todavía no está funcionando/)
    expect(e.a).not.toMatch(/no está funcionando|no está operativo/)
  })

  it('names the norm behind the 22% VAT rate, like it does for every other figure', () => {
    // Es el único número duro de la respuesta y el sourceUrl apunta al Código de
    // Comercio, así que sin nombrar la norma el 22% queda sin fuente alcanzable
    // desde la página, contra la regla del encabezado del archivo.
    const e = RENT_FAQ.find(x => /obliga al inquilino a pagar la comisión/i.test(x.q))!
    expect(e.a).toMatch(/22% \(art\. 34, Título 10 del Texto Ordenado 2023\)/)
  })

  it('backs the commission answer on a norm, not on the realtors guild', () => {
    // adiu.uy es la asociación de inmobiliarias: describe el uso de plaza, no
    // crea la obligación. Esta entrada tiene que colgar de fuente normativa.
    const e = RENT_FAQ.find(x => /obliga al inquilino a pagar la comisión/i.test(x.q))
    expect(e!.sourceUrl).toBe('https://www.impo.com.uy/bases/codigo-comercio/817-1865/112')
  })

  it('covers the core high-demand topics', () => {
    const present = new Set(rentFaqByCategory().map(g => g.category.id))
    for (const id of [
      'garantias',
      'deposito',
      'costos',
      'precio',
      'impuestos',
      'derechos',
      'situaciones',
    ] as const) {
      expect(present.has(id)).toBe(true)
    }
  })
})
