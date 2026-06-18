import { createError, type H3Event } from 'h3'

/** Guards the bot-only internal API: requires the shared `x-telegram-secret`. */
export function requireBotSecret(event: H3Event): void {
  const expected = useRuntimeConfig().telegram?.secret
  const got = event.node.req.headers['x-telegram-secret']
  if (!expected || got !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'bad telegram secret' })
  }
}
