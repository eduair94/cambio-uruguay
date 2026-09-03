// Ningún enlace interno puede disparar el 301 que el propio sitio publica.
//
// `server/middleware/lowercase-routes.ts` redirige /historico/<casa>/<MONEDA> a la minúscula, y el
// sitemap declara sólo la minúscula. Pero cada plantilla construía el href con `item.code`, que
// llega en mayúscula desde la API. Medido el 2026-09-03: 638 enlaces desde 104 páginas hacia 198
// URLs distintas, TODAS con respuesta 301, y 156 de las 157 URLs canónicas del sitemap sin recibir
// un solo enlace directo. Google todavía tiene 136 de las que redirigen, con 2.874 impresiones.
//
// El 301 sigue estando para lo que Google ya indexó; lo que no puede seguir es que el sitio se lo
// dispare a sí mismo.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return vueFiles(full)
    return name.endsWith('.vue') ? [full] : []
  })
}

const files = [...vueFiles(join(APP, 'pages')), ...vueFiles(join(APP, 'components'))]

/**
 * Un href de /historico con TRES o más segmentos construido a partir de una expresión que no pasa
 * por `canonicalRoutePath`. Dos segmentos (`/historico/<casa>`) no hacen falta: el origen ya es un
 * slug en minúscula.
 */
const DEEP_LINK = /`\/historico\/\$\{[^`]*\}\/\$\{[^`]*\}/g

describe('los enlaces profundos de /historico se emiten en minúscula', () => {
  it('hay plantillas que los construyen (guarda de vacuidad)', () => {
    const total = files.reduce(
      (n, f) => n + (readFileSync(f, 'utf8').match(DEEP_LINK)?.length ?? 0),
      0
    )
    expect(total).toBeGreaterThan(5)
  })

  it.each(files.map(f => [relative(APP, f).split(sep).join('/'), f] as const))(
    '%s no arma un href de moneda sin canonicalRoutePath',
    (nombre, full) => {
      const src = readFileSync(full, 'utf8')
      for (const match of src.match(DEEP_LINK) ?? []) {
        const at = src.indexOf(match)
        const antes = src.slice(Math.max(0, at - 40), at)
        expect(
          antes.includes('canonicalRoutePath('),
          `${nombre}: ${match} se construye sin canonicalRoutePath, y va a pegar contra el 301`
        ).toBe(true)
      }
    }
  )
})
