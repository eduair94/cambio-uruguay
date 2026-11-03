// La página de monopatines con ficha técnica: el asesor, la franja de la tarjeta, la tabla por tipo
// y que nada de eso se filtre al directorio de equipar ni a la página de bicicletas.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const read = (...parts: string[]): string => readFileSync(join(APP, ...parts), 'utf8')

const page = read('pages', 'monopatines-electricos-uruguay.vue')
const bicicletas = read('pages', 'bicicletas-electricas-uruguay.vue')
const card = read('components', 'equipar', 'ListingCard.vue')
const filters = read('components', 'equipar', 'ProductosFilters.vue')
const directorio = read('components', 'equipar', 'Directorio.vue')
const asesor = read('components', 'movilidad', 'MovilidadMonopatinAsesor.vue')
const categoriaApi = read('server', 'api', 'movilidad', '[categoria].get.ts')

describe('/monopatines-electricos-uruguay', () => {
  it('tiene el asesor, la tabla por tipo y la ficha en la tabla de modelos', () => {
    expect(page).toContain('id="asesor-title"')
    expect(page).toContain('<MovilidadMonopatinAsesor @ver="verDesdeAsesor" />')
    expect(page).toContain('id="tipos-title"')
    expect(page).toContain('<MovilidadSpecStrip v-if="row.product.specs"')
  })

  it('el botón del asesor lleva sus requisitos al directorio y baja hasta los resultados', () => {
    expect(page).toMatch(/dirUpdate\(\{[\s\S]*ficha: patch\.ficha/)
    expect(page).toContain("scrollToPageTop('movilidad-resultados')")
  })

  it('las preguntas nuevas existen y nunca dicen "ilegal"', () => {
    for (const id of [
      'movilidad-monopatin-autonomia',
      'movilidad-monopatin-carga',
      'movilidad-monopatin-peso-usuario',
      'movilidad-monopatin-velocidad',
    ]) {
      expect(page).toContain(`id: '${id}'`)
    }
    expect(page.toLowerCase()).not.toContain('ilegal')
    expect(asesor.toLowerCase()).not.toContain('ilegal')
  })

  it('publica la ficha en el JSON-LD como PropertyValue', () => {
    expect(page).toContain('additionalProperty: productProperties(row.product.specs)')
    expect(page).toContain("'@type': 'PropertyValue'")
  })

  it('el costo de una carga dice de dónde sale', () => {
    expect(page).toContain('tarifa\n        residencial simple')
  })
})

describe('el asesor', () => {
  it('pide la lista sólo en el navegador y publica sus reglas', () => {
    expect(asesor).toContain("'/api/movilidad/monopatin-asesor'")
    expect(asesor).toContain('server: false')
    expect(asesor).toContain('<summary>Cómo elegimos</summary>')
    expect(asesor).toContain('aria-live="polite"')
  })
})

describe('lo compartido con equipar', () => {
  it('la tarjeta sólo dibuja la ficha cuando el aviso la trae', () => {
    expect(card).toContain('<MovilidadSpecStrip\n        v-if="producto.specs"')
  })

  it('el panel sólo muestra la ficha cuando la respuesta trae sus facetas', () => {
    expect(filters).toContain('<fieldset v-if="fichaFacets"')
    expect(filters).toContain("rasgos: draft.rasgos.join(',')")
  })

  it('los órdenes por ficha sólo aparecen en el directorio de monopatines', () => {
    expect(directorio).toMatch(
      /props\.vertical === 'movilidad' && props\.fixedCategoria === 'monopatin-electrico'[\s\S]*MOVILIDAD_PRODUCTOS_SORT_ITEMS/
    )
  })

  it('la página de bicicletas no gana nada de la ficha', () => {
    expect(bicicletas).not.toContain('MovilidadMonopatinAsesor')
    expect(bicicletas).not.toContain('specStats')
  })

  it('la ruta de la categoría sólo agrega ficha para monopatín', () => {
    expect(categoriaApi).toMatch(
      /slug === 'monopatin-electrico'\s*\?\s*await attachMonopatinSpecs\(items\)/
    )
  })
})
