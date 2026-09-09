import { RentalListingModel } from '../../models/RentalListing'
import { RentalMetaModel } from '../../models/RentalMeta'
import { connectDb } from '../../utils/db'
import {
  RENTAL_COLLATION,
  RENTAL_STALE_DAYS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
  type RentalMeta,
} from '../../../utils/rentals'
import { RENTAL_GAP_MIN_PCT, RENTAL_GAP_MIN_UYU } from '../../../utils/rentalPortals'

/**
 * Las cifras de `/comparar-portales-de-alquiler-uruguay`.
 *
 * La comparativa no lleva números escritos a mano: los lee del mismo catálogo que sirve la
 * búsqueda, con `rentalPublicStages` y la MISMA ventana de vigencia. Una comparativa que cuenta un
 * universo distinto del que muestra el buscador es una comparativa falsa, y además envejece sola.
 *
 * Un dato importante para leer la respuesta: una vivienda publicada en dos portales cuenta en los
 * dos, así que `sources` suma más que `total`. La página lo dice.
 */
export interface RentalPortalStats {
  generatedAt: string
  staleDays: number
  /** Viviendas vigentes (una fila por vivienda, no por aviso). */
  total: number
  sources: Array<{ source: string; count: number }>
  /** Viviendas con avisos vivos en dos o más portales. */
  multiPortal: number
  /** De ésas, cuántas tienen precios distintos por encima del umbral de ruido. */
  withGap: number
  medianGapUyu: number
  medianGapPct: number
  maxGapUyu: number
  gapMinUyu: number
  gapMinPct: number
}

const median = (values: number[]): number => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

export default defineCachedEventHandler(
  async (): Promise<RentalPortalStats> => {
    await connectDb()
    const meta = (await RentalMetaModel.findOne({ key: 'uy-rentals' })
      .select({ _id: 0, __v: 0 })
      .lean()) as RentalMeta | null
    const usdUyu = Number(meta?.usdUyu) || 0

    // Consulta vacía: el universo entero del directorio, sin ningún filtro del usuario.
    const { filter } = buildRentalFilter(normalizeRentalQuery({}), RENTAL_STALE_DAYS, usdUyu)
    const publicStages = rentalPublicStages(filter, RENTAL_STALE_DAYS)

    const [totals, gaps] = await Promise.all([
      RentalListingModel.aggregate([
        ...publicStages,
        {
          $facet: {
            total: [{ $count: 'n' }],
            sources: [
              { $unwind: '$sources' },
              { $group: { _id: '$sources', count: { $sum: 1 } } },
              { $sort: { count: -1, _id: 1 } },
            ],
            multiPortal: [{ $match: { 'sources.1': { $exists: true } } }, { $count: 'n' }],
          },
        },
      ])
        .allowDiskUse(true)
        .collation(RENTAL_COLLATION),
      // `rentalPublicStages` ya dejó sólo avisos vigentes con `priceUyu > 0`, así que acá no se
      // vuelve a filtrar el precio: lo único que falta es quedarse con el mejor de CADA portal.
      RentalListingModel.aggregate([
        ...publicStages,
        { $match: { 'sources.1': { $exists: true } } },
        { $project: { _id: 0, key: 1, offers: { source: 1, priceUyu: 1 } } },
        { $unwind: '$offers' },
        {
          $group: {
            _id: { key: '$key', source: '$offers.source' },
            price: { $min: '$offers.priceUyu' },
          },
        },
        { $group: { _id: '$_id.key', prices: { $push: '$price' } } },
        { $match: { 'prices.1': { $exists: true } } },
        { $set: { cheapest: { $min: '$prices' } } },
        {
          $set: {
            // El segundo mejor precio es el menor de los ESTRICTAMENTE mayores. Si todos los
            // portales coinciden, no hay segundo y la vivienda no aporta ninguna brecha, que es
            // exactamente lo que hay que decir de ella.
            runnerUp: {
              $min: {
                $filter: {
                  input: '$prices',
                  as: 'price',
                  cond: { $gt: ['$$price', '$cheapest'] },
                },
              },
            },
          },
        },
        { $match: { runnerUp: { $gt: 0 } } },
        {
          $project: {
            _id: 0,
            diff: { $subtract: ['$runnerUp', '$cheapest'] },
            pct: {
              $multiply: [
                { $divide: [{ $subtract: ['$runnerUp', '$cheapest'] }, '$runnerUp'] },
                100,
              ],
            },
          },
        },
        { $match: { diff: { $gte: RENTAL_GAP_MIN_UYU }, pct: { $gte: RENTAL_GAP_MIN_PCT } } },
      ])
        .allowDiskUse(true)
        .collation(RENTAL_COLLATION),
    ])

    const facet = (totals[0] || {}) as Record<string, Array<Record<string, unknown>>>
    const rows = (gaps as Array<{ diff: number; pct: number }>).filter(
      row => Number.isFinite(row?.diff) && Number.isFinite(row?.pct)
    )

    return {
      generatedAt: new Date().toISOString(),
      staleDays: RENTAL_STALE_DAYS,
      total: Number(facet.total?.[0]?.n) || 0,
      sources: (facet.sources || [])
        .filter(row => row?._id)
        .map(row => ({ source: String(row._id), count: Number(row.count) || 0 })),
      multiPortal: Number(facet.multiPortal?.[0]?.n) || 0,
      withGap: rows.length,
      medianGapUyu: Math.round(median(rows.map(row => row.diff))),
      medianGapPct: Math.round(median(rows.map(row => row.pct)) * 10) / 10,
      maxGapUyu: rows.length ? Math.round(Math.max(...rows.map(row => row.diff))) : 0,
      gapMinUyu: RENTAL_GAP_MIN_UYU,
      gapMinPct: RENTAL_GAP_MIN_PCT,
    }
  },
  {
    name: 'rental-portal-stats',
    maxAge: 3600,
    swr: true,
    getKey: () => 'rental-portal-stats',
  }
)
