import { describe, expect, it } from 'vitest'
import { directorioAnalisisParaRuta } from '../../utils/directorioAnalisis'
import { DIRECTORIOS } from '../../utils/directorios'
import {
  TEMA_HUBS,
  TEMA_VECINOS_MAX_GRUPOS,
  TEMA_VECINOS_MAX_LINKS,
  temasDeRuta,
  temaVecinosParaRuta,
  temaVecinosRutas,
} from '../../utils/temaVecinos'

const linksOf = (path: string, exclude: readonly string[] = []) =>
  temaVecinosParaRuta(path, exclude).flatMap(grupo => grupo.links.map(link => link.to))

describe('"Más sobre este tema"', () => {
  it('el tope de páginas alcanza para el tema más grande: si recortara, dejaría de ser recíproco', () => {
    const largest = Math.max(...TEMA_HUBS.map(hub => hub.resources.length))
    expect(TEMA_VECINOS_MAX_LINKS).toBeGreaterThanOrEqual(largest - 1)
  })

  // Una página de datos que perteneciera a más temas de los que el bloque muestra perdería el
  // vínculo con los que quedan afuera.
  it('ninguna página de datos pertenece a más temas de los que el bloque muestra', () => {
    const dataRoutes = new Set(
      DIRECTORIOS.flatMap(entry => [
        entry.to,
        ...(entry.tambien ?? []).map(link => link.to),
        ...(entry.analisis ?? []),
      ])
    )
    for (const route of dataRoutes)
      expect(temasDeRuta(route).length, route).toBeLessThanOrEqual(TEMA_VECINOS_MAX_GRUPOS)
  })

  it('es recíproco: dentro de un tema, cada página lleva a las demás', () => {
    for (const hub of TEMA_HUBS) {
      const members = hub.resources.map(resource => resource.to)
      for (const page of members) {
        // Sólo las páginas cuyo bloque muestra este tema (una genérica en muchos temas muestra dos).
        if (!temaVecinosParaRuta(page).some(grupo => grupo.hub.slug === hub.slug)) continue
        const out = new Set(linksOf(page))
        for (const other of members)
          if (other !== page) expect(out, `${page} → ${other}`).toContain(other)
      }
    }
  })

  it('las evoluciones de precio se enlazan entre sí y con los históricos', () => {
    const evoluciones = [
      '/evolucion-precio-alquileres-uruguay',
      '/evolucion-precio-viviendas-uruguay',
      '/evolucion-precio-autos-usados-uruguay',
      '/historico',
      '/precio-de-la-nafta-uruguay',
    ]
    for (const page of evoluciones) {
      const out = new Set(linksOf(page))
      for (const other of evoluciones)
        if (other !== page) expect(out, `${page} → ${other}`).toContain(other)
    }
  })

  it('un directorio lleva a su tema, y su tema a sus análisis', () => {
    const [grupo] = temaVecinosParaRuta('/autos-usados-uruguay')
    expect(grupo?.hub.slug).toBe('comprar-y-mantener-auto-uruguay')
    expect(grupo?.links.map(link => link.to)).toContain('/mercado-de-autos-usados-uruguay')
  })

  it('primero el tema del propio mercado, después "economía y mercado"', () => {
    expect(
      temaVecinosParaRuta('/evolucion-precio-alquileres-uruguay').map(g => g.hub.slug)
    ).toEqual(['alquiler-y-vivienda-uruguay', 'economia-y-mercado-uruguay'])
    expect(
      temaVecinosParaRuta('/evolucion-precio-autos-usados-uruguay').map(g => g.hub.slug)[0]
    ).toBe('comprar-y-mantener-auto-uruguay')
  })

  it('las páginas de datos van primero dentro del tema', () => {
    const [grupo] = temaVecinosParaRuta('/alquilar-en-uruguay')
    expect(grupo?.links[0]?.to).toBe('/alquileres-uruguay')
  })

  it('una guía y un término encuentran su tema y las páginas del tema', () => {
    const guide = TEMA_HUBS.find(hub => hub.slug === 'alquiler-y-vivienda-uruguay')!.guides[0]!
    expect(temaVecinosParaRuta(`/guias/${guide}`).map(g => g.hub.slug)).toContain(
      'alquiler-y-vivienda-uruguay'
    )
    const term = temaVecinosParaRuta('/glosario/brecha-cambiaria')
    expect(term.map(g => g.hub.slug)).toContain('dolar-y-casas-de-cambio-uruguay')
    expect(term.flatMap(g => g.links.map(l => l.to))).toContain('/cotizaciones-de-la-region')
    // Un término no se lista a sí mismo.
    expect(term.flatMap(g => g.terms.map(t => t.slug))).not.toContain('brecha-cambiaria')
  })

  it('las páginas de un tema listan sus términos', () => {
    const [grupo] = temaVecinosParaRuta('/dolar-hoy')
    expect(grupo?.terms.map(term => term.slug)).toContain('spread-cambiario')
  })

  it('no repite lo que ya mostró el bloque de directorios, ni se repite entre dos temas', () => {
    const route = '/evolucion-precio-alquileres-uruguay'
    const directory = directorioAnalisisParaRuta(route)?.links.map(link => link.to) ?? []
    expect(directory.length).toBeGreaterThan(0)
    const shown = linksOf(route, directory)
    for (const to of directory) expect(shown).not.toContain(to)
    expect(new Set(shown).size).toBe(shown.length)
  })

  it('en el propio tema no se dibuja (la página del tema ya lista todo) y fuera de un tema tampoco', () => {
    expect(temaVecinosParaRuta('/temas/alquiler-y-vivienda-uruguay')).toEqual([])
    expect(temaVecinosParaRuta('/temas')).toEqual([])
    expect(temaVecinosParaRuta('/privacidad')).toEqual([])
  })

  it('reconoce la ruta con prefijo de idioma', () => {
    expect(temaVecinosParaRuta('/en/autos-usados-uruguay').map(g => g.hub.slug)).toContain(
      'comprar-y-mantener-auto-uruguay'
    )
  })

  it('las rutas para "Seguí leyendo" incluyen el tema, sus páginas y sus términos', () => {
    const rutas = temaVecinosRutas('/dolar-hoy')
    expect(rutas).toContain('/temas/dolar-y-casas-de-cambio-uruguay')
    expect(rutas).toContain('/historico')
    expect(rutas).toContain('/glosario/spread-cambiario')
  })
})
