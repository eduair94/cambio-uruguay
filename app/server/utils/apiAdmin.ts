// Llamadas del servidor del app a las rutas de administración de la API (`/admin/*`), con el token
// compartido `NUXT_API_ADMIN_TOKEN` (= `API_ADMIN_TOKEN` del backend). SÓLO servidor: el token
// nunca viaja al navegador ni sale en una respuesta. Los 4xx de la API pasan con su mensaje (son
// del usuario: tope de claves, datos inválidos); cualquier otra cosa es un 502 del servicio.

interface AdminFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: Record<string, unknown>
  query?: Record<string, string | number>
}

export async function apiAdminFetch<T>(path: string, opts: AdminFetchOptions = {}): Promise<T> {
  const config = useRuntimeConfig()
  const token = String(config.apiAdminToken || '')
  if (!token) {
    throw createError({ statusCode: 503, statusMessage: 'El servicio de claves no está configurado.' })
  }
  try {
    return (await $fetch(`${config.apiBaseServer}${path}`, {
      method: opts.method ?? 'GET',
      body: opts.body,
      query: opts.query,
      headers: { 'x-admin-token': token },
      timeout: 10_000,
    })) as T
  } catch (e: any) {
    const status = Number(e?.statusCode ?? e?.response?.status ?? 0)
    if (status >= 400 && status < 500 && status !== 401) {
      throw createError({ statusCode: status, statusMessage: e?.data?.message || 'Pedido inválido.' })
    }
    throw createError({ statusCode: 502, statusMessage: 'El servicio de claves no respondió. Probá de nuevo en un rato.' })
  }
}
