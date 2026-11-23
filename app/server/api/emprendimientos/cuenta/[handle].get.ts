// La ficha de /emprendimientos-de-instagram-uruguay/cuenta/<handle> y seis parecidas (mismo rubro,
// primero las del mismo departamento). Una cuenta que no está publicada o que pidió la baja contesta
// `listing: null` y la página dice que no está en el directorio (404).
import {
  EmprendimientoListingModel,
  type EmprendimientoListingDoc,
} from '../../../models/EmprendimientoListing'
import { connectDb } from '../../../utils/db'
import { loadCards, loadOptOuts, toDetail } from '../../../utils/emprendimientos'
import {
  handleFromInput,
  hash32,
  type EmprendimientoCard,
  type EmprendimientoCuentaResponse,
} from '../../../../utils/emprendimientos'

export default defineEventHandler(async (event): Promise<EmprendimientoCuentaResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=300, s-maxage=600, stale-while-revalidate=86400'
  )
  const handle = handleFromInput(String(getRouterParam(event, 'handle') ?? ''))
  if (!handle) return { listing: null, similares: [] }
  try {
    await connectDb()
    const now = Date.now()
    const optOuts = await loadOptOuts()
    if (optOuts.has(handle)) return { listing: null, similares: [] }
    const doc = (await EmprendimientoListingModel.findOne(
      { handle },
      { _id: 0, search: 0, photosExpireAt: 0, createdAt: 0, updatedAt: 0, __v: 0 }
    ).lean()) as EmprendimientoListingDoc | null
    if (!doc) return { listing: null, similares: [] }
    const sameDepto = (row: { departamento?: string | null }): number =>
      Number(!!doc.departamento && row.departamento === doc.departamento)
    const siblings = (
      await EmprendimientoListingModel.find(
        { rubro: doc.rubro, handle: { $ne: handle } },
        { _id: 0, handle: 1, departamento: 1 }
      ).lean()
    )
      .filter(row => !optOuts.has(row.handle))
      .sort(
        (a, b) =>
          sameDepto(b) - sameDepto(a) ||
          hash32(`${handle}:${a.handle}`) - hash32(`${handle}:${b.handle}`)
      )
      .slice(0, 6)
    const cards = await loadCards(
      siblings.map(row => row.handle),
      now
    )
    return {
      listing: toDetail(doc, now),
      similares: siblings
        .map(row => cards.get(row.handle))
        .filter((card): card is EmprendimientoCard => !!card),
    }
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Directorio no disponible' })
  }
})
