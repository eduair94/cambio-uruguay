// Un solo nodo FAQPage por página.
//
// POR QUÉ ESTE TEST. `FaqSection` y `FaqBlock` emiten su propio `FAQPage` por defecto
// (`useFaqSchema`, `emitSchema: true`), y varias páginas además arman su `@graph` a mano con un
// nodo `FAQPage` adentro. El resultado es DOS bloques `application/ld+json` con un `FAQPage` cada
// uno en la misma URL, con las mismas preguntas: no es el doble de datos estructurados, es un
// conflicto — Google tiene que elegir cuál de los dos describe la página y puede no elegir
// ninguno. Y es invisible: la página se ve idéntica, el HTML válida, los tests de SEO existentes
// sólo piden que HAYA `application/ld+json`.
//
// Medido el 2026-10-11: seis páginas lo hacían (/deuda-de-gastos-comunes-uruguay,
// /fecha-de-cobro-bps-uruguay, /garantia-de-alquiler-uruguay, /impuesto-temu-uruguay,
// /ley-de-usura-uruguay y /prestamo-hipotecario-uruguay), mientras que otras tres que ya tenían el
// mismo par —las fichas de courier, de programa de tarjeta y de tarjeta de débito— pasaban
// `:emit-schema="false"` y estaban bien. O sea que el patrón correcto ya existía en el repo y lo
// que faltaba era el trinquete.
//
// LA REGLA: si la página escribe su propio `FAQPage`, su `FaqSection`/`FaqBlock` va con
// `:emit-schema="false"`. Si no lo escribe, el componente lo emite y la página no repite el nodo.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    if (!name.endsWith('.vue')) return []
    return [relative(PAGES_DIR, full).split(sep).join('/')]
  })
}

/** Las etiquetas de los componentes que emiten `FAQPage` por su cuenta. */
const FAQ_COMPONENTS = ['FaqSection', 'FaqBlock']

/**
 * Las apariciones del componente que NO desactivan su esquema.
 *
 * Se mira la etiqueta completa, desde `<FaqSection` hasta su `>`, porque el atributo puede venir
 * en la misma línea o tres líneas más abajo (prettier parte la etiqueta cuando pasa los 100
 * caracteres) y buscarlo en todo el archivo daría por desactivada una segunda aparición que no lo
 * está.
 */
function schemaEmittingTags(source: string): string[] {
  const found: string[] = []
  for (const component of FAQ_COMPONENTS) {
    const pattern = new RegExp(`<${component}(?=[\\s/>])[^>]*>`, 'g')
    for (const match of source.match(pattern) ?? []) {
      if (!/:emit-schema="false"|:emitSchema="false"/.test(match)) found.push(match)
    }
  }
  return found
}

/** ¿La página escribe un nodo `FAQPage` a mano? */
const writesOwnFaqPage = (source: string) => /['"]@type['"]:\s*['"]FAQPage['"]/.test(source)

describe('ninguna página publica dos FAQPage', () => {
  it('toda página que escribe su propio FAQPage desactiva el del componente', () => {
    const offenders = pageFiles()
      .filter(file => {
        const source = readFileSync(join(PAGES_DIR, file), 'utf8')
        return writesOwnFaqPage(source) && schemaEmittingTags(source).length > 0
      })
      .sort()
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  // El guardarraíl del guardarraíl: si el lector de etiquetas dejara de encontrar apariciones, el
  // test de arriba quedaría verde para siempre sin mirar nada.
  it('encuentra las apariciones que sí emiten esquema', () => {
    const emitting = pageFiles().filter(
      file => schemaEmittingTags(readFileSync(join(PAGES_DIR, file), 'utf8')).length > 0
    )
    expect(emitting.length).toBeGreaterThan(0)
  })

  it('distingue la etiqueta desactivada de la que emite, incluso partida en varias líneas', () => {
    expect(schemaEmittingTags('<FaqSection :items="faq" expanded />')).toHaveLength(1)
    expect(schemaEmittingTags('<FaqSection :items="faq" :emit-schema="false" expanded />')).toEqual(
      []
    )
    expect(
      schemaEmittingTags('<FaqSection\n  :items="faq"\n  :emit-schema="false"\n  expanded\n/>')
    ).toEqual([])
    // Dos apariciones, una desactivada y otra no: la que emite se tiene que seguir viendo.
    expect(
      schemaEmittingTags('<FaqBlock :items="a" :emit-schema="false" />\n<FaqSection :items="b" />')
    ).toHaveLength(1)
    expect(writesOwnFaqPage("'@type': 'FAQPage',")).toBe(true)
    expect(writesOwnFaqPage("'@type': 'Article',")).toBe(false)
  })
})
