// El árbol de sucursales tiene que existir en el HTML, no sólo en el sitemap.
//
// Medido el 2026-09-03 sobre un rastreo de 1.229 páginas de producción con HTTP 200: CERO enlaces a
// /sucursales/<casa>/<depto> y CERO a /sucursal/<slug> en todo el sitio. Son 682 URLs declaradas en
// el sitemap alcanzables sólo desde el XML, con 50.202 impresiones y 336 clics en 28 días. La tabla
// de la página pintaba el departamento y la dirección como texto plano, así que no servía ni de
// ruta de rastreo ni de navegación.
//
// El árbol que el sitemap ya declaraba es
//   /casa/<origin> -> /sucursales/<casa> -> /sucursales/<casa>/<depto> -> /sucursal/<slug>
// y este test fija los dos eslabones que faltaban.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(__dirname, '..', '..', 'pages', 'sucursales', '[origin]', '[[location]].vue'),
  'utf8'
)

describe('la página de sucursales enlaza a sus hijos', () => {
  it('el hub enlaza cada departamento de la casa', () => {
    expect(src).toContain('deptLinks')
    expect(src).toContain('`/sucursales/${origin}/')
  })

  it('la página de departamento enlaza la ficha de cada sucursal', () => {
    expect(src).toContain('branchLinks')
    expect(src).toContain('`/sucursal/${branch.slug}`')
  })

  it('los dos bloques son <NuxtLink>, no un handler de click', () => {
    // Un @click con router.push no deja ancla en el HTML servido, que es el defecto original.
    const desde = src.indexOf('<nav v-if="deptLinks')
    const hasta = src.indexOf('</nav>', src.indexOf('<nav v-if="branchLinks'))
    const bloque = src.slice(desde, hasta)
    expect(bloque).toContain('<NuxtLink')
    expect(bloque).not.toContain('@click')
  })

  it('el departamento se emite con la grafía del sitemap, no con guiones', () => {
    // El sitemap declara /sucursales/brou/cerro%20largo (crudo en minúscula). La ruta responde
    // también con guiones y las dos formas se declaran canónicas de sí mismas, así que emitir la
    // otra agregaría una tercera grafía compitiendo.
    expect(src).toContain("d.raw.toLocaleLowerCase('es')")
    expect(src).not.toMatch(/sucursales\/\$\{origin\}\/\$\{[^}]*slugify/)
  })

  it('cada bloque aparece donde corresponde y no en la otra página', () => {
    // deptLinks sólo en el hub (sin location); branchLinks sólo en la página de departamento.
    expect(src).toMatch(
      /const deptLinks = computed\(\(\) => \{[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*if \(location\) return \[\]/
    )
    expect(src).toMatch(
      /const branchLinks = computed\(\(\) => \{[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*if \(!location\) return \[\]/
    )
  })
})
