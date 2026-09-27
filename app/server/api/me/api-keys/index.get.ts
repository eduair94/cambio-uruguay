// Las claves de la API de la cuenta en sesión, con su uso de 30 días. Privado y sin caché.
import type { ApiKeyRecord, ApiUsageResponse } from '../../../../utils/apiKeys'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const { keys } = await apiAdminFetch<{ keys: ApiKeyRecord[] }>('/admin/api-keys', { query: { ownerUid: uid } })
  const usage = await apiAdminFetch<ApiUsageResponse>('/admin/api-usage', { query: { ownerUid: uid, days: 30 } })
  return { keys, usage }
})
