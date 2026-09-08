import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const pagesDir = join(__dirname, '..', '..', 'pages')

function revenuePages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return revenuePages(full)
    if (!entry.name.endsWith('.vue') || !readFileSync(full, 'utf8').includes('/api/site-revenue')) {
      return []
    }
    return [relative(pagesDir, full).split(sep).join('/')]
  })
}

// Keep this frontend guard in the app suite as well as the backend privacy
// suite: a pages-only deploy does not run backend tests. Public analytics must
// never gain access to the separate advertising revenue snapshot.
describe('site revenue page privacy', () => {
  it('restricts the revenue endpoint to the private search statistics page', () => {
    expect(revenuePages(pagesDir)).toEqual(['estadisticas-de-busqueda.vue'])
  })
})
