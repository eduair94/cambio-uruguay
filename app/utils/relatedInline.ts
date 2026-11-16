// Lo que `RelatedInline` y `RelatedPages` comparten: cuántas recomendaciones suben al lado de la
// respuesta y cómo el bloque del pie se entera de cuáles fueron, para no repetirlas.

/** Tres: una fila corta debajo de un resultado, no otro directorio. */
export const RELATED_INLINE_LIMIT = 3

/** Clave de `useState`. El valor lleva la ruta: lo anotado en una página no vale para la siguiente. */
export const relatedInlineStateKey = 'related-inline-shown'

/** Las rutas que el bloque de arriba ya mostró EN ESTA página (ninguna si el estado es de otra). */
export function relatedInlineRoutes(
  state: { path: string; routes: readonly string[] } | null | undefined,
  currentPath: string
): string[] {
  return state && state.path === currentPath ? [...state.routes] : []
}
