// Lo que entra en `data` viaja entero al navegador, se use o no.
//
// Es el defecto más repetido del sitio, y esta sesión ya lo encontró cuatro veces con números
// medidos en producción el 2026-09-03:
//
//   /historico/<casa>/<moneda>   2.431.062 b, de los cuales 1.128.560 eran /api/drivers, que sólo
//                                alimenta un callback del tooltip de Chart.js
//   /sucursal/<slug>               534.869 b × 528 URLs, 233.275 de directorio de OTRAS casas
//   /convertir/<slug>              275.786 b, 95.364 de cotizaciones de 18 monedas para leer 2
//   /casa/<origin>                 332.818 b, 65.981 (89 % del payload) de una serie de 732 filas
//                                  que se reduce a cuatro escalares
//
// La regla que los arregla a todos es la misma: reducir en `transform`, que corre ANTES de que Nuxt
// escriba el payload. Un computed que reduce después no ahorra un solo byte. Este test la fija en
// los sitios donde ya se aplicó, para que no vuelva por descuido.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const PAGES = join(__dirname, '..', '..', 'pages')

const CASOS = [
  {
    nombre: 'casa/[origin]/index.vue',
    archivo: join(PAGES, 'casa', '[origin]', 'index.vue'),
    clave: 'casa-records-',
    debe: 'computePageRecords',
  },
  {
    nombre: 'sucursal/[slug].vue',
    archivo: join(PAGES, 'sucursal', '[slug].vue'),
    clave: 'branch-directory-',
    debe: 'siblingBranches',
  },
  {
    nombre: 'sucursales/[origin]/[[location]].vue',
    archivo: join(PAGES, 'sucursales', '[origin]', '[[location]].vue'),
    clave: 'branch-directory-',
    debe: 'branch.origin === origin',
  },
] as const

describe('las reducciones viven en transform, no en un computed', () => {
  it.each(CASOS.map(c => [c.nombre, c] as const))('%s reduce antes de serializar', (_n, caso) => {
    const src = readFileSync(caso.archivo, 'utf8')
    const at = src.indexOf(caso.clave)
    expect(at, `no encontré el useAsyncData de ${caso.clave}`).toBeGreaterThan(-1)
    const bloque = src.slice(at, at + 1800)
    expect(bloque).toContain('transform:')
    expect(bloque, `el transform no aplica ${caso.debe}`).toContain(caso.debe)
  })

  it('la serie de /casa ya no se guarda entera en un ref', () => {
    const src = readFileSync(CASOS[0].archivo, 'utf8')
    // El defecto era `const { data: evolution } = ...` y reducir después en un computed.
    expect(src).not.toContain('const { data: evolution }')
    expect(src).toContain('const { data: records }')
  })
})
