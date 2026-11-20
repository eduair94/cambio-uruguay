// El encabezado de nivel 1 de /sucursales/<casa>[/<lugar>] y /historico/<casa> vive dentro de un
// `v-card-title`, y Vuetify le pone a ese contenedor `white-space: nowrap`, `overflow: hidden` y
// `text-overflow: ellipsis`. El h1 hereda el `nowrap`: en un teléfono de 390 px el encabezado se
// cortaba a mitad de palabra («BROU en Montevideo: sucurs»), medido en producción el 2026-11-19.
// La variante del BCU de /historico/<casa> ya llevaba `text-wrap` y se veía bien: la clase alcanza,
// pero tiene que estar SIEMPRE, no atada a una condición.
//
// Comprobación sobre el fuente, como h1Contract.test.ts: lo que hay que garantizar es que la
// plantilla declare la clase estática en el h1, no reproducir un render de Vuetify.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')
const read = (file: string) => readFileSync(join(PAGES_DIR, file), 'utf8')

/** La etiqueta de apertura del único h1 de la plantilla. */
const h1OpenTag = (src: string): string => {
  const match = src.match(/<h1[\s>][^>]*>/)
  expect(match, 'la plantilla tiene que emitir un h1').not.toBeNull()
  return match![0]
}

/** Las clases del atributo `class="..."` estático (no el `:class` condicional). */
const staticClasses = (tag: string): string[] => {
  const match = tag.match(/(?:^|\s)class="([^"]*)"/)
  return match ? match[1]!.split(/\s+/).filter(Boolean) : []
}

const TEMPLATES = ['sucursales/[origin]/[[location]].vue', 'historico/[origin]/index.vue']

describe('el h1 dentro de v-card-title envuelve en vez de cortarse', () => {
  it.each(TEMPLATES)('%s lleva text-wrap estático en el h1', file => {
    const tag = h1OpenTag(read(file))
    expect(staticClasses(tag)).toContain('text-wrap')
  })

  it('historico/<casa> ya no ata text-wrap a la variante del BCU', () => {
    const tag = h1OpenTag(read('historico/[origin]/index.vue'))
    expect(tag).not.toMatch(/'text-wrap'\s*:/)
  })

  it('la bandera de la tabla de /historico/<casa> es decorativa: el código ya va impreso al lado', () => {
    const src = read('historico/[origin]/index.vue')
    const flag = src.match(/<img\s[^>]*getCurrencyFlag\(item\.code\)[^>]*>/)
    expect(flag).not.toBeNull()
    expect(flag![0]).toMatch(/(?:^|\s)alt=""/)
    expect(flag![0]).not.toMatch(/:alt=/)
  })
})
