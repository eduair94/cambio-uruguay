// Alta de una clave de la API para la cuenta en sesión. El dueño sale de la SESIÓN, nunca del
// cuerpo: el formulario no puede crear claves a nombre de otro ni pedir un plan.
import type { ApiKeyRecord } from '../../../../utils/apiKeys'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
  const { uid, email } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const b = ((await readBody(event)) ?? {}) as Record<string, unknown>
  if (b.acceptTerms !== true) {
    throw createError({ statusCode: 400, statusMessage: 'Para crear una clave hay que aceptar las condiciones de uso.' })
  }
  const text = (v: unknown) => (typeof v === 'string' ? v : '')
  return apiAdminFetch<{ key: string; apiKey: ApiKeyRecord }>('/admin/api-keys', {
    method: 'POST',
    body: {
      ownerUid: uid,
      ownerEmail: email,
      label: text(b.label),
      company: text(b.company),
      useCase: text(b.useCase),
      website: text(b.website),
    },
  })
})
