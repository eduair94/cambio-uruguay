import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIRECTORIOS } from '../../utils/directorios'
import { familiaNavRutas } from '../../utils/familiaNav'

/**
 * Las páginas de lectura que NINGUNA otra página enlaza desde su contenido, y que tampoco tienen
 * chip en la barra de su familia.
 *
 * `temaHuerfanas.test.ts` ya exige que toda página de lectura pertenezca a un tema, y eso le
 * garantiza aparecer en el bloque «Más sobre este tema». Lo que ese trinquete NO puede ver es
 * DÓNDE queda ese enlace: `docs/app/INTERCONEXIONES.md` lo midió en producción y el bloque del pie
 * aparece a **11.341 px de una página de 15.868** (después de todos los avisos), así que una página
 * cuyo único vínculo es ése está enlazada para un rastreador y es invisible para un lector. Es
 * literalmente la razón por la que existe la barra de la familia: «un rastreo que cuenta enlaces no
 * ve esto: hay que medir dónde están».
 *
 * La misma medición se hizo a mano el 2026-10-11 sobre UNA sección del menú —«eran las ÚNICAS dos
 * rutas de la sección `houses` del menú sin un solo enlace desde el contenido de otra página»— y de
 * ahí salió el grupo «antes de cambiar» de `utils/familiaNav.ts`. Lo que faltaba era el trinquete:
 * la medición a mano cubrió seis de las veintinueve secciones y nada impedía que la próxima página
 * naciera igual.
 *
 * QUÉ CUENTA COMO ENLACE. Un `to` o un `href` escrito en el contenido de otra página, de un
 * componente o de un módulo de contenido de `utils/` (la lista `related` de una guía, las tarjetas
 * de un catálogo). NO cuentan los cinco registros que dibuja el layout —`siteNav.ts` (el menú, que
 * no es una relación entre páginas), `familiaNav.ts` y `directorios.ts` (la barra, que se mide
 * aparte, abajo), `guideHubs.ts` (el bloque del tema, que es justo el que queda a 11.000 px) y
 * `relatedPages.ts` («Seguí leyendo», el último bloque del pie)—. Y la barra de la familia SÍ
 * cuenta, porque va arriba del título: es la forma en que el arreglo del 11/10 resolvió sus dos
 * rutas, y contar un chip de la barra como deuda convertiría ese arreglo en rojo.
 *
 * Se miran sólo las páginas RAÍZ (`pages/*.vue`), con el mismo recorte y por el mismo motivo que
 * `temaHuerfanas.test.ts`: las familias programáticas (`[key].vue`, `[slug].vue`) resuelven su
 * enlazado con la barra y el bloque directorio ↔ análisis.
 */
const APP = join(__dirname, '..', '..')
const PAGES_DIR = join(APP, 'pages')

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

/**
 * Un destino interno escrito como enlace: `to="/x"`, `:to="localePath('/x')"`, `href="/x"` o
 * `to: '/x'`.
 *
 * Exige el nombre del atributo a propósito. Un barrido por cadenas que empiezan con `/` cuenta
 * también las rutas que `utils/ads.ts` lista para configurar los avisos o las que `bareRoutes.ts`
 * enumera para servirlas sin layout, que no son enlaces: con ese criterio `/offline` figuraba
 * enlazada por el módulo de publicidad.
 */
const ENLACE = /(?::?to|href)\s*[=:]\s*["']?(?:localePath\()?['"](\/[a-z0-9][a-z0-9\-/]*)['"]/g

const fuentes = [
  ...archivos(PAGES_DIR, ['.vue']),
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

/** Las rutas que llevan chip en la barra de alguna familia (incluidos los grupos). */
const conBarra = new Set(DIRECTORIOS.flatMap(entrada => familiaNavRutas(entrada.to)))

const rutasRaiz = readdirSync(PAGES_DIR, { withFileTypes: true })
  .filter(entrada => entrada.isFile() && entrada.name.endsWith('.vue'))
  .map(entrada => (entrada.name === 'index.vue' ? '/' : `/${entrada.name.slice(0, -4)}`))
  .sort()

const sinEnlaceDeContexto = rutasRaiz.filter(ruta => {
  if (ruta === '/' || conBarra.has(ruta)) return false
  const origenes = [...(entrantes.get(ruta) ?? [])].filter(origen => origen !== `pages${ruta}.vue`)
  return origenes.length === 0
})

/**
 * Las que no son páginas de lectura, y por eso no esperan un enlace de contexto: el índice de los
 * directorios y el de los temas (son índices, los enlaces salen de ellos), lo legal, lo que habla
 * del propio sitio, la lista que vive en el navegador de quien la abre, y las que ya optan por
 * salirse del índice (`noindex`, ver `seoContract.test.ts`).
 *
 * Sumar una página acá es declarar que ningún lector de otra página la necesita. Si la necesita, va
 * un enlace.
 */
const SIN_LECTOR_QUE_LA_NECESITE = [
  '/directorios-uruguay', // ES el índice de los directorios
  '/estadisticas-reddit', // sobre el propio sitio
  '/mapa-de-temas', // ES el índice de temas
  '/mi-lista', // vive en el navegador de quien la abre
  '/offline', // fallback de la PWA, noindex
  '/preguntas-frecuentes', // sobre el propio sitio
  '/terminos',
  '/widget', // para embeber, noindex
]

/**
 * La deuda: páginas de lectura que nadie enlaza desde su contenido. **SÓLO PUEDE BAJAR.**
 *
 * 22 el 2026-10-13, la primera medición. 22 → 21 en la misma corrida, y la que salió es la ÚNICA de
 * las veintidós que cumple las dos condiciones: ruta libre de toda ventana de medición abierta de
 * `docs/seo/experiments.json`, y una página que YA habla de ella en prosa, así que el enlace es uno
 * que un lector sigue y no relleno. `/pension-alimenticia-uruguay` recibió tres desde
 * `/embargo-de-sueldo-uruguay`: la entradilla nombra las dos excepciones del art. 381 del CGP
 * («deudas por tributos y pensiones alimenticias»), el orden de prelación de la Ley 17.829 le da el
 * primer lugar por encima de toda retención firmada, y el bloque «Seguir por acá» no la tenía. El
 * vínculo además era de ida sola: la página de la pensión ya enlazaba al embargo.
 *
 * Las otras veintiuna esperan, y por una de dos razones. Veinte llevan una fila abierta del libro de
 * cambios (de la del 20/9 a la del 13/10): entrar a recibir enlaces es un cambio pensado para mover
 * tráfico, así que declara su propia fila y le cambiaría el sujeto al experimento que ya está
 * midiendo esa página — la misma reserva que `temaHuerfanas.test.ts` aplica a diecinueve rutas y
 * `seoDescriptionBudget.test.ts` a `/fecha-de-cobro-bps-uruguay`. La que queda,
 * `/donde-conseguir-monedas-uruguay`, tiene la ruta libre pero sus dos vecinas naturales
 * —`/precio-del-boleto-montevideo` y `/guias/propinas-en-uruguay`— están las dos dentro de una
 * ventana abierta, y su contenido vive en un árbol de cadenas trilingüe (`utils/coins.ts`) donde un
 * enlace no se puede escribir en la prosa. Entra cuando alguna de las dos cierre.
 *
 * Para bajar este número: un enlace en el CONTENIDO de la página cuyo lector la necesita, o un chip
 * en la barra de su familia (`utils/familiaNav.ts`) si pertenece a una. Un enlace que nadie seguiría
 * no cuenta como arreglo aunque ponga el test en verde.
 */
const DEUDA_SIN_ENLACE = [
  '/alternativa-a-bankos-uruguay',
  '/apostillar-un-documento-uruguay',
  '/apps-utiles-uruguay',
  '/cambios-de-precio-uruguay',
  '/certificado-unico-dgi-uruguay',
  '/cheques-uruguay',
  '/cortes-de-luz-por-barrio-uruguay',
  '/donde-conseguir-monedas-uruguay',
  '/fondo-de-solidaridad-uruguay',
  '/grabacion-sin-consentimiento-uruguay',
  '/impuesto-temu-uruguay',
  '/jubilacion-por-incapacidad-uruguay',
  '/llevar-el-auto-a-brasil-o-argentina',
  '/precio-del-boleto-montevideo',
  '/reconocer-anos-trabajados-uruguay',
  '/ropa-por-kilo-uruguay',
  '/seguro-obligatorio-de-auto-uruguay',
]

/** El trinquete. Sólo puede bajar: subirlo es publicar una página que nadie enlaza. */
// 18 → 17 el 2026-10-18, y otra vez sin ir a buscarlo: la página nueva
// `/cooperativas-de-vivienda-uruguay` necesita a `/prestamo-hipotecario-uruguay` en su propio
// contenido, porque la cooperativa y el crédito a nombre de una persona son las dos formas de
// financiar la misma compra y el lector que descarta una se va a la otra. La ruta medida tiene
// fila abierta del libro de cambios hasta el 27/10 y la reserva NO se rompe, por lo mismo que el
// 15/10: el enlace entrante nace en una página publicada hoy, sin tráfico todavía, y al archivo de
// la página medida no se lo tocó —ni el snippet, ni el cuerpo, ni un enlace de salida—.
//
// Y por eso el enlace de ENTRADA de la página nueva no salió de ahí: salió de
// `/comprar-o-alquilar-uruguay`, que no tiene ventana abierta y cuyo lector lo necesita de verdad
// —toda la página compara la cuota de un crédito contra el alquiler, o sea que da por inexistente
// la tercera puerta, donde el préstamo lo toma la cooperativa y lo que decide no es cuánto te
// prestan sino un TECHO de ingresos del hogar—.
// 19 → 18 el 2026-10-15, por lo mismo que las dos del 14/10 y sin ir a buscarlo: la página nueva
// `/impuesto-a-las-trasmisiones-patrimoniales-uruguay` necesita a `/valor-catastral-uruguay` en su
// propio contenido, porque el valor que explica esa página ES la base imponible del impuesto que
// explica ésta —el artículo 5.º del Título 19 la fija ahí y no en el precio—, así que el enlace es
// el que un lector sigue para poder hacer la cuenta y no relleno. `/valor-catastral-uruguay` tiene
// fila abierta del libro de cambios hasta el 9/11 y la reserva no se rompe: el enlace entrante nace
// en una página publicada hoy, sin tráfico todavía, y a la página medida no se le tocó ni el
// snippet ni el cuerpo.
//
// Al mismo tiempo, el enlace de entrada de la página nueva NO salió de ahí, justamente por esa
// fila: salió de `/comprar-o-alquilar-uruguay`, que no tiene ventana abierta y cuyo lector lo
// necesita de verdad —la página le pide escribir «Gastos de escrituración» y nunca le dijo de qué
// está hecha esa cifra, y la mitad que no se negocia es el ITP—.
// 21 → 19 el 2026-10-14, y las dos salieron sin que nadie fuera a buscarlas: la página nueva
// `/pagar-el-alquiler-en-efectivo-uruguay` necesita a las dos en su propio contenido —el crédito
// del inquilino es el motivo por el que al lector le conviene que el pago deje rastro, y el
// desalojo es la otra mitad de «estar al día con el IRPF para hacer valer el contrato»—, así que
// el enlace es uno que un lector sigue y no relleno. Las dos tienen fila abierta del libro de
// cambios, y la reserva que la nota de arriba describe no se rompe: lo que esas filas miden es su
// propia descripción, y el enlace entrante nace en una página publicada hoy, sin tráfico todavía.
// Es además lo que ya hace cada página nueva del repo con su bloque de relacionadas.
const DEUDA_MAXIMA = 17

describe('ninguna página de lectura queda sin un enlace de contexto', () => {
  it('las páginas sin enlace son exactamente las declaradas', () => {
    expect(sinEnlaceDeContexto).toEqual([...SIN_LECTOR_QUE_LA_NECESITE, ...DEUDA_SIN_ENLACE].sort())
  })

  it(`la deuda no pasa de ${DEUDA_MAXIMA} páginas, y sólo puede bajar`, () => {
    expect(DEUDA_SIN_ENLACE.length).toBeLessThanOrEqual(DEUDA_MAXIMA)
  })

  // Una ruta renombrada dejaría su entrada vieja acá y el conteo seguiría "verde" contra una página
  // que ya no existe, igual que en `temaHuerfanas.test.ts`.
  it('ninguna de las dos listas nombra una página que no existe', () => {
    const existen = new Set(rutasRaiz)
    for (const ruta of [...SIN_LECTOR_QUE_LA_NECESITE, ...DEUDA_SIN_ENLACE])
      expect(existen.has(ruta), ruta).toBe(true)
  })

  it('una página no puede estar en las dos listas', () => {
    const porDiseno = new Set(SIN_LECTOR_QUE_LA_NECESITE)
    expect(DEUDA_SIN_ENLACE.filter(ruta => porDiseno.has(ruta))).toEqual([])
  })

  // El contrapeso de la medición: si el lector de enlaces deja de reconocer una de las formas que
  // usa el repo, la deuda baja sola y el trinquete se afloja sin que nadie arregle nada.
  it('reconoce las cuatro formas de escribir un enlace interno, y no una ruta de configuración', () => {
    const leer = (texto: string) => [...texto.matchAll(ENLACE)].map(coincidencia => coincidencia[1])
    expect(leer('<NuxtLink to="/una-ruta">x</NuxtLink>')).toEqual(['/una-ruta'])
    expect(leer('<VBtn :to="localePath(\'/una-ruta\')">x</VBtn>')).toEqual(['/una-ruta'])
    expect(leer('<a href="/una-ruta">x</a>')).toEqual(['/una-ruta'])
    expect(leer("  { label: 'X', to: '/una-ruta' },")).toEqual(['/una-ruta'])
    expect(leer("const SIN_LAYOUT = ['/una-ruta']")).toEqual([])
  })

  // La prueba de que el enlace del 2026-10-13 existe de verdad y es recíproco: sin esto, borrar los
  // tres enlaces del embargo volvería a dejar la página huérfana y sólo lo diría la primera prueba
  // de este archivo, que es la que se actualiza al agregar una página.
  it('el embargo de sueldo y la pensión alimenticia se enlazan en los dos sentidos', () => {
    expect([...(entrantes.get('/pension-alimenticia-uruguay') ?? [])]).toContain(
      'pages/embargo-de-sueldo-uruguay.vue'
    )
    expect([...(entrantes.get('/embargo-de-sueldo-uruguay') ?? [])]).toContain(
      'pages/pension-alimenticia-uruguay.vue'
    )
  })
})
