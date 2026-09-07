// El detalle de un artículo: precio local por local, con la antigüedad que
// declara el origen y el `cheapest` ya filtrado por la API (nunca una góndola
// `stale`, nunca una fila `suspect`).
//
// El id se valida acá y no se confía del query: la ruta se cachea por id y un
// id basura llenaría el caché de entradas inútiles.
export default defineCachedEventHandler(
  async event => {
    const query = getQuery(event)
    const id = Number(query.id)
    if (!Number.isInteger(id) || id < 1) {
      throw createError({ statusCode: 400, statusMessage: 'id inválido' })
    }

    const base = useRuntimeConfig().apiBaseServer
    const detail = await $fetch<any>(`${base}/precios/article/${id}`, { timeout: 9000 }).catch(
      () => null
    )

    return detail ?? { day: null, article: null, stats: null, series: [], cheapest: null, rows: [] }
  },
  {
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 6,
    name: 'precios-article',
    getKey: event => String(getQuery(event).id ?? 'none'),
  }
)
