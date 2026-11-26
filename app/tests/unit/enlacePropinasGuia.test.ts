import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// `/guias/propinas-en-uruguay` no recibía UN SOLO enlace de contexto (medido el 2026-11-26: la
// única mención de su slug en todo el árbol era su propia ficha de `utils/guides.ts`), y además
// está fuera de todos los temas por la decisión que `temaHuerfanas.test.ts` dejó escrita el
// 2026-10-15 —«un padre inventado es peor que ninguno»—, así que tampoco tenía el bloque «Más
// sobre este tema». O sea: una página del tramo `contenido` —el que rinde 8× el promedio del
// sitio, `classes/revenueplan/value.ts`— cuya única puerta de entrada interna era la lista de
// `/guias`.
//
// El enlace sale de la calculadora de propinas porque el vínculo ya existía de ida sola (la guía
// la lista en sus `related`) y porque el propio texto de la calculadora afirma las DOS cosas que
// la guía desarrolla —que la propina es voluntaria y ronda el 10 %, y que el «cubierto» no es
// propina— sin decir nunca dónde se explican. Va en esa misma frase y no en el pie, por lo que
// `docs/app/INTERCONEXIONES.md` midió en producción: el bloque del pie queda a 11.341 px de una
// página de 15.868, enlazado para un rastreador e invisible para un lector.
//
// Este test vigila que el enlace no se pierda: sin él, el único aviso sería que el slug vuelve a
// tener una sola mención en el repo, que es justo lo que nadie estaba mirando.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
const template = (source: string) => source.slice(0, source.search(/<script\b/))

describe('enlace de contexto: la guía de propinas', () => {
  it('la calculadora de propinas enlaza la guía desde el párrafo del cubierto', () => {
    const tpl = template(read('pages/herramientas/calculadora-propinas.vue'))
    expect(tpl).toContain("localePath('/guias/propinas-en-uruguay')")
    // En la frase que ya nombraba el «cubierto», no en un bloque de relacionadas al final.
    expect(tpl).toContain('cubierto')
  })

  it('el vínculo queda recíproco: la guía ya enlaza la calculadora', () => {
    expect(read('utils/guides.ts')).toContain("to: '/herramientas/calculadora-propinas'")
  })
})
