import { CARD_PROGRAMS, CARD_REWARDS_LAST_REVIEWED } from '../../utils/cardRewards'
import { CASAS_LAST_RESEARCHED, CASAS_REPUTATION } from '../../utils/casasDirectory'
import { COURIERS, COURIER_RATES_VERIFIED_AT } from '../../utils/courierShipping'
import { DIRECTORIOS_CON_CIFRA, type DirectorioCifra } from '../../utils/directorios'

/**
 * Las cifras de `/directorios-uruguay`: una por directorio, cada una con la fecha de SU dato.
 *
 * **Cada tarjeta le pregunta a la misma ruta que usa la página a la que lleva**, y lee el mismo
 * campo que esa página imprime. No hay un atajo por la meta del job, y no es por prolijidad: la
 * primera versión leía las metas y, medida contra producción el 18/9/2026, cinco de nueve cifras
 * contaban otra cosa que su página —alquileres 66.388 contra las 60.454 que muestra (la ruta filtra
 * por frescura y elegibilidad), sillas 81 contra 191 (la ruta recuenta con `lastSeen`), tiendas 76
 * perfiles contra 80 tiendas del registro—. Una cifra que el lector no puede encontrar al hacer clic
 * es la cifra equivocada, por más que sea la que guardó el job.
 *
 * De esa misma medición sale la otra regla: **el hub sólo publica una cifra que el lector puede
 * verificar en la página**: la que la página imprime, o el largo de la lista que dibuja entera
 * (couriers: quince filas, sin total escrito). Equipar y movilidad no hacen ninguna de las dos
 * —hablan por categoría y por banda—, así que su tarjeta va sin número en vez de con uno que no está
 * en ningún lado (ver `fuente: 'sin-cifra'`).
 *
 * Los tres directorios curados a mano (casas, couriers, tarjetas) no hacen pedidos: su cifra es el
 * largo de la misma lista que dibuja su página, y su fecha la de la última revisión de esa lista.
 *
 * Cada pedido corre en paralelo, con tope de tiempo, y falla solo: una ruta caída deja esa tarjeta
 * SIN número (nunca un cero, ver `directorioCifra`) y no le quita la cifra a las demás. Si no se pudo
 * leer NINGUNA cifra relevada, la respuesta no se cachea: un segundo de base caída no puede dejar el
 * hub sin números durante todo el `max-age`.
 */
export interface DirectoriosResponse {
  cifras: Record<string, DirectorioCifra>
}

type Adapter = () => Promise<DirectorioCifra | null>

/** Tope por pedido: la ruta más pesada (alquileres) agrega sobre todo el catálogo. */
const FETCH_TIMEOUT_MS = 12_000

/** `YYYY-MM-DD` de una fecha ISO, o `null` si no parece una fecha. */
function day(value: unknown): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return null
}

function cifra(count: unknown, asOf: unknown): DirectorioCifra {
  return {
    count: typeof count === 'number' && Number.isFinite(count) ? count : null,
    asOf: day(asOf),
  }
}

function get<T>(url: string, query?: Record<string, string>): Promise<T> {
  return $fetch<T>(url, { query, timeout: FETCH_TIMEOUT_MS })
}

/**
 * Un adaptador por directorio relevado. Cada comentario nombra la línea de la página que imprime
 * la misma cifra, para que un cambio en la página se note acá.
 */
const RELEVADOS: Readonly<Record<string, Adapter>> = {
  async alquileres() {
    // pages/alquileres-uruguay.vue: `t('results', { n: numberFormat(total) })`.
    const data = await get<{ total?: number; meta?: { generatedAt?: string } | null }>(
      '/api/rentals'
    )
    return cifra(data?.total, data?.meta?.generatedAt)
  },
  async ventas() {
    // components/property-sales/Directory.vue: `coverageCount` con `data.coverage.listings`.
    const data = await get<{
      coverage?: { listings?: number }
      meta?: { generatedAt?: string } | null
    }>('/api/property-sales')
    return cifra(data?.coverage?.listings, data?.meta?.generatedAt)
  },
  async inmobiliarias() {
    // pages/inmobiliarias-uruguay/index.vue: "{{ data.total }} inmobiliarias".
    const data = await get<{ total?: number; coverage?: { computedAt?: string } }>('/api/agencies')
    return cifra(data?.total, data?.coverage?.computedAt)
  },
  async autos() {
    // pages/autos-usados-uruguay/index.vue: "Hoy hay {{ data.coverage.listings }} avisos vigentes".
    const data = await get<{ coverage?: { listings?: number; lastReadAt?: string | null } }>(
      '/api/cars'
    )
    return cifra(data?.coverage?.listings, data?.coverage?.lastReadAt)
  },
  async motos() {
    // pages/motos-usadas-uruguay/index.vue imprime "{{ payload.total }} avisos": misma ruta y mismo
    // campo que la página, que es la regla de este archivo — una cifra que el lector no puede
    // encontrar al hacer clic es la cifra equivocada, por mas que sea la que guardo el job.
    const data = await get<{ total?: number; generatedAt?: string }>('/api/motos')
    return cifra(data?.total, data?.generatedAt)
  },
  async celulares() {
    // pages/celulares-uruguay/index.vue: "Hoy hay {{ cards.length }} modelos con precio vigente".
    const data = await get<{
      generatedAt?: string
      brands?: Array<{ models?: unknown[] }>
    }>('/api/phones')
    const models = (data?.brands ?? []).reduce((sum, brand) => sum + (brand.models?.length ?? 0), 0)
    return cifra(models, data?.generatedAt)
  },
  async sillas() {
    // pages/sillas-escritorio-uruguay/index.vue: `catalogMeta.products`, del mismo `?summary=1`.
    const data = await get<{ meta?: { products?: number; asOf?: string } | null }>('/api/chairs', {
      summary: '1',
    })
    return cifra(data?.meta?.products, data?.meta?.asOf)
  },
  async tiendas() {
    // pages/tiendas-online-uruguay/index.vue: "Relevamos {{ stores.length }} tiendas online".
    const data = await get<{ stores?: unknown[]; reviewedAt?: string | null }>('/api/stores')
    return cifra(data?.stores?.length, data?.reviewedAt)
  },
  async precios() {
    // pages/precios-de-supermercado-uruguay.vue: "{{ count }} artículos".
    const data = await get<{ day?: string | null; count?: number }>('/api/precios')
    return cifra(data?.count, data?.day)
  },
}

/** Los directorios curados a mano: la cifra es el largo de la lista que dibuja su página. */
const CURADOS: Readonly<Record<string, DirectorioCifra>> = {
  casas: cifra(CASAS_REPUTATION.length, CASAS_LAST_RESEARCHED),
  couriers: cifra(COURIERS.length, COURIER_RATES_VERIFIED_AT),
  tarjetas: cifra(CARD_PROGRAMS.length, CARD_REWARDS_LAST_REVIEWED),
}

interface CifrasLeidas {
  cifras: Record<string, DirectorioCifra>
  /** Cuántas cifras relevadas se pudieron leer: cero quiere decir que falló todo lo que pregunta. */
  relevadosLeidos: number
}

async function leerCifras(): Promise<CifrasLeidas> {
  const cifras: Record<string, DirectorioCifra> = {}
  for (const id of DIRECTORIOS_CON_CIFRA) if (CURADOS[id]) cifras[id] = CURADOS[id]!

  const relevados = DIRECTORIOS_CON_CIFRA.filter(id => RELEVADOS[id])
  const results = await Promise.all(
    relevados.map(async id => {
      try {
        return [id, await RELEVADOS[id]!()] as const
      } catch {
        return [id, null] as const
      }
    })
  )

  let relevadosLeidos = 0
  for (const [id, value] of results) {
    if (value && value.count != null && value.count > 0) {
      cifras[id] = value
      relevadosLeidos += 1
    }
  }
  return { cifras, relevadosLeidos }
}

/**
 * Caché en la memoria del proceso, además del de borde. No es redundante: la página hace su SSR
 * pidiéndole esta ruta al propio Nitro, y ese pedido interno nunca pasa por Cloudflare — sin esto,
 * cada render de la página sin caché disparaba las ocho consultas de arriba (medido: ~5 s en frío).
 * `swr` sirve lo guardado mientras refresca en segundo plano. Una lectura sin NINGUNA cifra relevada
 * no se guarda (`validate`): el próximo pedido vuelve a intentar en vez de heredar el hueco.
 */
export const cifrasCacheOptions = {
  name: 'directorios-cifras',
  maxAge: 15 * 60,
  swr: true,
  staleMaxAge: 6 * 60 * 60,
  getKey: () => 'v1',
  validate: (entry: { value?: CifrasLeidas }) => (entry.value?.relevadosLeidos ?? 0) > 0,
}

const cifrasCacheadas = defineCachedFunction(leerCifras, cifrasCacheOptions)

export default defineEventHandler(async (event): Promise<DirectoriosResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )

  const { cifras, relevadosLeidos } = await cifrasCacheadas()
  if (relevadosLeidos === 0) setResponseHeader(event, 'cache-control', 'no-store')
  return { cifras }
})
