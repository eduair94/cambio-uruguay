// Auto Ads mete su unidad ENTRE los hijos de una fila flex: un VRow de varias columnas queda
// partido (una columna sola y angosta, la otra debajo) y la tarjeta del newsletter perdía 656 px de
// texto. Medido en producción el 2026-09-19 recorriendo las 228 plantillas del sitio: 7 filas
// partidas en una sola pasada, y Google elige otro lugar en cada carga. No se ve en local ni en CI
// porque ahí no se cargan anuncios, así que lo único que lo mantiene arreglado son estas reglas.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8')

describe('una unidad de Auto Ads no parte las filas', () => {
  it('en un VRow de varias columnas la unidad va al final de la fila, después de todo order-*', () => {
    const css = read('assets/css/critical.css')
    const rule = css.match(
      /\.v-row:has\(> \.v-col ~ \.v-col\) > \.google-auto-placed \{\s*order: (\d+);\s*\}/
    )
    expect(
      rule,
      'critical.css perdió la regla que saca la unidad de entre las columnas'
    ).not.toBeNull()
    // Vuetify llega a `order-13` (`order-last`): la unidad tiene que quedar después.
    expect(Number(rule![1])).toBeGreaterThan(13)
  })

  it('la tarjeta del newsletter envuelve, así que la unidad no le come el ancho al texto', () => {
    const source = read('components/NewsletterCapture.vue')
    expect(source).toMatch(/class="nl-capture-head d-flex/)
    expect(source).toMatch(/\.nl-capture-head \{\s*flex-wrap: wrap;/)
    expect(source).toMatch(/\.nl-capture-text \{\s*flex: 1 1 0;\s*min-width: 0;/)
  })

  it('en la grilla de autos la unidad ocupa la fila entera, no la celda de los filtros', () => {
    const source = read('components/cars/SidebarLayout.vue')
    expect(source).toMatch(
      /\.cars-layout > :deep\(\.google-auto-placed\) \{\s*grid-column: 1 \/ -1;/
    )
  })
})
