import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIRECTORIOS } from '../../utils/directorios'
import { familiaDe, familiaNavParaRuta } from '../../utils/familiaNav'

const rutas = (path: string) => familiaNavParaRuta(path)?.items.map(item => item.to) ?? []

describe('la barra de la familia', () => {
  it('pone arriba del directorio de alquileres a su evolución y su análisis', () => {
    const items = rutas('/alquileres-uruguay')
    expect(items[0]).toBe('/alquileres-uruguay')
    expect(items).toContain('/analisis-alquileres-uruguay')
    expect(items).toContain('/evolucion-precio-alquileres-uruguay')
  })

  it('es la misma barra en cada página de la familia, con la actual marcada', () => {
    const family = rutas('/alquileres-uruguay')
    for (const page of family) {
      const nav = familiaNavParaRuta(page)!
      expect(
        nav.items.map(item => item.to),
        page
      ).toEqual(family)
      expect(
        nav.items.filter(item => item.current).map(item => item.to),
        page
      ).toEqual([page])
    }
  })

  it('cubre venta de viviendas y autos, con su evolución de precios', () => {
    expect(rutas('/venta-viviendas-uruguay')).toContain('/evolucion-precio-viviendas-uruguay')
    expect(rutas('/evolucion-precio-autos-usados-uruguay')).toEqual(
      expect.arrayContaining([
        '/autos-usados-uruguay',
        '/mercado-de-autos-usados-uruguay',
        '/cuanto-vale-mi-auto-uruguay',
      ])
    )
  })

  it('un análisis que comparten varios directorios no es de ninguna familia', () => {
    expect(familiaNavParaRuta('/ciberlunes-y-black-friday-uruguay')).toBeNull()
    // Y celulares, cuya única hermana sería ese análisis compartido, no dibuja barra.
    expect(familiaNavParaRuta('/celulares-uruguay')).toBeNull()
  })

  it('no promociona rutas fuera del sitemap', () => {
    expect(rutas('/casas-de-cambio')).not.toContain('/estado')
    expect(familiaNavParaRuta('/estado')).toBeNull()
  })

  it('reconoce la ruta con prefijo de idioma y no dibuja nada fuera del registro', () => {
    expect(rutas('/en/autos-usados-uruguay')[0]).toBe('/autos-usados-uruguay')
    expect(familiaNavParaRuta('/privacidad')).toBeNull()
  })

  // El menú del celular es una lista vertical: cada fila lleva su ícono.
  it('cada página de una barra tiene ícono', () => {
    for (const entry of DIRECTORIOS)
      for (const item of familiaNavParaRuta(entry.to)?.items ?? [])
        expect(item.icon, `${entry.id} → ${item.to}`).toMatch(/^mdi-[a-z0-9-]+$/)
  })

  // La etiqueta sale del menú para que la barra esté en los tres idiomas.
  it('toda ruta de una barra está en el menú', () => {
    for (const entry of DIRECTORIOS) {
      const family = familiaDe(entry)
      if (family.length < 2) continue
      for (const item of familiaNavParaRuta(entry.to)?.items ?? [])
        expect(item.labelKey, `${entry.id} → ${item.to}`).toBeTruthy()
    }
  })
})

// El hueco entre la barra y la página iba de 11 a 61 px según el padding-top del <VContainer> de
// cada página (medido 2026-09-21). La barra lo anula en el contenedor que la sigue y pone el suyo;
// depende de que toda página arranque con un <VContainer>, que es lo que vigila pageContainer.test.ts.
describe('el aire debajo de la barra', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'components', 'FamiliaNav.vue'), 'utf8')
  const global = src.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''

  it('lo pone la barra: anula el padding-top del contenedor y de las migas que la siguen', () => {
    expect(global).toMatch(
      /\.familia-nav-wrap \+ \.v-container,[^{]*\{\s*padding-top: 0 !important;/
    )
    expect(global).toMatch(
      /\.v-container > \.v-breadcrumbs:first-child[^{]*\{\s*padding-top: 0 !important;/
    )
  })
})
