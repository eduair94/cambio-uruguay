// Tripwire: Vuetify's composables are NOT auto-imported in this app.
//
// `/que-banco-tiene-mas-descuentos-uruguay` shipped calling `useTheme()` without importing it.
// Nothing caught it — eslint allows the bare identifier (auto-imports are legal everywhere else)
// and no unit test SSR-renders a page — so it only failed in production, where the setup() threw
// and the ENTIRE page body rendered empty: nav and footer, no <h1>, no content, while the route,
// canonical and meta all still looked right. Cheap static check, whole class of bug gone.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOTS = ['pages', 'components', 'composables', 'layouts']
/** Composables that live in the `vuetify` package and must be imported explicitly. */
const VUETIFY_COMPOSABLES = ['useTheme', 'useDisplay', 'useRtl', 'useLocale', 'useLayout']

function vueAndTsFiles(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries.flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return vueAndTsFiles(full)
    return /\.(?:vue|ts)$/.test(name) ? [full] : []
  })
}

const APP_DIR = join(__dirname, '..', '..')
const files = ROOTS.flatMap(r => vueAndTsFiles(join(APP_DIR, r)))

describe('Vuetify composables are imported, never assumed auto-imported', () => {
  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it.each(VUETIFY_COMPOSABLES)('%s is imported wherever it is called', composable => {
    const offenders: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      // Called somewhere in the file...
      if (!new RegExp(`\\b${composable}\\s*\\(`).test(src)) continue
      // ...and the file must import it (from 'vuetify' or a deeper entry point), or define it.
      const imported = new RegExp(
        `import\\s*\\{[^}]*\\b${composable}\\b[^}]*\\}\\s*from\\s*['"]vuetify`
      ).test(src)
      const defined = new RegExp(`(?:function|const)\\s+${composable}\\b`).test(src)
      if (!imported && !defined) offenders.push(relative(APP_DIR, file).split(sep).join('/'))
    }
    expect(offenders).toEqual([])
  })
})
