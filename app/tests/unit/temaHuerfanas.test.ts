import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { temasDeRuta } from '../../utils/temaVecinos'

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
  '/estadisticas-del-sitio',
  '/estadisticas-reddit',
  '/estado', // tablero de operación, noindex
  '/hecho-a-pedido',
  '/mapa-de-temas', // ES el índice de temas
  '/mapa-del-sitio',
  '/mi-lista', // vive en el navegador de quien la abre
  '/offline', // fallback de la PWA, noindex
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
 * Para bajar este número: una entrada en `resources` del tema que corresponda
 * (`utils/guideHubs.ts`), con etiqueta y una línea de descripción, y regenerar el índice
 * (`npx vitest run tests/unit/temaIndex.test.ts -u`). El vínculo queda recíproco solo.
 */
const DEUDA_SIN_TEMA = [
  '/accidente-de-trabajo-uruguay',
  '/apostillar-un-documento-uruguay',
  '/cambiar-de-mutualista-uruguay',
  '/cambios-de-precio-uruguay',
  '/comparar-plataformas-dolar-uruguay',
  '/cuanto-me-tienen-que-pagar-uruguay',
  '/cuanto-sale-la-partida-de-nacimiento-uruguay',
  '/declarar-dinero-en-efectivo-uruguay',
  '/factura-de-ose-uruguay',
  '/factura-de-ute-uruguay',
  '/feriados-que-se-corren-uruguay',
  '/garantia-de-alquiler-uruguay',
  '/grabacion-sin-consentimiento-uruguay',
  '/importar-a-uruguay-siendo-extranjero',
  '/impuesto-temu-uruguay',
  '/limite-de-efectivo-uruguay',
  '/pizarra',
  '/prestamo-hipotecario-uruguay',
  '/que-pasa-si-no-pago-antel',
  '/sala-vip-aeropuerto-uruguay',
  '/temas-de-dinero-reddit',
  '/tendencias-uruguay',
  '/tickets-mutualistas-uruguay',
  '/trabajo-para-menores-de-edad-uruguay',
]

/** El trinquete. Este número sólo puede bajar: subirlo es publicar una página huérfana. */
const DEUDA_MAXIMA = 24

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
