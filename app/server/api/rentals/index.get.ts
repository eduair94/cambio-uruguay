import { setHeaderUnlessSent } from '../../utils/cachedResponseHeader'
import { publicRentalAdvertisers } from '../../utils/rentalDetail'
import {
  rentalGalleryProjection,
  withRentalGalleryPreviews,
  type RentalGalleryRow,
} from '../../utils/rentalGalleryPreview'
import { RentalListingModel } from '../../models/RentalListing'
import { rentalDirectoryCacheKey } from '../../utils/rentalDirectoryWarm'
import {
  rentalDirectoryData,
  type RentalDirectoryMemoRecord,
} from '../../utils/rentalDirectoryData'
import {
  RENTAL_MEMO_HEADER,
  RENTAL_WORKER_HEADER,
  formatRentalMemoHeader,
  rentalWorkerId,
} from '../../utils/rentalMemo'
import { rentalFlag } from '../../utils/rentalFlags'
import {
  normalizeRentalDirectoryParts,
  type RentalsDirectoryResponse,
} from '../../../utils/rentalDirectoryParts'
import { annotateRentalAvailability } from '../../utils/rentalAvailability'
import { normalizeRentalQuery } from '../../../utils/rentals'

/**
 * The rental directory, filtered and paginated IN MONGO.
 *
 * Unlike /api/chairs — a few hundred rows sent whole and filtered in the browser — this collection
 * is tens of thousands of properties. Shipping it to the client would be a multi-megabyte payload
 * per visit, so every filter, the sort, the facet counts and the median all run as queries against
 * the compound indexes declared on the model.
 *
 * Rows whose adverts stopped appearing are excluded by `lastSeen`: the documents stay (the backend
 * prunes them later, and their history is worth keeping), but a flat nobody has published for a
 * week and a half is not shown as if it were on the market today.
 *
 * What reaches `rentallistings` lives in server/utils/rentalDirectoryData.ts (since 2026-11-20,
 * P5): the order of the search in 20-page windows, the facets, the department and barrio counts
 * and the coverage are entries of the per-worker memo, and only the cards of the page are read on
 * every request. See docs/app/RENTALS_DIRECTORY_API.md.
 */

// The single pass, re-exported so the production check of an order change and the tests run THIS
// pipeline (it lives in server/utils/rentalDirectoryOrder.ts since P5).
export { rentalDirectoryItemsPipeline } from '../../utils/rentalDirectoryOrder'

/** Lo que el navegador y el borde pueden guardar; la memoria del proceso se rige por `maxAge`. */
export const RENTAL_DIRECTORY_CACHE_CONTROL = 'public, max-age=30, s-maxage=300'

/** The memo lookups of one request, filled by the cached handler for the outer wrapper. */
interface RentalsMemoTrace {
  /** The cached handler ran in this request (false: Nitro answered from its outer memo). */
  ran: boolean
  records: RentalDirectoryMemoRecord[]
}

type DirectoryEvent = Parameters<typeof setHeaderUnlessSent>[0]

const memoTrace = (event: DirectoryEvent) =>
  (event as { context?: { rentalsMemo?: RentalsMemoTrace } }).context?.rentalsMemo

/**
 * The lookups of this request (`win=hit`, `win=miss,win=hit`, …) or `outer=hit`, and the worker:
 * for the after-deploy classification of each answer (spec §3.1), never for the browser. Nothing
 * personal in either.
 */
function setRentalsMemoHeaders(event: DirectoryEvent) {
  const trace = memoTrace(event)
  const memo = trace?.ran
    ? formatRentalMemoHeader(trace.records)
    : formatRentalMemoHeader([{ kind: 'outer', state: 'hit' }])
  if (memo) setHeaderUnlessSent(event, RENTAL_MEMO_HEADER, memo)
  setHeaderUnlessSent(event, RENTAL_WORKER_HEADER, rentalWorkerId())
}

/**
 * La respuesta entera (`parts=all`) es un memo de Nitro de 60 s por consulta, y el SSR de
 * /alquileres-uruguay lo lee de memoria: medido 2026-09-22, la página tardaba 4,5 s y el 100 % era
 * esta ruta. Desde P5 (2026-11-20) cada parte cara tiene su propio memo adentro
 * (server/utils/rentalDirectoryData.ts), así que reconstruir esta respuesta desde ahí cuesta
 * ~40 ms y el memo externo bajó de 300 s a 60 s. `items` y `facets` NO pasan por él: son rebanadas
 * del memo interno, y guardarlas acá sumaba una entrada de ~85 KB por página de scroll a la
 * memoria sin tope de Nitro.
 *
 * La consulta de la primera página es idéntica para todo visitante (`availabilityRevision` sólo viaja
 * cuando el propio visitante reportó un aviso, y en SSR siempre es 0), así que no hay nada personal
 * que guardar. Un fallo NO se guarda: Nitro no almacena una respuesta cuando el handler lanza, y con
 * una entrada vencida en mano sirve la vieja y registra el error en vez de propagarlo.
 */
const cachedDirectory = defineCachedEventHandler(
  async (event): Promise<RentalsDirectoryResponse> => {
    const input = getQuery(event) as Record<string, unknown>
    const query = normalizeRentalQuery(input)
    // `items` for the next page of a scroll, `facets` for the barrio list of another department,
    // the whole response otherwise (utils/rentalDirectoryParts.ts).
    const parts = normalizeRentalDirectoryParts(input.parts)
    const records: RentalDirectoryMemoRecord[] = []

    try {
      const { inputs, meta, availability } = await rentalDirectoryData.load(query)

      // The card carousels' photos, read for this page only (see rentalGalleryPreview.ts). A failed
      // read leaves each card with its cover: fewer photos, never a broken search.
      const cardItems = async () => {
        const { items, total } = await rentalDirectoryData.page(inputs, records)
        const galleries = items.length
          ? await RentalListingModel.find(
              { key: { $in: items.map(property => property.key) } },
              rentalGalleryProjection
            )
              .lean<RentalGalleryRow[]>()
              .catch(() => [])
          : []
        return {
          total,
          items: withRentalGalleryPreviews(items, galleries).map(property =>
            annotateRentalAvailability(publicRentalAdvertisers(property), availability)
          ),
        }
      }

      if (parts === 'items') {
        // The next page of a scroll: a slice of the search's window and the cards of that slice.
        // No facet function is called, so a page never waits on a facet pass. The count is the
        // window's own.
        const { items, total } = await cardItems()
        return { parts: 'items', items, total, page: query.page, perPage: query.perPage }
      }
      if (parts === 'facets')
        return { parts: 'facets', ...(await rentalDirectoryData.facets(inputs, records)) }

      // The page waits only for its window; the counts run beside it.
      const [page, counts] = await Promise.all([
        cardItems(),
        rentalDirectoryData.facets(inputs, records),
      ])
      return {
        meta: meta ?? null,
        coverage: rentalDirectoryData.coverage(inputs),
        items: page.items,
        // The count of the very pass that ordered the page; the facet's only after the fallback.
        total: page.total ?? counts.total,
        page: query.page,
        perPage: query.perPage,
        medianUyu: counts.medianUyu,
        facets: counts.facets,
      }
    } catch (error) {
      console.error('[api/rentals] failed', error)
      throw createError({
        statusCode: 503,
        statusMessage: 'Rental search is temporarily unavailable',
        cause: error,
      })
    } finally {
      // Handed over when this run ends: an outer-memo answer revalidated in the background must
      // not report its lookups on the request that got the old answer.
      const trace = memoTrace(event)
      if (trace) {
        trace.ran = true
        trace.records.push(...records)
      }
    }
  },
  {
    name: 'rentals-directory',
    getKey: event => rentalDirectoryCacheKey(getQuery(event) as Record<string, unknown>),
    maxAge: 60,
    // Sirve la página vieja mientras UN worker la reconstruye (Nitro deduplica los fallos de caché
    // en vuelo), y sobrevive una hora sin backend antes de volver a cobrar el pedido entero.
    staleMaxAge: 3600,
    swr: true,
    // Quien acaba de reportar un aviso como alquilado tiene que verlo desaparecer ya. Y en `nuxt dev`
    // no se guarda nada: `page.route` sólo intercepta fetches del navegador, el primer render SSR
    // pega acá de verdad, y un `maxAge: 0` en Nitro no vence nunca (ttl 0 = sin vencimiento).
    // NODE_ENV y no `import.meta.dev` porque tests/unit/rentalsSortMemory.test.ts transpila este
    // archivo a CommonJS y lo corre en un VM, donde `import.meta` es un error de sintaxis.
    // `parts=items`/`facets` no pasan por acá porque son tajadas del memo interno, y eso deja de ser
    // cierto con el memo apagado (`.data/flags/rentals.json`, `"memo":"off"`): ahí el memo interno
    // no guarda nada ni pasa por el semáforo, y sin este memo cada página de scroll costaría su
    // ventana contada, un barrido entero. La clave empieza por las partes (rentalDirectoryCacheKey),
    // así que una tajada nunca contesta un pedido entero.
    shouldBypassCache: event => {
      const input = getQuery(event)
      return (
        process.env.NODE_ENV === 'development' ||
        Boolean(input.availabilityRevision) ||
        (normalizeRentalDirectoryParts(input.parts) !== 'all' && rentalFlag('memo'))
      )
    },
  }
)

// Nitro reemplaza `cache-control` con su propio `s-maxage/stale-while-revalidate` en toda respuesta
// que sale del memo, y descarta las cabeceras que el handler puso antes de lanzar. Por eso las dos
// cabeceras que este sitio promete —la del navegador y el `no-store` del 503— se ponen por fuera.
// Pero NUNCA sobre una respuesta ya enviada: ante un `If-None-Match` que coincide, el memo contesta
// 304 y cierra la respuesta él mismo, y escribir una cabecera encima tiraba ERR_HTTP_HEADERS_SENT y
// convertía ese 304 en un 500 (Sentry CAMBIO-URUGUAY-BACKEND-14). Las del memo interno, también
// por fuera: Nitro repite en cada acierto las cabeceras que el handler puso la vez que corrió.
export default defineEventHandler(async (event): Promise<RentalsDirectoryResponse> => {
  const trace: RentalsMemoTrace = { ran: false, records: [] }
  if (event.context) (event.context as { rentalsMemo?: RentalsMemoTrace }).rentalsMemo = trace
  try {
    const response = await cachedDirectory(event)
    setHeaderUnlessSent(event, 'cache-control', RENTAL_DIRECTORY_CACHE_CONTROL)
    setRentalsMemoHeaders(event)
    return response as RentalsDirectoryResponse
  } catch (error) {
    setHeaderUnlessSent(event, 'cache-control', 'no-store')
    setRentalsMemoHeaders(event)
    throw error
  }
})
