import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rentalMessages } from '../../utils/rentalMessages'

// Las tres guías que contestan lo que frena un alquiler tienen que estar ARRIBA, no enlazadas y ya.
//
// Estaban enlazadas desde el directorio desde hacía meses. Medido en producción el 2026-09-20 a
// 390 px: el primer enlace a una guía aparecía a y=13.000 de una página de 22.717 px — quince
// pantallas de scroll. El lector se queda 349 s de media mirando avisos y nunca ve la respuesta a
// "¿qué garantía me van a pedir?".
//
// Por eso este test NO comprueba que los enlaces existan (eso ya era cierto y no alcanzaba):
// comprueba que estén dentro del `<header>`, antes del panel de filtros y de los resultados. Es la
// única propiedad que se puede romper sin que nada más se entere — mover el bloque treinta líneas
// abajo no rompe ningún otro test y deshace el cambio entero.
const source = readFileSync(resolve(__dirname, '../../pages/alquileres-uruguay.vue'), 'utf8')

const GUIDES = [
  '/alquilar-en-uruguay',
  '/alquilar-sin-recibo-de-sueldo',
  '/alquilar-estando-en-clearing',
]

describe('guías del encabezado del directorio de alquileres', () => {
  const headerStart = source.indexOf('<header class="rentals-head">')
  const headerEnd = source.indexOf('</header>')
  const navStart = source.indexOf('<nav class="rentals-guides"')

  it('el encabezado existe y el bloque está adentro', () => {
    expect(headerStart).toBeGreaterThan(-1)
    expect(navStart).toBeGreaterThan(headerStart)
    expect(navStart).toBeLessThan(headerEnd)
  })

  it('el bloque va antes del panel de filtros y de los resultados', () => {
    const sidebar = source.indexOf('<aside class="rentals-sidebar"')
    expect(sidebar).toBeGreaterThan(-1)
    expect(navStart).toBeLessThan(sidebar)
  })

  it('apunta a las tres guías, por `headerGuides`', () => {
    const block = source.slice(
      source.indexOf('const headerGuides'),
      source.indexOf('const catalogBaseUrl')
    )
    for (const route of GUIDES) expect(block).toContain(route)
  })

  it('la etiqueta es la pregunta del lector, no el título de la guía', () => {
    // Si alguien reemplaza las preguntas por los títulos, el bloque se vuelve una segunda copia
    // del que ya estaba al pie y pierde el motivo por el que se subió.
    for (const locale of ['es', 'en', 'pt'] as const) {
      const m = rentalMessages[locale] as Record<string, string>
      for (const key of ['guideQ', 'independentQ', 'clearingQ']) {
        expect(typeof m[key]).toBe('string')
        expect(m[key]!.length).toBeGreaterThan(3)
      }
      expect(m.guideQ).not.toBe(m.guide)
      expect(m.independentQ).not.toBe(m.independent)
      expect(m.clearingQ).not.toBe(m.clearing)
      expect(typeof m.guidesLead).toBe('string')
    }
  })

  it('el bloque del pie sigue estando: esto suma un punto de entrada, no mueve el que había', () => {
    const footer = source.indexOf('v-for="link in relatedLinks"')
    expect(footer).toBeGreaterThan(headerEnd)
  })
})
