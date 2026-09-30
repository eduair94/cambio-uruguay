// Las páginas más visitadas del sitio, para /paginas-mas-visitadas.
//
// Pública y sin sesión a propósito: el documento (`sitetoppages`) ya se escribe sin nada privado —
// el job lo arma campo por campo desde el ranking privado (classes/site-analytics/publicTopPages.ts).
// Esta ruta nunca lee `sitepagerankings`, que es la versión privada.
//
// Cacheada una hora: la fuente se renueva una vez por día.
import { SiteTopPagesModel } from '../models/SiteTopPages'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    return await SiteTopPagesModel.findOne({ key: 'site' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    // La página dibuja su propio "todavía no hay datos"; un 500 sólo la rompería.
    return null
  }
})
