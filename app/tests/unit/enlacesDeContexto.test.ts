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
  '/opinion-alquileres', // la encuesta: se llega desde los correos y la pregunta, noindex
  '/opiniones-alquileres', // privada, requireAdmin
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
 * `/donde-conseguir-monedas-uruguay`, tenía la ruta libre pero sus dos vecinas naturales
 * —`/precio-del-boleto-montevideo` y `/guias/propinas-en-uruguay`— estaban las dos dentro de una
 * ventana abierta. Salió el 2026-10-18 por una tercera que no se había mirado; ver la nota del
 * trinquete, al pie de la lista.
 *
 * Para bajar este número: un enlace en el CONTENIDO de la página cuyo lector la necesita, o un chip
 * en la barra de su familia (`utils/familiaNav.ts`) si pertenece a una. Un enlace que nadie seguiría
 * no cuenta como arreglo aunque ponga el test en verde.
 */
const DEUDA_SIN_ENLACE = [
  '/alternativa-a-bankos-uruguay',
  '/apostillar-un-documento-uruguay',
  '/apps-utiles-uruguay',
  '/certificado-unico-dgi-uruguay',
  '/cheques-uruguay',
  '/fondo-de-solidaridad-uruguay',
  '/grabacion-sin-consentimiento-uruguay',
  '/llevar-el-auto-a-brasil-o-argentina',
  '/precio-del-boleto-montevideo',
  '/reconocer-anos-trabajados-uruguay',
  '/ropa-por-kilo-uruguay',
  '/seguro-obligatorio-de-auto-uruguay',
]

/** El trinquete. Sólo puede bajar: subirlo es publicar una página que nadie enlaza. */
// 15 → 14 el 2026-10-20, y por primera vez con el ORIGEN libre, que es lo que bloqueó a las dos
// candidatas de ayer: `/impuesto-temu-uruguay` recibe su enlace de
// `/importar-para-revender-uruguay`, que no tiene ninguna fila en el libro de cambios. Es la única
// de las quince que hoy estaba libre en los dos pozos —acá y en `temaHuerfanas.test.ts`—, así que
// la página queda con tema y con enlace en la misma corrida.
//
// El lector lo necesita de verdad y la frase ya existía a medias: la pregunta «¿Puedo hacer muchos
// envíos de US$ 800 en el año?» advierte que fraccionar un pedido «es la clase de maniobra que la
// Aduana mira» y nunca dice que, antes del riesgo, hay una cuenta — el mínimo de US$ 20 es POR
// ENVÍO (Ley 20.446 art. 627 para la prestación única, art. 660 para el IVA de la franquicia), así
// que una caja de menos de US$ 20 paga más de impuesto que de mercadería. La página del impuesto
// Temu es la que resuelve esos cuatro casos con el mismo motor que la calculadora, y es además la
// única que dice desde dónde factura cada plataforma, que es lo que decide si la exoneración del
// TIFA le alcanza al revendedor o no.
//
// Las dos de ayer siguen esperando a su origen: `/cheques-uruguay` al 21/10 (`/salir-del-clearing`)
// y `/alternativa-a-bankos-uruguay` al 27/10 (`/apps-de-beneficios-uruguay`).
// 16 → 15 el 2026-10-19, sin ir a buscarlo, como el 15 y el 18/10: la página nueva
// `/prestamos-para-jubilados-uruguay` necesita a `/jubilacion-por-incapacidad-uruguay` en su propio
// contenido. Desde la Resolución de Gerencia General 403/2024 el BPS no da préstamos sociales nuevos
// a quien cobra el subsidio transitorio por incapacidad parcial —es una prestación de actividad, no
// de pasividad—, y la página de la incapacidad es la que explica qué es ese subsidio y cuánto
// dura; el enlace está en la frase que lo excluye, que es donde el lector lo necesita. La ruta
// medida tiene fila abierta hasta el 14/11 y la reserva no se rompe: el enlace nace en una página
// publicada hoy, sin tráfico todavía, y al archivo de la página medida no se lo tocó.
//
// El enlace de ENTRADA de la página nueva sale de `/embargo-de-sueldo-uruguay`, que no tiene
// ninguna fila en el libro de cambios y cuyo lector lo necesita: la mitad de esa página habla de
// pasividades —el piso de la Ley 17.829 y el orden de prelación, con el Crédito Social del BROU en
// el literal C— y el jubilado que llega ahí suele tener en el recibo el descuento de un préstamo
// del BPS o del BROU.
// SIGUE EN 16 el 2026-10-19, y las dos candidatas del día quedaron por el ORIGEN, no por el
// destino: `npm run seo_debt` imprimió `/cheques-uruguay` y `/alternativa-a-bankos-uruguay` como
// las dos rutas libres de este pozo, pero la reserva también alcanza a la página donde se
// escribe el enlace, porque ahí sí se le toca el contenido a una ruta medida.
//
// `/cheques-uruguay` tiene la vecina identificada y es el caso de `/donde-conseguir-monedas-uruguay`
// otra vez: la página YA enlaza a `/salir-del-clearing` de ida sola, y el lector de ésa la
// necesita de verdad —abre diciendo que «no es un solo registro: son DOS cosas distintas» (el
// Clearing de Informes privado y la Central de Riesgos del BCU) y nunca nombra el tercero, el
// registro de infractores del BCU del art. 66 del Decreto-Ley 14.412, que es el que te alcanza si
// lo que rebotó fue un cheque; y de ése no se sale por tiempo como de los otros dos, sino con una
// rehabilitación que hay que pedir y que el BCU concede «en los casos debidamente justificados»
// (art. 64), o sea nunca sola—. `/salir-del-clearing` está reservada hasta el 2026-10-21 por la
// fila `clearing-que-pasa-y-categorias-bcu`, así que el enlace entra ese día.
//
// `/alternativa-a-bankos-uruguay` espera al 2026-10-27: la única página cuyo lector compara apps
// de beneficios y que ya nombra a Bankos es `/apps-de-beneficios-uruguay`, reservada por
// `tarjetas-y-pagos-entran-a-su-tema`. Las dos rutas libres que la enlazarían hoy
// (`/descuentos-con-tarjeta-uruguay` y `/que-banco-tiene-mas-descuentos-uruguay`) son las dos a
// las que ESA página manda con sus botones, y su lector ya está usando nuestro mapa: devolverlo a
// la comparativa es relleno, que es justo lo que el encabezado de este archivo no cuenta como
// arreglo aunque ponga el test en verde.
// 17 → 16 el 2026-10-18, y es la única de las diecisiete con la ruta libre de toda ventana de
// medición abierta: `npm run seo_debt` imprimió ese día UNA fila libre entre las 58 de los tres
// trinquetes con lista, y era ésta.
//
// La nota de arriba la daba por bloqueada por sus dos vecinas naturales
// —`/precio-del-boleto-montevideo` y `/guias/propinas-en-uruguay`, las dos con fila abierta—, y lo
// que faltaba era mirar una tercera: `/retirar-efectivo-uruguay`, que es la página que la de las
// monedas YA enlaza, y de ida sola, igual que el caso de `/pension-alimenticia-uruguay` del 13/10.
// Su ruta no tiene ninguna fila en el libro de cambios (ni una sola en las 97), así que el enlace
// no le cambia el sujeto a ningún experimento.
//
// Y el lector lo necesita de verdad: la sección «Consejos de seguridad al sacar efectivo» de esa
// página le dice, en los tres idiomas, «pedí billetes chicos (100, 200, 500): los de 1.000 y 2.000
// cuestan de cambiar», o sea nombra el problema entero y no dice dónde se resuelve. La página de
// las monedas es la que contesta, incluso por la negativa, que es la parte cara: que el cajero
// entrega billetes y nunca monedas, que el kiosco no fracciona un billete grande y que la casa de
// cambio cambia divisas y no fracciona moneda nacional — tres viajes que el lector se ahorra.
//
// El enlace NO va en el bloque de relacionadas del pie, que es justo lo que el encabezado de este
// archivo dice que no sirve: va dentro de la tarjeta de esa sección, debajo de la viñeta que crea
// la pregunta (`WithdrawSection.link`, campo nuevo y opcional). `withdrawCash.test.ts` lo exige en
// los tres idiomas y lo suma a la paridad de locales.
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
// 13 → 12 el 2026-10-21, y ésta salió sin ir a buscarla, que es como salieron casi todas:
// `/cortes-de-luz-por-barrio-uruguay` lo necesita la página nueva
// `/compensacion-por-corte-de-luz-uruguay` en su propio contenido, porque quien acaba de leer que la
// compensación se mide por SEMESTRE y por grupo de suministros necesita saber cuánto estuvo sin luz
// su zona, y ese libro —los minutos por barrio integrados del mapa público de UTE— es justo el dato
// que ninguna fuente oficial publica por barrio. La ruta medida tiene fila abierta del libro de
// cambios hasta el 1/11 y la reserva NO se rompe, por lo mismo que el 15 y el 18/10: el enlace
// entrante nace en una página publicada hoy, sin tráfico todavía, y al archivo de la página medida
// no se lo tocó —ni el snippet, ni el cuerpo, ni un enlace de salida—.
//
// Y por eso el enlace de ENTRADA de la página nueva tampoco salió de ahí: salió de
// `/a-quien-le-reclamo-uruguay`, que no tiene ventana abierta y cuyo lector lo necesita de verdad
// —esa página rutea «luz y agua son URSEA, 15 días hábiles» y su bloque «el detalle de cada caso»
// ya lleva la factura de UTE, pero nunca decía que por los cortes hay una compensación que no se
// reclama—.
//
// 14 → 13 el 2026-10-21 (la otra mitad de la misma corrida): `/cambios-de-precio-uruguay`, que
// estaba en este pozo y en el de los temas
// a la vez y es la única de los dos con la ruta libre hoy (`npm run seo_debt`), así que se cierran
// sus dos deudas juntas en vez de dejarla medio arreglada.
//
// El enlace salió de `/evolucion-precio-autos-usados-uruguay`, que no tiene ventana abierta, y lo
// necesita su propio lector: esa página mide la COHORTE (la mediana del modelo-año, que se mueve
// también cuando cambia la mezcla publicada) y su sección «Cómo lo medimos» dedica una viñeta entera
// a avisar de eso, sin tener a dónde mandar a quien lo que quiere es el aviso. El movimiento aviso
// por aviso es justo lo que lista la página enlazada, y la relación ya era recíproca del otro lado:
// `/cambios-de-precio-uruguay` cierra enlazando a las tres `/evolucion-precio-*` como «lo que sí
// contesta el nivel del mercado». Lo que faltaba era la vuelta.
const DEUDA_MAXIMA = 12

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
