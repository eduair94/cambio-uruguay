import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LINK_AREAS, measurementLinkArea } from '../../utils/engagementMeasurement'

// Qué botón y qué bloque de las páginas de alquiler se usa (rent-12, rentals-voice-06). Antes no
// había ni un `data-cta` en la ficha y todo clic a otra ficha se leía como `content`.
//
// Dos reglas que un cambio futuro puede romper sin que falle nada más: el valor de un `data-cta`
// tiene que pasar el filtro del propio plugin (si no, el evento no sale, en silencio) y NUNCA puede
// llevar la clave ni la dirección de un aviso, que GA4 guardaría como texto.
const read = (file: string) => readFileSync(resolve(__dirname, '../..', file), 'utf8')
const ficha = read('pages/alquileres/[key].vue')
const directory = read('pages/alquileres-uruguay.vue')
const planner = read('components/rentals/BudgetPlanner.vue')
const plugin = read('plugins/track-clicks.client.ts')

const staticValues = (source: string, attribute: string) =>
  [...source.matchAll(new RegExp(`(?<![:\\w-])${attribute}="([^"]*)"`, 'g'))].map(
    match => match[1]!
  )
const boundValues = (source: string, attribute: string) =>
  [...source.matchAll(new RegExp(`:${attribute}="([^"]*)"`, 'g'))].map(match => match[1]!)

describe('rental click measurement', () => {
  it('uses the plugin’s own filter, so the values below are the ones it accepts', () => {
    expect(plugin).toContain('/^[\\w-]{1,80}$/.test(cta.dataset.cta')
  })

  it('names every ficha button it measures, with static values the plugin accepts', () => {
    const values = staticValues(ficha, 'data-cta')
    expect(values.sort()).toEqual(
      [
        'rental-contact-aside',
        'rental-contact-bar',
        'rental-contact-offer',
        'rental-copy-inquiry',
        'rental-favorite-aside',
        'rental-favorite-bar',
        'rental-favorite-head',
        'rental-map-toggle',
        'rental-presentation',
        'rental-share',
      ].sort()
    )
    for (const value of values) expect(value).toMatch(/^[\w-]{1,80}$/)
    // Nunca un valor armado con datos del aviso.
    expect(boundValues(ficha, 'data-cta')).toEqual([])
    // El planificador cuenta quién lo abre, no quién lo cierra.
    expect(boundValues(planner, 'data-cta')).toEqual(["open ? undefined : 'rental-budget-open'"])
  })

  it('names the directory’s offer, save and share buttons the same way', () => {
    const values = new Set(staticValues(directory, 'data-cta'))
    for (const value of ['rental-card-offer', 'rental-save-search', 'rental-share-search'])
      expect(values.has(value), value).toBe(true)
    for (const value of values) expect(value).toMatch(/^[\w-]{1,80}$/)
    // El único valor armado es el atajo de filtros: su clave es el nombre del filtro, no un aviso.
    expect(boundValues(directory, 'data-cta')).toEqual(['`rental-quick-${key}`'])
    expect(directory).toContain('v-for="key in quickFilters"')
  })

  it('marks the ficha’s link blocks with areas the tracker knows', () => {
    const areas = [
      ...staticValues(ficha, 'data-link-area'),
      ...boundValues(ficha, 'data-link-area').flatMap(expression =>
        [...expression.matchAll(/'([\w-]+)'/g)].map(match => match[1]!)
      ),
    ]
    expect(new Set(areas)).toEqual(
      new Set([
        'rental_gone',
        'rental_similar',
        'rental_insight',
        'rental_breadcrumb',
        'rental_barrio',
      ])
    )
    for (const area of areas) {
      expect(LINK_AREAS).toContain(area)
      expect(measurementLinkArea(area)).toBe(area)
    }
  })
})
