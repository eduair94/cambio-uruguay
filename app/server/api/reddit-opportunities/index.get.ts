// La cola de /oportunidades-reddit, paginada, con sus facetas y la última corrida del job.
//
// PÚBLICA desde el 29/10/2026, con dos vistas que decide el servidor:
//  - cualquiera (con o sin sesión): los hilos PENDIENTES, sin nada de lo que una persona marcó;
//  - las cuentas de `NUXT_ADMIN_EMAILS`: además los respondidos y descartados, con el enlace del
//    comentario con que se contestó y si se ve. Ese enlace ata una cuenta personal de Reddit a la
//    cola del sitio y no sale en la vista pública (ver `toPublicOpp`).
//
// Sin caché: el job escribe una vez por día y lo nuevo tiene que verse apenas termina; además la
// misma URL contesta distinto con y sin sesión, y un caché compartido le serviría la vista pública
// al admin. La arma el job de backend `currency-reddit-opportunities`; esta ruta sólo lee.
import { RedditOpportunityModel } from '../../models/RedditOpportunity'
import { RedditOpportunityMetaModel } from '../../models/RedditOpportunityMeta'
import { connectDb } from '../../utils/db'
import { adminOrNull } from '../../utils/requireAdmin'
import {
  buildOppsFilter,
  freshSinceOf,
  OPP_PROJECTION,
  OPP_PUBLIC_PROJECTION,
  oppsSortOf,
  parseOppsQuery,
  toPublicOpp,
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

interface MetaRow {
  asOf: Date
  windowDays: number
  subs: unknown[]
  judged: number
  judgeFailures: number
  recommendedTotal: number
  notes: string[]
}

export default defineEventHandler(async event => {
  const admin = await adminOrNull(event)
  setResponseHeaders(event, {
    'cache-control': 'private, no-store',
    'x-robots-tag': 'noindex',
    vary: 'Authorization',
  })
  await connectDb()

  const q = parseOppsQuery(getQuery(event))
  // El público ve sólo pendientes, diga lo que diga la URL.
  if (!admin) q.state = 'open'

  const meta = await RedditOpportunityMetaModel.findOne({ key: 'reddit_opportunities' })
    .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, key: 0 })
    .lean<MetaRow>()
  const freshSince = freshSinceOf(meta?.asOf)
  const now = Date.now()
  const filter = buildOppsFilter(q, { now, freshSince })

  // Cada chip de estado cuenta con el MISMO filtro que mostraría al tocarlo: "pendientes" excluye
  // cerrados, borrados y ya enlazados, así el número del chip y el total de la lista coinciden.
  const stateCounts = admin
    ? Promise.all(
        (['open', 'answered', 'dismissed'] as const).map(async state => ({
          value: state,
          count: await RedditOpportunityModel.countDocuments(
            buildOppsFilter({ ...q, state }, { now, freshSince })
          ),
        }))
      )
    : Promise.resolve([] as Facet[])

  // Cuántos de la vista actual entraron en la última corrida: el número del chip "nuevos".
  const freshCount = freshSince
    ? RedditOpportunityModel.countDocuments(
        buildOppsFilter({ ...q, fresh: true }, { now, freshSince })
      )
    : Promise.resolve(0)

  const offset = q.offset ?? (q.page - 1) * q.limit

  const [items, total, subs, families, states, fresh] = await Promise.all([
    RedditOpportunityModel.find(filter)
      .sort(oppsSortOf(q.sort))
      .skip(offset)
      .limit(q.limit)
      .select(admin ? OPP_PROJECTION : OPP_PUBLIC_PROJECTION)
      .lean<OppItem[]>(),
    RedditOpportunityModel.countDocuments(filter),
    facet('sub', buildOppsFilter(q, { omit: 'sub', now, freshSince })),
    facet('family', buildOppsFilter(q, { omit: 'family', now, freshSince })),
    stateCounts,
    freshCount,
  ])

  return {
    admin: !!admin,
    items: admin ? items : items.map(toPublicOpp),
    total,
    page: q.page,
    offset,
    limit: q.limit,
    pages: Math.max(1, Math.ceil(total / q.limit)),
    facets: { subs, families, states, fresh },
    // Lo de la corrida es transparencia (qué se leyó y cuándo); las notas y los lotes fallidos del
    // juez son para quien la opera.
    meta: meta
      ? admin
        ? meta
        : {
            asOf: meta.asOf,
            windowDays: meta.windowDays,
            subs: meta.subs,
            recommendedTotal: meta.recommendedTotal,
          }
      : null,
    hint: meta ? '' : 'La primera actualización todavía no corrió.',
  }
})
