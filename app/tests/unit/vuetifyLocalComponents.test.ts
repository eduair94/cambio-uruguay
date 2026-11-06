import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// Los componentes de Vuetify que se registran en `plugins/vuetify.ts` viajan en el chunk de
// entrada de TODAS las páginas, con su CSS en el CSS de entrada. Estos los usan pocas páginas
// (medido el 6/11/2026: VDataTable 34 KB, VDatePicker 21 KB + 11 KB de fechas, VSlider 11 KB,
// VAutocomplete 10 KB…), así que cada archivo que los usa los importa él mismo. Un archivo que
// los use sin importarlos renderiza un `<v-data-table>` desconocido: este test lo frena.
const APP = resolve(__dirname, '../..')
const LOCAL_ONLY = [
  'VAutocomplete',
  'VDataTable',
  'VDatePicker',
  'VPagination',
  'VSlider',
  'VTimeline',
  'VTimelineItem',
]
// VDataTable -> v-data-table (la V inicial también lleva guion).
const kebab = (name: string) =>
  'v-' +
  name
    .slice(1)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) vueFiles(path, out)
    else if (name.endsWith('.vue')) out.push(path)
  }
  return out
}

describe('componentes de Vuetify importados donde se usan', () => {
  const plugin = readFileSync(join(APP, 'plugins/vuetify.ts'), 'utf8')

  it('no se registran globalmente', () => {
    for (const name of LOCAL_ONLY) expect(plugin, name).not.toMatch(new RegExp(`\\b${name}\\b`))
  })

  it('cada archivo que los usa los importa', () => {
    const missing: string[] = []
    const files = ['components', 'pages', 'layouts'].flatMap(dir => vueFiles(join(APP, dir)))
    files.push(join(APP, 'app.vue'), join(APP, 'error.vue'))
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      const imported = src.match(/import \{([^}]*)\} from 'vuetify\/components'/)?.[1] ?? ''
      for (const name of LOCAL_ONLY) {
        const used = new RegExp(`<(?:${name}|${kebab(name)})(?=[\\s/>])`).test(src)
        if (used && !new RegExp(`\\b${name}\\b`).test(imported)) {
          missing.push(`${relative(APP, file)}: ${name}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})
