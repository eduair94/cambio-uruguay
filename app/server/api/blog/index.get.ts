// List blog posts (newest first). Also kicks off generation of today's posts in
// the background on the first visit of the day, so the blog stays fresh even
// without an external cron (the scheduled task is the primary trigger).
import { listPosts, ensureTodayPosts } from '../../utils/blog'

export default defineEventHandler(async event => {
  const q = getQuery(event)
  const limit = q.limit ? Math.max(1, Math.min(Number(q.limit) || 0, 200)) : undefined

  const posts = await listPosts(limit)

  // Fire-and-forget: ensure today's posts exist for the next load. Never blocks
  // or fails the response.
  ensureTodayPosts().catch(() => {})

  return { posts, count: posts.length }
})
