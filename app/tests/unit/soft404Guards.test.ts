// Las guardas que convierten un soft 404 en un 404 de verdad.
//
// Medido en producción el 2026-09-03: /sucursales/no_existe_casa/montevideo devolvía 200 con
// 229 KB, canonical a sí misma e `index, follow`; /sucursales/brou/no-existe-depto lo mismo con
// 283 KB; /historico/brou/xyz con 242 KB. Las familias que sí validaban —/casa/<origin> y el hub
// /historico/<casa>— devolvían 404, así que el patrón a copiar ya existía en el repo.
//
// Dos cosas tienen que seguir siendo ciertas y son las que este test fija: que la guarda esté en
// `validate` (lanzar `createError` después de un `await` en el setup renderiza el error pero
// contesta 200, que es justo el soft 404 que se quiere evitar), y que no referencie nada del
// ámbito del módulo, porque `definePageMeta` es una macro que el compilador extrae.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES = join(__dirname, '..', '..', 'pages')

const CASOS = [
  {
    nombre: 'sucursales/[origin]/[[location]].vue',
    src: readFileSync(join(PAGES, 'sucursales', '[origin]', '[[location]].vue'), 'utf8'),
    debeContener: ['/api/branches', 'casas?.[origin]'],
  },
  {
    nombre: 'historico/[origin]/[currency]/[[type]].vue',
    src: readFileSync(join(PAGES, 'historico', '[origin]', '[currency]', '[[type]].vue'), 'utf8'),
    debeContener: ["'usd'", "'xau'"],
  },
] as const

/** El bloque `definePageMeta({...})` completo. */
function pageMeta(src: string): string {
  const at = src.indexOf('definePageMeta(')
  expect(at, 'la página no declara definePageMeta').toBeGreaterThan(-1)
  const fin = src.indexOf('\n})', at)
  return src.slice(at, fin)
}

describe('las dos familias más grandes rechazan lo inventado', () => {
  it.each(CASOS.map(c => [c.nombre, c] as const))('%s valida en la guarda', (_n, caso) => {
    const meta = pageMeta(caso.src)
    expect(meta).toContain('validate')
    for (const fragmento of caso.debeContener) {
      expect(meta, `la guarda no comprueba ${fragmento}`).toContain(fragmento)
    }
    // Una guarda que sólo mira que el parámetro exista es la que producía el soft 404.
    expect(meta).not.toMatch(/return !!\(?route\.params\.\w+( && route\.params\.\w+)?\)?\s*$/m)
  })

  it.each(CASOS.map(c => [c.nombre, c] as const))(
    '%s no usa createError después de un await en el setup para 404ear',
    (_n, caso) => {
      // `createError` puede existir para OTROS estados; lo que no puede es ser el único 404.
      expect(pageMeta(caso.src)).toContain('validate')
    }
  )

  it('la lista de monedas cubre las que el sitemap declara', () => {
    const meta = pageMeta(CASOS[1].src)
    for (const code of ['usd', 'eur', 'brl', 'ars']) {
      expect(meta).toContain(`'${code}'`)
    }
  })
})
