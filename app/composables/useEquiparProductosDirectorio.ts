import {
  EQUIPAR_PRODUCTOS_EMPTY_FACETS,
  equiparProductosChips,
  equiparProductosFiltered,
  equiparProductosNormalize,
  equiparProductosParams,
  equiparProductosWithout,
  type EquiparProductosQuery,
  type EquiparProductosResponse,
} from '~/utils/equiparProductos'

/**
 * The state behind both directory pages (/equipar-casa-uruguay/productos and
 * /equipar-casa-uruguay/productos/<categoria>): the query read off the URL, the API call that
 * follows it, and the two ways of changing it. `fixedCategoria` is the per-category page's
 * route param — it never travels in the query string, so every URL of that page is that category.
 *
 * `async` because the SSR fetch has to be awaited in setup; the pages `await` this.
 *
 * `options.apiPath` es lo único que separa a este directorio del de movilidad
 * (/monopatines-electricos-uruguay, /bicicletas-electricas-uruguay): las dos colecciones guardan
 * la misma fila y las dos rutas contestan la misma forma (`server/utils/retailProductos.ts`), así
 * que la página elige de cuál come y el estado, los chips y el `noindex` de las URLs filtradas son
 * los mismos. `options.key` tiene que ser distinto por vertical: dos páginas con la misma clave de
 * `useAsyncData` se pisan la respuesta.
 */
export async function useEquiparProductosDirectorio(
  fixedCategoria = '',
  options: { apiPath?: string; key?: string } = {}
) {
  const apiPath = options.apiPath ?? '/api/equipar/productos'
  const route = useRoute()
  const router = useRouter()

  const query = computed<EquiparProductosQuery>(() =>
    equiparProductosNormalize({
      ...(route.query as Record<string, unknown>),
      categoria: fixedCategoria || (route.query.categoria as unknown),
    })
  )

  const { data, error } = await useAsyncData(
    options.key ?? `equipar-productos-${fixedCategoria || 'todo'}`,
    () =>
      $fetch<EquiparProductosResponse>(apiPath, {
        query: equiparProductosParams(query.value),
      }),
    { watch: [query] }
  )

  const facets = computed(() => data.value?.facets ?? EQUIPAR_PRODUCTOS_EMPTY_FACETS)
  const chips = computed(() => equiparProductosChips(query.value, facets.value, fixedCategoria))
  /** Any filter beyond the route's own category: those URLs are thin copies and go `noindex`. */
  const filtered = computed(() =>
    equiparProductosFiltered(query.value, fixedCategoria ? ['categoria'] : [])
  )

  function update(next: EquiparProductosQuery) {
    const params = equiparProductosParams(fixedCategoria ? { ...next, categoria: '' } : next)
    // Outside the fixed page a variant is only meaningful with its category, and `params` already
    // dropped it; inside, the category is implied by the route and the variant must survive alone.
    if (fixedCategoria && next.variante) params.variante = next.variante
    router.replace({ query: params })
  }

  const remove = (keys: ReadonlyArray<keyof EquiparProductosQuery>) =>
    update(equiparProductosWithout(query.value, keys))

  const clear = () =>
    update(equiparProductosNormalize({ categoria: fixedCategoria, orden: query.value.orden }))

  return { query, data, error, facets, chips, filtered, update, remove, clear }
}
