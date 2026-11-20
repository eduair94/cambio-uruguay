// La respuesta en el snippet de cinco páginas de contenido que Google muestra en la primera página
// (posición 5 a 10) y que casi no recibían clics (GSC, 1–28/10/2026): la pensión a la vejez, la
// asignación familiar, la liquidación por renuncia, las comisiones de Mercado Pago y los peajes.
// La consulta de las cinco pide un número o un plazo, y ese número estaba en el cuerpo y no en el
// título.
//
// Lo que este archivo vigila es que el número del snippet sea el MISMO que imprime el cuerpo. Los
// títulos (y cuatro de las cinco descripciones) son literales dentro del `.vue` porque es la única
// forma que `seoTitleBudget` y `seoDescriptionBudget` saben leer sin ejecutar la app, y un literal
// no se entera cuando cambia la constante de la que salió: el BPS reajusta en enero, el MTOP en
// junio y diciembre, Mercado Pago cuando quiere. Mismo patrón que `seasonalRental.test.ts`. El día
// que alguien actualice una constante y no el título, esto se pone en rojo en vez de publicar dos
// cifras distintas en la misma página.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  ASIGNACION_FAMILIAR_VIGENCIA,
  COMPARACION,
  EQUIDAD_BASE,
  FRANJAS_CONTRIBUTIVAS,
} from '../../utils/asignacionFamiliar'
import { formatUYU } from '../../utils/format'
import { MP_FEES, feeForSale } from '../../utils/mercadoPagoFees'
import { AGE_REQUIREMENT, AMOUNT_2026, PENSION_SNIPPET_DESCRIPTION } from '../../utils/pensionVejez'
import { PLAZO_EXIGIBILIDAD_DIAS, RECARGO_POR_MORA } from '../../utils/renuncia'
import {
  TOLL_CAR_CATEGORY_ID,
  TOLL_CATEGORIES,
  TOLL_EXEMPTIONS,
  TOLL_PLAZAS,
  suciveSurchargePct,
} from '../../utils/tolls'

const MAX_TITLE = 60
const MAX_DESCRIPTION = 155

const pageSource = (file: string) =>
  readFileSync(join(__dirname, '..', '..', 'pages', file), 'utf8')

/** El literal de un `const <name> = '…'` del nivel superior del `<script setup>`. */
function pageLiteral(source: string, name: string): string {
  const match = source.match(new RegExp(`\\nconst ${name} =\\s*\\n?\\s*'((?:[^'\\\\]|\\\\.)*)'`))
  if (!match) throw new Error(`no se pudo leer el literal \`${name}\` de la página`)
  return match[1]!
}

/** Espejo del titleTemplate de app.vue (ver `seoTitleBudget.test.ts`). */
const withBrand = (title: string) => `${title} | Cambio Uruguay`

/** Como lo escribe la prosa del sitio: punto de miles, coma decimal y centavos sólo si los hay. */
const num = (n: number) =>
  n.toLocaleString('es-UY', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })

/** `formatUYU` separa el signo con un espacio duro; el literal, con uno común. */
const plain = (text: string) => text.replace(/\u00A0/g, ' ')

function expectFitsTheSerp(title: string, description: string) {
  expect(withBrand(title).length, withBrand(title)).toBeLessThanOrEqual(MAX_TITLE)
  expect(description.length, description).toBeLessThanOrEqual(MAX_DESCRIPTION)
}

describe('/pension-a-la-vejez-uruguay', () => {
  const source = pageSource('pension-a-la-vejez-uruguay.vue')
  const title = pageLiteral(source, 'title')
  const amount = plain(formatUYU(AMOUNT_2026, 0))

  it('el título publica el monto de la constante que imprime la tarjeta "Monto 2026"', () => {
    expect(title).toContain(amount)
    expect(title).toContain('2026')
  })

  it('la descripción se arma con las constantes, no con una copia', () => {
    expect(source).toContain('const description = PENSION_SNIPPET_DESCRIPTION')
    const description = plain(PENSION_SNIPPET_DESCRIPTION)
    expect(description.startsWith(`El BPS paga ${amount} por mes`)).toBe(true)
    expect(description).toContain(`${AGE_REQUIREMENT.base} años`)
    expect(description).toContain(`${AGE_REQUIREMENT.caregiverFrom} con cuidados`)
    expect(description).toContain('MIDES')
  })

  it('entra en el SERP', () => {
    expectFitsTheSerp(title, PENSION_SNIPPET_DESCRIPTION)
  })
})

describe('/asignacion-familiar-uruguay', () => {
  const source = pageSource('asignacion-familiar-uruguay.vue')
  const title = pageLiteral(source, 'title')
  const description = pageLiteral(source, 'description')
  const [alta, baja] = FRANJAS_CONTRIBUTIVAS.map(franja => `$ ${num(franja.montoMensual)}`)
  const equidad = `$ ${num(EQUIDAD_BASE)}`

  it('el título nombra el monto alto de la contributiva y el del Plan de Equidad', () => {
    expect(title).toContain(alta)
    expect(title).toContain(equidad)
  })

  it('la descripción trae las dos franjas, el Plan de Equidad y la vigencia', () => {
    expect(description).toContain(alta)
    expect(description).toContain(baja)
    expect(description).toContain(equidad)
    expect(description).toContain(ASIGNACION_FAMILIAR_VIGENCIA)
  })

  it('la edad tope de la descripción es la que la comparación publica para los dos regímenes', () => {
    expect(description).toContain('Hasta los 18 si estudia')
    const edad = COMPARACION.find(fila => fila.key === 'edad')!
    expect(edad.contributiva).toContain('18 cursando secundaria')
    expect(edad.equidad).toContain('18 cursando secundaria')
  })

  it('entra en el SERP', () => {
    expectFitsTheSerp(title, description)
  })
})

describe('/renunciar-al-trabajo-uruguay', () => {
  const source = pageSource('renunciar-al-trabajo-uruguay.vue')
  const title = pageLiteral(source, 'title')
  const description = pageLiteral(source, 'description')

  it('título y descripción dicen el plazo de la constante, en días corridos', () => {
    expect(title).toContain(`${PLAZO_EXIGIBILIDAD_DIAS} días`)
    expect(title.toLowerCase()).toContain('liquidación por renuncia')
    expect(description).toContain(`${PLAZO_EXIGIBILIDAD_DIAS} días corridos`)
  })

  it('el recargo de la descripción es el del art. 29 de la Ley 18.572', () => {
    expect(description).toContain(`${num(RECARGO_POR_MORA * 100)} %`)
    expect(description).toContain('18.572')
  })

  it('entra en el SERP', () => {
    expectFitsTheSerp(title, description)
  })
})

describe('/comisiones-mercado-pago-uruguay', () => {
  const source = pageSource('comisiones-mercado-pago-uruguay.vue')
  const title = pageLiteral(source, 'title')
  const description = pageLiteral(source, 'description')
  const pcts = MP_FEES.map(row => row.pct)
  const lowest = `${num(Math.min(...pcts))} %`
  const highest = `${num(Math.max(...pcts))} %`

  it('el rango del título es el mínimo y el máximo de la tabla', () => {
    expect(title).toContain(lowest)
    expect(title).toContain(highest)
    expect(description).toContain(lowest)
    expect(description).toContain(highest)
  })

  it('lo que queda de $ 1.000 por link es la cuenta de feeForSale, la misma de la tabla', () => {
    const link = MP_FEES.find(row => row.method === 'link' && row.release === 'instante')!
    const net = feeForSale(1000, link.pct)!.net
    expect(description).toContain(`de $ 1.000 te quedan $ ${num(net)} al instante`)
  })

  it('entra en el SERP', () => {
    expectFitsTheSerp(title, description)
  })
})

describe('/peajes-uruguay', () => {
  const source = pageSource('peajes-uruguay.vue')
  const title = pageLiteral(source, 'title')
  const description = pageLiteral(source, 'description')
  const car = TOLL_CATEGORIES.find(category => category.id === TOLL_CAR_CATEGORY_ID)!

  it('el título y la descripción publican la tarifa del auto con TAG', () => {
    expect(title).toContain(`$ ${num(car.telepeajeUyu)} con TAG`)
    expect(description).toContain(`$ ${num(car.telepeajeUyu)} con TAG`)
  })

  it('la descripción trae las tres tarifas, el recargo y los conteos de la página', () => {
    expect(description).toContain(`$ ${num(car.basicaUyu)} en la barrera`)
    expect(description).toContain(`$ ${num(car.suciveUyu)} por SUCIVE`)
    expect(description).toContain(`${Math.round(suciveSurchargePct(car))} % más`)
    expect(description).toContain(`${TOLL_PLAZAS.length} puestos`)
    expect(description).toContain(`${TOLL_CATEGORIES.length} categorías`)
  })

  it('"las motos no pagan" sale de la exoneración de los vehículos de porte menor', () => {
    expect(title).toContain('motos no pagan')
    expect(description).toContain('motos no pagan')
    const minor = TOLL_EXEMPTIONS.find(exemption => exemption.who.includes('porte menor'))
    expect(minor?.who).toContain('motos')
  })

  it('entra en el SERP', () => {
    expectFitsTheSerp(title, description)
  })
})
