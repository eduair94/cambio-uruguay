import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  COOP_FAQ,
  COOP_INCOME_CAPS,
  COOP_MAX_UR,
  COOP_PATH,
  COOP_REQUIREMENTS,
  COOP_SOURCES,
  COOP_STEPS,
  COOP_TITLE,
  COOP_UNPUBLISHED,
  COOP_VERIFIED_AT,
  coopAgreedCaps,
  coopCapInPesos,
  coopDescription,
  coopDisputedCaps,
} from '../../utils/housingCooperatives'

/**
 * El catálogo de `/cooperativas-de-vivienda-uruguay`.
 *
 * Lo que se vigila acá no es que el archivo compile: es que las dos cifras que la página AFIRMA
 * sigan siendo las que dicen las fichas del MVOT, y que la contradicción entre esas dos fichas no
 * se "arregle" sola en un commit futuro eligiendo una. Si el MVOT corrige su tabla, este test
 * tiene que fallar y obligar a volver a leer las dos fuentes, no dejar pasar el cambio en
 * silencio.
 */
const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'cooperativas-de-vivienda-uruguay.vue'),
  'utf8'
)

describe('el tope de ingresos es exactamente el de las dos fichas del MVOT', () => {
  it('tiene las cinco filas, de 1 a 5 integrantes', () => {
    expect(COOP_INCOME_CAPS.map(cap => cap.members)).toEqual([1, 2, 3, 4, 5])
  })

  it('transcribe la tabla del Programa Cooperativas', () => {
    expect(COOP_INCOME_CAPS.map(cap => cap.programaUr)).toEqual([60, 66, 72, 84, 96])
  })

  it('transcribe la tabla del esquema general de ingresos', () => {
    expect(COOP_INCOME_CAPS.map(cap => cap.esquemaUr)).toEqual([40, 60, 72, 84, 96])
  })

  // El corazón de la página: de tres integrantes para arriba las dos fichas dicen lo mismo y la
  // cifra se puede afirmar; abajo no, y se publican las dos.
  it('separa las filas que coinciden de las que el Estado se contradice', () => {
    expect(coopAgreedCaps().map(cap => cap.members)).toEqual([3, 4, 5])
    expect(coopDisputedCaps().map(cap => cap.members)).toEqual([1, 2])
  })

  it('el techo del programa son 96 UR', () => {
    expect(COOP_MAX_UR).toBe(96)
  })
})

describe('la conversión a pesos no publica una cifra que no puede sostener', () => {
  it('multiplica por el valor de la UR del día', () => {
    const cap = COOP_INCOME_CAPS[4]!
    expect(coopCapInPesos(cap, 2000)).toEqual({ low: 192000, high: 192000 })
  })

  it('devuelve el rango completo cuando las dos fichas discrepan', () => {
    expect(coopCapInPesos(COOP_INCOME_CAPS[0]!, 2000)).toEqual({ low: 80000, high: 120000 })
  })

  // Sin lectura de la UR no hay peso: una página que imprime "$ 0" o una cifra vieja rotulada
  // "hoy" miente con más autoridad que una que no imprime nada.
  it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'no inventa un peso con una UR de %s',
    value => {
      expect(coopCapInPesos(COOP_INCOME_CAPS[4]!, value as number | null)).toBeNull()
    }
  )
})

describe('las dos variantes de la descripción entran en el SERP', () => {
  const MAX_DESCRIPTION = 155

  it('la variante sin UR entra y nombra las tres filas afirmables', () => {
    const text = coopDescription(null)
    expect(text.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
    expect(text).toContain('72, 84, 96 UR')
  })

  // Se mide con una UR muy por encima de la de hoy: un presupuesto que sólo entra mientras la UR
  // aguante no es un presupuesto. Es la misma regla que `seoTitleBudget` aplica a la portada.
  it.each([1500, 2100, 3500, 9999, 99999])('la variante viva entra con la UR en %s', ur => {
    const text = coopDescription(ur)
    expect(text.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
    expect(text).toContain('96 UR')
    expect(text).toContain('$ ')
  })

  it('el título entra en los 60 caracteres con la marca', () => {
    expect(`${COOP_TITLE} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
  })
})

describe('la página publica lo que el catálogo declara', () => {
  // El canonical se arma con la constante, así que lo que se verifica es que la página use ESA
  // constante y el host propio: una copia a mano del path podría quedarse vieja en un renombrado.
  it('declara su propia ruta como canonical absoluto', () => {
    expect(COOP_PATH).toBe('/cooperativas-de-vivienda-uruguay')
    expect(PAGE).toContain('https://cambio-uruguay.com${COOP_PATH}')
    expect(PAGE).toContain("rel: 'canonical'")
  })

  it('lleva un único h1', () => {
    expect(PAGE.match(/<h1\b/g) ?? []).toHaveLength(1)
  })

  it('emite BreadcrumbList y FAQPage', () => {
    expect(PAGE).toContain('BreadcrumbList')
    expect(PAGE).toContain('FAQPage')
  })

  // El motivo por el que la página existe: si alguien borra el bloque de lo que NO se publica,
  // la página pasa a parecerse a cualquier resumen y la honestidad deja de estar a la vista.
  it('dibuja los cuatro datos que deliberadamente no publica', () => {
    expect(COOP_UNPUBLISHED).toHaveLength(4)
    expect(COOP_UNPUBLISHED.map(item => item.id)).toContain('aporte')
    for (const item of COOP_UNPUBLISHED) expect(item.why.length).toBeGreaterThan(40)
    expect(PAGE).toContain('unpublished')
  })
})

describe('cada afirmación tiene una fuente oficial detrás', () => {
  it('las tres fichas son de gub.uy', () => {
    expect(COOP_SOURCES).toHaveLength(3)
    for (const source of COOP_SOURCES) expect(source.url).toMatch(/^https:\/\/www\.gub\.uy\//)
  })

  it('la fecha de cotejo es una fecha ISO', () => {
    expect(COOP_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('los requisitos y los pasos no quedan vacíos', () => {
    expect(COOP_REQUIREMENTS.length).toBeGreaterThanOrEqual(6)
    expect(COOP_STEPS.length).toBeGreaterThanOrEqual(7)
    for (const step of COOP_STEPS) expect(step.who.length).toBeGreaterThan(0)
  })

  it('las preguntas frecuentes se responden con cifras y no con generalidades', () => {
    expect(COOP_FAQ.length).toBeGreaterThanOrEqual(5)
    expect(COOP_FAQ.some(faq => /96 UR/.test(faq.answer))).toBe(true)
  })
})
