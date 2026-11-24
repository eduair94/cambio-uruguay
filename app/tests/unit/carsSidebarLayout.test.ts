// Las listas de autos ponen filtros y resultados en una grilla con celda fija, nunca en un VRow.
//
// Auto Ads inserta su `div.google-auto-placed` entre las dos columnas de un VRow: es un tercer hijo
// de ancho completo en una fila flex que envuelve, y los resultados caen debajo de los filtros
// (medido en producción el 2026-09-19: filtros en x=191, anuncio en y=1677, resultados en x=191
// y=1719). No se ve sin consentimiento de anuncios, así que ninguna medición local lo encuentra.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8')

const PAGES = [
  'pages/autos-usados-uruguay/index.vue',
  'pages/oportunidades-autos-usados-uruguay.vue',
  'pages/autos-chocados-y-con-deuda-uruguay.vue',
]

// Todo lo que usa CarsSidebarLayout, no sólo autos: el hueco de la celda vacía era de todos. Se
// descubren solos, así una página nueva que adopte el layout entra al control sin tocar este test.
const CONSUMERS = ['pages', 'components']
  .flatMap(dir =>
    (readdirSync(join(ROOT, dir), { recursive: true }) as string[]).map(f => join(dir, f))
  )
  .map(f => f.replaceAll('\\', '/'))
  .filter(f => f.endsWith('.vue') && read(f).includes('<CarsSidebarLayout'))
  .sort()

describe('filtros y resultados de autos', () => {
  it.each(PAGES)('%s usa CarsSidebarLayout y no un VRow', page => {
    const source = read(page)
    expect(source).toMatch(
      /<CarsSidebarLayout>[\s\S]*<template #filters>[\s\S]*<\/CarsSidebarLayout>/
    )
    expect(source).not.toMatch(/<VRow\b/)
  })

  it('cada columna tiene su celda, así que lo que se inserte en el medio no las mueve', () => {
    const source = read('components/cars/SidebarLayout.vue')
    expect(source).toMatch(/\.cars-layout__filters \{\s*grid-column: 1;\s*grid-row: 1;/)
    expect(source).toMatch(/\.cars-layout__results \{\s*grid-column: 2;\s*grid-row: 1;/)
  })

  // En el celular la celda de filtros queda vacía (los filtros van en un cajón), y una celda vacía
  // sigue siendo una fila de la grilla: el `gap` le sumaba 24 px de aire muerto encima de la barra
  // de Filtros/orden en las siete páginas que usan el layout (2026-11-24, /computadoras-usadas-uruguay).
  it('la celda de filtros vacía no ocupa una fila ni cobra el gap', () => {
    const source = read('components/cars/SidebarLayout.vue')
    expect(source).toMatch(/\.cars-layout__filters:empty \{\s*display: none;/)
  })

  // Y la regla sólo sirve si la celda queda de verdad vacía: un consumidor que deje un nodo en la
  // celda en el celular (un wrapper, un `v-show`) vuelve a abrir el hueco sin que nada falle.
  it('encuentra a todos los que usan el layout', () => {
    expect(CONSUMERS).toEqual(expect.arrayContaining(PAGES))
    expect(CONSUMERS.length).toBeGreaterThanOrEqual(7)
  })

  it.each(CONSUMERS)('%s monta los filtros de la celda sólo fuera del celular', page => {
    const source = read(page)
    const slot = source.match(/<template #filters>([\s\S]*?)<\/template>/)
    expect(slot, 'sin <template #filters>').not.toBeNull()
    const body = slot![1]!.trim()
    // Un único elemento raíz, con `v-if="!smAndDown"`: nada más que pueda quedar en el celular.
    const root = body.match(/^<([A-Z]\w*)\s[^>]*?v-if="!smAndDown"/)
    expect(root, 'la celda no abre con un componente montado sólo fuera del celular').not.toBeNull()
    const tag = root![1]!
    const selfClosing = /^<[A-Z]\w*\s[^>]*?\/>$/.test(body)
    expect(selfClosing || body.endsWith(`</${tag}>`), 'hay algo más en la celda').toBe(true)
  })
})
