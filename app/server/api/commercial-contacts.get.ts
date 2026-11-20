import { defineEventHandler, setResponseHeader } from 'h3'
import { safeCommercialContacts } from '../../utils/commercialContacts'
import { requireAdmin } from '../utils/requireAdmin'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseHeader(event, 'vary', 'Authorization')
  await requireAdmin(event)
  const { COMMERCIAL_CONTACTS } = await import('../data/commercialContacts')
  return { contacts: safeCommercialContacts(COMMERCIAL_CONTACTS) }
})
