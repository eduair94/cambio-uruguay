// Las listas de autos ponen filtros y resultados en una grilla con celda fija, nunca en un VRow.
//
// Auto Ads inserta su `div.google-auto-placed` entre las dos columnas de un VRow: es un tercer hijo
// de ancho completo en una fila flex que envuelve, y los resultados caen debajo de los filtros
// (medido en producción el 2026-09-19: filtros en x=191, anuncio en y=1677, resultados en x=191
// y=1719). No se ve sin consentimiento de anuncios, así que ninguna medición local lo encuentra.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8')

const PAGES = [
  'pages/autos-usados-uruguay/index.vue',
  'pages/oportunidades-autos-usados-uruguay.vue',
  'pages/autos-chocados-y-con-deuda-uruguay.vue',
]

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
})
