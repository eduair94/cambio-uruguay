/**
 * Recalentar el memo de /api/rentals para que ningún visitante pague la corrida fría.
 *
 * La regla de la casa (AGENTS.md raíz, `rentals:analysis-weekly`): lo que procesa la base se
 * calcula periódicamente y se guarda; el pedido sólo lee. `/api/rentals` ya es un memo de cinco
 * minutos por consulta (`defineCachedEventHandler`, ver server/api/rentals/index.get.ts), pero un
 * memo vacío lo llena el primer visitante después de cada deploy o reinicio, y ése espera 4,5 s
 * dentro de uno de los dos permisos de SSR de propiedades. Esta lista son las consultas que
 * importan: la portada sin filtros (la que Google y el 90 % de las visitas piden), los tres
 * departamentos que son el 92 % del catálogo y la segunda página.
 *
 * Corre SECUENCIAL a propósito: cada fallo de caché son seis agregaciones sobre todo el inventario,
 * y cinco en paralelo pisarían justo el pedido de un visitante real. Nitro deduplica los fallos en
 * vuelo por clave, así que un calentamiento que coincide con un pedido real comparte UNA corrida.
 *
 * Sobre el doble disparo del cluster de pm2 (dos workers, dos `scheduledTasks`): acá NO va un lock
 * entre workers, al revés que en `analysisWeekly.ts`. La caché de Nitro es memoria del proceso
 * (`nitro.storage` no monta `cache` sobre Redis ni disco), así que cada worker tiene SU memo y
 * cada uno tiene que calentarlo. Lo único que se evita es que una corrida se apile sobre otra del
 * mismo proceso (un calentamiento lento que llega al siguiente minuto programado).
 */
import { normalizeRentalQuery, rentalQueryToParams } from '../../utils/rentals'

/**
 * La clave del memo de /api/rentals: una por consulta NORMALIZADA, nunca por la cadena cruda.
 * `?page=1` y `?` tienen que caer en la misma entrada, y un `?utm_*` perdido no puede acuñar otra
 * corrida de 4,5 s. `rentalQueryToParams` ya deja sólo lo que difiere del default, así que la clave
 * es la misma URL que el sitio publica. Vive acá y no en la ruta para que el calentador y su test
 * la compartan sin cargar los globales de Nitro.
 */
export const rentalDirectoryCacheKey = (input: Record<string, unknown>) =>
  new URLSearchParams(rentalQueryToParams(normalizeRentalQuery(input))).toString() || 'default'

export const RENTAL_DIRECTORY_WARM_QUERIES: ReadonlyArray<Readonly<Record<string, string>>> = [
  {},
  { department: 'Montevideo' },
  { department: 'Canelones' },
  { department: 'Maldonado' },
  { page: '2' },
]

export type RentalDirectoryWarmFetcher = (query: Record<string, string>) => Promise<unknown>

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
