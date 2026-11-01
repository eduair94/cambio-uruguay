import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BANKOS_BANKS } from '../../utils/bankos'
import { titleFits } from '../../utils/liveRateSeo'

/**
 * El título de /descuentos-con-tarjeta-uruguay/<emisor> lleva cuántos comercios tiene hoy.
 *
 * Dos candidatos ("… comercios adheridos" y "… comercios") y el título fijo de respaldo. Lo que
 * importa es que al menos el corto entre en 60 con la marca para TODOS los emisores, aun con cuatro
 * cifras: si no, ese emisor volvería en silencio al título fijo.
 */
const WORST_COUNT = '9.999'

describe('título vivo de los descuentos por emisor', () => {
  for (const bank of BANKOS_BANKS) {
    it(`${bank.name}: el candidato corto entra con ${WORST_COUNT} comercios`, () => {
      expect(titleFits(`Descuentos ${bank.name}: ${WORST_COUNT} comercios`)).toBe(true)
    })
  }

  it('la página arma el título con pickTitle y vuelve al fijo sin lectura', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'pages', 'descuentos-con-tarjeta-uruguay', '[banco].vue'),
      'utf8'
    )
    expect(source).toContain('`Descuentos ${name}: ${n} comercios adheridos`')
    expect(source).toContain('`Descuentos ${name}: ${n} comercios`')
    expect(source).toMatch(/if \(!brands \|\| !name\) return fallback/)
    expect(source).toContain('title: () => `${seoTitle.value} | Cambio Uruguay`')
  })
})
