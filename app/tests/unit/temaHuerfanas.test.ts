import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getGuide, guides } from '../../utils/guides'
import { temaVecinosParaRuta, temasDeRuta } from '../../utils/temaVecinos'

/**
 * Las páginas que no pertenecen a NINGÚN tema, o sea las que no dibujan "Más sobre este tema".
 *
 * `temaIndex.test.ts` ya exige que toda página de DATOS del registro de directorios tenga tema, y
 * eso dejaba afuera justo al tramo que más rinde: una guía o una página de problema no está en
 * `DIRECTORIOS`, así que podía publicarse sin entrada en ningún tema y nada se ponía rojo. Medido
 * el 2026-09-28 sobre las 193 páginas raíz: **60 sin tema**, de las cuales 27 eran páginas de
 * lectura del tramo `contenido` (`classes/revenueplan/value.ts`, 8× el promedio del sitio).
 *
 * Una página sin tema no es una página con menos enlaces: es una página que no recibe NINGUNO del
 * bloque, porque el vínculo del tema es recíproco por construcción y ella no está en la relación.
 * `docs/app/INTERCONEXIONES.md` lo llama huérfana y lo pone como paso obligatorio al agregar una
 * página; lo que faltaba era el trinquete.
 *
 * Se miran sólo las páginas RAÍZ (`pages/*.vue`). Las familias programáticas (`[key].vue`,
 * `[slug].vue`) no son páginas de lectura de un tema y su enlazado lo resuelven la barra de la
 * familia y el bloque directorio ↔ análisis.
 */
const PAGES_DIR = join(__dirname, '..', '..', 'pages')

const routeOf = (file: string) => (file === 'index.vue' ? '/' : `/${file.slice(0, -4)}`)

const rootRoutes = readdirSync(PAGES_DIR, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.vue'))
  .map(entry => routeOf(entry.name))
  .sort()

/**
 * Las que están fuera de un tema A PROPÓSITO, y no son deuda: la portada (es el sitio, no un
 * miembro de un tema), lo legal y comercial, el área de cuenta, las herramientas cuyo contenido lo
 * pone quien las abre, la documentación para desarrolladores, las páginas sobre el propio sitio y
 * las que ya optan por salirse del índice (`noindex`, ver `seoContract.test.ts`).
 *
 * Sumar una página acá es declarar que no es una página de lectura. Si es de lectura, va a un tema.
 */
const FUERA_DE_TEMA_POR_DISENO = [
  '/', // la portada es el sitio entero, no un miembro de un tema
  '/acerca',
  '/api-cotizacion-intradia', // referencia para desarrolladores
  '/api-cotizaciones-regionales',
  '/asistente-ia', // herramienta: el contenido lo escribe quien la abre
  '/avanzado',
  '/buscar', // noindex
  '/buscar-con-ia', // sobre el propio sitio
  '/conectar', // área de cuenta
  '/contacto',
  '/desarrolladores',
  '/directorios-uruguay', // índice de los directorios del sitio
  '/empresas', // planes de la API
  '/estadisticas-de-busqueda', // privada, noindex
  '/estadisticas-por-pagina', // privada, noindex
  '/estadisticas-del-sitio',
  '/estadisticas-reddit',
  '/estado', // tablero de operación, noindex
  '/hecho-a-pedido',
  '/mapa-de-temas', // ES el índice de temas
  '/mapa-del-sitio',
  '/mi-lista', // vive en el navegador de quien la abre
  '/offline', // fallback de la PWA, noindex
  '/opinion-alquileres', // encuesta, se llega desde los correos; noindex
  '/opiniones-alquileres', // privada, noindex
  '/paginas-mas-visitadas', // sobre el propio sitio, como /estadisticas-del-sitio
  '/preguntas-frecuentes', // sobre el propio sitio
  '/privacidad',
  '/publicidad',
  '/ranking-usuarios-charruadevs', // nombra personas, noindex
  '/terminos',
  '/widget', // para embeber, noindex
]

/**
 * La deuda: páginas de lectura que todavía no entraron a ningún tema. **SÓLO PUEDE BAJAR.**
 *
 * 24 el 2026-09-28 (48 el mismo día, antes de esta tanda). Las ocho que salieron son el cluster de
 * tarjetas y pagos: el descuento de IVA, Totalnet, las comisiones de Mercado Pago, las tarjetas de
 * socio, los clubes de beneficios y la clonación de tarjetas entraron a "Bancos, tarjetas y pagos",
 * y las dos decisiones de compra —cuotas contra contado, y pagar todo con crédito— a "Deudas y
 * crédito", que es el tema donde ya viven `tarjeta-debito-vs-credito-uruguay` y
 * `cashback-millas-o-puntos-uruguay`.
 *
 * 24 → 19 el 2026-09-30. Las cinco que salieron no son un cluster sino lo contrario: son las
 * ÚNICAS cinco de las veinticuatro que no están dentro de una ventana de medición abierta de
 * `docs/seo/experiments.json`. Las otras diecinueve llevan una fila declarada entre el 16 y el 29
 * de septiembre, y `AGENTS.md` es explícito en que dos filas sobre las mismas rutas arruinan la
 * medición de las dos: entrar a un tema es un cambio pensado para mover tráfico, así que declara
 * su propia fila y le cambiaría el sujeto al experimento que ya está midiendo esa página. Entran
 * cuando su ventana cierre (la última, `/comparar-plataformas-dolar-uruguay`, el 2026-10-27).
 *
 * Las cinco fueron a donde ya vivía su vecina más cercana, no a un tema nuevo: la pizarra al lado
 * de `/dolar-hoy`, los feriados que se corren detrás de `/horas-extras-uruguay` (el tema ya lleva
 * la guía `feriados-en-uruguay-como-se-pagan`), el tope de efectivo detrás de
 * `/retirar-efectivo-uruguay` y la sala VIP al lado de `/cuanto-vale-una-milla-itau-uruguay`
 * —los dos beneficios de tarjeta que el sitio mide en plata—, y los tickets de mutualista entre
 * los otros gastos fijos del mes de "Finanzas personales" (supermercado, supergas, meal prep).
 *
 * 7 → 5 el 2026-10-26: las dos huérfanas de aduana entran a `importaciones-y-aduana-uruguay`.
 * Hoy hay cinco de las siete con la ruta libre de toda ventana de medición abierta
 * (`npm run seo_debt`: 6 libres entre las 71 de los cinco pozos, y cinco de esas seis son de este
 * pozo), así que por una vez la lista no la recortó el libro de cambios sino la decisión editorial.
 * Estas dos van juntas en UNA fila porque son UN hueco del mismo tema y no dos cambios: el hub
 * cubría la franquicia postal y la del viajero, y no cubría ni quién puede usar la primera ni qué
 * pasa con la plata en la mano en el mismo cruce.
 *
 * El tema es el suyo por la regla de siempre —a donde ya vive su vecina más cercana— y acá la
 * vecina es literal en los dos casos: `/importar-a-uruguay-siendo-extranjero` contesta quién puede
 * usar la franquicia que `/franquicia-aduana-uruguay` explica (el Decreto 50/026 exige documento
 * nacional uruguayo), y `/declarar-dinero-en-efectivo-uruguay` es el otro mostrador del cruce que
 * `/franquicia-viajero-uruguay` ya cubre de un lado. La primera es además la más huérfana de las
 * siete en proporción a su tamaño: 1.224 líneas y, fuera del menú, un solo enlace de contenido
 * entrante (`utils/aduanaFaq.ts`), contra los tres que ya recibe la de efectivo.
 *
 * De las otras tres libres de este pozo: `/cambiar-de-mutualista-uruguay` no entró porque el sitio
 * no tiene tema de salud y su vecindario natural —las fichas `/mutualista/<institucion>` nacidas el
 * 2026-10-25— está dentro de su propia ventana de medición abierta, así que elegirle un tema hoy es
 * elegirlo sin el dato que falta; `/tendencias-uruguay` y `/temas-de-dinero-reddit` son radares del
 * propio sitio y la decisión pendiente es si son páginas de lectura, no a qué tema van.
 *
 * Para bajar este número: una entrada en `resources` del tema que corresponda
 * (`utils/guideHubs.ts`), con etiqueta y una línea de descripción, y regenerar el índice
 * (`npx vitest run tests/unit/temaIndex.test.ts -u`). El vínculo queda recíproco solo.
 */
const DEUDA_SIN_TEMA = [
  '/cambiar-de-mutualista-uruguay',
  '/comparar-plataformas-dolar-uruguay',
  '/temas-de-dinero-reddit',
  '/tendencias-uruguay',
]

/**
 * 18 → 17 el 2026-10-20: `/impuesto-temu-uruguay` entra a `importaciones-y-aduana-uruguay`, y es
 * la ÚNICA de las dieciocho que hoy está libre en los dos pozos a la vez —sin tema y sin enlace de
 * contexto—, así que las dos deudas de esa página se cierran en la misma corrida en vez de dejarla
 * medio arreglada. De las otras dos rutas libres del día, `/factura-de-ose-uruguay` sigue esperando
 * por lo que dice la nota de abajo (su racimo se libera el 21 y el 25/10) y la tercera no es de este
 * pozo.
 *
 * El tema es el suyo sin discusión: el hub ya lleva la GUÍA homónima del catálogo
 * (`guideSlugs: ['impuesto-temu-uruguay', …]`) y la página, que es la que calcula los cuatro casos,
 * no figuraba en ningún `resources`. Las etiquetas se separan a propósito —la guía explica, la
 * página calcula— porque son dos URLs sobre el mismo nombre popular.
 *
 * Y eso deja a la vista una deuda que este trinquete no mide y que hoy no se puede tocar: el
 * título de la guía («Impuesto Temu: qué es y cuánto pagás») y el de la página («Impuesto Temu:
 * cuánto pagás en Uruguay») se disputan la misma consulta. Re-angular la guía es un cambio de
 * snippet y su ruta está reservada hasta el 2026-11-05 por
 * `descripciones-de-las-guias-respuesta-primero-2`.
 */
/**
 * 19 → 18 el 2026-10-19: `/cuanto-me-tienen-que-pagar-uruguay` entra a
 * `sueldo-trabajo-e-impuestos-uruguay`, y es una de las DOS únicas de las diecinueve con la ruta
 * libre de toda ventana de medición abierta (`npm run seo_debt`: 4 libres entre las 57 de los tres
 * trinquetes con lista, y de esas cuatro sólo dos son de este pozo).
 *
 * El tema no se eligió por afinidad temática sino por la misma regla que las cinco del 30/9 —a
 * donde ya vivía su vecina más cercana—, y acá la vecina es literal: el hub ya lleva la guía
 * `salario-minimo-uruguay-cuanto-es`, o sea publica el SMN y nunca decía que el SMN NO es el
 * mínimo de quien lo lee. Esta página es la que contesta eso (el mínimo exigible es el laudo del
 * grupo, subgrupo y categoría del Consejo de Salarios), así que el hueco que tapa está dentro del
 * tema, no al lado.
 *
 * La otra libre, `/factura-de-ose-uruguay`, NO entró, y no por falta de tiempo: su propio
 * encabezado declara que sus dos hermanas son `/factura-de-ute-uruguay` y
 * `/que-pasa-si-no-pago-antel` —«los tres servicios del hogar con la misma gramática»—, las dos
 * también en esta lista y reservadas hasta el 21 y el 25/10. Entrar sola partiría el racimo en dos
 * filas del libro de cambios medidas por separado, que es lo contrario de lo que hicieron las
 * tandas de septiembre.
 *
 * Sólo puede bajar: subirlo es publicar una página huérfana.
 */
/**
 * 16 → 14 el 2026-10-22: las DOS rutas de este pozo que hoy están libres de toda ventana de medición
 * abierta y que además no son de un racimo. Las otras dos libres siguen siendo
 * `/factura-de-ose-uruguay` y `/que-pasa-si-no-pago-antel`, y siguen esperando por lo que dice la
 * nota de más abajo: su tercera hermana, `/factura-de-ute-uruguay`, se libera el 25/10 y entrar antes
 * partiría el racimo de «los tres servicios del hogar con la misma gramática» en filas del libro de
 * cambios medidas por separado.
 *
 * `/cuanto-sale-la-partida-de-nacimiento-uruguay` entra a `tramites-y-documentos-uruguay` por la
 * regla de siempre —a donde ya vive su vecina más cercana—, y acá la vecindad es casi literal: el hub
 * ya publica «Cuánto sale la cédula» y «Cuánto sale el pasaporte», los otros dos documentos que se
 * piden en la misma ventanilla de Identificación Civil, y le faltaba el tercero.
 *
 * `/garantia-de-alquiler-uruguay` entra a `alquiler-y-vivienda-uruguay`, que es el tema que la nota
 * del 21/10 ya le había adjudicado dejándole pendiente «mirarla junto con las otras páginas de
 * garantía antes de elegirle el `resources`». Mirado: el hub lleva la GUÍA homónima del catálogo
 * (`garantias-de-alquiler-uruguay`, en plural) y además `alquilar-sin-garantia-uruguay` y
 * `deposito-de-alquiler-uruguay`, o sea que lo que explica la garantía ya estaba y lo que faltaba es
 * lo único que ninguna de las tres hace: el precio. Es la misma separación que esta lista declaró
 * para `/impuesto-temu-uruguay` el 20/10 —la guía explica, la página calcula— y por eso la etiqueta
 * dice «Cuánto cuesta la garantía» y no repite el nombre de la guía: son dos URLs sobre el mismo
 * nombre y no se las manda a disputar la misma consulta.
 *
 * 17 → 16 el 2026-10-21: `/cambios-de-precio-uruguay` entra a `economia-y-mercado-uruguay`, y es
 * una de las CUATRO rutas de este pozo que hoy están libres de toda ventana de medición abierta
 * (`npm run seo_debt`). De esas cuatro es la única que además está libre en el pozo de al lado —sin
 * enlace de contexto—, así que sus dos deudas se cierran en la misma corrida en vez de dejarla medio
 * arreglada, que es el criterio que esta lista ya aplicó el 2026-10-20 con `/impuesto-temu-uruguay`.
 *
 * Las otras tres no entraron por lo que ya dice la nota de abajo: `/factura-de-ose-uruguay` y
 * `/que-pasa-si-no-pago-antel` son dos de los «tres servicios del hogar con la misma gramática» y la
 * tercera hermana, `/factura-de-ute-uruguay`, sigue reservada hasta el 25/10, así que entrar ahora
 * partiría el racimo en filas del libro de cambios medidas por separado; y `/garantia-de-alquiler-uruguay`
 * no es de este racimo pero tampoco es una página sola: su tema natural es el de alquiler, donde
 * conviene mirarla junto con las otras páginas de garantía antes de elegirle el `resources`.
 *
 * El tema no se eligió por afinidad amplia sino por la regla de siempre —a donde ya vivía su vecina
 * más cercana—: el hub ya lista las tres páginas `/evolucion-precio-*`, que miden el NIVEL de cada
 * cohorte, y ésta es la que mide el mismo movimiento aviso por aviso. Es el vecino que le faltaba a
 * esas tres, no una página nueva en un tema ajeno.
 */
/**
 * 14 → 13 el 2026-10-23: `/apostillar-un-documento-uruguay` entra a `tramites-y-documentos-uruguay`.
 * `npm run seo_debt` imprimió 7 rutas libres entre las 85 de los cinco pozos, cinco de ellas de
 * este pozo, y ésta es una de las DOS que además está libre en el de al lado —sin enlace de
 * contexto—, así que sus dos deudas se cierran en la misma corrida en vez de dejarla medio
 * arreglada, que es el criterio que esta lista aplica desde `/impuesto-temu-uruguay` el 20/10.
 *
 * De esas dos se eligió ésta y no `/grabacion-sin-consentimiento-uruguay` por el ORIGEN, que es lo
 * que decide cuando el destino está libre: las dos únicas páginas del sitio que hablan de grabar
 * —`/denunciar-ruidos-molestos-uruguay` y `/derechos-consumidor-compras-online`— están reservadas
 * hasta el 17/11 y el 24/10, y además ninguna de las dos plantea el problema de esa página (grabar
 * el ruido como prueba no es que te hayan grabado a vos), así que el enlace sería relleno.
 *
 * El tema es el de siempre —a donde ya vive su vecina más cercana— y acá la vecina es el paso
 * siguiente: el hub ya publica los cuatro documentos que se apostillan (antecedentes judiciales,
 * cédula, pasaporte y la partida de nacimiento que entró el 22/10) y ninguno decía qué se hace
 * cuando el papel tiene que valer afuera. El encabezado de `utils/apostille.ts` describe el mismo
 * hueco al revés: hasta que nació esa página, la única mención del arancel en todo el sitio era
 * una línea del FAQ de la partida.
 *
 * Las otras tres libres de este pozo no entraron: `/factura-de-ose-uruguay` y
 * `/que-pasa-si-no-pago-antel` siguen esperando a su tercera hermana `/factura-de-ute-uruguay`
 * (reservada hasta el 25/10) por lo que dice la nota del 19/10 sobre el racimo, y
 * `/temas-de-dinero-reddit` es una página sobre lo que se pregunta en Reddit, no sobre un tema del
 * sitio: elegirle un hub pide mirarla junto con `/estadisticas-reddit`, que está declarada fuera de
 * tema por diseño.
 */
/**
 * 10 → 7 el 2026-10-25: el racimo de los servicios del hogar entero, que es la única entrada de
 * esta lista que estaba AGENDADA. Cinco corridas seguidas —el 19, 20, 21, 22, 23 y 24/10— lo
 * dejaron pasar escribiendo la misma razón y la misma fecha: `/factura-de-ose-uruguay` y
 * `/que-pasa-si-no-pago-antel` estaban libres, pero su tercera hermana `/factura-de-ute-uruguay`
 * seguía reservada «hasta el 25/10» y entrar sin ella habría partido el racimo en filas del libro
 * de cambios medidas por separado. Hoy `npm run seo_debt` la da libre junto con las otras dos, así
 * que las tres entran en la misma fila y por fin se mide el racimo y no sus pedazos.
 *
 * Son un racimo porque ellas mismas lo declaran: el encabezado `OWN-WORLD` de
 * `/factura-de-ose-uruguay` nombra a las otras dos —«los tres servicios del hogar con la misma
 * gramática»— y su sección «Las otras dos facturas del hogar» las enlaza. Eso es justamente lo
 * que hacía caro el agujero: las tres se enlazaban ENTRE ELLAS y ninguna figuraba en ningún
 * `resources`, o sea tres páginas del tramo `contenido` (las tres ya valuadas así en
 * `classes/revenueplan/value.ts`, 8× el promedio del sitio) formando una isla a la que el bloque
 * «Más sobre este tema» no llega desde ninguna página del sitio. Un racimo cerrado sobre sí mismo
 * no se arregla solo: cuantas más puertas tiene hacia adentro, menos se nota que no tiene ninguna
 * desde afuera.
 *
 * Las tres al MISMO tema, `finanzas-personales-y-jubilacion-uruguay`, por la regla de siempre —a
 * donde ya vive su vecina más cercana—: el hub ya publicaba todo gasto recurrente del hogar —la
 * guía `precio-supergas-garrafa-uruguay`, `/precios-de-supermercado-uruguay`,
 * `/tickets-mutualistas-uruguay`, `/meal-prep-uruguay`— y además las tres páginas que reparten un
 * sueldo entre esos gastos (`/plan-de-vida-uruguay`, `/vivir-con-25000-pesos-uruguay`,
 * `/vivir-con-el-salario-minimo-uruguay`), y le faltaban exactamente los tres gastos que llegan
 * como FACTURA. No fueron a `alquiler-y-vivienda-uruguay`, que es el otro candidato y tiene
 * `/cortes-de-luz-por-barrio-uruguay`: ese hub trata la operación de alquilar —garantía, depósito,
 * rescisión, desalojo, portales— y los cortes por barrio están ahí como señal para elegir dónde
 * vivir, no como una factura. Estas tres las lee igual quien alquila y quien es propietario.
 *
 * Sólo puede bajar: subirlo es publicar una página huérfana.
 */
/**
 * 13 → 11 el 2026-10-24: `/accidente-de-trabajo-uruguay` y `/trabajo-para-menores-de-edad-uruguay`
 * entran a `sueldo-trabajo-e-impuestos-uruguay`. Son DOS de las siete rutas de este pozo libres hoy
 * de toda ventana de medición abierta, y las dos únicas que además no arrastran la salvedad que las
 * otras cinco arrastran: tres son el racimo de los servicios del hogar que todavía espera a
 * `/factura-de-ute-uruguay` (se libera el 25/10), `/temas-de-dinero-reddit` sigue pendiente de
 * mirarse junto con `/estadisticas-reddit` por lo que dice la nota del 23/10, y
 * `/grabacion-sin-consentimiento-uruguay` no tiene hoy una página que la necesite en prosa, que es
 * la condición del pozo de al lado.
 *
 * Entran JUNTAS y al mismo tema porque son el mismo tema: el hub ya publica `/seguro-de-paro-uruguay`,
 * `/indemnizacion-por-despido-uruguay`, `/denunciar-trabajo-en-negro-uruguay` y la guía
 * `me-certifique-subsidio-por-enfermedad-uruguay`, o sea todo lo que pasa cuando el trabajo se
 * interrumpe, y le faltaban las dos puntas: la del accidente (el BSE, que es por dónde se cobra esa
 * interrupción) y la del que recién entra al mercado. Ninguna de las dos estaba en ningún
 * `resources`, así que el bloque «Más sobre este tema» no las enlazaba desde ninguna página.
 *
 * Sólo puede bajar: subirlo es publicar una página huérfana.
 */
/**
 * 11 → 10 el 2026-10-24 (segunda corrida del día): `/grabacion-sin-consentimiento-uruguay` entra a
 * `derechos-y-reclamos-uruguay`. La nota de arriba, de esta misma mañana, la había dejado afuera
 * diciendo que «no tiene hoy una página que la necesite en prosa, que es la condición del pozo de
 * al lado», y la del 23/10 explicaba por qué: las dos únicas páginas del sitio que hablan de GRABAR
 * están reservadas y además ninguna plantea su problema.
 *
 * Las dos notas buscaban el origen por el tema del texto —quién habla de grabar— y por eso no
 * miraban el único candidato que importaba: la página a la que ESTA página ya enlaza. El chip
 * «¿A quién le reclamo?» de su bloque «Seguí leyendo» apunta a `/a-quien-le-reclamo-uruguay`, de
 * ida sola, que es exactamente el caso de `/pension-alimenticia-uruguay` (13/10),
 * `/donde-conseguir-monedas-uruguay` (18/10) y `/cambios-de-precio-uruguay` (21/10). Esa ruta no
 * tiene ninguna fila en el libro de cambios —ya fue el origen libre del enlace del 21/10 a
 * `/compensacion-por-corte-de-luz-uruguay`—, así que las dos deudas de esta página se cierran en la
 * misma corrida.
 *
 * El tema es el de siempre —a donde ya vive su vecina más cercana—: el hub ya publica
 * `/a-quien-le-reclamo-uruguay`, `/defensa-al-consumidor-uruguay`, `/estafas-uruguay` y
 * `/denunciar-ruidos-molestos-uruguay`, o sea el mapa de ventanillas y los conflictos que no son de
 * consumo, y le faltaba el único de esa familia donde del otro lado no hay una empresa.
 *
 * Sólo puede bajar: subirlo es publicar una página huérfana.
 */
/**
 * 5 → 4 el 2026-10-27: `/prestamo-hipotecario-uruguay` entra a `comprar-vivienda-uruguay`. Su fila
 * `prestamo-hipotecario` es del 2026-09-28, así que hoy cumple 29 días y sale de la ventana que
 * `experiments_overlap.test.ts` protege (el solape es `|Δfecha| ≤ 28`): es la única de las cinco
 * que se libera hoy, y la única libre que además tiene un tema evidente. De las otras tres libres,
 * las tres siguen esperando por lo que la nota del 26/10 ya razonó —`/cambiar-de-mutualista-uruguay`
 * por falta de un tema de salud, y los dos radares del propio sitio porque la decisión pendiente es
 * si son páginas de lectura—, y `/comparar-plataformas-dolar-uruguay` se libera mañana.
 *
 * El tema es el suyo sin discusión y por una vez no hay que deducirlo del vecindario: el `seoTitle`
 * del hub ES el nombre de la página («Comprar vivienda en Uruguay: crédito hipotecario, BHU y
 * escrituración») y el hub ya lleva la guía `credito-hipotecario-uruguay`, que explica el crédito,
 * más `bhu-como-funciona`. Lo único que no hacía ninguna de las dos es lo que esta página contesta:
 * en qué MONEDA queda la cuota (UI o UR, nunca dólares). De ahí la etiqueta, que no repite el
 * nombre de la guía — misma separación que esta lista ya declaró para `/impuesto-temu-uruguay` y
 * para `/garantia-de-alquiler-uruguay`: dos URLs sobre el mismo nombre no se mandan a disputar la
 * misma consulta.
 *
 * Y el presupuesto baja de 10 a 4, o sea hasta la deuda real. Los 10 venían de cuando la lista no
 * existía y el trinquete era sólo un número; con la lista declarada, seis de holgura no son margen
 * inofensivo: absorben seis páginas nuevas publicadas huérfanas sin que nada se ponga rojo, que es
 * el único accidente que este archivo existe para atajar. Es el mismo argumento que `seoContract`
 * escribió al bajar `canonical` de 23 a 0.
 */
const DEUDA_MAXIMA = 4

describe('ninguna página de lectura queda fuera de todos los temas', () => {
  const sinTema = rootRoutes.filter(route => temasDeRuta(route).length === 0)

  it('las páginas sin tema son exactamente las declaradas', () => {
    expect(sinTema).toEqual([...FUERA_DE_TEMA_POR_DISENO, ...DEUDA_SIN_TEMA].sort())
  })

  it(`la deuda no pasa de ${DEUDA_MAXIMA} páginas, y sólo puede bajar`, () => {
    expect(DEUDA_SIN_TEMA.length).toBeLessThanOrEqual(DEUDA_MAXIMA)
  })

  // Una ruta renombrada deja su entrada vieja acá y el conteo sigue "verde" contra una página que
  // ya no existe: la lista tiene que hablar de páginas reales.
  it('ninguna de las dos listas nombra una página que no existe', () => {
    const existen = new Set(rootRoutes)
    for (const route of [...FUERA_DE_TEMA_POR_DISENO, ...DEUDA_SIN_TEMA])
      expect(existen.has(route), route).toBe(true)
  })

  it('una página no puede estar en las dos listas', () => {
    const porDiseno = new Set(FUERA_DE_TEMA_POR_DISENO)
    expect(DEUDA_SIN_TEMA.filter(route => porDiseno.has(route))).toEqual([])
  })
})

/**
 * Lo mismo, para las GUÍAS, que es el agujero que dejaba el recorte de arriba.
 *
 * El comentario de cabecera justifica mirar sólo `pages/*.vue` diciendo que las familias
 * programáticas «no son páginas de lectura de un tema y su enlazado lo resuelven la barra de la
 * familia y el bloque directorio ↔ análisis». Para `/alquileres/[key]` o `/precio/[slug]` es
 * cierto; para `pages/guias/[slug].vue` es falso en las dos mitades. Las 146 guías SÍ son páginas
 * de lectura de un tema —123 de ellas ya están en uno— y NO tienen barra de familia ni bloque de
 * análisis: el único enlazado recíproco que les toca es el del tema. Así que el trinquete de
 * arriba cuenta 193 rutas raíz y deja 146 páginas del tramo `contenido` —el que rinde 8× el
 * promedio del sitio, `classes/revenueplan/value.ts`— donde una guía nueva podía nacer huérfana
 * sin poner nada en rojo.
 *
 * Medido el 2026-10-12: **23 de las 146 fuera de todo tema**, y son un solo racimo —dólar, cambio
 * de monedas, casas de cambio—, o sea justo el tema del que nació el sitio. Una guía sin tema no
 * es una guía con menos enlaces: `temaVecinosParaRuta` devuelve `[]`, así que no recibe NINGUNO
 * del bloque, y el hub de su tema tampoco la lista. `/guias/glosario-terminos-cambiarios` pasó de
 * 0 a 28 enlaces de contexto con una línea.
 *
 * 23 → 22 el 2026-10-12, y la que salió es la ÚNICA de las 23 con la ruta libre: las otras 22
 * llevan una fila abierta de `docs/seo/experiments.json` (de la del 14/10 a la del 5/11, casi
 * todas de las tandas de título y descripción de octubre), y entrar a un tema es un cambio
 * pensado para mover tráfico, así que declara su propia fila y le cambiaría el sujeto al
 * experimento que ya está midiendo esa página. Es la misma reserva que este archivo ya aplicó el
 * 2026-09-30 a diecinueve rutas raíz y que `seoDescriptionBudget.test.ts` aplica a
 * `/fecha-de-cobro-bps-uruguay`. Entran cuando su ventana cierre.
 *
 * Y entrar al tema NO le cambia el bloque a ninguna otra página, que es lo que hace que la tanda
 * se pueda partir de a una sin contaminar nada: `temaVecinosParaRuta` arma sus enlaces con
 * `hub.resources` y `hub.terms`, nunca con `hub.guides`, así que sumar un slug a `guideSlugs`
 * sólo agrega la pertenencia de esa guía y una tarjeta en la página del tema. Medido antes y
 * después sobre las 146 guías más `/temas`, `/glosario`, `/dolar-hoy`, `/pizarra` y
 * `/casas-de-cambio`: cambió una sola ruta.
 *
 * Para bajar este número: el slug en `guideSlugs` del tema que corresponda
 * (`utils/guideHubs.ts`) y regenerar el índice
 * (`npx vitest run tests/unit/temaIndex.test.ts -u`). El vínculo queda recíproco solo.
 */
const GUIAS_SIN_TEMA = [
  'ahorrar-en-dolares-o-pesos',
  'billetes-y-monedas-de-uruguay',
  'cajeros-automaticos-uruguay-turistas',
  'cambiar-dolares-aeropuerto-carrasco',
  'cambiar-monedas-poco-comunes-uruguay',
  'cambiar-pesos-argentinos-uruguay',
  'comprar-dolares-online-uruguay',
  'criptomonedas-regulacion-impuestos-uruguay',
  'devolucion-iva-turistas-uruguay',
  'documentos-para-cambiar-dolares-uruguay',
  'dolar-cripto-usdt-uruguay',
  'dolares-deteriorados-billetes-rechazados-uruguay',
  'dolares-para-viajar',
  'euros-reales-donde-cambiar',
  'horarios-casas-de-cambio-uruguay',
  'moneda-de-uruguay',
  'pagar-en-dolares-o-pesos-uruguay',
  'precio-del-oro-en-uruguay',
  'propinas-en-uruguay',
  'proyeccion-dolar-uruguay-se-puede-predecir',
  'tipo-de-cambio-fiscal-dgi-uruguay',
]

/**
 * Sigue en 22 el 2026-10-15, y esta vez no por la reserva de la ventana.
 *
 * `propinas-en-uruguay` era la única de las 22 con la ventana cerrada (la fila
 * `titulos-que-responden` cerró el 14/10), así que era la candidata del día. No entró, y la razón
 * es la misma regla que el presupuesto de migas de `seoContract.test.ts` escribe para el rastro
 * corto: **un padre inventado es peor que ninguno**. De los 16 temas no hay uno sobre cuánto cuesta
 * un servicio en la vida diaria; los dos que podrían recibirla la desubican, cada uno a su manera.
 * `dolar-y-casas-de-cambio-uruguay` es la mecánica de la pizarra (leer una cotización, BILLETE
 * contra CABLE, qué casa paga mejor) y `economia-y-mercado-uruguay` está armado de macro (por qué
 * sube el dólar, inflación, UI/UR/BPC) aunque sus recursos sean de precios. Quien llega
 * preguntando cuánto dejar en un restorán no recibiría de ninguno de los dos un vecino que le
 * contestara algo, y la tarjeta quedaría en la página de un tema que la guía no trata.
 *
 * Lo que SÍ se le arregló hoy es el otro lado de su snippet, que no depende de ningún tema: la
 * descripción pasó de 156 a 151 caracteres y de abrir por la etiqueta a abrir por el 10 %
 * (`guideSnippetBudget.test.ts`, 24 → 22). El tema queda pendiente de que exista uno donde entre
 * sin mentirle al lector, o de que alguien mida que uno de los dos de arriba sí la ayuda.
 *
 * Sólo puede bajar: subirlo es publicar una guía huérfana.
 */
/**
 * 22 → 21 el 2026-10-21: `ui-ur-bpc-diferencias` entra a `economia-y-mercado-uruguay`, y es la única
 * de las 22 con la ruta libre hoy (las otras 21 llevan fila abierta, de la del 29/10 a la del 13/11).
 *
 * El tema es el suyo sin inventar ningún padre, que es la regla que la nota de arriba dejó escrita el
 * 15/10 al NO mover `propinas-en-uruguay`: el `intro` de este hub ya anuncia «los indicadores que
 * mueven todo (UI, UR, BPC)», su `resources` ya lleva `/indicadores` y el conversor de UI, y entre sus
 * guías ya estaba `unidad-indexada-explicada`. Esta guía es la que compara las tres, así que el hueco
 * que tapa está adentro del tema y no al lado.
 *
 * Sólo puede bajar: subirlo es publicar una guía huérfana.
 */
const DEUDA_MAXIMA_GUIAS = 21

describe('ninguna guía queda fuera de todos los temas', () => {
  const sinTema = guides
    .filter(guide => temasDeRuta(`/guias/${guide.slug}`).length === 0)
    .map(guide => guide.slug)
    .sort()

  it('las guías sin tema son exactamente las declaradas', () => {
    expect(sinTema).toEqual([...GUIAS_SIN_TEMA].sort())
  })

  it(`la deuda no pasa de ${DEUDA_MAXIMA_GUIAS} guías, y sólo puede bajar`, () => {
    expect(GUIAS_SIN_TEMA.length).toBeLessThanOrEqual(DEUDA_MAXIMA_GUIAS)
  })

  // Un slug renombrado dejaría su entrada vieja acá y el conteo seguiría "verde" contra una guía
  // que ya no existe, igual que con las rutas raíz de arriba.
  it('la lista no nombra una guía que no existe', () => {
    for (const slug of GUIAS_SIN_TEMA) expect(getGuide(slug), slug).toBeDefined()
  })

  // La razón por la que esta lista existe: una guía sin tema no recibe ningún enlace del bloque.
  it('una guía sin tema no recibe ningún enlace de "Más sobre este tema"', () => {
    for (const slug of GUIAS_SIN_TEMA)
      expect(temaVecinosParaRuta(`/guias/${slug}`), slug).toEqual([])
  })
})
