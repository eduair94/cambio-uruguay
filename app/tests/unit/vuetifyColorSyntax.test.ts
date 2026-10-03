import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'
import { describe, expect, it } from 'vitest'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Vuetify guarda sus colores como "r,g,b" (con comas): `rgba(var(--v-theme-primary), 0.4)` es válido,
 * pero la sintaxis moderna con barra, `rgb(var(--v-border-color) / 0.18)`, se expande a
 * `rgb(255,255,255 / 0.18)` — inválida — y el navegador descarta la declaración entera sin avisar.
 * Así estuvo el borde de PriceHistoryBlock: nunca se pintó y su relleno quedaba como una sangría
 * invisible en la ficha de alquiler (medido el 2026-10-03).
 */
const SLASH_ALPHA_ON_VUETIFY_VAR = /rgba?\(\s*var\(--v-[\w-]+(?:\s*,[^)]*)?\)\s*\//

const files = await glob('{pages,components,layouts,assets}/**/*.{vue,css,scss}', {
  cwd: appRoot,
  absolute: true,
})

describe('Vuetify color variables are never used with slash alpha', () => {
  it('recognizes the broken form and accepts the comma form', () => {
    expect('border: 1px solid rgb(var(--v-border-color) / 0.18);').toMatch(
      SLASH_ALPHA_ON_VUETIFY_VAR
    )
    expect('color: rgb(var(--v-theme-primary, 0 0 0) / 0.5)').toMatch(SLASH_ALPHA_ON_VUETIFY_VAR)
    expect('border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));').not.toMatch(
      SLASH_ALPHA_ON_VUETIFY_VAR
    )
  })

  it('finds files to check', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('no stylesheet uses it', () => {
    const offenders = files.filter(file =>
      SLASH_ALPHA_ON_VUETIFY_VAR.test(readFileSync(file, 'utf8'))
    )
    expect(offenders.map(file => relative(appRoot, file))).toEqual([])
  })
})
