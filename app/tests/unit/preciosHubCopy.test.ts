import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Tres frases que la página publicó y que la fuente oficial o su propio dato desmienten
// (verificado el 2026-11-20):
// - "el histórico, una cosa que el Estado no guarda": el SIPC guarda precios desde 2007 y los
//   publica como datos abiertos (precios.uy/datos-del-sipc, catalogodatos.gub.uy).
// - "el sistema oficial no obliga a actualizar todos los días": su FAQ dice que los
//   establecimientos "deben informar diariamente" y que el envío "es obligatorio".
// - "los precios que las 373 bocas declaran": 373 son los locales con canasta comparable; un
//   artículo solo lo declaraban 763.
const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'precios-de-supermercado-uruguay.vue'),
  'utf8'
)

describe('/precios-de-supermercado-uruguay: el texto', () => {
  it('no vuelve a publicar lo que la fuente oficial desmiente', () => {
    expect(PAGE).not.toMatch(/no guarda/i)
    expect(PAGE).not.toMatch(/no obliga a actualizar/i)
    expect(PAGE).not.toMatch(/bocas<\/strong>\s*declaran|bocas declaran/i)
  })

  it('la respuesta va antes que el buscador', () => {
    const resumen = PAGE.indexOf('id="resumen"')
    const buscador = PAGE.indexOf('id="buscador"')
    expect(resumen).toBeGreaterThan(-1)
    expect(buscador).toBeGreaterThan(resumen)
  })

  it('las anclas del resumen existen', () => {
    for (const id of ['cadenas', 'departamentos', 'canasta-articulos']) {
      expect(PAGE).toContain(`id="${id}"`)
      expect(PAGE).toContain(`href="#${id}"`)
    }
  })

  it('una sola H1 y el asistente sigue', () => {
    expect(PAGE.match(/<h1\b/g)).toHaveLength(1)
    expect(PAGE).toContain('<AssistantCta topic="super"')
  })
})
