import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito, por las dos razones de `directoriosTramoParity.test.ts`: el
// vitest de la raíz no puede importar un archivo de `app/` —y acá se importa `utils/ads.ts`, que es
// el registro con el que se coteja—, y el job de CI del backend no se dispara con un push que sólo
// toca `app/`, que es exactamente cuando nace una página de problema.
import { bucketOf } from '../../../classes/gsc/opportunities'
import {
  TIER_CONTENIDO,
  TIER_DATO_VIVO,
  TIER_DIRECTORIO,
  TIER_OTRO,
  tierOf,
} from '../../../classes/revenueplan/value'
import { adDensityForPath } from '../../utils/ads'
import { guideHubs } from '../../utils/guideHubs'

/**
 * Que cada página que el sitio MONETIZA COMO LECTURA LARGA esté valuada como contenido en el plan
 * de ingreso.
 *
 * Es la otra mitad de `directoriosTramoParity.test.ts`, y es la mitad que más páginas toca. Ese
 * trinquete cotejó la lista de directorios de `classes/revenueplan/value.ts` contra el registro con
 * el que el sitio declara qué es un directorio, y encontró tres valuados 1× en vez de 0,2×. La
 * pregunta simétrica —qué pasa con las páginas que el sitio declara CONTENIDO— no la cotejaba nada.
 *
 * Medido el 2026-10-22 sobre las 223 páginas raíz: **161 caían en `otro` y valían 1×** teniendo la
 * forma del tramo que mide 8×. El motivo es mecánico y no se ve mirando el archivo: `bucketOf` sólo
 * pliega las familias que se abren en muchas URLs, así que `/guias/<x>` cae en `/guias/*` y cobra
 * su tramo, pero una página de problema con ruta propia conserva su path entero y tiene que estar
 * listada a mano en `CONTENIDO_PATHS`. Esa lista se llenaba desde la alerta `unclassified-families`,
 * que sólo nombra lo que GA4 reportó CON tráfico en la ventana — así que una página sin muestra
 * nunca se asomaba.
 *
 * Y la consecuencia es la que el plan de ingreso existe para evitar: lo que ordena la cola de
 * trabajo es `clics × multiplicador`, de modo que una página de problema quedaba OCHO VECES por
 * debajo de la guía equivalente de `/guias/*` —la misma clase de página y la misma intención de
 * búsqueda, a un lado y al otro de una línea que es un accidente del plegado— y 5× por encima de un
 * directorio en vez de 40×.
 *
 * CON QUÉ SE COTEJA, Y POR QUÉ ESTE REGISTRO Y NO OTRO. `adDensityForPath` (`utils/ads.ts`) decide
 * por ruta cuántos anuncios admite: `normal` son DOS unidades en flujo, que ese archivo describe
 * como «the long reads where an in-flow unit is ordinary and expected», y `light` es UNA sola,
 * después del contenido, en «tool and rate surfaces». No es una pista de la diferencia de RPM: es
 * su mecanismo, y el `why` de `TIER_DATO_VIVO` ya razonaba desde ahí mucho antes de este cotejo
 * («cotización, conversor, histórico, sucursal: alrededor del promedio del sitio, y una sola unidad
 * de anuncio»). Los dos registros coinciden donde los dos opinan: cero páginas `normal` valuadas
 * `dato-vivo`, cero páginas `light` valuadas `contenido`.
 *
 * Se miran sólo las páginas RAÍZ (`pages/*.vue`), con el mismo recorte y por el mismo motivo que
 * `temaHuerfanas.test.ts`: las familias programáticas ya las pliega `bucketOf` y las cubre el
 * cotejo de fichas de `tests/revenueplan/value_routes.test.ts`.
 */
const PAGES = join(__dirname, '..', '..', 'pages')

const rutas = readdirSync(PAGES, { withFileTypes: true })
  .filter(entrada => entrada.isFile() && entrada.name.endsWith('.vue'))
  .map(entrada => (entrada.name === 'index.vue' ? '/' : `/${entrada.name.slice(0, -4)}`))
  .sort()

/** Las que el sitio monetiza como lectura larga: dos unidades en flujo. */
const LECTURA_LARGA = rutas.filter(ruta => adDensityForPath(ruta) === 'normal')

/**
 * Las que llevan `normal` pero NO son páginas de lectura, con su motivo.
 *
 * `normal` es el DEFAULT de `ads.ts` —lo que no es herramienta, conversión ni plomería cae ahí—, así
 * que lo legal, lo que habla del propio sitio y la referencia para desarrolladores lo heredan sin
 * que nadie las haya juzgado lectura larga. Son las mismas que `temaHuerfanas.test.ts` declara
 * fuera de todo tema por diseño, y por la misma razón: no son páginas de lectura.
 *
 * Sumar una acá es declarar que ningún lector llega a ella desde una búsqueda. Si llega, va al tramo.
 */
const NO_ES_PAGINA_DE_LECTURA = new Map([
  ['/acerca', 'sobre el propio sitio'],
  ['/api-cotizacion-intradia', 'referencia para desarrolladores'],
  ['/api-cotizaciones-regionales', 'referencia para desarrolladores'],
  ['/empresas', 'los planes de la API: la página ES la conversión'],
  ['/estadisticas-reddit', 'sobre el propio sitio'],
  ['/hecho-a-pedido', 'sobre el propio sitio'],
  ['/mapa-de-temas', 'ES el índice de temas: los enlaces salen de ella'],
  ['/paginas-mas-visitadas', 'sobre el propio sitio'],
  ['/preguntas-frecuentes', 'sobre el propio sitio'],
  ['/privacidad', 'legal'],
  ['/ranking-usuarios-charruadevs', 'nombra personas, noindex'],
  ['/terminos', 'legal'],
])

/**
 * Las tres listas CURADAS, sin clasificar A PROPÓSITO y con el mismo motivo que
 * `directoriosTramoParity.test.ts` ya le escribió a `/apps-utiles-uruguay`: no son fichas de un
 * relevamiento propio, y a una familia que no se midió no se le inventa un multiplicador. Valen 1×
 * y salen en la alerta `unclassified-families` hasta que alguien tenga sus cifras.
 */
const LISTA_CURADA = [
  '/apps-utiles-uruguay',
  '/apps-de-beneficios-uruguay',
  '/apps-economia-uruguay',
]

/**
 * La deuda: páginas de lectura larga que todavía no están en ningún tramo. **SÓLO PUEDE BAJAR.**
 *
 * 54 el 2026-10-29, cuando sale el racimo del hub `deudas-y-credito-uruguay`: ese tema declaraba
 * quince entradas partidas por la mitad entre dos tramos que se diferencian por ocho veces —ocho ya
 * eran contenido, una es la calculadora (`/herramientas/*`, dato vivo) y seis estaban acá—, y es el
 * peor vecindario del sitio para tener ese error, porque dos de las ocho clasificadas entraron por
 * la alerta `unclassified-families`, o sea con tráfico e ingreso MEDIDOS. Las seis piden un dato en
 * vivo de una sola clase, el tope legal del BCU contra el que su texto razona, y ninguna publica un
 * relevamiento propio; el motivo por página está en `classes/revenueplan/value.ts`. Esa tanda
 * también deja escrito qué no era la línea del 22/10: los controles interactivos no sacan del
 * tramo —`/conviene-pagar-todo-con-credito-uruguay` tiene dieciocho y entró entonces—, lo único que
 * parkeaba era el `useFetch`.
 *
 * 161 el 2026-10-22, antes de la primera tanda; 62 después de ella. Quedan 61 tras clasificar la
 * guía catastral el 2026-10-24: la UR sólo convierte una tasa auxiliar. Y 60 el 2026-10-28, cuando
 * `/cortes-de-luz-por-barrio-uruguay` pasa a `contenido` junto con la página de cortes de agua que
 * nace ese día: las dos son el mismo libro —un servicio del hogar contado por barrio—, piden UN
 * dato en vivo que llena dos tablas y todo el resto de su cuerpo es explicación, así que están del
 * lado de la lectura larga y no de la serie con texto alrededor. Las tres vecinas de hub de la de
 * agua (`/factura-de-ute-uruguay`, `/factura-de-ose-uruguay`, `/que-pasa-si-no-pago-antel`) ya
 * estaban clasificadas así. Las 84 iniciales son todas
 * las que cumplen una línea mecánica: su `<script setup>` no pide ningún dato en vivo, o sea que su
 * cuerpo es texto y no una serie con texto alrededor. Las que quedan son justamente las que esa
 * línea no puede decidir desde acá —una guía que muestra una cifra fresca (la de préstamos, que es
 * la que más rinde del sitio) y una serie viva con explicación al lado se ven igual— más dos que son
 * un relevamiento y no una lectura: `/fletes-mudanzas-uruguay` publica filas de proveedor y
 * `/pensiones-estudiantiles-uruguay` bandas de precio relevadas.
 *
 * Se retiran de a tandas, como se retiró la deuda de descripciones y de títulos: cada tanda elige su
 * tramo mirando la página y escribe por qué. La regla 3 de la cabecera de `value.ts` dice qué hacer
 * con la duda y es lo que esta lista hace: dejarla en `otro`, que vale el promedio y aparece en la
 * alerta, en vez de inventarle un multiplicador alto.
 *
 * Subirlo es publicar una página de lectura larga que la cola de trabajo va a ordenar como si fuera
 * la portada.
 */
const DEUDA_SIN_TRAMO = [
  '/advertencias-bcu',
  '/analisis-alquileres-uruguay',
  '/apostillar-un-documento-uruguay',
  '/banco-o-casa-de-cambio-uruguay',
  '/barrios-alquileres-uruguay',
  '/cambios-de-precio-uruguay',
  '/casas-de-cambio-abiertas-fin-de-semana',
  '/certificado-de-antecedentes-judiciales-uruguay',
  '/comparar-portales-de-alquiler-uruguay',
  '/cooperativas-de-vivienda-uruguay',
  '/cotizacion-del-bcu',
  '/cotizaciones-de-la-region',
  '/cuanto-gastar-en-un-sommier-uruguay',
  '/cuanto-vale-mi-auto-uruguay',
  '/dolar-blue-hoy',
  '/donde-vivir-uruguay',
  '/economia-uruguay',
  '/elecciones-bps-2026',
  '/envio-directo-o-casillero-uruguay',
  '/estafas-uruguay',
  '/evolucion-precio-alquileres-uruguay',
  '/evolucion-precio-autos-usados-uruguay',
  '/evolucion-precio-viviendas-uruguay',
  '/fletes-mudanzas-uruguay',
  '/franquicia-aduana-uruguay',
  '/garantia-de-alquiler-uruguay',
  '/iass-uruguay',
  '/importar-a-uruguay-siendo-extranjero',
  '/impuestos-inversiones-uruguay',
  '/letras-de-regulacion-monetaria-uruguay',
  '/libreta-de-conducir-uruguay',
  '/llevar-dolares-o-reales-a-brasil',
  '/llevar-el-auto-a-brasil-o-argentina',
  '/mercado-it-uruguay',
  '/noticias',
  '/pensiones-estudiantiles-uruguay',
  '/plan-de-vida-uruguay',
  '/por-que-sube-el-dolar',
  '/precio-de-la-nafta-uruguay',
  '/precio-del-boleto-montevideo',
  '/prestamo-hipotecario-uruguay',
  '/prestamos-p2p-uruguay',
  '/problemas-con-la-aduana-uruguay',
  '/que-auto-comprar-uruguay',
  '/que-banco-tiene-mas-descuentos-uruguay',
  '/ropa-por-kilo-uruguay',
  '/salud-financiera',
  '/seguro-obligatorio-de-auto-uruguay',
  '/subsidio-de-alquiler-uruguay',
  '/temas-de-dinero-reddit',
  '/tendencias-uruguay',
  '/tickets-mutualistas-uruguay',
  '/vender-mi-auto-uruguay',
  '/vivir-con-el-salario-minimo-uruguay',
]

const DEUDA_MAXIMA = 54

const TRAMO_POR_NOMBRE: Record<string, unknown> = {
  contenido: TIER_CONTENIDO,
  'dato-vivo': TIER_DATO_VIVO,
  directorio: TIER_DIRECTORIO,
  otro: TIER_OTRO,
}

/**
 * Las que llevan `normal` y NO son contenido porque su propia medición dice otra cosa, con el motivo.
 *
 * Son los directorios de producto: su forma es de lectura larga —y por eso `ads.ts` les da dos
 * unidades— pero midieron 0,09× y 0,18× el promedio del sitio el 2026-09-16, y una medición propia
 * le gana a la forma de la página. Es la misma excepción que `directoriosTramoParity.test.ts`
 * escribe al revés.
 */
const MEDIDA_CONTRA_SU_FORMA = 'directorio'

describe('las páginas que el sitio monetiza como lectura larga están valuadas como contenido', () => {
  it('lee los dos registros', () => {
    expect(rutas.length).toBeGreaterThan(200)
    expect(LECTURA_LARGA.length).toBeGreaterThan(150)
  })

  it('cada página de lectura larga es contenido, un directorio medido, o una excepción declarada', () => {
    const sinClasificar = LECTURA_LARGA.filter(ruta => {
      if (NO_ES_PAGINA_DE_LECTURA.has(ruta)) return false
      if (LISTA_CURADA.includes(ruta)) return false
      if (DEUDA_SIN_TRAMO.includes(ruta)) return false
      const tramo = tierOf(bucketOf(ruta))
      return tramo !== TIER_CONTENIDO && tramo !== TRAMO_POR_NOMBRE[MEDIDA_CONTRA_SU_FORMA]
    })
    expect(sinClasificar, sinClasificar.join('\n')).toEqual([])
  })

  it(`la deuda no pasa de ${DEUDA_MAXIMA} páginas, y sólo puede bajar`, () => {
    expect(DEUDA_SIN_TRAMO.length).toBeLessThanOrEqual(DEUDA_MAXIMA)
  })

  it('la deuda dice la verdad: cada una sigue sin tramo', () => {
    // Una entrada que caducó —ya se clasificó— tiene que delatarse acá en vez de inflar el contador
    // y dejar que la próxima página nazca sin tramo contra un presupuesto que sobra.
    const yaClasificadas = DEUDA_SIN_TRAMO.filter(ruta => tierOf(bucketOf(ruta)) !== TIER_OTRO)
    expect(yaClasificadas, yaClasificadas.join('\n')).toEqual([])
  })

  it('ninguna lista nombra una página que no existe o que no es lectura larga', () => {
    const declaradas = [...NO_ES_PAGINA_DE_LECTURA.keys(), ...LISTA_CURADA, ...DEUDA_SIN_TRAMO]
    expect(declaradas.filter(ruta => !LECTURA_LARGA.includes(ruta))).toEqual([])
  })

  it('las excepciones que no son de lectura siguen sin tramo', () => {
    for (const ruta of [...NO_ES_PAGINA_DE_LECTURA.keys(), ...LISTA_CURADA])
      expect(tierOf(bucketOf(ruta)), ruta).toBe(TIER_OTRO)
  })

  /**
   * El contrapeso. Sin esto los tests de arriba pasarían aunque `tierOf` devolviera `contenido` para
   * cualquier cosa, que es la otra forma de quedar verde sin clasificar nada — y es justo el riesgo
   * de una tanda que agrega 84 rutas a una lista.
   */
  it('el tramo no le pone contenido a todo', () => {
    expect(tierOf(bucketOf('/alquileres-uruguay'))).toBe(TIER_DIRECTORIO)
    expect(tierOf(bucketOf('/historico/dolar'))).toBe(TIER_DATO_VIVO)
    expect(tierOf(bucketOf('/esta-pagina-no-existe'))).toBe(TIER_OTRO)
  })

  /**
   * Y el cotejo al revés, que es el que demuestra que los dos registros se pueden cruzar: una página
   * que `ads.ts` monetiza con UNA unidad («tool and rate surfaces») no puede estar valuada como
   * contenido, y una que monetiza con dos no puede estar valuada como dato vivo.
   */
  it('los dos registros no se contradicen', () => {
    const livianaYContenido = rutas.filter(
      ruta => adDensityForPath(ruta) === 'light' && tierOf(bucketOf(ruta)) === TIER_CONTENIDO
    )
    expect(livianaYContenido, livianaYContenido.join('\n')).toEqual([])
    const largaYDatoVivo = LECTURA_LARGA.filter(ruta => tierOf(bucketOf(ruta)) === TIER_DATO_VIVO)
    expect(largaYDatoVivo, largaYDatoVivo.join('\n')).toEqual([])
  })

  /**
   * Que la deuda que queda esté parkeada por el motivo declarado y no por comodidad.
   *
   * La primera tanda se eligió con una línea mecánica —no promover una página que pide un dato en
   * vivo en su propio `<script setup>`, porque desde acá una guía que muestra una cifra fresca y una
   * serie con texto alrededor se ven igual— y este test la verifica del lado que importa: una página
   * de lectura larga cuyo cuerpo es puro texto no puede quedarse en la lista de deuda. Sin esto la
   * deuda sería un estacionamiento: alcanzaría con anotar ahí la próxima página de problema para no
   * tener que valuarla.
   *
   * Cinco páginas no las decide esa línea, y quedan en deuda con su motivo: dos son un relevamiento
   * en vez de una lectura, y tres tienen el cuerpo hecho de la cifra misma —su texto es estático
   * porque el número está escrito ahí, no porque sean una lectura larga—. Las tres son candidatas a
   * `dato-vivo`, que vale lo mismo que `otro` (1×), así que dejarlas acá no les cambia el precio: lo
   * que evita es afirmar un tramo que nadie midió.
   */
  const NO_LA_DECIDE_LA_LINEA = new Map([
    ['/fletes-mudanzas-uruguay', 'publica filas de proveedor (`ProviderRow`), no un texto'],
    ['/pensiones-estudiantiles-uruguay', 'publica bandas de precio relevadas'],
    [
      '/cotizacion-del-bcu',
      'es una página de cotización: `/cotizacion` ya está en `DATO_VIVO_BUCKETS`',
    ],
    [
      '/precio-del-boleto-montevideo',
      'es la tarifa publicada por la Intendencia; el cuerpo ES la cifra',
    ],
    ['/tickets-mutualistas-uruguay', 'es una consulta por institución sobre la planilla del MSP'],
  ])

  const pideDatoVivo = (ruta: string) =>
    /useFetch|useAsyncData|\$fetch|useLazyFetch/.test(
      readFileSync(join(PAGES, `${ruta === '/' ? 'index' : ruta.slice(1)}.vue`), 'utf8')
    )

  it('cada página que sigue en deuda lo está por el motivo declarado', () => {
    const sinMotivo = DEUDA_SIN_TRAMO.filter(
      ruta => !pideDatoVivo(ruta) && !NO_LA_DECIDE_LA_LINEA.has(ruta)
    )
    expect(sinMotivo, sinMotivo.join('\n')).toEqual([])
  })

  /**
   * Y el contrapeso de esa línea: la medición le gana a la forma, así que una página de contenido SÍ
   * puede pedir un dato en vivo — las cinco de abajo entraron a `CONTENIDO_PATHS` por la alerta
   * `unclassified-families`, o sea con tráfico e ingreso medidos, y una de ellas es la guía de
   * préstamos, que es la familia que más rinde de todo el sitio. Están acá para que quede escrito
   * que la línea de la tanda es un criterio de SELECCIÓN y no un invariante del tramo: si alguna vez
   * se usa al revés —para sacar del tramo a una página porque muestra una cifra— este test dice que
   * no.
   */
  it('la medición le gana a la forma: hay contenido que pide datos en vivo', () => {
    const porMedicion = [
      '/carne-de-salud-uruguay',
      '/limite-de-efectivo-uruguay',
      '/mejores-bancos-uruguay',
      '/mejores-prestamos-uruguay',
      '/prestamos-uruguay',
    ]
    for (const ruta of porMedicion) {
      expect(tierOf(bucketOf(ruta)), ruta).toBe(TIER_CONTENIDO)
      expect(pideDatoVivo(ruta), ruta).toBe(true)
    }
  })
})

/**
 * El racimo de deudas y crédito, que es el vecindario más caro del sitio para tener una página
 * valuada al promedio.
 *
 * La deuda de arriba se retira de a tandas y hasta el 2026-10-28 cada tanda se eligió ruta por ruta.
 * Lo que mostró la del 29 es que el HUB ya es el racimo: `deudas-y-credito-uruguay` declara quince
 * entradas en `resources` y estaba partido por la mitad entre dos tramos que se diferencian por OCHO
 * VECES, sin que nada de eso respondiera a una diferencia entre las páginas — ocho eran contenido,
 * seis estaban en deuda por pedir un dato en vivo y la que queda es la calculadora.
 *
 * Por qué este hub y no los veintitantos: dos de sus miembros (`/prestamos-uruguay` y
 * `/mejores-prestamos-uruguay`) entraron al tramo por la alerta `unclassified-families`, o sea con
 * tráfico e ingreso MEDIDOS, y `docs/analytics/REVENUE_PLAN.md` registra la guía de préstamo a sola
 * firma como la familia de mayor multiplicador medido de todo el sitio. O sea que acá el tramo no es
 * una hipótesis sobre la forma de la página: hay medición propia al lado.
 *
 * Lo que este trinquete compra es la página que viene. Una entrada nueva en el hub —la clase de
 * página que este vecindario produce seguido— nace sin estar en `CONTENIDO_PATHS` y la cola de
 * trabajo la ordena ocho veces por debajo de sus catorce vecinas sin que nada se ponga rojo. Ahora
 * sí: o entra al tramo, o se declara acá como la calculadora, con su motivo.
 */
describe('el hub de deudas y crédito está entero en un tramo', () => {
  const hub = guideHubs.find(entrada => entrada.slug === 'deudas-y-credito-uruguay')

  /**
   * La única entrada del hub que NO es contenido, con su motivo. Es una herramienta y no una
   * lectura, y los dos registros lo dicen más fuerte que en cualquier otro caso de este archivo:
   * `bucketOf` la pliega en `/herramientas/*`, que ya está en `DATO_VIVO_BUCKETS`, y `ads.ts` no le
   * da `light` sino `none` —una calculadora no lleva NINGÚN anuncio salvo que se active `toolsAds`—,
   * así que no entra siquiera en el cotejo de lectura larga de arriba.
   */
  const NO_ES_LECTURA = new Map([
    ['/herramientas/calculadora-prestamo', 'es la calculadora: una herramienta, no una lectura'],
  ])

  it('el hub existe y tiene sus entradas', () => {
    expect(hub).toBeDefined()
    expect(hub!.resources?.length).toBeGreaterThan(10)
  })

  it('cada entrada es contenido, o está declarada como lo que no es una lectura', () => {
    const sinTramo = (hub!.resources ?? [])
      .map(recurso => recurso.to)
      .filter(ruta => !NO_ES_LECTURA.has(ruta) && tierOf(bucketOf(ruta)) !== TIER_CONTENIDO)
    expect(sinTramo, sinTramo.join('\n')).toEqual([])
  })

  it('la excepción declarada sigue siendo la herramienta que dice ser', () => {
    for (const ruta of NO_ES_LECTURA.keys()) {
      expect(tierOf(bucketOf(ruta)), ruta).toBe(TIER_DATO_VIVO)
      expect(adDensityForPath(ruta), ruta).toBe('none')
      expect(adDensityForPath(ruta, { toolsAds: true }), ruta).toBe('light')
    }
  })

  it('ninguna entrada declarada como no-lectura quedó fuera del hub', () => {
    const rutas = new Set((hub!.resources ?? []).map(recurso => recurso.to))
    for (const ruta of NO_ES_LECTURA.keys()) expect(rutas.has(ruta), ruta).toBe(true)
  })
})
