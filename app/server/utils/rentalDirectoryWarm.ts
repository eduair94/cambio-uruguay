/**
 * Recalentar los memos de /api/rentals para que ningún visitante pague la corrida fría.
 *
 * La regla de la casa (AGENTS.md raíz, `rentals:analysis-weekly`): lo que procesa la base se
 * calcula periódicamente y se guarda; el pedido sólo lee. `/api/rentals` tiene dos memos: el de
 * cada parte cara (ventanas del orden y facetas, server/utils/rentalDirectoryData.ts) y el de la
 * respuesta entera (`defineCachedEventHandler`, ver server/api/rentals/index.get.ts). Un memo vacío
 * lo llena el primer visitante después de cada deploy o reinicio, y ése espera varios segundos
 * dentro de uno de los dos permisos de SSR de propiedades. Esta lista son las consultas que
 * importan: la portada sin filtros (la que Google y el 90 % de las visitas piden) y los tres
 * departamentos que son el 92 % del catálogo.
 *
 * Corre SECUENCIAL a propósito: cada consulta son pasadas sobre todo el inventario, y cuatro en
 * paralelo pisarían justo el pedido de un visitante real. Los dos memos deduplican los fallos en
 * vuelo por clave, así que un calentamiento que coincide con un pedido real comparte UNA corrida.
 *
 * Sobre el doble disparo del cluster de pm2 (dos workers, dos `scheduledTasks`): acá NO va un lock
 * entre workers, al revés que en `analysisWeekly.ts`. La caché de Nitro es memoria del proceso
 * (`nitro.storage` no monta `cache` sobre Redis ni disco), así que cada worker tiene SU memo y
 * cada uno tiene que calentarlo. Lo único que se evita es que una corrida se apile sobre otra del
 * mismo proceso (un calentamiento lento que llega al siguiente minuto programado).
 */
import { normalizeRentalDirectoryParts } from '../../utils/rentalDirectoryParts'
import { normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'

/**
 * La clave del memo de /api/rentals: una por consulta NORMALIZADA, nunca por la cadena cruda.
 * `?page=1` y `?` tienen que caer en la misma entrada, y un `?utm_*` perdido no puede acuñar otra
 * corrida de 4,5 s. `rentalQueryToParams` ya deja sólo lo que difiere del default, así que la clave
 * es la misma URL que el sitio publica. Vive acá y no en la ruta para que el calentador y su test
 * la compartan sin cargar los globales de Nitro.
 *
 * Del punto de referencia, sólo las coordenadas (`'point'`): la respuesta no depende de la etiqueta,
 * que puede ser la dirección que alguien escribió, así que ni acuña otra entrada ni queda en la clave.
 *
 * La parte pedida (`parts`, utils/rentalDirectoryParts.ts) va como PREFIJO cuando no es la
 * respuesta entera (`items_page=2`, `facets_department=Montevideo`): una página de tarjetas sola o
 * las facetas solas nunca pueden contestar un pedido completo. Prefijo y no un `&parts=` al final
 * porque Nitro guarda la entrada con la clave escapada (`escapeKey` borra todo carácter que no es de
 * palabra): `department=Montevideo&parts=facets` y un departamento escrito como «Montevideo parts
 * facets» quedaban en la misma entrada. Una clave completa siempre empieza por el nombre de un
 * parámetro de `rentalQueryToParams` o es `default`, y ninguno empieza por `items` ni por `facets`.
 */
export const rentalDirectoryCacheKey = (input: Record<string, unknown>) => {
  const base = new URLSearchParams(
    rentalQueryToParams(normalizeRentalQuery(input), { includeReference: 'point' })
  ).toString()
  const parts = normalizeRentalDirectoryParts(input.parts)
  return parts === 'all' ? base || 'default' : `${parts}_${base}`
}

// Sin la segunda página desde P5 (2026-11-20): `parts=items` ya no pasa por el memo de Nitro (salvo
// con el memo interno apagado), y su ventana de 20 páginas es la misma entrada del memo interno que
// calienta la primera.
export const RENTAL_DIRECTORY_WARM_QUERIES: ReadonlyArray<Readonly<Record<string, string>>> = [
  {},
  { department: 'Montevideo' },
  { department: 'Canelones' },
  { department: 'Maldonado' },
]

export type RentalDirectoryWarmFetcher = (query: Record<string, string>) => Promise<unknown>

/**
 * Una consulta del calentamiento: primero el memo interno (la ventana 0 y la faceta, forzadas y en
 * el carril de fondo: server/utils/rentalDirectoryData.ts), después la respuesta entera por la ruta,
 * para el memo de Nitro, que entonces se arma desde aciertos. La tarea de :51/:56 y el arranque usan
 * esta misma.
 */
export function rentalDirectoryWarmFetcher(
  warmInner: (query: Record<string, string>) => Promise<unknown>,
  fetchOuter: RentalDirectoryWarmFetcher
): RentalDirectoryWarmFetcher {
  return async query => {
    await warmInner({ ...query })
    return fetchOuter({ ...query })
  }
}

/**
 * Cuándo calienta el arranque de un worker, o `null` si no debe. Nunca en `nuxt dev`, en el
 * prerender ni en los tests (la .env local apunta a la base de producción), y NUNCA en la
 * verificación previa al deploy: scripts/check-staging.cjs arranca el build candidato con
 * `NODE_ENV=production`, `CU_DEPLOY_PREFLIGHT=1` y sin `NODE_APP_INSTANCE`, y sin esta guarda cada
 * deploy le mandaría a producción pasadas sobre todo el inventario desde el proceso de prueba
 * (server/entry.ts ya no arranca las tareas programadas ahí). Cada worker a los 5 s más 25 s por
 * instancia, para que los dos no lean el inventario a la vez.
 */
export function rentalDirectoryBootWarmDelay(options: {
  dev: boolean | undefined
  prerender: boolean | undefined
  env: Readonly<Record<string, string | undefined>>
}): number | null {
  const { dev, prerender, env } = options
  if (dev || prerender || env.NODE_ENV === 'test' || env.CU_DEPLOY_PREFLIGHT) return null
  const instance = Number(env.NODE_APP_INSTANCE ?? 0)
  return 5_000 + (Number.isInteger(instance) && instance > 0 ? instance : 0) * 25_000
}

export interface RentalDirectoryWarmReport {
  status: 'warmed' | 'busy'
  /** Consultas que respondieron, como cadena de query (vacía = portada sin filtros). */
  warmed: string[]
  /** Consultas que fallaron; una sola no frena a las demás. */
  failed: Array<{ query: string; error: string }>
  ms: number
}

const describe = (query: Record<string, string>) => new URLSearchParams(query).toString()

export async function warmRentalDirectory(
  fetcher: RentalDirectoryWarmFetcher,
  queries: ReadonlyArray<Readonly<Record<string, string>>> = RENTAL_DIRECTORY_WARM_QUERIES,
  now: () => number = Date.now
): Promise<RentalDirectoryWarmReport> {
  const started = now()
  const report: RentalDirectoryWarmReport = { status: 'warmed', warmed: [], failed: [], ms: 0 }
  for (const query of queries) {
    const label = describe(query)
    try {
      await fetcher({ ...query })
      report.warmed.push(label)
    } catch (error) {
      report.failed.push({
        query: label,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  report.ms = now() - started
  return report
}

let inFlight: Promise<RentalDirectoryWarmReport> | null = null

/** Una corrida por proceso a la vez; la segunda que llega mientras dura la primera vuelve `busy`. */
export async function runRentalDirectoryWarm(
  fetcher: RentalDirectoryWarmFetcher,
  queries?: ReadonlyArray<Readonly<Record<string, string>>>
): Promise<RentalDirectoryWarmReport> {
  if (inFlight) return { status: 'busy', warmed: [], failed: [], ms: 0 }
  inFlight = warmRentalDirectory(fetcher, queries)
  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}
