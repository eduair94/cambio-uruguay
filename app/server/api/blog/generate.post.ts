// Manual / cron trigger to generate today's posts. Idempotent: only generates
// the categories that don't yet have today's post (so repeated calls are cheap
// and won't re-spend AI). Optionally gated by a shared token when
// NUXT_BLOG_GENERATE_TOKEN is set in the environment.
import { ensureTodayPosts } from '../../utils/blog'

export default defineEventHandler(async event => {
  const required = process.env.NUXT_BLOG_GENERATE_TOKEN
  if (required) {
    const provided = getHeader(event, 'x-blog-token') || String(getQuery(event).token || '')
    if (provided !== required) {
      throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
    }
  }

  const created = await ensureTodayPosts()
  return { ok: true, created }
})
