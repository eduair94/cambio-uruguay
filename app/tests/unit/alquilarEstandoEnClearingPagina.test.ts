// /alquilar-estando-en-clearing, leída como texto.
//
// Lo que este archivo vigila salió de medir el HTML que sirve el servidor (19/11/2026): las seis
// respuestas de las preguntas frecuentes estaban sólo en el JSON-LD (el acordeón dibujaba nodos
// vacíos), y el porqué de cada garantía —forClearing, caveat, sourceUrl de rentClearing.ts— estaba
// investigado y fechado pero nunca se dibujaba. Un buscador o un asistente que lee la página no lo
// veía. También fijaba a mano "Verificado en julio de 2026", que envejece solo.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'alquilar-estando-en-clearing.vue'),
  'utf8'
)
const TEMPLATE = SOURCE.slice(0, SOURCE.indexOf('<script'))
const SCRIPT = SOURCE.slice(SOURCE.indexOf('<script'), SOURCE.indexOf('<style'))

describe('/alquilar-estando-en-clearing', () => {
  it('las respuestas de las preguntas frecuentes llegan al HTML del servidor (eager)', () => {
    expect(TEMPLATE).toMatch(/<VExpansionPanel\s[^>]*v-for="faq in faqs"[^>]*\seager[\s>]/)
  })

  it('dibuja el detalle investigado de cada garantía', () => {
    expect(TEMPLATE).toContain('route.forClearing')
    expect(TEMPLATE).toContain('route.caveat')
    expect(TEMPLATE).toContain('route.sourceUrl')
  })

  it('no fija a mano el mes de verificación', () => {
    expect(SOURCE).not.toContain('Verificado en julio de 2026')
  })

  it('conserva su única unidad intermedia y no pasa a FaqSection', () => {
    expect(TEMPLATE.match(/<AdSlot\b/g)).toHaveLength(1)
    expect(TEMPLATE).toContain('<AdSlot placement="in-article"')
    expect(TEMPLATE).not.toContain('<FaqSection')
  })

  it('tiene la respuesta corta arriba, con enlace al costo de cada garantía', () => {
    expect(TEMPLATE).toContain('id="respuesta-corta"')
    const block = TEMPLATE.slice(TEMPLATE.indexOf('id="respuesta-corta"'))
    expect(block.slice(0, block.indexOf('</section>'))).toContain(
      "localePath('/garantia-de-alquiler-uruguay')"
    )
  })

  it('tiene un solo H1', () => {
    expect(TEMPLATE.match(/<h1\b/g)).toHaveLength(1)
  })

  it('no depende del reloj ni del azar al renderizar', () => {
    expect(SCRIPT).not.toMatch(/new Date\(\s*\)/)
    expect(SCRIPT).not.toContain('Date.now()')
    expect(SCRIPT).not.toContain('Math.random()')
  })
})
