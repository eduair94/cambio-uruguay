// La entidad de /casa/<origin> tiene que vivir en esta página, no en el sitio de la casa.
//
// El nodo FinancialService declaraba `url` con el dominio de la casa —gales.com.uy,
// aeromar.com.uy— lo que le dice al consumidor que la entidad descrita acá vive en otro lado. En
// una página cuyo trabajo es comparar casas, eso es ceder la referencia a la competencia. Son 397
// URLs, 305 de ellas con datos en Search Console (10.985 impresiones en 28 días).
//
// `sameAs` es el campo que existe justamente para decir "esta entidad también está allá" sin
// entregar la identidad.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(__dirname, '..', '..', 'pages', 'casa', '[origin]', 'index.vue'),
  'utf8'
)

/** El nodo FinancialService del grafo. */
const nodo = (() => {
  const at = src.indexOf("'@type': 'FinancialService'")
  expect(at).toBeGreaterThan(-1)
  return src.slice(at, at + 900)
})()

describe('el FinancialService de /casa/<origin>', () => {
  it('no pone el sitio de la casa en `url`', () => {
    expect(nodo).not.toMatch(/url: website\.value/)
    expect(nodo).not.toContain('{ url: website.value }')
  })

  it('apunta `url` a la canónica de esta página', () => {
    expect(nodo).toContain('url: canonicalUrl.value')
  })

  it('lleva un @id propio, para que el resto del grafo pueda referenciarlo', () => {
    expect(nodo).toContain("'@id': `${canonicalUrl.value}#casa`")
  })

  it('el sitio de la casa queda en sameAs', () => {
    expect(nodo).toContain('sameAs: [website.value]')
  })

  it('sigue siendo opcional: una casa sin sitio no emite sameAs vacío', () => {
    expect(nodo).toContain('...(website.value ? { sameAs: [website.value] } : {})')
  })
})
