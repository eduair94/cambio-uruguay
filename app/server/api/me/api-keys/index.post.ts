// Alta de una clave de la API para la cuenta en sesión. El dueño sale de la SESIÓN, nunca del
// cuerpo: el formulario no puede crear claves a nombre de otro ni pedir un plan.
import type { ApiKeyRecord } from '../../../../utils/apiKeys'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async event => {
  const { uid, email, emailVerified, anonymous } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  // Una clave tiene que ser de alguien: un invitado se crea con un script y sin correo, y cada alta
  // le manda un aviso al dueño del sitio. Hace falta una cuenta con correo verificado.
  if (anonymous || !email || !emailVerified) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Para crear una clave necesitás una cuenta con correo verificado: entrá con Google o verificá tu correo.',
    })
  }
  const b = ((await readBody(event)) ?? {}) as Record<string, unknown>
  if (b.acceptTerms !== true) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Para crear una clave hay que aceptar las condiciones de uso.',
    })
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
