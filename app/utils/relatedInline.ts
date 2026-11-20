// Lo que `RelatedInline` y `RelatedPages` comparten: cuántas recomendaciones suben al lado de la
// respuesta, en qué páginas, y cuáles son, para que el bloque del pie no las repita.
//
// Hasta el 20/11/2026 el bloque de arriba anotaba sus rutas en un `useState` desde un
// `watchEffect` y el del pie las leía. En una página con un `await` de nivel superior (indicadores,
// costo de vida) el servidor pintaba el pie ANTES de esa anotación y el navegador DESPUÉS: el HTML
// del servidor traía seis tarjetas y el navegador calculaba otras seis. La hidratación corrige el
// texto pero no el `href` ni el ícono, así que cada tarjeta mostraba el título de una página y
// llevaba a otra (en /indicadores/unidad-reajustable, «Pagar el alquiler en efectivo» abría la
// página del reajuste del alquiler). Ahora las dos se calculan con la misma función pura y los
// mismos argumentos, sin estado compartido: el servidor y el navegador no pueden discrepar.
//
// PURO (sin Vue ni Nuxt, imports relativos) para que vitest lo cargue tal cual.
import {
  normalizeRelatedPath,
  relatedEnabledForPath,
  relatedFor,
  type RelatedPage,
} from './relatedPages'

/** Tres: una fila corta debajo de un resultado, no otro directorio. */
export const RELATED_INLINE_LIMIT = 3

/**
 * Las páginas que pintan `<RelatedInline />`: las calculadoras de `<ToolShell>` (sus dos diseños) y
 * cada indicador. Un test (`relatedInlineParity.test.ts`) recorre `pages/` y exige que esta lista sea
 * EXACTAMENTE la de las páginas que lo pintan: una de más le sacaría al pie tres tarjetas que nadie
 * mostró arriba, una de menos dejaría el bloque de arriba vacío.
 */
export const RELATED_INLINE_ROUTES: readonly string[] = Object.freeze([
  '/herramientas/calculadora-aguinaldo',
  '/herramientas/calculadora-impuestos-importacion',
  '/herramientas/calculadora-impuestos-inversiones',
  '/herramientas/calculadora-inflacion',
  '/herramientas/calculadora-irpf',
  '/herramientas/calculadora-iva',
  '/herramientas/calculadora-plazo-fijo',
  '/herramientas/calculadora-prestamo',
  '/herramientas/calculadora-presupuesto-viaje',
  '/herramientas/calculadora-propinas',
  '/herramientas/calculadora-spread',
  '/herramientas/calculadora-subsidio-por-enfermedad',
  '/herramientas/calculadora-sueldo-liquido',
  '/herramientas/conversor-de-monedas',
  '/herramientas/conversor-unidad-indexada',
  '/herramientas/costo-de-vida',
  '/herramientas/costo-real-de-invertir-afuera',
  '/herramientas/widget-dolar',
])

/** Prefijos de páginas dinámicas que lo pintan (`pages/indicadores/[indicador].vue`). */
export const RELATED_INLINE_PREFIXES: readonly string[] = Object.freeze(['/indicadores/'])

/** Si la página de `path` (con o sin prefijo de idioma, query o barra final) pinta el bloque. */
export function rendersRelatedInline(path: string): boolean {
  const clean = normalizeRelatedPath(path)
  return (
    RELATED_INLINE_ROUTES.includes(clean) ||
    RELATED_INLINE_PREFIXES.some(prefix => clean.startsWith(prefix) && clean.length > prefix.length)
  )
}

/**
 * Las recomendaciones del bloque de arriba. `RelatedInline` las pinta y `RelatedPages` las excluye
 * llamándola con los MISMOS argumentos (`route.path`, `route.query`), así lo pintado y lo excluido
 * coinciden por construcción, en el servidor y en el navegador.
 */
export function relatedInlineItems(
  path: string,
  query: { operation?: unknown; mode?: unknown } = {}
): RelatedPage[] {
  if (!rendersRelatedInline(path) || !relatedEnabledForPath(path)) return []
  return relatedFor(path, RELATED_INLINE_LIMIT, { operation: query.operation, mode: query.mode })
}
