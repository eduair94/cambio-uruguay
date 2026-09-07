import { loadAgencyDirectory, loadAgencyProfileContact } from '../../utils/agencies'
import { agencyCatalogueLinks } from '../../../utils/agencies'
import { agencyKey } from '../../../utils/propertyAdvertiser'
export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const key = agencyKey(getRouterParam(event, 'key', { decode: true }))
  if (!key) throw createError({ statusCode: 404, statusMessage: 'Agency not found' })
  let rows
  try {
    rows = await loadAgencyDirectory()
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Agency directory is temporarily unavailable',
      cause: error,
    })
  }
  const agency = rows.find(row => row.agency.key === key)
  if (!agency) throw createError({ statusCode: 404, statusMessage: 'Agency not found' })
  setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
  // Contact read failures do not fabricate channels or prevent the original profile link.
  const publicContact = await loadAgencyProfileContact(agency.agency).catch(() => null)
  return {
    ...agency,
    publicContact,
    links: agencyCatalogueLinks(key),
    indexable: agency.listings >= 2 && agency.departments.length > 0,
  }
})
