import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  PYME_DISCOUNT,
  TRADEMARK_FEES,
  TRADEMARK_GRACE_MONTHS,
  TRADEMARK_NON_USE_YEARS,
  TRADEMARK_NOT_CHARGED,
  TRADEMARK_OPPOSITION_DAYS,
  TRADEMARK_PATH,
  TRADEMARK_RENEWAL_WINDOW_MONTHS,
  TRADEMARK_SOURCES,
  TRADEMARK_TERM_YEARS,
  TRADEMARK_UI_VALUE,
  TRADEMARK_UI_VALUE_AT,
  TRADEMARK_VERIFIED_AT,
  trademarkFeeUi,
  trademarkFeeUyu,
  trademarkQuote,
  uiToUyu,
} from '../../utils/trademarkRegistry'

/**
 * La tabla de la DNPI de noviembre de 2026, copiada a mano de la publicación oficial.
 *
 * ES EL CONTROL, y por eso está escrita acá y no calculada: el módulo guarda la cifra en UI —que es
 * la que fija el artículo 99 de la Ley 17.011 en la redacción del artículo 392 de la Ley 18.719— y
 * multiplica por el valor de la UI del encabezado. Si esa multiplicación no reprodujera peso por
 * peso lo que cobra la ventanilla, la página publicaría una cifra nuestra con cara de cifra
 * oficial, que es exactamente lo que este repositorio no hace. Reproducir las dieciséis filas con
 * un solo redondeo es también la prueba de que el valor de UI anotado es el correcto: con otro, las
 * dieciséis fallan a la vez.
 */
const TABLA_OFICIAL_NOVIEMBRE_2026: Record<string, number> = {
  'solicitud-denominativa': 7494.12,
  'solicitud-denominativa-extra': 4496.47,
  'solicitud-mixta': 10491.77,
  'solicitud-mixta-extra': 5995.3,
  titulo: 2997.65,
  'renovacion-denominativa': 7494.12,
  'renovacion-mixta': 10491.77,
  'renovacion-gracia': 22482.37,
  oposicion: 10491.77,
  transferencia: 7494.12,
  'cambio-nombre': 2997.65,
  'cambio-domicilio': 2997.65,
  cancelacion: 8992.93,
  anulacion: 8992.95,
  certificado: 3747.06,
  'matricula-agente': 74941.23,
}

describe('las tasas de marcas reproducen la tabla oficial', () => {
  it('convierte cada fila al peso que publica la DNPI', () => {
    const mal: string[] = []
    for (const fee of TRADEMARK_FEES) {
      const esperado = TABLA_OFICIAL_NOVIEMBRE_2026[fee.id]
      expect(esperado, `falta el control de ${fee.id}`).toBeTypeOf('number')
      const calculado = trademarkFeeUyu(fee.id)
      if (calculado !== esperado) mal.push(`${fee.id}: ${calculado} ≠ ${esperado}`)
    }
    expect(mal, mal.join('\n')).toEqual([])
  })

  it('no declara una fila que la tabla no tenga, ni al revés', () => {
    expect(TRADEMARK_FEES.map(fee => fee.id).sort()).toEqual(
      Object.keys(TABLA_OFICIAL_NOVIEMBRE_2026).sort()
    )
  })

  it('usa el valor de la UI que la propia tabla declara en su encabezado', () => {
    expect(TRADEMARK_UI_VALUE).toBe(6.685)
    expect(TRADEMARK_UI_VALUE_AT).toBe('2026-11-01')
  })

  it('tiene identificadores únicos y ninguna cifra en cero', () => {
    const ids = TRADEMARK_FEES.map(fee => fee.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const fee of TRADEMARK_FEES) expect(fee.ui, fee.id).toBeGreaterThan(0)
  })
})

/**
 * Las tres proporciones que la página AFIRMA con la palabra «exacto».
 *
 * Están medidas sobre las cifras en UI y no sobre los pesos a propósito: en pesos el redondeo a dos
 * decimales las rompe —la renovación en gracia da 22.482,37 y el triple de 7.494,12 da 22.482,36—,
 * así que una página que dijera «el triple» mirando los pesos estaría diciendo algo falso por un
 * centavo. La proporción es de la ley; el peso es una conversión.
 */
describe('las proporciones que la página afirma', () => {
  // La tabla imprime la cifra en UI con cinco decimales, así que una proporción exacta de la ley
  // vuelve con hasta 1e-5 UI de diferencia (la renovación en gracia dice 3.363,10675 y el triple de
  // 1.121,03558 da 3.363,10674). La tolerancia es de 1e-4 UI, que son 0,00067 pesos: sobra para el
  // redondeo de la imprenta y no alcanza para tapar un cambio de tasa.
  const casi = (a: number, b: number) => Math.abs(a - b) < 1e-4

  it('la marca con logo cuesta 40 % más que la denominativa', () => {
    expect(
      casi(trademarkFeeUi('solicitud-mixta'), trademarkFeeUi('solicitud-denominativa') * 1.4)
    ).toBe(true)
  })

  it('la clase adicional denominativa es el 60 % de la primera', () => {
    expect(
      casi(
        trademarkFeeUi('solicitud-denominativa-extra'),
        trademarkFeeUi('solicitud-denominativa') * 0.6
      )
    ).toBe(true)
  })

  it('renovar en el plazo de gracia cuesta el triple que renovar en plazo', () => {
    expect(
      casi(trademarkFeeUi('renovacion-gracia'), trademarkFeeUi('renovacion-denominativa') * 3)
    ).toBe(true)
  })
})

describe('la suma de tasas de un registro', () => {
  it('cobra la primera clase y las adicionales por separado', () => {
    const una = trademarkQuote({ kind: 'denominativa', classes: 1 })
    expect(una.extraClassesUi).toBe(0)
    expect(una.totalUyu).toBe(7494.12)

    const tres = trademarkQuote({ kind: 'denominativa', classes: 3 })
    expect(tres.extraClassesUi).toBe(trademarkFeeUi('solicitud-denominativa-extra') * 2)
    expect(tres.totalUyu).toBe(uiToUyu(1121.03558 + 672.62135 * 2))
  })

  it('cambia la tasa unitaria cuando la marca lleva logo', () => {
    expect(trademarkQuote({ kind: 'mixta', classes: 1 }).totalUyu).toBe(10491.77)
    expect(trademarkQuote({ kind: 'mixta', classes: 2 }).extraClassesUi).toBe(896.828466)
  })

  it('suma el título sólo cuando se pide, y nunca le aplica el descuento Pyme', () => {
    const sin = trademarkQuote({ kind: 'denominativa', classes: 1 })
    const con = trademarkQuote({ kind: 'denominativa', classes: 1, withTitle: true })
    expect(sin.titleUi).toBe(0)
    expect(con.titleUi).toBe(trademarkFeeUi('titulo'))
    expect(con.totalUyu).toBe(uiToUyu(1121.03558 + 448.414233))

    const pyme = trademarkQuote({ kind: 'denominativa', classes: 1, withTitle: true, pyme: true })
    expect(pyme.pymeDiscountUi).toBe(1121.03558 * PYME_DISCOUNT)
    // El título entero más el 20 % de la solicitud: el descuento no lo toca.
    expect(pyme.totalUyu).toBe(uiToUyu(1121.03558 * 0.2 + 448.414233))
  })

  it('descuenta el 80 % de la solicitud, clases adicionales incluidas', () => {
    const pyme = trademarkQuote({ kind: 'mixta', classes: 2, pyme: true })
    const registro = 1569.44982 + 896.828466
    expect(pyme.pymeDiscountUi).toBe(registro * 0.8)
    expect(pyme.totalUi).toBeCloseTo(registro * 0.2, 6)
  })

  it('no hay marca sin clase: cero, vacío o basura cuentan como una', () => {
    for (const classes of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(trademarkQuote({ kind: 'denominativa', classes }).classes, String(classes)).toBe(1)
    }
    expect(trademarkQuote({ kind: 'denominativa', classes: 2.9 }).classes).toBe(2)
  })
})

describe('los plazos salen de la Ley 17.011', () => {
  it('son los de los artículos 18, 19 y 23', () => {
    expect(TRADEMARK_TERM_YEARS).toBe(10)
    expect(TRADEMARK_RENEWAL_WINDOW_MONTHS).toBe(6)
    expect(TRADEMARK_GRACE_MONTHS).toBe(6)
    expect(TRADEMARK_OPPOSITION_DAYS).toBe(30)
    expect(TRADEMARK_NON_USE_YEARS).toBe(5)
  })
})

describe('las fuentes y lo que ya no se cobra', () => {
  const PERMITIDOS = ['gub.uy', 'impo.com.uy']

  it('cada fuente es oficial y va por https', () => {
    expect(TRADEMARK_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const source of TRADEMARK_SOURCES) {
      expect(source.url.startsWith('https://'), source.url).toBe(true)
      const host = new URL(source.url).hostname
      expect(
        PERMITIDOS.some(dominio => host === dominio || host.endsWith(`.${dominio}`)),
        source.url
      ).toBe(true)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('nombra la norma que sacó cada tasa que ya no se cobra', () => {
    expect(TRADEMARK_NOT_CHARGED).toHaveLength(2)
    expect(TRADEMARK_NOT_CHARGED[0]!.detail).toContain('Ley 19.670')
    expect(TRADEMARK_NOT_CHARGED[1]!.detail).toContain('circular 3/2018')
  })

  it('fecha el día en que se abrieron', () => {
    expect(TRADEMARK_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

/**
 * Que el snippet no se despegue de la tabla.
 *
 * El título y la descripción van como literales EN la página, porque es la forma que leen
 * `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts` sin ejecutar la app. El costo de esa
 * decisión es que una cifra escrita a mano puede quedar atrás de la tabla sin que nada avise, y
 * esto es lo que lo evita: las dos cifras del snippet se recalculan acá desde el catálogo.
 */
describe('la descripción de la página dice las cifras del catálogo', () => {
  const page = readFileSync(
    join(__dirname, '..', '..', 'pages', 'registrar-una-marca-uruguay.vue'),
    'utf8'
  )
  // Miles con punto, armado a mano: `toLocaleString` depende del ICU con el que corre Node y
  // acá lo que se compara es el texto exacto que la página imprime.
  const miles = (n: number) =>
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  it('imprime la tasa denominativa y la mixta al peso redondeado', () => {
    const description = /const description =\s*'([^']+)'/.exec(page)?.[1]
    expect(description, 'no encontré la descripción literal').toBeTruthy()
    expect(description!.length).toBeLessThanOrEqual(155)
    expect(description).toContain(miles(trademarkFeeUyu('solicitud-denominativa')))
    expect(description).toContain(miles(trademarkFeeUyu('solicitud-mixta')))
  })

  it('declara la ruta del catálogo como canónica', () => {
    expect(page).toContain('TRADEMARK_PATH')
    expect(TRADEMARK_PATH).toBe('/registrar-una-marca-uruguay')
  })
})
