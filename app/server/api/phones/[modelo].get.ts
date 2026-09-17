import { PhoneModelModel } from '../../models/PhoneModel'
import { PhoneMetaModel } from '../../models/PhoneMeta'
import { connectDb } from '../../utils/db'
import {
  PHONE_DETAIL_PROJECTION,
  PHONE_LIST_PROJECTION,
  PHONE_META_KEY,
  PHONE_SLUG_RE,
  phoneIsStale,
  phoneModelProjection,
  phonePublishable,
  phoneSiblings,
  type PhoneDetailResponse,
  type PhoneMetaDoc,
  type PhoneModelDoc,
} from '../../../utils/phones'

/**
 * One model's own page for `/celulares-uruguay/<modelo>`.
 *
 * A malformed slug 404s BEFORE touching the database — same rule
 * `app/server/api/property-nearby/[operation]/[key].get.ts` and `app/server/api/equipar/[categoria]
 * .get.ts` already follow: a request shape that could never match a document should never spend a
 * database round trip finding that out.
 *
 * Unlike the hub (`./index.get.ts`), this route has no honest "empty" shape to fall back to — `model`
 * is not optional in `PhoneDetailResponse` — so a database failure collapses onto the SAME response as
 * "no such model": a 404 with `cache-control: no-store`, never cached as a false negative. The route
 * still SERVES a model whose current NEW price is not publishable (an ambiguous split, a stale run,
 * too few offers) — the page decides what to show for that — but reports it via `publishable`/`stale`
 * rather than pretending the model does not exist.
 */
export default defineEventHandler(async (event): Promise<PhoneDetailResponse> => {
  const slug = String(getRouterParam(event, 'modelo') || '')
  if (!PHONE_SLUG_RE.test(slug)) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Model not found' })
  }

  let meta: Pick<PhoneMetaDoc, 'generatedAt' | 'usdUyu'> | null
  let model: PhoneModelDoc | null
  let siblingDocs: PhoneModelDoc[]
  try {
    await connectDb()
    const [metaRow, doc] = await Promise.all([
      PhoneMetaModel.findOne({ key: PHONE_META_KEY }).select({ generatedAt: 1, usdUyu: 1 }).lean(),
      PhoneModelModel.findOne({ slug }).select(PHONE_DETAIL_PROJECTION).lean(),
    ])
    meta = metaRow as unknown as Pick<PhoneMetaDoc, 'generatedAt' | 'usdUyu'> | null
    model = doc as unknown as PhoneModelDoc | null
    siblingDocs = model
      ? ((await PhoneModelModel.find({ brand: model.brand, key: { $ne: model.key } })
          .select(PHONE_LIST_PROJECTION)
          .lean()) as unknown as PhoneModelDoc[])
      : []
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Model not found' })
  }

  if (!model) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Model not found' })
  }

  const today = new Date().toISOString().slice(0, 10)
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )
  return {
    generatedAt: meta?.generatedAt ?? '',
    usdUyu: meta?.usdUyu ?? 0,
    model: phoneModelProjection(model),
    stale: phoneIsStale(model.lastSeen, today),
    publishable: phonePublishable(model, today),
    siblings: phoneSiblings(siblingDocs, model, today),
  }
})
