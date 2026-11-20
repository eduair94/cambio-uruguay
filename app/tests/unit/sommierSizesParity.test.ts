import { describe, expect, it } from 'vitest'
// Como equiparMirrorParity: el test del app puede leer el registro de la raíz; el build no.
import { EQUIPAR_BY_KEY } from '../../../classes/equipar/registry'
import { SOMMIER_SIZES } from '../../utils/sommierBudget'

/**
 * `/cuanto-gastar-en-un-sommier-uruguay` pide sus medidas por la clave de la variante y pone al lado
 * el colchón de la misma clave. Si el registro renombra una variante, la página se queda sin datos
 * en silencio: mostraría "todavía no reunimos avisos" para siempre.
 */
describe('las medidas de la página del sommier son las del registro', () => {
  it('mismas claves y mismas etiquetas que las variantes del sommier', () => {
    const sommier = EQUIPAR_BY_KEY.get('sommier')!
    const byKey = new Map(sommier.variants.map(variant => [variant.key, variant.label]))
    expect(new Set(SOMMIER_SIZES.map(size => size.variant))).toEqual(new Set(byKey.keys()))
    for (const size of SOMMIER_SIZES) expect(size.label, size.variant).toBe(byKey.get(size.variant))
  })

  it('el colchón tiene una variante con cada clave, para ponerlos lado a lado', () => {
    const colchon = EQUIPAR_BY_KEY.get('colchon')!
    const keys = new Set(colchon.variants.map(variant => variant.key))
    for (const size of SOMMIER_SIZES) expect(keys.has(size.variant), size.variant).toBe(true)
  })
})
