import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileStyle, parse } from 'vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { glob } from 'glob'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Vuetify stamps `v-theme--dark` / `v-theme--light` on EVERY component it renders,
 * not just on the app root. A rule whose whole selector is that class therefore hits
 * every button, icon and card on the site. `:global(.v-theme--dark) .card {}` inside a
 * scoped block compiles to exactly that: the descendant is dropped and the data-v
 * attribute is never added. Write `.v-theme--dark .card {}` instead.
 */
const BARE_THEME_RULE = /(^|[},])\s*\.v-theme--(dark|light)\s*\{/

const sfcs = await glob('{pages,components,layouts}/**/*.vue', { cwd: appRoot, absolute: true })

describe('scoped styles never leak a bare theme selector', () => {
  it('finds SFCs to check', () => {
    expect(sfcs.length).toBeGreaterThan(50)
  })

  it.each(sfcs.map(file => [relative(appRoot, file), file]))('%s', (_name, file) => {
    const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })

    for (const block of descriptor.styles) {
      if (!block.scoped) continue

      const { code } = compileStyle({
        source: block.content,
        filename: file,
        id: 'data-v-test',
        scoped: true,
        preprocessLang: block.lang as 'scss' | undefined,
      })

      expect(code).not.toMatch(BARE_THEME_RULE)
    }
  })
})
