// Server-only AI category suggester for the import cart. The model is given the
// FIXED catalog and must reply with one of its ids; we validate that reply with
// the pure `pickCategoryId`. Crucially, the AI only *suggests a category* — the
// tax treatment (IVA rate), IMESI, required procedures and forbidden/courier-
// prohibited status are then derived deterministically from the trusted catalog
// (`importProductTypes`), never from the model. Best-effort: returns null when
// the AI isn't configured or its reply isn't a known id (UI keeps the manual
// selector + the usual disclaimers).
import { IMPORT_PRODUCT_TYPES } from '../../utils/importProductTypes'
import { pickCategoryId } from '../../utils/productClassify'
import { chatTextWithFallback } from './ai'

const CATALOG = IMPORT_PRODUCT_TYPES.map(t => `${t.id}: ${t.label}`).join('\n')
const SYSTEM =
  'You classify a product into ONE Uruguayan import category. Choose the single best-matching category ID from the list and reply with ONLY that id (lowercase, exactly as written), nothing else.\n\nCategories:\n' +
  CATALOG

/** Suggest a catalog category id for a product name, or null. Advisory only. */
export async function classifyProductCategory(name: string): Promise<string | null> {
  const clean = name.trim().slice(0, 200)
  if (!clean) return null
  const text = await chatTextWithFallback({
    system: SYSTEM,
    user: `Product: ${clean}`,
    maxTokens: 16,
    temperature: 0,
  })
  return pickCategoryId(text)
}
