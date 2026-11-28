import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guides } from '../../utils/guides'

/**
 * El decimosexto pozo: las GUÍAS que ninguna otra página enlaza desde su contenido.
 *
 * POR QUÉ HACE FALTA. `enlacesDeContexto.test.ts` mide lo mismo pero sólo sobre las páginas RAÍZ
 * (`pages/*.vue`), y deja fuera a las familias programáticas porque «resuelven su enlazado con la
 * barra y el bloque directorio ↔ análisis». Las guías viven en una familia programática
 * (`pages/guias/[slug].vue`) y NO tienen ninguna de esas dos cosas: no llevan chip en la barra de
 * ninguna familia y no son un directorio. Lo único que una guía tiene garantizado es lo que ese
 * mismo trinquete declara que NO cuenta como enlace de contexto — el bloque «Más sobre este tema»
 * de `guideHubs.ts` y el «Seguí leyendo» de `relatedPages.ts` —, y no cuenta por una razón medida:
 * `docs/app/INTERCONEXIONES.md` ubicó el bloque del pie a **11.341 px de una página de 15.868**, o
 * sea enlazada para un rastreador e invisible para un lector.
 *
 * La consecuencia es que una guía podía nacer, y vivir, sin una sola puerta de entrada que un
 * lector cruce. Se descubrió a mano el 2026-11-26 con `/guias/propinas-en-uruguay` («la única
 * mención en todo el árbol era su propia ficha de `utils/guides.ts`») y la cuenta completa, medida
 * el 2026-11-28 con el mismo criterio del trinquete de arriba: **32 de las 165 guías indexables no
 * recibían ni un enlace de contexto**, y otras 49 recibían uno solo. Son páginas de la familia
 * `/guias/*`, que
 * `classes/revenueplan/value.ts` valúa en el tramo `contenido` — el que rinde 8× el promedio del
 * sitio —, así que es la deuda de enlazado más cara que el repo tenía sin medir, y se leía igual
 * que «acá no hay deuda».
 *
 * QUÉ CUENTA COMO ENLACE. Exactamente lo mismo que en `enlacesDeContexto.test.ts`: un `to` o un
 * `href` escrito en el contenido de una página, de un componente o de un módulo de contenido de
 * `utils/` (la lista `related` de otra guía, las tarjetas de un catálogo, el `links` de una
 * sección). NO cuentan los cinco registros que dibuja el layout, por el mismo motivo que allá.
 *
 * Para bajar este número: un enlace en el CONTENIDO de la página cuyo lector necesita la guía. Un
 * enlace que nadie seguiría no cuenta como arreglo aunque ponga el test en verde.
 */
const APP = join(__dirname, '..', '..')

/** Los cinco registros del layout. Un enlace que sale de acá no es un enlace de contexto. */
const REGISTROS_DEL_LAYOUT = [
  'siteNav.ts',
  'familiaNav.ts',
  'directorios.ts',
  'guideHubs.ts',
  'relatedPages.ts',
]

function archivos(dir: string, extensiones: string[]): string[] {
  return readdirSync(dir).flatMap(nombre => {
    const completo = join(dir, nombre)
    if (statSync(completo).isDirectory()) return archivos(completo, extensiones)
    if (!extensiones.some(ext => nombre.endsWith(ext))) return []
    return REGISTROS_DEL_LAYOUT.includes(nombre) ? [] : [completo]
  })
}

/** El mismo lector de destinos internos de `enlacesDeContexto.test.ts`, y por los mismos motivos. */
const ENLACE = /(?::?to|href)\s*[=:]\s*["']?(?:localePath\()?['"](\/[a-z0-9][a-z0-9\-/]*)['"]/g

const fuentes = [
  ...archivos(join(APP, 'pages'), ['.vue']),
  ...archivos(join(APP, 'components'), ['.vue']),
  ...archivos(join(APP, 'utils'), ['.ts']),
]

const entrantes = new Map<string, Set<string>>()
for (const archivo of fuentes) {
  const texto = readFileSync(archivo, 'utf8')
  const origen = relative(APP, archivo).split(sep).join('/')
  for (const coincidencia of texto.matchAll(ENLACE)) {
    const ruta = coincidencia[1]!.replace(/\/$/, '')
    if (!entrantes.has(ruta)) entrantes.set(ruta, new Set())
    entrantes.get(ruta)!.add(origen)
  }
}

/**
 * Las guías que se miden: el catálogo entero menos las consolidadas, que declaran
 * `noindex, follow` y no van al sitemap (`guides.ts`), así que nadie tiene que enlazarlas.
 */
const medibles = guides.filter(guia => !guia.consolidatedInto)

const sinEnlaceDeContexto = medibles
  .filter(guia => (entrantes.get(`/guias/${guia.slug}`)?.size ?? 0) === 0)
  .map(guia => guia.slug)
  .sort()

/**
 * La deuda: guías que nadie enlaza desde su contenido. **SÓLO PUEDE BAJAR**, y la lista es EXACTA
 * (una guía nueva sin puerta de entrada pone CI en rojo en vez de sumarse en silencio al número).
 *
 * 32 el 2026-11-28, la primera medición. 32 → 31 en la misma corrida, y la que salió es la que
 * cumple las tres condiciones de la nota de `/guias/propinas-en-uruguay` (2026-11-26): ruta libre
 * de toda ventana abierta del libro de cambios, una página que YA habla de ella en prosa y que
 * además YA recibe un enlace suyo —o sea que el vínculo existía de ida sola—, y un origen de tramo
 * más barato que el destino, que es el sentido que pide `docs/analytics/REVENUE_PLAN.md`.
 * `/guias/usar-tarjeta-uruguaya-en-argentina` recibió el suyo desde
 * `/cotizaciones-de-la-region`: la sección «¿Compro la moneda acá o llevo dólares?» compara las dos
 * rutas con precio de mostrador y su propio aviso enumera lo que la cuenta no incluye, mientras la
 * tercera ruta que usa cualquier viajero —pagar con la tarjeta— no estaba en ninguna parte de la
 * página; y la guía ya enlazaba a ese tablero y a `/dolar-blue-hoy`, las dos de ida sola.
 *
 * El comentario va DENTRO de la lista por lo que `DEUDA_SIN_ENLACE` en `enlacesDeContexto.test.ts`
 * deja escrito: `classes/revenueplan/debtFree.ts::parseStringList` corta en el primer `\n]`, y
 * prettier aplasta a una sola línea cualquier array que entre en 100 columnas salvo los que llevan
 * un comentario.
 */
const GUIAS_SIN_ENLACE = [
  'acoso-laboral-uruguay',
  'asignacion-familiar-doble-uruguay',
  'aumento-de-jubilaciones-uruguay',
  'billete-cable-transferencia',
  'cambiar-monedas-poco-comunes-uruguay',
  'casas-de-cambio-vs-bancos',
  'comision-inmobiliaria-uruguay',
  'como-leer-cotizacion-dolar',
  'como-pedir-un-aumento-de-sueldo-uruguay',
  'comprar-criptomonedas-en-uruguay',
  'comprar-dolares-online-uruguay',
  'comprar-en-shein-desde-uruguay',
  'conviene-ahorrar-en-dolares-uruguay',
  'cuanto-cuesta-un-sepelio-uruguay',
  'cuanto-tiempo-guardar-recibos-y-facturas-uruguay',
  'devoluciones-y-cambios-en-tiendas-uruguay',
  'educacion-financiera-para-jovenes-uruguay',
  'euros-reales-donde-cambiar',
  'evitar-comisiones-cambio',
  'glosario-terminos-cambiarios',
  'horarios-casas-de-cambio-uruguay',
  'impuesto-al-patrimonio-uruguay',
  'inflacion-y-dolar-uruguay',
  'no-pagar-prestamo-e-irse-del-pais-uruguay',
  'pedir-que-me-despidan-uruguay',
  'precio-del-oro-en-uruguay',
  'proyeccion-dolar-uruguay-se-puede-predecir',
  'saldo-a-favor-tarjeta-de-credito-uruguay',
  'tipo-de-cambio-fiscal-dgi-uruguay',
  'trabajo-domestico-uruguay',
  'usuario-personal-bps-uruguay',
]

/** Igual a la lista, a propósito: la holgura de un trinquete absorbe en silencio la página nueva. */
const GUIAS_DEUDA_MAXIMA = 31

/**
 * Cuántas guías mide este pozo. Si el lector dejara de ver el catálogo —o alguien cambiara la forma
 * de `guides`—, la deuda caería a cero sin que nada se arregle, que es el modo de fallar del que
 * nacieron los pozos sexto y séptimo de `npm run seo_debt`.
 */
const GUIAS_MEDIBLES = 165

describe('toda guía tiene al menos una puerta de entrada que un lector cruza', () => {
  it(`mide al menos ${GUIAS_MEDIBLES} guías y lee enlaces de verdad`, () => {
    expect(medibles.length).toBeGreaterThanOrEqual(GUIAS_MEDIBLES)
    // Un regex que deja de matchear devolvería «toda guía es huérfana», no un cero.
    expect(sinEnlaceDeContexto.length).toBeLessThan(medibles.length / 2)
  })

  it('no cuenta como enlace de contexto lo que dibuja el layout', () => {
    // El bloque del tema y el «Seguí leyendo» están excluidos a propósito: ver el encabezado.
    expect(fuentes.some(archivo => archivo.endsWith('guideHubs.ts'))).toBe(false)
    expect(fuentes.some(archivo => archivo.endsWith('relatedPages.ts'))).toBe(false)
  })

  it(`tiene como mucho ${GUIAS_DEUDA_MAXIMA} guías sin enlace de contexto entrante`, () => {
    expect(sinEnlaceDeContexto.length, sinEnlaceDeContexto.join('\n')).toBeLessThanOrEqual(
      GUIAS_DEUDA_MAXIMA
    )
  })

  it('la deuda declarada es exactamente la medida', () => {
    expect(sinEnlaceDeContexto).toEqual([...GUIAS_SIN_ENLACE].sort())
  })
})
