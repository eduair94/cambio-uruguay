// La cola de /oportunidades-reddit, paginada, con sus facetas y la última corrida del job.
//
// PRIVADA (requireAdmin, no-store, noindex): es la lista de trabajo de quien contesta en Reddit, con
// hilos de desconocidos marcados como "para contestar con un enlace". Publicada sería exactamente
// lo que un moderador reporta como spam. La arma el job de backend `currency-reddit-opportunities`;
// esta ruta sólo lee.
import { RedditOpportunityModel } from '../../models/RedditOpportunity'
import { RedditOpportunityMetaModel } from '../../models/RedditOpportunityMeta'
import { connectDb } from '../../utils/db'
import { requireAdmin } from '../../utils/requireAdmin'
import {
  buildOppsFilter,
  OPP_PROJECTION,
  parseOppsQuery,
  oppsSortOf,
  type OppItem,
} from '../../../utils/redditOpportunities'

type Facet = { value: string; count: number }

async function facet(field: 'sub' | 'family', match: Record<string, unknown>): Promise<Facet[]> {
  const rows = await RedditOpportunityModel.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ])
  return rows.filter(r => r._id).map(r => ({ value: r._id, count: r.count }))
}

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeaders(event, { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' })
  await connectDb()

  const q = parseOppsQuery(getQuery(event))
  const filter = buildOppsFilter(q)

  // Cada chip de estado cuenta con el MISMO filtro que mostraría al tocarlo: "pendientes" excluye
  // cerrados, borrados y ya enlazados, así el número del chip y el total de la lista coinciden.
  const stateCounts = Promise.all(
    (['open', 'answered', 'dismissed'] as const).map(async state => ({
      value: state,
      count: await RedditOpportunityModel.countDocuments(buildOppsFilter({ ...q, state })),
    }))
  )

  const [items, total, subs, families, states, meta] = await Promise.all([
    RedditOpportunityModel.find(filter)
      .sort(oppsSortOf(q.sort))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .select(OPP_PROJECTION)
      .lean<OppItem[]>(),
    RedditOpportunityModel.countDocuments(filter),
    facet('sub', buildOppsFilter(q, 'sub')),
    facet('family', buildOppsFilter(q, 'family')),
    stateCounts,
    RedditOpportunityMetaModel.findOne({ key: 'reddit_opportunities' })
      .select({ _id: 0, __v: 0 })
      .lean(),
  ])

  return {
    items,
    total,
    page: q.page,
    limit: q.limit,
    pages: Math.max(1, Math.ceil(total / q.limit)),
    facets: { subs, families, states },
    meta: meta ?? null,
    hint: meta
      ? ''
      : 'Todavía no corrió `currency-reddit-opportunities` (corre todos los días a las 10:21 UTC).',
  }
})
