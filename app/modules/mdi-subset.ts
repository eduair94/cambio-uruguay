import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { defineNuxtModule } from '@nuxt/kit'

/**
 * La fuente de íconos, recortada a los íconos que el sitio usa.
 *
 * MEDIDO EL 6/11/2026 en producción: `@mdi/font` metía en el CSS de entrada — el que bloquea el
 * primer pintado en TODAS las páginas — las 7.448 reglas `.mdi-<nombre>::before`, 300 KB de los
 * 790 KB del archivo, y cada visita bajaba además la fuente entera, 394 KB de woff2. El sitio usa
 * ~730 íconos. Recortada: ~45 KB de fuente y ~30 KB de reglas.
 *
 * Cómo: se buscan en el código fuente todos los tokens `mdi-<nombre>` (plantillas, utils con
 * `icon: 'mdi-…'`, el servidor) más los que Vuetify usa por dentro para sus alias (`$close`,
 * `$expand`…), se cruzan con los nombres que la fuente conoce y se genera, en el build, un CSS con
 * esas reglas y una fuente con esos glifos. No hay lista versionada que mantener: un ícono nuevo
 * entra solo en el próximo build.
 *
 * El único caso que esto no ve es un nombre ARMADO en tiempo de ejecución, pegando el prefijo a una
 * variable: no hay ninguno, y `tests/unit/mdiSubset.test.ts` falla si aparece uno.
 *
 * En `nuxt dev` se sigue usando la fuente completa, para que un ícono recién escrito se vea sin
 * reiniciar. Si el recorte falla en el build, también se usa la completa y se avisa en el log: un
 * sitio más pesado es mejor que un deploy caído.
 */

export const MDI_FULL_CSS = '@mdi/font/css/materialdesignicons.min.css'

const ICON_TOKEN = /mdi-([a-z0-9]+(?:-[a-z0-9]+)*)/g
const ICON_RULE = /\.mdi-([a-z0-9-]+)::?before\s*\{\s*content:\s*"\\([0-9A-Fa-f]+)";?\s*\}/g
const FONT_FACE = /@font-face\s*\{[^}]*\}/

/** Nombres `mdi-…` mencionados en un texto, sin el prefijo. */
export function iconTokens(source: string): Set<string> {
  const out = new Set<string>()
  for (const match of source.matchAll(ICON_TOKEN)) out.add(match[1]!)
  return out
}

/** Nombre → punto de código, leído del CSS de @mdi/font. */
export function iconCodepoints(fullCss: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const match of fullCss.matchAll(ICON_RULE)) out.set(match[1]!, parseInt(match[2]!, 16))
  return out
}

/**
 * El CSS de @mdi/font con sólo las reglas de los íconos usados y la fuente recortada. Todo lo
 * demás (`.mdi:before`, tamaños, rotaciones, `mdi-spin`) queda igual.
 */
export function subsetCss(fullCss: string, used: ReadonlySet<string>, fontFile: string): string {
  if (!FONT_FACE.test(fullCss)) throw new Error('[mdi-subset] @mdi/font CSS has no @font-face')
  return fullCss
    .replace(
      FONT_FACE,
      `@font-face{font-family:"Material Design Icons";src:url("./${fontFile}") format("woff2");font-weight:normal;font-style:normal}`
    )
    .replace(ICON_RULE, (rule, name: string) => (used.has(name) ? rule : ''))
    .replace(/\/\*# sourceMappingURL=[^*]*\*\//, '')
}

// public: static files that never load this CSS; tests: fixtures, not UI.
const SKIP_DIRS = new Set(['node_modules', 'public', 'tests'])
const SCANNED = /\.(?:vue|ts|js|mjs|cjs|json|html|md)$/

async function collectFromTree(dir: string, into: Set<string>): Promise<void> {
  for (const name of await readdir(dir)) {
    if (name.startsWith('.') || SKIP_DIRS.has(name)) continue
    const path = join(dir, name)
    const info = await stat(path)
    if (info.isDirectory()) await collectFromTree(path, into)
    else if (SCANNED.test(name) && info.size < 5_000_000) {
      for (const token of iconTokens(await readFile(path, 'utf8'))) into.add(token)
    }
  }
}

export default defineNuxtModule({
  meta: { name: 'mdi-subset' },
  async setup(_options, nuxt) {
    if (nuxt.options.dev || nuxt.options._prepare) return
    const index = nuxt.options.css.indexOf(MDI_FULL_CSS)
    if (index < 0) return

    try {
      const require = createRequire(join(nuxt.options.rootDir, 'package.json'))
      const fontsDir = join(dirname(require.resolve('@mdi/font/package.json')), 'fonts')
      const fullCss = await readFile(
        require.resolve('@mdi/font/css/materialdesignicons.css'),
        'utf8'
      )
      const codepoints = iconCodepoints(fullCss)

      const tokens = new Set<string>()
      await collectFromTree(nuxt.options.rootDir, tokens)
      const vuetifyAliases = await readFile(require.resolve('vuetify/lib/iconsets/mdi.js'), 'utf8')
      for (const token of iconTokens(vuetifyAliases)) tokens.add(token)
      const used = new Set([...tokens].filter(name => codepoints.has(name)))
      if (used.size < 50) throw new Error(`only ${used.size} icons found`)

      const { default: subsetFont } = await import('subset-font')
      const font = await readFile(join(fontsDir, 'materialdesignicons-webfont.woff2'))
      const glyphs = [...used].map(name => String.fromCodePoint(codepoints.get(name)!)).join('')
      const subset = await subsetFont(font, glyphs, { targetFormat: 'woff2' })

      // NOT under buildDir: Nuxt empties it after the modules run, and the build then fails to
      // resolve the CSS it was told to load.
      const outDir = join(nuxt.options.rootDir, 'node_modules', '.cache', 'mdi-subset')
      await mkdir(outDir, { recursive: true })
      const fontFile = 'materialdesignicons-subset.woff2'
      await writeFile(join(outDir, fontFile), subset)
      const cssPath = join(outDir, 'materialdesignicons-subset.css')
      await writeFile(cssPath, subsetCss(fullCss, used, fontFile))
      nuxt.options.css[index] = cssPath
      console.info(
        `[mdi-subset] ${used.size} of ${codepoints.size} icons, font ${font.length} -> ${subset.length} bytes`
      )
    } catch (error) {
      console.warn('[mdi-subset] falling back to the full icon font:', error)
    }
  },
})
