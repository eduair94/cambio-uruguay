// Pure helper for the AI product-category suggestion. The AI is constrained to
// pick an id from the trusted IMPORT_PRODUCT_TYPES catalog; this validates its
// reply against that closed set so the model can NEVER invent a tax treatment or
// a "forbidden" verdict — those always come from the deterministic catalog. PURE
// (no Vue/Nuxt/AI runtime) so it is unit-testable.
import { IMPORT_PRODUCT_TYPES } from './importProductTypes'

/**
 * Return the first catalog category id that appears as a token in `text`, or
 * null. Tokenizes on non `[a-z_]` characters so underscored ids
 * (e.g. `alcohol_tabaco`) match exactly. `validIds` defaults to the full catalog.
 */
export function pickCategoryId(
  text: string | null | undefined,
  validIds: readonly string[] = IMPORT_PRODUCT_TYPES.map(t => t.id)
): string | null {
  if (!text) return null
  for (const token of text.toLowerCase().split(/[^a-z_]+/)) {
    if (token && validIds.includes(token)) return token
  }
  return null
}
