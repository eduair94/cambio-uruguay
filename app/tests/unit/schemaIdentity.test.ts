// Una sola identidad, no dos.
//
// El layout escribía su propio grafo JSON-LD con un WebSite y una Organization, y @nuxtjs/seo emite
// los suyos igual. Medido en producción el 2026-09-03: DOS nodos `WebSite` con el MISMO @id
// (https://cambio-uruguay.com/#website), que es inválido — el consumidor los fusiona o elige uno, y
// el que puede perderse es el que lleva el SearchAction. Y dos Organizations con @id distinto
// (#organization escrita a mano, #identity del módulo), de las cuales la que el WebPage referencia
// es la del módulo: la pobre, sin logo, sin contacto y sin sameAs.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const layout = readFileSync(join(__dirname, '..', '..', 'layouts', 'default.vue'), 'utf8')

describe('la identidad del sitio la declara el módulo', () => {
  it('el layout ya no escribe un grafo JSON-LD a mano', () => {
    expect(layout).not.toContain("'@graph'")
    expect(layout).not.toContain("'@id': 'https://cambio-uruguay.com/#website'")
    expect(layout).not.toContain("'@id': 'https://cambio-uruguay.com/#organization'")
  })

  it('usa las funciones del módulo, que escriben sobre sus nodos', () => {
    expect(layout).toContain('useSchemaOrg(')
    expect(layout).toContain('defineWebSite(')
    expect(layout).toContain('defineOrganization(')
  })

  it('el SearchAction sobrevive a la consolidación', () => {
    expect(layout).toContain('defineSearchAction(')
    expect(layout).toContain('search_term_string')
  })

  it('no se perdió ningún dato de la Organization vieja', () => {
    for (const campo of [
      'alternateName',
      'foundingDate',
      'contactPoint',
      'sameAs',
      'address',
      'founder',
      'knowsAbout',
      'logo',
    ]) {
      expect(layout, `falta ${campo} en la Organization`).toContain(`${campo}:`)
    }
  })

  it('la Organization lleva el @id que el WebPage referencia', () => {
    // Sin @id explícito la librería la nombra #organization, y el `about` del WebPage apunta a
    // #identity: la parte rica queda colgando de un identificador que nadie referencia. Verificado
    // en producción el 2026-09-03.
    expect(layout).toContain("'@id': 'https://cambio-uruguay.com/#identity'")
  })

  it('el logo declara el tamaño real del archivo', () => {
    expect(layout).toContain('width: 498')
    expect(layout).toContain('height: 72')
  })
})
