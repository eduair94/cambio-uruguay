// Toda ficha del directorio tiene que tener un origin ACTIVO detrás.
//
// `CASAS_REPUTATION` no es sólo contenido: es la fuente de los enlaces `/casa/<code>` que arman
// `CasasComparativa.vue` (en cuatro lugares) y `/mapa-del-sitio`. Y `/casa/<origin>` valida contra
// `/localData`, que se construye recorriendo las claves ACTIVAS de `classes/origins.ts`. O sea que
// una ficha cuya casa quedó comentada en `origins` produce enlaces internos a un 404.
//
// El repo ya venía cumpliendo el invariante sin escribirlo: las cinco casas deshabilitadas (aspen,
// vexel, velso, mas_cambio, salto_grande) no tienen ficha. El 2026-09-04 estuve por romperlo:
// deshabilité `cambio_sicurezza` —el BCU la marca "En proceso de Baja" y su sitio está borrado— y
// dejé su ficha, que habría sido la primera "ficha sin origin activo" del repo. Lo encontró la
// revisión adversarial del diagnóstico, no la suite.
//
// El test lee `classes/origins.ts` como TEXTO a propósito: es un archivo del backend (CommonJS, con
// 50 imports de scrapers que arrastran axios y cheerio) y esta suite es la del frontend. Lo único
// que necesita saber es qué claves están comentadas.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CASAS_REPUTATION } from '~/utils/casasDirectory'

const ORIGINS_SRC = readFileSync(join(__dirname, '..', '..', '..', 'classes', 'origins.ts'), 'utf8')

/** El bloque `export const origins = { ... }`, que es el registro que alimenta /localData. */
function originsBlock(): string {
  const start = ORIGINS_SRC.indexOf('export const origins')
  expect(start, 'no encontré `export const origins` en classes/origins.ts').toBeGreaterThan(-1)
  const end = ORIGINS_SRC.indexOf('\n};', start)
  return ORIGINS_SRC.slice(start, end)
}

/** Claves activas: las que NO están comentadas. */
function activeOrigins(): Set<string> {
  const active = new Set<string>()
  for (const line of originsBlock().split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue
    const match = trimmed.match(/^(\w+):/)
    if (match) active.add(match[1])
  }
  return active
}

describe('el directorio de casas y el registro de scrapers no pueden discrepar', () => {
  it('ninguna ficha apunta a una casa deshabilitada', () => {
    const active = activeOrigins()
    const huérfanas = CASAS_REPUTATION.filter(casa => !active.has(casa.code)).map(c => c.code)
    expect(
      huérfanas,
      `estas fichas generan enlaces /casa/<code> a un 404, porque su clave está comentada en classes/origins.ts: ${huérfanas.join(', ')}`
    ).toEqual([])
  })

  // Cordura del parser: si el bloque dejara de leerse bien, el test de arriba pasaría vacío y no
  // vigilaría nada.
  it('el lector de origins.ts encuentra un registro plausible', () => {
    const active = activeOrigins()
    expect(active.size).toBeGreaterThan(30)
    expect(active.has('brou')).toBe(true)
    // Las deshabilitadas del día en que se escribió esto, como prueba de que el filtro filtra.
    expect(active.has('cambio_sicurezza')).toBe(false)
    expect(active.has('aspen')).toBe(false)
  })
})
