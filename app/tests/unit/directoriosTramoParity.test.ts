import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito, por las dos razones de `storeConstantsParity.test.ts`: el
// vitest de la raíz no puede importar un archivo de `app/`, y el job de CI del backend no se
// dispara con un push que sólo toca `app/` — que es exactamente cuando nace un directorio. La otra
// mitad del cotejo (que las rutas y los prefijos de la tabla existan) vive en
// `tests/revenueplan/value_routes.test.ts`.
import { bucketOf } from '../../../classes/gsc/opportunities'
import {
  TIER_CONTENIDO,
  TIER_DATO_VIVO,
  TIER_DIRECTORIO,
  TIER_OTRO,
  tierOf,
} from '../../../classes/revenueplan/value'
import { DIRECTORIOS } from '../../utils/directorios'

/**
 * Que cada directorio que el sitio DECLARA esté valuado como directorio en el plan de ingreso.
 *
 * `classes/revenueplan/value.ts` decide cuánto vale un clic por familia de página, y los
 * directorios de producto valen 0,2× el promedio del sitio: son las páginas más caras de producir y
 * las que menos pagan por vista (`/alquileres` midió 0,09× y `/oportunidades` 0,18× el 2026-09-16).
 * La lista de rutas de ese archivo se mantiene A MANO —«se agrega cuando nace un directorio»— y
 * nada la cotejaba contra `utils/directorios.ts`, que es el registro con el que este sitio define
 * qué es un directorio y el que dibuja `/directorios-uruguay`.
 *
 * Medido el 2026-10-14: tres de los quince habían nacido, se habían declarado en el registro y
 * nadie los había agregado a la tabla (`/motos-usadas-uruguay`, `/inmobiliarias-uruguay`,
 * `/precios-de-supermercado-uruguay`), así que valían 1× — cinco veces su tramo. Es el mismo error
 * que el comentario del espejo de `value.ts` ya documenta para `/en/alquileres-uruguay/*`: «un
 * directorio quedaba valuado 5 veces por encima de su tramo».
 *
 * Un directorio sobrevaluado no es un número feo en un tablero: lo que ordena la cola de trabajo es
 * `clics × multiplicador`, así que manda a trabajar donde el clic no paga, que es justo la decisión
 * que el plan de ingreso existe para corregir.
 */
const TRAMO_DISTINTO_AL_REGISTRO = new Map([
  // Es una página de cotización en vivo, y como tal está en `DATO_VIVO_BUCKETS` desde el principio.
  ['/casas-de-cambio', 'dato-vivo'],
  // Entró a `CONTENIDO_PATHS` el 2026-09-20 desde la alerta `unclassified-families`, o sea con
  // tráfico e ingreso medidos en la ventana. Una medición propia le gana a la forma de la página.
  ['/tarjetas-de-credito-uruguay', 'contenido'],
  // Las dos listas CURADAS del registro, y las dos sin clasificar a propósito: no son fichas de un
  // relevamiento propio, y `/couriers-uruguay` además cuelga del racimo de importación, que es el
  // que mide 8×. Valen 1× y salen en la alerta `unclassified-families` hasta que alguien tenga sus
  // cifras — que es lo que la cabecera de `value.ts` manda hacer con una familia que no se midió:
  // «NUNCA se le inventa un multiplicador».
  ['/couriers-uruguay', 'otro'],
  ['/apps-utiles-uruguay', 'otro'],
])

const TRAMO_POR_NOMBRE: Record<string, unknown> = {
  contenido: TIER_CONTENIDO,
  'dato-vivo': TIER_DATO_VIVO,
  directorio: TIER_DIRECTORIO,
  otro: TIER_OTRO,
}

describe('los directorios que el sitio declara están valuados en el plan de ingreso', () => {
  const rutas = DIRECTORIOS.map(entrada => entrada.to)

  it('lee el registro', () => {
    expect(rutas.length).toBeGreaterThanOrEqual(15)
  })

  it('cada ruta del registro es directorio, o una excepción declarada con su motivo', () => {
    const sinClasificar = rutas.filter(
      ruta => !TRAMO_DISTINTO_AL_REGISTRO.has(ruta) && tierOf(bucketOf(ruta)) !== TIER_DIRECTORIO
    )
    expect(sinClasificar).toEqual([])
  })

  it('las excepciones dicen la verdad sobre el tramo en el que están', () => {
    // Una excepción que caducó —la página se reclasificó, o juntó medición propia— tiene que
    // delatarse acá en vez de quedar como un comentario que ya no describe el código.
    for (const [ruta, tramo] of TRAMO_DISTINTO_AL_REGISTRO)
      expect(tierOf(bucketOf(ruta)), ruta).toBe(TRAMO_POR_NOMBRE[tramo])
  })

  it('ninguna excepción nombra una ruta que el registro no declara', () => {
    expect([...TRAMO_DISTINTO_AL_REGISTRO.keys()].filter(ruta => !rutas.includes(ruta))).toEqual([])
  })

  // El contrapeso: sin esto los tests de arriba pasarían aunque `tierOf` devolviera `directorio`
  // para cualquier cosa, que es la otra forma de quedar "verde" sin clasificar nada.
  it('el tramo no le pone directorio a todo', () => {
    expect(tierOf(bucketOf('/guias/alguna-guia'))).toBe(TIER_CONTENIDO)
    expect(tierOf(bucketOf('/historico/dolar'))).toBe(TIER_DATO_VIVO)
    expect(tierOf(bucketOf('/plan-de-vida-uruguay'))).toBe(TIER_OTRO)
  })
})
