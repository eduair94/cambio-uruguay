// Begin Discord OAuth2: set a signed CSRF state cookie and redirect to Discord.
import { signState } from '../../../utils/discordAuth'

export default defineEventHandler(event => {
  const cfg = useRuntimeConfig().discord as {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Discord login not configured' })
  }

  const state = signState(cfg.clientSecret)
  setCookie(event, 'dc_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 600,
    path: '/',
  })

  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('scope', 'identify email')
  url.searchParams.set('redirect_uri', cfg.redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'consent')
  return sendRedirect(event, url.toString(), 302)
})
