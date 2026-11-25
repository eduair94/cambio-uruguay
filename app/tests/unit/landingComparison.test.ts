import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PRESELECTED_COMPARISONS,
  adsHeldByLanding,
  landedComparisonPath,
  tabLandingUrl,
} from '../../utils/landingComparison'
import { CAR_COMPARISON_PATH } from '../../utils/carComparison'
import { MOTO_COMPARE_PATH } from '../../utils/motos'

// Una pestaña que ARRANCA en un comparador con el aviso ya elegido: la granja de 23–25/11/2026
// (342 de 1.196 sesiones de Clarity, una página, cero toques). La misma regla deja a Clarity sin
// grabar la pestaña y a AdSense sin cargar mientras siga en el comparador.

describe('landedComparisonPath', () => {
  it('names the comparator a tab landed on with a listing picked, in any locale', () => {
    expect(
      landedComparisonPath(
        'https://cambio-uruguay.com/en/autos-usados-uruguay/comparar?autos=ml-MLU703495291'
      )
    ).toBe('/autos-usados-uruguay/comparar')
    expect(landedComparisonPath('/autos-usados-uruguay/comparar?autos=fb-1')).toBe(
      '/autos-usados-uruguay/comparar'
    )
    expect(landedComparisonPath('/pt/motos-usadas-uruguay/comparar?motos=ml-MLU1')).toBe(
      '/motos-usadas-uruguay/comparar'
    )
  })

  it('is null for the empty comparator, an empty parameter and every other page', () => {
    expect(landedComparisonPath('/autos-usados-uruguay/comparar')).toBeNull()
    expect(landedComparisonPath('/autos-usados-uruguay/comparar?autos=%20')).toBeNull()
    // The parameter of the other comparator does not pick anything here.
    expect(landedComparisonPath('/autos-usados-uruguay/comparar?motos=ml-MLU1')).toBeNull()
    expect(landedComparisonPath('/autos-usados-uruguay/ml-MLU703495291')).toBeNull()
    expect(landedComparisonPath('/comparar?autos=ml-MLU1')).toBeNull()
    expect(landedComparisonPath('')).toBeNull()
    expect(landedComparisonPath(undefined)).toBeNull()
    expect(landedComparisonPath(42)).toBeNull()
  })

  it('names the same comparator paths as the pages', () => {
    expect(PRESELECTED_COMPARISONS).toEqual([
      [CAR_COMPARISON_PATH, 'autos'],
      [MOTO_COMPARE_PATH, 'motos'],
    ])
  })
})

describe('adsHeldByLanding', () => {
  const landed = '/autos-usados-uruguay/comparar'

  it('holds the ads while the tab stays on that comparator, whatever the locale or listing', () => {
    expect(adsHeldByLanding(landed, '/en/autos-usados-uruguay/comparar')).toBe(true)
    expect(adsHeldByLanding(landed, '/autos-usados-uruguay/comparar/')).toBe(true)
    expect(adsHeldByLanding(landed, '/pt/autos-usados-uruguay/comparar?autos=ml-MLU2')).toBe(true)
  })

  it('lets them go anywhere else, and never holds without a landing', () => {
    expect(adsHeldByLanding(landed, '/autos-usados-uruguay')).toBe(false)
    expect(adsHeldByLanding(landed, '/motos-usadas-uruguay/comparar')).toBe(false)
    expect(adsHeldByLanding(null, '/autos-usados-uruguay/comparar')).toBe(false)
    expect(adsHeldByLanding(undefined, '/autos-usados-uruguay/comparar')).toBe(false)
  })
})

describe('tabLandingUrl', () => {
  it('answers nothing on the server', () => {
    expect(tabLandingUrl()).toBe('')
  })
})

describe('app.vue', () => {
  it('remembers the landing before it lets the loader in, in the same onNuxtReady', () => {
    const source = readFileSync(resolve(__dirname, '../../app.vue'), 'utf8')
    expect(source).toMatch(
      /onNuxtReady\(\(\) => \{[^}]*rememberLanding\(tabLandingUrl\(\)\)\s*hydrated\.value = true\s*\}\)/
    )
  })
})
