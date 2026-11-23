// El listado de /emprendimientos-de-instagram-uruguay y de cada /<rubro>: una página de 24
// tarjetas, las facetas (cada una contada con los demás filtros puestos) y, en la primera página,
// los destacados. Lee `emprendimientolistings` (el job `currency-emprendimientos`) y nunca sirve
// una cuenta que pidió la baja ni una foto vencida. Sin base, la forma vacía con `unavailable`.
import { EmprendimientoMetaModel } from '../../models/EmprendimientoMeta'
import { connectDb } from '../../utils/db'
import {
  filterRows,
  loadCards,
  loadLightRows,
  loadOptOuts,
  pickDestacados,
} from '../../utils/emprendimientos'
import {
  EMPRENDIMIENTOS_EMPTY,
  EMPRENDIMIENTOS_PER_PAGE,
  emprendimientosStateFromQuery,
  montevideoDay,
  sortEmprendimientos,
  type EmprendimientoCard,
  type EmprendimientosResponse,
} from '../../../utils/emprendimientos'

export default defineEventHandler(async (event): Promise<EmprendimientosResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=300, s-maxage=600, stale-while-revalidate=86400'
  )
  const state = emprendimientosStateFromQuery(getQuery(event) as Record<string, unknown>)
  try {
    await connectDb()
    const now = Date.now()
    const [optOuts, meta] = await Promise.all([
      loadOptOuts(),
      EmprendimientoMetaModel.findOne({ key: 'current' }, { _id: 0, generatedAt: 1 }).lean(),
    ])
    const rows = await loadLightRows(optOuts)
    const { matched, facets } = filterRows(rows, state)
    const sorted = sortEmprendimientos(matched, state.orden, montevideoDay(now), now)
    const pages = Math.max(1, Math.ceil(sorted.length / EMPRENDIMIENTOS_PER_PAGE))
    const page = Math.min(state.pagina, pages)
    const pageHandles = sorted
      .slice((page - 1) * EMPRENDIMIENTOS_PER_PAGE, page * EMPRENDIMIENTOS_PER_PAGE)
      .map(row => row.handle)
    // Los destacados salen del conjunto filtrado por rubro y departamento (no por la búsqueda ni el
    // orden): en /regalos-y-papeleria, lo raro es lo raro de ese rubro.
    const destacados = page === 1 && !state.q && !state.raros ? pickDestacados(matched, now) : null
    const cards = await loadCards(
      [
        ...pageHandles,
        ...(destacados ? [...destacados.raros, ...destacados.joyitas, ...destacados.nuevos] : []),
      ],
      now
    )
    const pick = (handles: readonly string[]): EmprendimientoCard[] =>
      handles.map(handle => cards.get(handle)).filter((card): card is EmprendimientoCard => !!card)
    return {
      generatedAt: meta?.generatedAt ?? null,
      total: rows.length,
      matched: matched.length,
      page,
      pages,
      items: pick(pageHandles),
      facets,
      destacados: destacados
        ? {
            raros: pick(destacados.raros),
            joyitas: pick(destacados.joyitas),
            nuevos: pick(destacados.nuevos),
          }
        : null,
    }
  } catch {
    return { ...EMPRENDIMIENTOS_EMPTY, unavailable: true }
  }
})
