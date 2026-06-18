// Nitro scheduled task: generate today's blog posts once a day. Registered in
// nuxt.config under `nitro.scheduledTasks`. Idempotent — if the posts already
// exist (e.g. created on first visit), it does nothing and spends no AI.
import { ensureTodayPosts } from '../../utils/blog'

export default defineTask({
  meta: {
    name: 'blog:daily',
    description: 'Generate the daily AI blog posts (dólar global + dólar Uruguay)',
  },
  async run() {
    const created = await ensureTodayPosts()
    return { result: { created } }
  },
})
