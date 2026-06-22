import { classifyProductCategory } from '../utils/productClassify'
import {
  productTypeById,
  productRegimeStatus,
  type ImportRegime,
} from '../../utils/importProductTypes'

// Best-effort AI category suggestion for the import cart. Returns the suggested
// catalog category id plus the DETERMINISTIC tax/forbidden facts derived from the
// trusted catalog for that id (never from the AI). `categoryId` is null when the
// AI isn't configured or couldn't classify — the client keeps the manual selector.
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const name = String(query?.name ?? '').trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }
  const regime: ImportRegime = query?.regime === 'general' ? 'general' : 'courier'
  const categoryId = await classifyProductCategory(name)
  if (!categoryId) return { categoryId: null }

  const type = productTypeById(categoryId)
  const status = productRegimeStatus(type, regime)
  return {
    categoryId,
    label: type.label,
    blocked: status.blocked,
    reason: status.reason ?? null,
  }
})
