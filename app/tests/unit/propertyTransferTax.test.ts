import { describe, expect, it } from 'vitest'

import {
  IRPF_CAPITAL_RATE,
  IRPF_CRITERIA,
  IRPF_FICTO_CUTOFF,
  IRPF_FICTO_EFFECTIVE_RATE,
  IRPF_FICTO_SHARE,
  IRPF_HOME_EXEMPTION,
  ITP_BUYER_RATE,
  ITP_DEADLINES,
  ITP_EXEMPTIONS,
  ITP_FAQ,
  ITP_FORMS,
  ITP_HEIR_DIRECT_RATE,
  ITP_OTHER_RATE,
  ITP_PATH,
  ITP_RATES,
  ITP_SELLER_RATE,
  ITP_SOURCES,
  ITP_UNPUBLISHED,
  ITP_VERIFIED_AT,
  irpfFictoAmount,
  itpAmount,
  itpBreakdown,
  itpTaxableBase,
} from '../../utils/propertyTransferTax'

describe('las tasas son las del artículo 7º del Título 19', () => {
  // Los cuatro números del artículo, escritos acá para que un cambio de cualquiera de ellos tenga
  // que pasar por este archivo: son los únicos datos de la página que no se pueden derivar.
  it('fija 2 % y 2 % para las partes de un negocio oneroso', () => {
    expect(ITP_SELLER_RATE).toBe(2)
    expect(ITP_BUYER_RATE).toBe(2)
  })

  it('fija 3 % en línea recta y 4 % para los demás contribuyentes', () => {
    expect(ITP_HEIR_DIRECT_RATE).toBe(3)
    expect(ITP_OTHER_RATE).toBe(4)
  })

  it('publica una fila por tasa, con su tasa real', () => {
    expect(ITP_RATES.map(rate => rate.rate)).toEqual([2, 2, 3, 4])
    for (const rate of ITP_RATES) {
      expect(rate.who.length, rate.id).toBeGreaterThan(0)
      expect(rate.when.length, rate.id).toBeGreaterThan(0)
    }
  })

  it('no repite un id entre las filas', () => {
    expect(new Set(ITP_RATES.map(rate => rate.id)).size).toBe(ITP_RATES.length)
  })
})

/**
 * El corazón de la página. El artículo 5º, literal A), fija la base en el valor real de Catastro
 * actualizado por IPC y usa el precio sólo como TECHO: «Si esa actualización determinare un valor
 * mayor que el precio establecido […] el monto imponible, en tales casos, será dicho precio».
 *
 * Es la regla que la página existe para contar, así que los dos lados del `min` van medidos: el
 * caso normal (se vende por encima del valor catastral y manda el catastral) y el caso del techo
 * (se vende por debajo y manda el precio). Una implementación que hubiera leído el artículo al
 * revés —base = precio, con el valor catastral como piso— pasa cualquier test que mida un solo
 * lado.
 */
describe('la base del ITP es el valor catastral, con el precio como techo', () => {
  it('en una venta por encima del valor catastral, la base es el valor catastral', () => {
    expect(itpTaxableBase(3_000_000, 5_200_000)).toBe(3_000_000)
  })

  it('en una venta por debajo del valor catastral, la base es el precio', () => {
    expect(itpTaxableBase(3_000_000, 2_400_000)).toBe(2_400_000)
  })

  it('con precio igual al valor catastral da lo mismo por los dos lados', () => {
    expect(itpTaxableBase(3_000_000, 3_000_000)).toBe(3_000_000)
  })

  // Una transmisión por causa de muerte no tiene precio: no hay techo que aplicar.
  it('sin precio, la base es el valor catastral actualizado', () => {
    expect(itpTaxableBase(3_000_000, null)).toBe(3_000_000)
  })

  // Un cero en un formulario es «no lo escribí», no «se regaló»: la misma regla que los gastos
  // comunes de Mercado Libre. Un cero no puede volver cero el impuesto de una escritura.
  it('un precio en cero o negativo no achica la base', () => {
    expect(itpTaxableBase(3_000_000, 0)).toBe(3_000_000)
    expect(itpTaxableBase(3_000_000, -1)).toBe(3_000_000)
  })

  it('sin valor catastral no inventa una base', () => {
    expect(itpTaxableBase(0, 5_200_000)).toBe(0)
    expect(itpTaxableBase(Number.NaN, 5_200_000)).toBe(0)
  })
})

describe('el impuesto de cada parte', () => {
  it('es la base por la tasa', () => {
    expect(itpAmount(3_000_000, 2)).toBe(60_000)
    expect(itpAmount(3_000_000, 3)).toBe(90_000)
  })

  it('no devuelve nada ante una base o una tasa que no se pueden usar', () => {
    expect(itpAmount(0, 2)).toBe(0)
    expect(itpAmount(3_000_000, 0)).toBe(0)
    expect(itpAmount(Number.NaN, 2)).toBe(0)
  })

  it('reparte las dos puntas de una compraventa y las suma', () => {
    const breakdown = itpBreakdown(3_000_000, 5_200_000)
    expect(breakdown.base).toBe(3_000_000)
    expect(breakdown.seller).toBe(60_000)
    expect(breakdown.buyer).toBe(60_000)
    expect(breakdown.total).toBe(120_000)
    expect(breakdown.priceCapped).toBe(false)
  })

  it('avisa cuando el techo del precio fue el que mandó', () => {
    const breakdown = itpBreakdown(3_000_000, 2_400_000)
    expect(breakdown.base).toBe(2_400_000)
    expect(breakdown.seller).toBe(48_000)
    expect(breakdown.priceCapped).toBe(true)
  })

  it('no marca el techo cuando no hay precio ni cuando el precio es cero', () => {
    expect(itpBreakdown(3_000_000, null).priceCapped).toBe(false)
    expect(itpBreakdown(3_000_000, 0).priceCapped).toBe(false)
  })

  it('sin valor catastral no publica ningún monto', () => {
    const breakdown = itpBreakdown(0, 5_200_000)
    expect(breakdown).toEqual({ base: 0, priceCapped: false, seller: 0, buyer: 0, total: 0 })
  })
})

describe('el IRPF del vendedor es otro impuesto, con otra base', () => {
  it('usa la tasa del 12 % y el ficto del 15 % de la ficha de la DGI', () => {
    expect(IRPF_CAPITAL_RATE).toBe(12)
    expect(IRPF_FICTO_SHARE).toBe(15)
  })

  // El 1,8 % que la página imprime no se escribe a mano: sale de los dos números de arriba, así
  // que no puede quedar desincronizado de la ficha.
  it('deriva el 1,8 % efectivo del ficto en vez de escribirlo', () => {
    expect(IRPF_FICTO_EFFECTIVE_RATE).toBeCloseTo(1.8, 10)
    expect(irpfFictoAmount(5_200_000)).toBeCloseTo(93_600, 6)
  })

  it('no inventa un impuesto sin un monto con el que calcularlo', () => {
    expect(irpfFictoAmount(0)).toBe(0)
    expect(irpfFictoAmount(Number.NaN)).toBe(0)
  })

  it('fecha el corte del ficto en la vigencia del IRPF', () => {
    expect(IRPF_FICTO_CUTOFF).toBe('2007-07-01')
  })

  it('declara los dos criterios, y que el real es el único posterior al corte', () => {
    expect(IRPF_CRITERIA.map(criterion => criterion.id)).toEqual(['ficto', 'real'])
    const real = IRPF_CRITERIA.find(criterion => criterion.id === 'real')
    expect(real?.eligibility).toContain('2007')
  })

  // Los topes van en UI porque la ficha de la DGI los declara en UI: un equivalente en pesos
  // congelado en el código envejece en un mes.
  it('guarda los topes de la exoneración de vivienda en UI y no en pesos', () => {
    expect(IRPF_HOME_EXEMPTION.soldMaxUi).toBe(1_200_000)
    expect(IRPF_HOME_EXEMPTION.boughtMaxUi).toBe(1_800_000)
    expect(IRPF_HOME_EXEMPTION.reinvestedSharePercent).toBe(50)
    expect(IRPF_HOME_EXEMPTION.monthsBetween).toBe(12)
  })
})

describe('plazos, trámite y exoneraciones', () => {
  it('publica los cuatro plazos de la ficha de la DGI', () => {
    expect(ITP_DEADLINES).toHaveLength(4)
    const compraventa = ITP_DEADLINES.find(row => row.id === 'compraventa')
    expect(compraventa?.deadline).toContain('15 días corridos')
    const sucesion = ITP_DEADLINES.find(row => row.id === 'sucesion')
    expect(sucesion?.deadline).toContain('1 año')
  })

  it('nombra los formularios y el código de pago', () => {
    expect(ITP_FORMS.urban).toBe('1700')
    expect(ITP_FORMS.rural).toBe('1701')
    expect(ITP_FORMS.paymentCode).toBe('680')
  })

  /**
   * La lista de exoneraciones importa por lo que NO dice. La pregunta que trae a la página es
   * «exoneración por primera vivienda» y la respuesta es que en el régimen general no existe: si
   * alguien agrega una fila que la afirme, este test la encuentra.
   */
  it('no afirma una exoneración por primera vivienda o vivienda única', () => {
    const text = ITP_EXEMPTIONS.map(item => `${item.label} ${item.detail}`)
      .join(' ')
      .toLowerCase()
    expect(text).not.toContain('primera vivienda')
    expect(text).not.toContain('vivienda única')
  })

  it('declara qué no se publica y por qué, con los honorarios del escribano entre ellos', () => {
    expect(ITP_UNPUBLISHED.some(item => item.id === 'honorarios')).toBe(true)
    for (const item of ITP_UNPUBLISHED) {
      expect(item.what.length, item.id).toBeGreaterThan(0)
      expect(item.why.length, item.id).toBeGreaterThan(0)
    }
  })
})

describe('la página se puede sostener con lo que cita', () => {
  // Ninguna cifra legal de esta página puede ir sin una fuente real: es la regla del repo, y acá
  // se mide que las cuatro fuentes sean de los dominios que valen para normativa uruguaya.
  it('cita sólo fuentes oficiales uruguayas', () => {
    expect(ITP_SOURCES.length).toBeGreaterThanOrEqual(4)
    for (const source of ITP_SOURCES) {
      expect(source.url, source.label).toMatch(/^https:\/\/(www\.impo\.com\.uy|www\.gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(0)
    }
  })

  it('cita el Título 19 y la ficha de IRPF de la DGI, que son las dos mitades de la página', () => {
    const urls = ITP_SOURCES.map(source => source.url).join(' ')
    expect(urls).toContain('todgi-2023/19-2024')
    expect(urls).toContain('irpf-incrementos-patrimoniales-inmuebles-urbanos')
  })

  it('tiene preguntas con respuesta, para el FAQPage', () => {
    expect(ITP_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const faq of ITP_FAQ) {
      expect(faq.question.endsWith('?'), faq.question).toBe(true)
      expect(faq.answer.length, faq.question).toBeGreaterThan(80)
    }
  })

  it('declara su ruta y la fecha en que se cotejó', () => {
    expect(ITP_PATH).toBe('/impuesto-a-las-trasmisiones-patrimoniales-uruguay')
    expect(ITP_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
