// El catálogo de precios del SIPC más la canasta del día, unidos una sola vez
// acá en lugar de mandar dos pedidos a cada navegador.
//
// Anyone integrating should call the public API directly: `GET /precios/articles`
// y `GET /precios/basket`. Esta ruta es la de lectura del sitio, no una segunda
// API.
export default defineCachedEventHandler(
  async () => {
    const base = useRuntimeConfig().apiBaseServer

    const [catalogue, basket] = await Promise.all([
      $fetch<any>(`${base}/precios/articles`, { timeout: 9000 }).catch(() => null),
      $fetch<any>(`${base}/precios/basket`, { timeout: 9000 }).catch(() => null),
    ])

    // Un catálogo vacío de la forma correcta le gana a un 500: la página
    // renderiza su estado "sin datos" en vez de no renderizar.
    return {
      day: catalogue?.day ?? null,
      count: catalogue?.count ?? 0,
      articles: catalogue?.articles ?? [],
      basketMeta: catalogue?.basket ?? null,
      basket: basket?.day ? basket : null,
    }
  },
  {
    // El job corre una vez al día: media hora es corta al lado de eso y
    // suficiente para absorber un crawl.
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 6,
    name: 'precios',
    getKey: () => 'all',
  }
)
