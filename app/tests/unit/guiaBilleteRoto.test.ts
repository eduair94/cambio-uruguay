import { describe, expect, it } from 'vitest'
import { BILLETES_LEIDO_EL, BILLETE_UMBRAL_PIEZA, billetesGuides } from '../../utils/guidesBilletes'
import { getGuide, guides } from '../../utils/guides'
import { guideHubs } from '../../utils/guideHubs'

/**
 * La guía del billete roto, manchado o entintado.
 *
 * Lo que este test cuida NO es la forma del objeto —eso ya lo hace `guides.test.ts` para todo el
 * catálogo— sino la regla por la que la página existe: ninguna afirmación sin el artículo que la
 * sostiene. La guía se para sobre un único umbral (el del artículo 57.1 del Libro VII del BCU) y
 * ese número viaja al título y a la descripción, que son los dos renglones que el lector ve en
 * Google. Si una circular lo mueve, lo que no puede pasar es que la constante cambie y el snippet
 * siga publicando el viejo: por eso el snippet se mide contra la constante y no contra sí mismo.
 *
 * Y cuida la otra mitad, la honesta: que la guía siga diciendo que la norma NO prevé el canje de
 * dólares deteriorados y que el entintado presentado por una persona NO se reemplaza. Las dos son
 * negaciones verificadas leyendo el Libro VII entero, y son justo lo que una reescritura
 * bienintencionada "arreglaría" convirtiéndolas en un sí.
 */
const SLUG = 'billete-roto-o-manchado-uruguay'
const guia = billetesGuides[0]
const prosa = guia.sections.map(section => section.body).join('\n')
const respuestas = (guia.faqs ?? []).map(faq => faq.a).join('\n')

describe('la guía del billete roto', () => {
  it('está en el catálogo, con su slug y su fecha de lectura', () => {
    expect(billetesGuides).toHaveLength(1)
    expect(guia.slug).toBe(SLUG)
    expect(getGuide(SLUG)).toBe(guia)
    expect(guides.filter(g => g.slug === SLUG)).toHaveLength(1)
    expect(guia.updatedAt).toBe(BILLETES_LEIDO_EL)
    expect(BILLETES_LEIDO_EL).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('pertenece al tema del dólar, que es el que la enlaza de vuelta', () => {
    const hubs = guideHubs.filter(hub => hub.guideSlugs.includes(SLUG))
    expect(hubs).toHaveLength(1)
    expect(hubs[0].slug).toBe('dolar-y-casas-de-cambio-uruguay')
  })

  it('el título y la descripción traen el umbral del 57.1', () => {
    expect(guia.title).toContain(String(BILLETE_UMBRAL_PIEZA))
    expect(guia.description).toContain(String(BILLETE_UMBRAL_PIEZA))
    // 43 caracteres para el título: `pages/guias/[slug].vue` le agrega SIEMPRE los 17 de la marca.
    expect(`${guia.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guia.description.length).toBeLessThanOrEqual(155)
  })

  it('publica las dos condiciones del canje, no sólo el porcentaje', () => {
    expect(prosa).toContain(`más del ${BILLETE_UMBRAL_PIEZA} % del billete completo`)
    expect(prosa).toContain('una sola pieza')
    // El literal b) es la mitad que casi nadie cuenta: sin él, un billete en pedazos parece perdido.
    expect(prosa).toContain('reconstituirse en su casi totalidad')
    expect(prosa).toMatch(/numeraciones y firmas/)
  })

  it('distingue quién está obligado de quién sólo puede aceptar', () => {
    expect(prosa).toContain('canje o renovación obligatoria por parte de los Bancos')
    expect(prosa).toContain('institución financiera no bancaria')
    expect(respuestas).toContain('no está obligada')
  })

  it('conserva las dos negaciones verificadas', () => {
    // Entintado: el artículo 58 bis literal b) lo dice con todas las letras.
    expect(prosa).toContain('no serán reemplazados')
    expect(prosa).toContain('no tiene valor circulatorio')
    // Dólares: la Parte Segunda no define el billete deteriorado ni impone su canje.
    expect(prosa).toContain('no aparece en ninguno de sus artículos')
    expect(respuestas).toContain('no prevé el canje de billetes en dólares deteriorados')
  })

  it('cita los artículos que sostienen cada tramo', () => {
    for (const articulo of ['57.1', '57 bis', '58 bis', '59.2', '56.1', '56.2']) {
      expect(prosa + respuestas, articulo).toContain(articulo)
    }
  })

  it('todas las fuentes son páginas oficiales del BCU, con publisher', () => {
    const sources = guia.sources ?? []
    expect(sources.length).toBeGreaterThanOrEqual(4)
    for (const source of sources) {
      expect(source.url, source.label).toMatch(/^https:\/\/(www|subsitio)\.bcu\.gub\.uy\//)
      expect(source.publisher, source.label).toBe('Banco Central del Uruguay')
      expect(source.label.length, source.url).toBeGreaterThan(20)
    }
    const urls = sources.map(source => source.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('no inventa un arancel: dice que el canje no tiene precio publicado', () => {
    expect(respuestas).toMatch(/fija un precio, un tope ni una comisión/)
    expect(respuestas).toMatch(/tampoco dice que sea gratis/)
  })

  it('tiene cuerpo, preguntas y tabla con filas completas', () => {
    expect(guia.sections.length).toBeGreaterThanOrEqual(6)
    expect(guia.faqs?.length ?? 0).toBeGreaterThanOrEqual(7)
    const tablas = guia.sections.flatMap(section => (section.table ? [section.table] : []))
    expect(tablas.length).toBeGreaterThanOrEqual(1)
    for (const tabla of tablas) {
      for (const fila of tabla.rows) expect(fila).toHaveLength(tabla.headers.length)
    }
  })
})
