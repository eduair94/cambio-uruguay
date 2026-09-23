// Los insumos de `/conviene-auto-moto-o-omnibus-uruguay`: precios vivos, zonas y los tiempos de UN
// par de barrios.
//
// La aritmética NO pasa por acá. El job publica insumos y `app/utils/transportModel.ts` los combina
// en el navegador, porque el visitante mueve controles y espera que los números cambien en el acto;
// mandar cada cambio al servidor sería un round-trip por tecla.
//
// DOS CAPAS, Y LA DE AFUERA EXISTE POR UN MOTIVO CONCRETO: adentro va un `defineCachedEventHandler`
// —el snapshot cambia una vez por día y la página lo pide en SSR en cada visita— y afuera un
// `defineEventHandler` que atrapa el fallo. Sin esa segunda capa, una caída de Mongo dejaría la
// forma vacía metida en la caché de Nitro durante media hora y la página seguiría diciendo "todavía
// no relevamos rutas" un buen rato después de que la base volvió. Es la misma regla que ya está
// escrita en `/api/movilidad/<categoria>`: un fallo de base devuelve la forma vacía con `no-store`,
// nunca un 404 y nunca un error cacheado.
import { TransportSnapshotModel } from '../../models/TransportSnapshot'
import { connectDb } from '../../utils/db'
import {
  transportEmptyComparador,
  transportProjectComparador,
  type TransportComparadorResponse,
  type TransportSnapshotRaw,
} from '../../utils/transportSnapshot'

/** Un slug de zona del snapshot. Acotarlo evita que la clave de caché la escriba el visitante. */
const ZONE_SLUG = /^[a-z0-9-]{1,48}$/

function zoneParam(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  const slug = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return ZONE_SLUG.test(slug) ? slug : ''
}

const cached = defineCachedEventHandler(
  async (event): Promise<TransportComparadorResponse> => {
    await connectDb()
    const query = getQuery(event)
    const from = zoneParam(query.desde)
    const to = zoneParam(query.hasta)

    // `routes` y `transit` son decenas de miles de filas: se traen enteras porque Mongo no sabe
    // filtrar por índice de zona adentro de un array aplanado, pero NUNCA salen enteras de acá —
    // la proyección se queda con el par pedido. Lo que viaja al navegador son las 68 zonas.
    const doc = (await TransportSnapshotModel.findOne({ slug: 'current' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()) as unknown as TransportSnapshotRaw | null

    if (!doc) {
      // El job todavía no corrió. Es un estado legítimo del sitio, no un error: la página funciona
      // con kilómetros a mano, así que se sirve la forma vacía y se sale del camino cacheado.
      throw createError({ statusCode: 503, statusMessage: 'Transport snapshot not built yet' })
    }

    return transportProjectComparador(doc, from && to ? { from, to } : null)
  },
  {
    // El job corre una vez por día y la matriz de rutas se rehace cada varios días: media hora de
    // caché no le hace perder nada a la página y le ahorra una lectura de decenas de miles de filas
    // por visita. La ventana stale cubre un reinicio del backend sin volver al baseline.
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 12,
    name: 'transporte-comparador-v1',
    getKey: event => {
      const query = getQuery(event)
      return `${zoneParam(query.desde) || '-'}:${zoneParam(query.hasta) || '-'}`
    },
  }
)

export default defineEventHandler(async (event): Promise<TransportComparadorResponse> => {
  try {
    return await cached(event)
  } catch {
    // El 503 de adentro es la señal de "no hay snapshot", no la respuesta al visitante: la página
    // renderiza igual y un 503 la dejaría sin datos y con un error en consola.
    setResponseStatus(event, 200)
    setResponseHeader(event, 'cache-control', 'no-store')
    return transportEmptyComparador()
  }
})
