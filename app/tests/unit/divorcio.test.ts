// La guía del divorcio: ninguna afirmación sin el artículo que la sostiene.
//
// POR QUÉ ESTE TEST. Esta guía es casi entera texto legal, y el modo de fallar de una página así no
// es quedar en rojo: es envejecer. Un numeral que se reescribe —le pasó justo al que esta guía
// encabeza, el 3º) del artículo 187, reescrito por el artículo 474 de la Ley 20.446 y vigente desde
// el 1.º de enero de 2026— deja la prosa diciendo lo de antes, con el mismo aire de autoridad y sin
// que nada avise. Así que lo que se verifica acá no es el contenido del Código, que este repo no
// puede cotejar solo, sino lo único que sí se puede: que cada artículo que la guía NOMBRA esté en la
// tarjeta de Fuentes con su enlace a IMPO, y que las afirmaciones que dan la respuesta del snippet
// —una audiencia por sola voluntad, dos plazos de tres meses en el mutuo consentimiento, y la
// sentencia que espera a guarda, visitas y pensión— sigan escritas con las palabras de la norma.
//
// Es la misma regla que `tests/unit/guides.test.ts` aplica en sus bloques de «correcciones
// verificadas», aplicada desde el primer commit de la guía en vez de después del error.
import { describe, expect, it } from 'vitest'
import { getGuide } from '../../utils/guides'
import { temasDeRuta } from '../../utils/temaVecinos'

const SLUG = 'divorcio-por-sola-voluntad-uruguay'
const RUTA = `/guias/${SLUG}`

const guia = getGuide(SLUG)

/** Todo el texto que la página publica: descripción, secciones, pasos y preguntas. */
const texto = (() => {
  const g = guia!
  const partes = [g.description, ...g.sections.flatMap(s => [s.heading, s.body])]
  for (const faq of g.faqs ?? []) partes.push(faq.q, faq.a)
  for (const step of g.steps ?? []) partes.push(step.name, step.text)
  return partes.join('\n')
})()

/** Las etiquetas de la tarjeta de Fuentes, que es donde vive la cita. */
const fuentes = (guia?.sources ?? []).map(s => s.label).join('\n')

describe('la guía del divorcio existe y entra en el SERP', () => {
  it('está en el catálogo', () => {
    expect(guia).toBeDefined()
  })

  it('pertenece al tema de pareja, así que recibe el bloque «Más sobre este tema»', () => {
    expect(temasDeRuta(RUTA).map(hub => hub.slug)).toContain('pareja-familia-y-dinero-uruguay')
  })

  it('su título entra con la marca y su descripción entra en el snippet', () => {
    expect(`${guia!.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guia!.description.length).toBeLessThanOrEqual(155)
  })

  // La regla de oro de las descripciones de este sitio: la cifra adelante, no el tema.
  it('su descripción trae el dato y no el anuncio', () => {
    expect(guia!.description).toMatch(/una audiencia/)
    expect(guia!.description).toMatch(/tres meses/)
  })
})

describe('cada artículo que nombra está en las fuentes', () => {
  /** Los números de artículo que la prosa cita: «artículo 187», «artículos 167 y 189», «37.1». */
  const citados = new Set<string>()
  for (const match of texto.matchAll(/artículos?\s+([\d.]+)(?:\s+y\s+([\d.]+))?/gi)) {
    for (const numero of [match[1], match[2]]) if (numero) citados.add(numero.replace(/\.$/, ''))
  }

  it('la prosa cita artículos', () => {
    expect(citados.size).toBeGreaterThanOrEqual(8)
  })

  it('ninguno queda sin su enlace a IMPO', () => {
    // Un ordinal (37.1, 227.2) lo respalda la fuente de su artículo.
    const sinFuente = [...citados].filter(numero => {
      const base = numero.split('.')[0]!
      return !new RegExp(`artículos?\\s+(?:\\d+\\s+y\\s+)?${base}\\b`, 'i').test(fuentes)
    })
    expect(sinFuente, sinFuente.join(', ')).toEqual([])
  })

  it('todas las fuentes son el texto de la norma en IMPO', () => {
    for (const source of guia!.sources ?? [])
      expect(source.url, source.label).toMatch(/^https:\/\/www\.impo\.com\.uy\/bases\//)
  })
})

describe('las tres respuestas que la guía promete siguen escritas con las palabras de la norma', () => {
  it('las tres vías del artículo 187, textuales', () => {
    expect(texto).toMatch(/«el divorcio solo puede pedirse»/)
    expect(texto).toMatch(/«por el mutuo consentimiento de los cónyuges»/)
    expect(texto).toMatch(/«por la sola voluntad de cualquiera de los cónyuges»/)
  })

  it('la vía nueva está fechada y atribuida, no dada por eterna', () => {
    expect(texto).toMatch(/Ley 20\.446/)
    expect(texto).toMatch(/artículo 474/)
    expect(texto).toMatch(/1\.º de enero de 2026/)
    const urls = (guia!.sources ?? []).map(s => s.url)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/20446-2025/474')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/20446-2025/3')
  })

  // Los seis meses son una SUMA de lo que el texto fija, no un dato de un tercero: la guía no puede
  // publicarlos sin publicar al lado los dos plazos que los componen.
  it('los seis meses del mutuo consentimiento vienen con sus dos plazos de tres meses', () => {
    expect(texto).toMatch(/dos plazos de tres meses/)
    expect(texto).toMatch(/«fijará nueva audiencia con plazo de tres meses»/)
    expect(texto).toMatch(/«en un nuevo plazo de tres meses/)
  })

  it('la sentencia con hijos menores espera a los tres puntos del artículo 167', () => {
    expect(texto).toMatch(/guarda, régimen de visitas y pensión alimenticia/)
    expect(texto).toMatch(/numerales 2º y 3º del artículo 187/)
  })
})

// La guía dice, en su propia voz, que los honorarios no son un precio público y que por eso no
// publica una cifra. Esto lo mantiene cierto: una revisión futura que agregue «sale unos X pesos»
// pone CI en rojo antes de publicarlo.
describe('no publica un precio que no pueda sostener', () => {
  it('no hay ningún importe en el cuerpo', () => {
    expect(texto).not.toMatch(/\$/)
    expect(texto).not.toMatch(/\bUS\s?\$|\bUYU\b|\bd[óo]lares\b/i)
    expect(texto).not.toMatch(/\d[\d.,]*\s*pesos/i)
  })

  it('y dice por qué, con la salida para quien no puede pagarlo', () => {
    expect(texto).toMatch(/honorarios no son un precio público/)
    expect(guia!.sections.flatMap(s => s.links ?? []).map(l => l.to)).toContain(
      '/guias/abogado-gratis-uruguay'
    )
  })
})
