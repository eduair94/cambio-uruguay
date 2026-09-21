import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIRECTORIOS } from '../../utils/directorios'
import { familiaNavParaRuta, familiaNavRutas } from '../../utils/familiaNav'

// Una página con la barra "En esta sección" no enlaza, en su cabecera, una página que la barra ya
// enlaza. Medido en producción el 2026-09-21: once páginas lo hacían — 31 enlaces repetidos, con
// listas propias al lado de la barra ("Otras búsquedas de vivienda", "Más opciones", filas de chips
// y botones) — y el usuario pidió que todo quede en la barra. Si una página necesita un enlace más
// arriba, va como grupo en `utils/familiaNav.ts`, no como otra lista.
//
// Mira la cabecera en el código: hasta `</header>` si la página tiene uno, si no hasta el primer
// `<h2`, sin las migas (que son jerarquía, no una lista). Detecta rutas escritas literales; una ruta
// que llega por constante (CARS_PATH) no la ve — las migas son casi todas así.
const ROOT = resolve(__dirname, '../..')
const FUENTE: Record<string, string> = {
  '/venta-viviendas-uruguay': 'components/property-sales/Directory.vue',
}

function fuente(route: string): string | null {
  const candidates = FUENTE[route]
    ? [FUENTE[route]!]
    : [`pages${route}.vue`, `pages${route}/index.vue`]
  for (const file of candidates) {
    const path = resolve(ROOT, file)
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  return null
}

function cabecera(source: string): string {
  const template = source.slice(0, source.search(/<script\b/))
  const sinMigas = template.replace(/<(VBreadcrumbs|v-breadcrumbs)\b[\s\S]*?\/>/g, '')
  const header = sinMigas.indexOf('</header>')
  if (header !== -1) return sinMigas.slice(0, header)
  const h2 = sinMigas.search(/<h2\b/)
  return h2 === -1 ? sinMigas : sinMigas.slice(0, h2)
}

const paginas = [
  ...new Set(
    DIRECTORIOS.flatMap(entry => familiaNavParaRuta(entry.to)?.items.map(item => item.to) ?? [])
  ),
]

describe('las páginas con barra no repiten sus enlaces arriba', () => {
  it('encuentra el código de casi todas (guarda contra un mapeo que no mira nada)', () => {
    const found = paginas.filter(route => fuente(route))
    expect(found.length).toBeGreaterThanOrEqual(paginas.length - 3)
  })

  for (const route of paginas)
    it(route, () => {
      const source = fuente(route)
      if (!source) return
      const head = cabecera(source)
      for (const other of familiaNavRutas(route))
        if (other !== route)
          expect(head, `${route} enlaza ${other} arriba`).not.toContain(`'${other}'`)
    })
})
