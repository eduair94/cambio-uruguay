import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { formatCarUsd } from '../../utils/cars'
import { titleFits } from '../../utils/liveRateSeo'

/**
 * Las fichas de producto con la cifra de su descripción también en el título: autos por modelo
 * (mediana del año con más avisos), celulares (nuevo desde) y súper (mediana). Cada página arma
 * candidatos con `pickTitle` y vuelve al título sin cifra si ninguno entra; acá se fija que los
 * nombres reales más largos de cada familia entren con al menos un candidato.
 */
const page = (...parts: string[]) =>
  readFileSync(join(__dirname, '..', '..', 'pages', ...parts), 'utf8')

describe('precio en el título de las fichas', () => {
  it('autos: modelo, año y mediana', () => {
    const usd = formatCarUsd(18_900)
    expect(titleFits(`Volkswagen T-Cross 2020 usado: ${usd}`)).toBe(true)
    expect(titleFits(`Chevrolet Onix 2024 usado: ${formatCarUsd(14_395)}`)).toBe(true)
    // Un nombre largo cae al segundo candidato, sin "usado".
    expect(titleFits(`Mercedes-Benz Clase C 2018: ${formatCarUsd(125_000)}`)).toBe(true)
    const source = page('autos-usados-uruguay', 'precios', '[slug].vue')
    expect(source).toContain('if (!year || year.n < 5) return heading.value')
    expect(source).toContain('title: () => `${seoTitle.value} | Cambio Uruguay`')
  })

  it('celulares: el nombre sin la marca entra cuando con la marca no', () => {
    expect(titleFits('Apple iPhone 17 Pro Max 256 GB: desde $57.954')).toBe(false)
    expect(titleFits('iPhone 17 Pro Max 256 GB: desde $157.954')).toBe(true)
    expect(titleFits('Samsung Galaxy A16 128 GB: desde $7.829')).toBe(true)
    const source = page('celulares-uruguay', '[modelo].vue')
    expect(source).toContain('if (!headline.value) return title.value')
    expect(source).toContain('title: () => `${seoTitle.value} | Cambio Uruguay`')
  })

  it('súper: la mediana, nunca el mínimo (que incluye filas sospechosas y viejas)', () => {
    expect(titleFits('Gaseosa Coca Cola: $155 de mediana')).toBe(true)
    expect(titleFits('Carne picada vacuna Hasta 20 % de grasa: $379 de mediana')).toBe(false)
    const source = page('precio', '[slug].vue')
    const block = source.slice(source.indexOf('const seoTitle'), source.indexOf('useSeoMeta({'))
    expect(block).toContain('stats.value?.p50')
    expect(block).not.toMatch(/\.min\b/)
    expect(source).toContain('title: () => `${seoTitle.value} | Cambio Uruguay`')
  })
})
