// Fetch a single blog post by slug. If the post is missing but its slug is for
// today, generate it on demand (so a direct visit to today's URL works even if
// the scheduled task hasn't run yet). Unknown/old missing slugs -> 404.
import { getPost, generatePost } from '../../utils/blog'
import { montevideoToday, parseBlogSlug } from '../../../utils/blog'

export default defineEventHandler(async event => {
  const slug = getRouterParam(event, 'slug') || ''
  const parsed = parseBlogSlug(slug)
  if (!parsed) {
    throw createError({ statusCode: 404, statusMessage: 'Post no encontrado' })
  }

  let post = await getPost(slug)
  if (!post && parsed.date === montevideoToday()) {
    post = await generatePost(parsed.category, parsed.date)
  }
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post no encontrado' })
  }
  return post
})
