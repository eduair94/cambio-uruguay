import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// `/guias/usar-tarjeta-uruguaya-en-argentina` no recibía UN SOLO enlace de contexto, y esta vez no
// se descubrió a mano: lo midió `enlacesDeContextoGuias.test.ts`, el decimosexto pozo de
// `npm run seo_debt`, que nació con esta corrida porque el trinquete de las páginas raíz
// (`enlacesDeContexto.test.ts`) deja fuera a las familias programáticas y las guías no tienen ni
// barra ni bloque directorio ↔ análisis. Es una página del tramo `contenido` —el que rinde 8× el
// promedio del sitio, `classes/revenueplan/value.ts`— y su única puerta de entrada interna era la
// lista de `/guias` más el bloque del tema, que queda a 11.341 px.
//
// El enlace sale del tablero regional por las tres razones de la nota de `/guias/propinas-en-uruguay`
// y no por cercanía temática: el vínculo ya existía de ida sola (la guía enlaza al tablero y a
// `/dolar-blue-hoy`, y ninguno le devolvía nada), el origen está sin tramo y vale 1× mientras el
// destino vale 8×, que es el sentido que pide `docs/analytics/REVENUE_PLAN.md`, y sobre todo la
// propia página deja la pregunta hecha y sin contestar: su sección «¿Compro la moneda acá o llevo
// dólares?» compara las dos rutas que tienen precio de mostrador, y la tercera que usa cualquier
// viajero —pagar allá con la tarjeta— no aparecía en ninguna parte del tablero.
//
// Va DENTRO del aviso «Lo que esta cuenta no incluye», a mitad de página y en flujo, y no en el pie
// «Seguir por acá», por la medición de `docs/app/INTERCONEXIONES.md`. Este test vigila que no se
// pierda y que no se mude al pie: sin él, el único aviso sería que el slug vuelve a tener una sola
// mención en el repo.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
const template = (source: string) => source.slice(0, source.search(/<script\b/))

const GUIA = "localePath('/guias/usar-tarjeta-uruguaya-en-argentina')"

describe('enlace de contexto: la guía de pagar con tarjeta en Argentina', () => {
  const tpl = template(read('pages/cotizaciones-de-la-region.vue'))

  it('el tablero regional enlaza la guía', () => {
    expect(tpl).toContain(GUIA)
  })

  it('el enlace va en el aviso de la sección de rutas, no en el pie', () => {
    const aviso = tpl.indexOf('Lo que esta cuenta no incluye')
    const pie = tpl.indexOf('Seguir por acá')
    const enlace = tpl.indexOf(GUIA)
    expect(aviso).toBeGreaterThan(-1)
    expect(pie).toBeGreaterThan(aviso)
    expect(enlace).toBeGreaterThan(aviso)
    expect(enlace).toBeLessThan(pie)
  })

  it('el vínculo queda recíproco: la guía ya enlaza el tablero', () => {
    expect(read('utils/guidesPagos.ts')).toContain("to: '/cotizaciones-de-la-region'")
  })
})
