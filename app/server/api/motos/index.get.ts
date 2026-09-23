import { MotoCatalogModel } from '../../models/MotoCatalog'
import { MotoCatalogMetaModel } from '../../models/MotoCatalogMeta'
import { connectDb } from '../../utils/db'
import {
  MOTOS_PER_PAGE,
  MOTO_FRESH_DAYS_FALLBACK,
  MOTO_FUEL_LABEL,
  MOTO_META_ID,
  MOTO_ROW_PROJECTION,
  MOTO_SELLER_LABEL,
  MOTO_TYPE_LABEL,
  motoCoverageOf,
  motoEmptyList,
  motoMatch,
  motoNormalizeQuery,
  motoSortSpec,
  type MotoFacet,
  type MotoListResponse,
} from '../../../utils/motos'
import type { MotoPublicCatalogMetaDoc, MotoPublicListing } from '../../../utils/motosPublic'

/**
 * Un facet sobre el catálogo: cuántos avisos hay por cada valor de un campo, DENTRO del resto de
 * los filtros puestos (quien llama saca del filtro el campo que está contando, igual que
 * `/api/cars`). Un valor nulo o vacío nunca se publica como opción: "sin departamento" no es un
 * departamento, y ofrecerlo como filtro sería ofrecer una pregunta que el dato no contesta.
 */
async function motoFacet(
  match: Record<string, unknown>,
  field: string,
  limit: number,
  labelField?: string
): Promise<MotoFacet[]> {
  const rows = await MotoCatalogModel.aggregate<{ _id: unknown; label?: unknown; count: number }>([
    { $match: match },
    {
      $group: {
        _id: `$${field}`,
        ...(labelField ? { label: { $first: `$${labelField}` } } : {}),
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]).option({ maxTimeMS: 10_000 })
  return rows
    .filter(row => typeof row._id === 'string' && row._id.trim().length > 0)
    .map(row => ({
      value: String(row._id),
      label: typeof row.label === 'string' && row.label ? row.label : String(row._id),
      count: row.count,
    }))
}

/**
 * El listado de `/motos-usadas-uruguay`: un AVISO por fila, con filtros y paginado.
 *
 * Tres decisiones que no son de forma:
 *
 * 1. **La ventana de frescura sale de la corrida, no de una constante de acá.** El job publica su
 *    propio `freshDays` en la meta; copiarlo del lado del app sería tener dos verdades y que la
 *    página listara avisos que el job ya dejó de contar (o al revés) sin que nadie lo note.
 * 2. **Un fallo de base NO es un 404 ni un 500**: devuelve la forma vacía con `cache-control:
 *    no-store` y `status: 'unavailable'`, como `/api/phones`. Un directorio vacío cacheado diez
 *    minutos porque Mongo parpadeó una vez esconde el catálogo entero durante esa ventana, y el
 *    500 rompería el SSR de la página.
 * 3. **Sin documento de corrida, `status: 'preparing'`**: el job todavía no publicó nada. La
 *    página tiene que poder decir "el relevamiento está arrancando" y no "no hay motos usadas en
 *    Uruguay" — que es afirmar algo que nadie midió.
 */
export default defineEventHandler(async (event): Promise<MotoListResponse> => {
  const query = motoNormalizeQuery(getQuery(event) as Record<string, unknown>)
  const today = new Date().toISOString().slice(0, 10)

  try {
    await connectDb()
    const metaDoc = (await MotoCatalogMetaModel.findOne({ key: MOTO_META_ID })
      .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
      .lean()) as unknown as MotoPublicCatalogMetaDoc | null
    const coverage = motoCoverageOf(metaDoc?.meta ?? null)
    const freshDays = coverage?.freshDays ?? MOTO_FRESH_DAYS_FALLBACK
    const match = motoMatch(query, today, freshDays)
    /** El filtro SIN uno de los criterios de texto: un facet que se contara con su propio filtro
     * puesto devolvería una sola opción con el total de la pantalla, y el lector no podría ver
     * cuántos avisos hay del otro lado de ese filtro. */
    const without = (field: 'departamento' | 'tipo' | 'combustible' | 'vendedor') =>
      motoMatch({ ...query, [field]: '' }, today, freshDays)

    const [total, items, brands, models, departments, types, fuels, sellers] = await Promise.all([
      MotoCatalogModel.countDocuments(match).maxTimeMS(10_000),
      MotoCatalogModel.find(match)
        .select(MOTO_ROW_PROJECTION)
        .sort(motoSortSpec(query.sort))
        .skip((query.page - 1) * MOTOS_PER_PAGE)
        .limit(MOTOS_PER_PAGE)
        .maxTimeMS(10_000)
        .lean(),
      // La marca se cuenta sin el filtro de marca NI el de modelo: un modelo pertenece a una marca,
      // así que dejarlo puesto daría una sola marca con un solo número.
      motoFacet(
        motoMatch({ ...query, marca: '', modelo: '' }, today, freshDays),
        'brandSlug',
        60,
        'brand'
      ),
      query.marca
        ? motoFacet(
            motoMatch({ ...query, modelo: '' }, today, freshDays),
            'marketSlug',
            120,
            'model'
          )
        : Promise.resolve([]),
      motoFacet(without('departamento'), 'department', 19),
      motoFacet(without('tipo'), 'type', 13),
      motoFacet(without('combustible'), 'fuel', 4),
      motoFacet(without('vendedor'), 'sellerType', 2),
    ])

    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
    )
    return {
      status: metaDoc ? 'ok' : 'preparing',
      generatedAt: coverage?.generatedAt ?? '',
      total,
      page: query.page,
      perPage: MOTOS_PER_PAGE,
      items: (items ?? []) as unknown as MotoPublicListing[],
      facets: {
        brands,
        models,
        departments,
        // Las etiquetas de tipo, motor y vendedor son catálogos cerrados: se traducen acá y no en
        // la plantilla, para que la misma palabra no se escriba en dos lados.
        types: types.map(facet => ({
          ...facet,
          label: MOTO_TYPE_LABEL[facet.value as keyof typeof MOTO_TYPE_LABEL] ?? facet.value,
        })),
        fuels: fuels.map(facet => ({
          ...facet,
          label: MOTO_FUEL_LABEL[facet.value as keyof typeof MOTO_FUEL_LABEL] ?? facet.value,
        })),
        sellers: sellers.map(facet => ({
          ...facet,
          label: MOTO_SELLER_LABEL[facet.value as keyof typeof MOTO_SELLER_LABEL] ?? facet.value,
        })),
      },
      coverage,
    }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return motoEmptyList(query, 'unavailable')
  }
})
