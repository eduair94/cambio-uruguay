import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { DIRECTORIOS } from '../../utils/directorios'
import {
  familiaDe,
  familiaNavParaRuta,
  familiaNavRutas,
  familiaNavTotal,
  type FamiliaNav,
} from '../../utils/familiaNav'

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
      const nav = familiaNavParaRuta(entry.to)!
      for (const item of [...nav.items, ...nav.grupos.flatMap(grupo => grupo.items)])
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

describe('los grupos de la barra', () => {
  const todas = (nav: FamiliaNav) => [
    ...nav.items.map(item => item.to),
    ...nav.grupos.flatMap(grupo => grupo.items.map(item => item.to)),
  ]

  // El motivo de los grupos: el directorio de alquileres tenía tres bloques de enlaces arriba del
  // título y tres enlaces aparecían dos veces. Una ruta, una vez, en toda la barra.
  it('ninguna ruta aparece dos veces en una barra', () => {
    for (const entry of DIRECTORIOS) {
      const nav = familiaNavParaRuta(entry.to)
      if (!nav) continue
      const routes = todas(nav)
      expect(routes, entry.id).toEqual([...new Set(routes)])
    }
  })

  it('alquileres lleva las otras búsquedas de vivienda y las guías de antes de alquilar', () => {
    const nav = familiaNavParaRuta('/alquileres-uruguay')!
    expect(nav.grupos.map(grupo => grupo.labelKey)).toEqual([
      'familiaNav.grupos.vivienda',
      'familiaNav.grupos.antesDeAlquilar',
    ])
    expect(todas(nav)).toEqual(
      expect.arrayContaining([
        '/venta-viviendas-uruguay',
        '/inmobiliarias-uruguay',
        '/alquiler-ideal-uruguay',
        '/fletes-mudanzas-uruguay',
        '/alquilar-en-uruguay',
      ])
    )
    expect(familiaNavTotal(nav)).toBe(todas(nav).length)
  })

  it('los grupos son los mismos en cada página de cada familia', () => {
    for (const entry of DIRECTORIOS) {
      const grupos = familiaNavParaRuta(entry.to)?.grupos
      if (!grupos) continue
      for (const page of rutas(entry.to))
        expect(familiaNavParaRuta(page)!.grupos, page).toEqual(grupos)
    }
  })

  // Lo que venta, autos y tarjetas listaban arriba del título, cada una por su cuenta (2026-09-21).
  it('venta, autos y tarjetas llevan como grupo lo que sus páginas listaban arriba', () => {
    const venta = familiaNavParaRuta('/venta-viviendas-uruguay')!
    expect(todas(venta)).toEqual(
      expect.arrayContaining([
        '/alquileres-uruguay',
        '/oportunidades-inmobiliarias-uruguay',
        '/comprar-o-alquilar-uruguay',
        '/barrios-alquileres-uruguay',
      ])
    )
    // Desde la venta, las oportunidades son las de COMPRA.
    const oportunidades = venta.grupos
      .flatMap(grupo => grupo.items)
      .find(item => item.to === '/oportunidades-inmobiliarias-uruguay')!
    expect(oportunidades.query).toEqual({ operation: 'sale' })

    expect(todas(familiaNavParaRuta('/autos-usados-uruguay')!)).toContain(
      '/comprar-auto-con-deuda-uruguay'
    )
    expect(todas(familiaNavParaRuta('/tarjetas-de-credito-uruguay')!)).toEqual(
      expect.arrayContaining([
        '/tarjetas-de-debito-uruguay',
        '/mejores-bancos-uruguay',
        '/tarjetas-de-socio-uruguay',
        '/pagar-cuentas-con-tarjeta',
      ])
    )
  })

  it('familiaNavRutas devuelve todo lo que enlaza la barra, o nada si no hay barra', () => {
    const nav = familiaNavParaRuta('/alquileres-uruguay')!
    expect(familiaNavRutas('/alquileres-uruguay')).toEqual(todas(nav))
    expect(familiaNavRutas('/privacidad')).toEqual([])
  })

  // Un grupo enlaza, no da pertenencia: la venta de viviendas conserva su propia barra y la guía
  // no dibuja la de alquileres.
  it('una ruta de un grupo no pasa a ser de la familia', () => {
    expect(rutas('/venta-viviendas-uruguay')[0]).toBe('/venta-viviendas-uruguay')
    expect(familiaNavParaRuta('/alquilar-en-uruguay')).toBeNull()
  })

  it('cada título y cada etiqueta propia existe en los tres idiomas', () => {
    const keys = new Set<string>()
    for (const entry of DIRECTORIOS)
      for (const grupo of familiaNavParaRuta(entry.to)?.grupos ?? []) {
        keys.add(grupo.labelKey)
        for (const item of grupo.items) if (item.labelKey) keys.add(item.labelKey)
      }
    for (const [locale, messages] of Object.entries({ es, en, pt }))
      for (const key of keys) {
        let node: unknown = messages
        for (const part of key.split('.'))
          node = (node as Record<string, unknown> | undefined)?.[part]
        expect(typeof node, `${locale} ${key}`).toBe('string')
      }
  })
})
