// El mapa de alquileres y el filtro que comparte con la lista.
//
// Dos cosas que este test cuida, y las dos son defectos que el sitio ya tuvo en otras familias:
//
//  1. UN SOLO armado de filtro. Si el mapa armara el suyo, un filtro aplicado en la lista y no en
//     el mapa daría un mapa que muestra propiedades que la lista no lista — la misma clase de
//     contradicción que la home tuvo entre su meta description y su propio FAQ.
//  2. Los puntos NO viajan en el payload del SSR. Son hasta 3.000, y esta página se usa sobre todo
//     como lista: meterlos en el HTML le cobraría a todos el peso de una vista que abren algunos.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildRentalFilter, normalizeRentalQuery } from '../../utils/rentals'

const APP = join(__dirname, '..', '..')
const pagina = readFileSync(join(APP, 'pages', 'alquileres-uruguay.vue'), 'utf8')
const mapa = readFileSync(join(APP, 'server', 'api', 'rentals', 'mapa.get.ts'), 'utf8')
const lista = readFileSync(join(APP, 'server', 'api', 'rentals', 'index.get.ts'), 'utf8')

describe('el filtro es uno solo', () => {
  it('las dos rutas lo piden a la misma función', () => {
    expect(mapa).toContain('buildRentalFilter(query, STALE_DAYS)')
    expect(lista).toContain('buildRentalFilter(query, STALE_DAYS)')
  })

  it('la lista ya no arma el suyo a mano', () => {
    expect(lista).not.toContain('nonLocation.propertyType = query.type')
  })

  it('los dos usan la misma ventana de frescura', () => {
    const ventana = (src: string) => /const STALE_DAYS = (\d+)/.exec(src)?.[1]
    expect(ventana(mapa)).toBe(ventana(lista))
  })
})

describe('buildRentalFilter', () => {
  const q = (over: Record<string, unknown> = {}) => normalizeRentalQuery(over)

  it('siempre excluye lo que dejó de publicarse', () => {
    const { filter } = buildRentalFilter(q(), 10)
    expect(filter.lastSeen).toBeTruthy()
  })

  it('el departamento entra en el filtro pero NO en el de las facetas', () => {
    // Contar el facet de departamento con el departamento aplicado dejaría "1" al lado de todos
    // los demás.
    const { filter, nonLocation } = buildRentalFilter(q({ department: 'Montevideo' }), 10)
    expect(filter.department).toBe('Montevideo')
    expect(nonLocation.department).toBeUndefined()
  })

  it('el filtro de varios portales mira la segunda fuente', () => {
    const { filter } = buildRentalFilter(q({ multi: '1' }), 10)
    expect(filter['sources.1']).toEqual({ $exists: true })
  })

  it('escapa lo que el usuario escribe, para que un paréntesis no rompa la consulta', () => {
    const { filter } = buildRentalFilter(q({ q: 'pocitos (frente)' }), 10)
    const or = filter.$or as Array<{ title: RegExp }>
    expect(or[0]!.title.source).toContain(String.raw`\(`)
    expect(() => new RegExp(or[0]!.title.source)).not.toThrow()
  })
})

describe('la página no manda los puntos en el SSR', () => {
  it('el mapa se pide sólo cuando alguien lo abre', () => {
    const at = pagina.indexOf("'rentals-map'")
    expect(at).toBeGreaterThan(-1)
    const bloque = pagina.slice(at, at + 400)
    expect(bloque).toContain('server: false')
    expect(bloque).toContain('immediate: false')
  })

  it('sigue los filtros una vez abierto', () => {
    const at = pagina.indexOf("'rentals-map'")
    expect(pagina.slice(at, at + 400)).toContain('watch: [requestParams]')
  })

  it('reutiliza LocationsMap en vez de escribir otro mapa', () => {
    expect(pagina).toContain('<LocationsMap')
    expect(pagina).toContain(':popup-for="rentalPopup"')
  })
})

describe('lo que el mapa no puede mostrar, lo dice', () => {
  it('la respuesta separa el total de las que tienen coordenada', () => {
    expect(mapa).toContain('located: locatedCount')
    expect(mapa).toContain('shown: points.length')
  })

  it('la página avisa cuándo hay propiedades sin ubicación', () => {
    expect(pagina).toContain('mapData.located < mapData.total')
    expect(pagina).toContain('sólo aparece en la lista')
  })

  it('descarta el 0,0 que los feeds usan como nulo', () => {
    // Cae en el Golfo de Guinea y arrastraría el encuadre del mapa a África.
    expect(mapa).toContain('lat === 0 && lng === 0')
  })
})
