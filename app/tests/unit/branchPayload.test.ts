// El recorte del directorio en las dos familias de sucursales.
//
// `/api/branches` devuelve el directorio ENTERO —todas las casas, sus 528 sucursales, y la
// cotización de cada una— y las dos familias lo pedían tal cual. Lo que entra en `data` viaja
// entero al navegador, se use o no. Medido en producción el 2026-09-03:
//
//   /sucursal/alter-cambio-misiones-1375   534.869 bytes · 233.275 de directorio (44 %) × 528 URLs
//   /sucursales/brou/montevideo            595.580 bytes · 233.275 de directorio (39 %)
//
// Dos cosas tienen que seguir siendo ciertas para que el recorte sea seguro, y son las que este
// test fija: que haya `transform`, y que la clave del caché dependa del recorte. Con la clave
// compartida que había, la segunda página renderizada en el mismo proceso se quedaba con el
// recorte de la primera — un bug que no rompe ningún test y sirve la sucursal equivocada.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES = join(__dirname, '..', '..', 'pages')

const CASES = [
  {
    name: 'sucursal/[slug].vue',
    source: readFileSync(join(PAGES, 'sucursal', '[slug].vue'), 'utf8'),
    key: 'branch-directory-${route.params.slug}',
  },
  {
    name: 'sucursales/[origin]/[[location]].vue',
    source: readFileSync(join(PAGES, 'sucursales', '[origin]', '[[location]].vue'), 'utf8'),
    key: 'branch-directory-${origin}',
  },
] as const

describe('el directorio de sucursales no viaja entero', () => {
  it.each(CASES.map(c => [c.name, c] as const))('%s recorta antes de serializar', (_n, c) => {
    // Se ancla en la CLAVE y no en '/api/branches': la ruta aparece también dentro del `validate`
    // de definePageMeta, que corre fuera de setup y por eso no se serializa. Anclar ahí buscaba el
    // transform en el bloque equivocado.
    const at = c.source.indexOf(c.key)
    expect(at, 'no encontré el useAsyncData del directorio').toBeGreaterThan(-1)
    const block = c.source.slice(at, at + 1600)
    expect(block).toContain('/api/branches')
    expect(block).toContain('transform:')
  })

  it.each(CASES.map(c => [c.name, c] as const))('%s usa una clave propia del recorte', (_n, c) => {
    expect(c.source).toContain(c.key)
  })

  it('las páginas que sí necesitan el directorio completo conservan la clave compartida', () => {
    // Contrapeso: /sucursal (el índice) lista TODAS las sucursales, así que su fetch no se recorta.
    // Si algún día también se recorta, esta prueba avisa de que hay que revisar la clave.
    const index = readFileSync(join(PAGES, 'sucursal', 'index.vue'), 'utf8')
    expect(index).toContain("useAsyncData('branch-directory'")
  })
})
