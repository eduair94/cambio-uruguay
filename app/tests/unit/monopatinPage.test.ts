// La página de monopatines con ficha técnica: el asesor, la franja de la tarjeta, la tabla por tipo
// y que nada de eso se filtre al directorio de equipar ni a la página de bicicletas.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const read = (...parts: string[]): string => readFileSync(join(APP, ...parts), 'utf8')

const page = read('pages', 'monopatines-electricos-uruguay', 'index.vue')
const bicicletas = read('pages', 'bicicletas-electricas-uruguay', 'index.vue')
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

  it('los órdenes por ficha sólo aparecen en los directorios con ficha (monopatín y bicicleta)', () => {
    expect(directorio).toMatch(
      /props\.vertical === 'movilidad' &&[\s\S]*props\.fixedCategoria === 'monopatin-electrico'[\s\S]*props\.fixedCategoria === 'bicicleta-electrica'[\s\S]*MOVILIDAD_PRODUCTOS_SORT_ITEMS/
    )
  })

  // Desde el 4/11/2026 la bici tiene su propio asesor y sus medianas, nunca los del monopatín.
  it('la página de bicicletas usa su asesor y su snapshot, no los del monopatín', () => {
    expect(bicicletas).not.toContain('MovilidadMonopatinAsesor')
    expect(bicicletas).toContain('<MovilidadBicicletaAsesor')
    expect(bicicletas).toContain('specStats')
  })

  it('la ruta de la categoría agrega la ficha de SU categoría (un snapshot por categoría)', () => {
    expect(categoriaApi).toContain('await attachMovilidadSpecs(items, slug)')
    expect(categoriaApi).toContain('MovilidadSpecSnapshotModel.findOne({ key: category })')
  })
})

describe('la tabla de modelos agrupados (4/11/2026)', () => {
  it('lee el catálogo de modelos y enlaza cada fila a la página del modelo', () => {
    expect(page).toContain("useFetch<MonopatinModelListResponse>('/api/movilidad/modelos'")
    expect(page).toContain('`/monopatines-electricos-uruguay/${model.slug}`')
    expect(page).toContain('<MovilidadCompareTray')
  })

  it('sin catálogo de modelos cae a la tabla vieja', () => {
    expect(page).toMatch(/v-else-if="productRows\.length"/)
  })

  it('el ItemList del hub enlaza a las páginas de modelo', () => {
    expect(page).toContain(
      'url: `https://cambio-uruguay.com/monopatines-electricos-uruguay/${model.slug}`'
    )
  })

  it('la bandeja compara hasta tres y arma la URL del comparador', () => {
    const tray = read('components', 'movilidad', 'MovilidadCompareTray.vue')
    expect(tray).toContain('/monopatines-electricos-uruguay/comparar')
    expect(tray).toContain('MONOPATIN_COMPARE_MAX')
    expect(tray).toMatch(/m: .*join\(','\)/)
  })
})

describe('"Ver el modelo" desde la tarjeta y el asesor', () => {
  it('la tarjeta del directorio enlaza al modelo sólo cuando el aviso tiene uno', () => {
    // Desde el 4/11/2026 la ruta sale de la categoría del aviso (monopatín o bici):
    // movilidadModelPath, con su test en movilidadModelos.test.ts.
    expect(card).toContain('v-if="producto.modelSlug && modelPath"')
    expect(card).toContain('movilidadModelPath(props.producto.category, props.producto.modelSlug)')
  })
  it('cada elección del asesor enlaza a su modelo', () => {
    expect(asesor).toContain('v-if="pick.candidato.modelSlug"')
  })
})
