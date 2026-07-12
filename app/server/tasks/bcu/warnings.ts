// Nitro scheduled task: refresh the BCU's advertencias list weekly.
// Registered in nuxt.config under `nitro.scheduledTasks`. A failed scrape is a no-op — the last
// good list keeps serving, because publishing "no hay advertencias" would be far worse than
// publishing last week's.
import { refreshBcuWarnings } from '../../utils/bcuWarningsStore'

export default defineTask({
  meta: {
    name: 'bcu:warnings',
    description: 'Scrape the BCU list of entities it has publicly warned about',
  },
  async run() {
    const result = await refreshBcuWarnings()
    return { result }
  },
})
