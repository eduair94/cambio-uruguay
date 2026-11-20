import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import { getGuide } from '../../utils/guides'
import {
  SHEIN_CART_EXAMPLES_USD,
  SHEIN_FREE_SHIPPING_OVER_USD,
  SHEIN_PROCESSING_DAYS,
  SHEIN_STD_SHIPPING_USD,
  SHEIN_STD_TRANSIT_DAYS,
  sheinCartExample,
  sheinUsd,
} from '../../utils/guidesPrimavera2026'
import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  LAST_RESEARCHED,
  POSTAL_IVA_MIN_USD,
  SIMPLIFIED_RATE_PCT,
} from '../../utils/importRules'
import { courierImport } from '../../utils/importTax'

const g = getGuide('comprar-en-shein-desde-uruguay')!

/** Todo lo que el lector ve: títulos, prosa, tablas, pasos y FAQ. */
const text = () =>
  [
    g.title,
    g.description,
    ...g.sections.flatMap(s => [s.heading, s.body, ...(s.table?.rows.flat() ?? [])]),
    ...(g.steps ?? []).map(s => `${s.name} ${s.text}`),
    ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
  ].join('\n')

/** Cada bloque que se lee como una unidad: una sección, un paso o una respuesta. */
const blocks = () => [
  ...g.sections.map(s => `${s.heading}\n${s.body}\n${(s.table?.rows.flat() ?? []).join(' ')}`),
  ...(g.steps ?? []).map(s => `${s.name}\n${s.text}`),
  ...(g.faqs ?? []).map(f => `${f.q}\n${f.a}`),
]

const section = (heading: RegExp) => {
  const s = g.sections.find(x => heading.test(x.heading))
  expect(s, `falta la sección ${heading}`).toBeDefined()
  return s!
}

const linksOf = (heading: RegExp) => (section(heading).links ?? []).map(l => l.to)

describe('guía de comprar en Shein desde Uruguay', () => {
  it('existe con su slug, su fecha y un snippet que entra en el SERP', () => {
    expect(g).toBeDefined()
    expect(g.slug).toBe('comprar-en-shein-desde-uruguay')
    expect(g.updatedAt).toBe('2026-11-20')
    expect(g.tag).toBe('IMPORTAR')
    expect(g.title.length).toBeLessThanOrEqual(43)
    expect(`${g.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(155)
    // El dato va adelante: la respuesta a "¿Shein envía a Uruguay?" abre la descripción.
    expect(g.description).toMatch(/^Shein envía directo a Uruguay/)
  })

  it('publica el envío que Shein muestra para Uruguay, y nada que no muestre', () => {
    const table = section(/Shein envía a Uruguay/).table!
    expect(table.headers).toHaveLength(2)
    expect(table.rows.length).toBeGreaterThanOrEqual(5)
    for (const row of table.rows) expect(row).toHaveLength(2)
    const cells = table.rows.flat().join(' ')
    for (const dato of ['Envío estándar', '1 a 3 días', '8 a 13 días laborables', 'US$ 12,90'])
      expect(cells).toContain(dato)
    expect(cells).toMatch(/más de US\$ 79/)
    // Shein no lista un envío exprés para Uruguay ni una fecha de entrega fija: no se inventan.
    expect(text()).not.toMatch(/env[ií]o expr[eé]s/i)
    expect(text()).not.toMatch(/US\$ 12[.,]90 .{0,40}exprés/i)
  })

  it('dice cómo comprobarlo en el checkout y con qué fecha lo leyó', () => {
    expect(section(/Cómo comprobarlo/).body).toMatch(/checkout/)
    expect(section(/Cómo comprobarlo/).body).toMatch(/no podés escribir tu dirección/)
    expect(text()).toContain('20 de noviembre de 2026')
    expect(text()).not.toContain('21 de octubre de 2026')
    const filas = section(/Shein envía a Uruguay/).table!.rows.map(r => r[0])
    expect(filas).toContain('Mínimo de compra')
    expect(filas).toContain('Leído por última vez')
  })

  it('separa cómo llega de cuánto se paga: las cifras del régimen viven en un bloque y su FAQ', () => {
    // El 22 % y el mínimo de US$ 20 van en «Cuánto pagás» (prosa + tabla) y la FAQ de impuestos
    // los repite porque su texto no sale en el HTML del servidor. En ningún otro bloque.
    const conTasa = blocks().filter(b => b.includes('22 %'))
    expect(conTasa).toHaveLength(2)
    expect(conTasa[0]).toMatch(/^Cuánto pagás/)
    expect(conTasa[1]).toMatch(/^¿Cuánto pago de impuestos/)
    const conPiso = blocks().filter(b => b.includes(`US$ ${POSTAL_IVA_MIN_USD} `))
    expect(conPiso).toHaveLength(2)
    expect(conPiso[0]).toMatch(/^Cuánto pagás/)
    expect(conPiso[1]).toMatch(/^¿Cuánto pago de impuestos/)
    // El cupo anual no se repite: se enlaza.
    expect(text()).not.toContain('US$ 800')
  })

  it('la tabla de pedidos sale de courierImport() con el envío que publica Shein', () => {
    const table = section(/Cuánto pagás/).table!
    expect(table.headers).toEqual([
      'Ropa en el carrito',
      'Envío de Shein',
      'IVA con franquicia',
      'Total con franquicia',
      `Total sin cupo (${SIMPLIFIED_RATE_PCT} %)`,
    ])
    expect(table.rows).toHaveLength(SHEIN_CART_EXAMPLES_USD.length)
    const today = new Date(`${LAST_RESEARCHED}T00:00:00Z`)
    SHEIN_CART_EXAMPLES_USD.forEach((cart, i) => {
      const shipping = cart > SHEIN_FREE_SHIPPING_OVER_USD ? 0 : SHEIN_STD_SHIPPING_USD
      const input = {
        value: cart,
        sellerShipping: shipping,
        origin: 'other' as const,
        useFranchise: true,
        franchiseAvailable: FRANCHISE_ANNUAL_USD,
        ivaPct: URUGUAY.iva.basica,
        today,
      }
      const conCupo = courierImport({ ...input, shipmentsUsed: 0 })
      const sinCupo = courierImport({ ...input, shipmentsUsed: FRANCHISE_MAX_SHIPMENTS })
      expect(conCupo.regime).toBe('franquicia')
      expect(sinCupo.regime).toBe('simplificado')
      // El rótulo «(el mínimo)» sale de lo que cobró el motor, no de otra fórmula.
      const floor = conCupo.totalTax === POSTAL_IVA_MIN_USD
      expect(sheinCartExample(cart).ivaIsFloor).toBe(floor)
      expect(table.rows[i]).toEqual([
        sheinUsd(cart),
        shipping ? sheinUsd(shipping) : 'Gratis',
        floor ? `${sheinUsd(conCupo.totalTax)} (el mínimo)` : sheinUsd(conCupo.totalTax),
        sheinUsd(conCupo.landedCost),
        sheinUsd(sinCupo.landedCost),
      ])
    })
    // Las cifras de hoy, para que un cambio del motor o del envío de Shein se vea en el diff.
    expect(sheinCartExample(75).total).toBe(107.9)
    expect(sheinCartExample(80).total).toBe(100)
    expect(sheinCartExample(30).totalNoFranchise).toBe(68.64)
    const pagas = section(/Cuánto pagás/).body
    expect(pagas).toContain(`US$ ${POSTAL_IVA_MIN_USD}`)
    expect(pagas).toContain('US$ 90,90')
    expect(pagas).toContain('US$ 107,90')
    // El umbral es US$ 90,90 de factura, no el carrito de US$ 120 de la tabla.
    expect(pagas).not.toContain('Recién en US$ 120')
    expect(pagas).toContain('Por encima de US$ 90,90 de factura manda el 22 %')
  })

  it('formatea los dólares a la uruguaya', () => {
    expect(sheinUsd(62.9)).toBe('US$ 62,90')
    expect(sheinUsd(100)).toBe('US$ 100')
    expect(sheinUsd(68.64)).toBe('US$ 68,64')
    expect(sheinUsd(12.9)).toBe('US$ 12,90')
  })

  it('contesta cómo se compra: sitio, app, moneda, cuotas y que no hay local', () => {
    const s = section(/^Cómo comprar en Shein desde Uruguay/)
    expect(g.sections.indexOf(s)).toBe(1)
    for (const dato of ['shein.com', 'app', 'dólares', 'pesos uruguayos', 'cuotas', 'débito'])
      expect(s.body).toContain(dato)
    expect(s.body).toMatch(/mínimo de compra/)
    expect(s.body).toMatch(/Sobre nosotros/)
  })

  it('contesta cuánto demora, con la palabra que se busca y el total desde el pago', () => {
    const s = section(/demora/)
    expect(g.sections.indexOf(s)).toBe(2)
    const min = SHEIN_PROCESSING_DAYS[0] + SHEIN_STD_TRANSIT_DAYS[0]
    const max = SHEIN_PROCESSING_DAYS[1] + SHEIN_STD_TRANSIT_DAYS[1]
    // La frase del calendario («casi dos semanas … algo más de tres») está escrita para 9 y 16
    // días laborables: si Shein cambia su tabla y estas constantes, hay que reescribirla.
    expect(min).toBe(9)
    expect(max).toBe(16)
    expect(s.body).toContain('casi dos semanas como mínimo y algo más de tres como máximo')
    expect(s.body).toMatch(new RegExp(`^Entre ${min} y ${max} días laborables desde que pagás`))
    // Shein no dice si el plazo incluye la aduana: no se afirma ni que la incluye ni que no.
    expect(s.body).toContain('Shein no dice si ese plazo incluye el despacho en la Aduana')
    expect(text()).not.toMatch(/no cuenta (el paso por|el despacho en) la aduana/i)
    expect(s.body).toMatch(/48 horas/)
    expect(s.table!.rows.flat()).toEqual(
      expect.arrayContaining([`${min} días laborables`, `${max} días laborables`])
    )
    const faq = (g.faqs ?? []).find(f => /demora/.test(f.q))
    expect(faq?.q).toBe('¿Cuánto demora en llegar un pedido de Shein a Uruguay?')
    expect(faq?.a).toContain(`${min} y ${max} días laborables`)
  })

  it('dice qué pasa después de pagar sin nombrar una empresa que Shein no nombra', () => {
    const s = section(/^Después de pagar/)
    expect(s.body).toContain('(art. 9)')
    expect(s.body).toMatch(/cédula/)
    expect(s.body).toMatch(/17track/)
    expect(s.body).toMatch(/código de seguridad/)
    expect(linksOf(/^Después de pagar/)).toEqual([
      '/declarar-compra-exterior-uruguay',
      '/donde-te-entregan-el-paquete-uruguay',
    ])
    expect(text()).not.toMatch(/MailAmerica|\bUES\b/i)
    // Ninguna fuente dice que el número del operador sea el de Shein: se identifica por 17track.
    expect(s.body).not.toMatch(/número de envío sea el de/)
  })

  it('no concluye nada sobre el IVA de un pedido a un casillero de Miami', () => {
    const s = section(/Directo o por casillero/).body
    // Con una dirección de EE. UU. los términos redirigen al sitio de ese país, con otro vendedor.
    expect(s).toContain('Fashion Choice Pte. Ltd. (5.5)')
    expect(s).toMatch(/redirigir al sitio local/)
    expect(s).toContain('SHEIN Distribution Corporation')
    expect(text()).not.toMatch(/no la vuelve estadounidense|no te saca el IVA|tampoco te ahorra/)
    const urls = (g.sources ?? []).map(x => x.url)
    expect(urls).toContain('https://us.shein.com/Terms-and-Conditions-a-399.html')
  })

  it('el maquillaje se puede traer, por el régimen general y con despachante', () => {
    const faq = (g.faqs ?? []).find(f => /maquillaje/.test(f.q))!
    expect(faq.a).toMatch(/^Sí, pero no como un paquete común/)
    expect(faq.a).toMatch(/régimen general de importación/)
    expect(faq.a).toMatch(/despachante de aduana/)
    // La FAQ no sale en el HTML del servidor: la sección lo dice también.
    expect(section(/carrito/).body).toMatch(/despachante de aduana/)
  })

  it('un solo plazo para faltantes o daños: los cinco días de los términos', () => {
    const paso = (g.steps ?? []).find(s => /Revisá el paquete/.test(s.name))!
    expect(paso.text).toMatch(/5 días desde que lo recibiste/)
    expect(paso.text).not.toMatch(/te da 60 días/)
  })

  it('cita las normas que sostiene cada afirmación', () => {
    for (const norma of [
      'Decreto 50/026',
      '(art. 3)',
      '(art. 4)',
      '(art. 5)',
      '(art. 7)',
      '(art. 8)',
      'art. 10',
      'Ley 19.920',
      'Ley 17.250',
      'IMESI',
    ])
      expect(text()).toContain(norma)
  })

  it('publica los plazos de la política vigente de Shein, cada uno con su fecha de arranque', () => {
    const reclamos = section(/no llega/).body
    expect(reclamos).toMatch(/90 días desde la fecha de pago/)
    expect(reclamos).toMatch(/60 días desde la fecha de entrega/)
    expect(reclamos).toMatch(/180 días desde la fecha del pedido/)
    const devoluciones = section(/devoluciones/i).body
    expect(devoluciones).toMatch(/30 días posteriores a la recepción/)
    expect(devoluciones).toMatch(/autogestionada/)
    expect(devoluciones).toMatch(/no se reembolsa/)
  })

  it('enlaza la página que corresponde en cada sección que la nombra', () => {
    expect(linksOf(/Directo o por casillero/)).toEqual(
      expect.arrayContaining(['/envio-directo-o-casillero-uruguay', '/comparativas/couriers'])
    )
    expect(linksOf(/Cuánto pagás/)).toEqual(
      expect.arrayContaining([
        '/impuesto-temu-uruguay',
        '/guias/impuesto-temu-uruguay',
        '/herramientas/calculadora-impuestos-importacion',
      ])
    )
    expect(linksOf(/franquicias te quedan/)).toContain('/franquicia-aduana-uruguay')
    expect(linksOf(/no llega/)).toContain('/derechos-consumidor-compras-online')
    expect(linksOf(/carrito/)).toContain('/importar')
    expect(linksOf(/Es seguro/)).toContain('/tiendas-online-uruguay/shein')
  })

  it('tiene forma de guía: secciones, pasos, preguntas, fuentes y relacionadas', () => {
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(12)
    expect(g.steps?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.faqs?.length ?? 0).toBeLessThanOrEqual(13)
    const preguntas = (g.faqs ?? []).map(f => f.q)
    expect(preguntas).toContain('¿Shein envía a Uruguay?')
    expect(preguntas).toContain('¿Es seguro comprar en Shein desde Uruguay?')
    for (const q of [
      '¿Cómo se compra en Shein desde Uruguay?',
      '¿Cuánto pago de impuestos por un pedido de Shein?',
      '¿Los precios de Shein son en dólares o en pesos?',
      '¿Por qué me piden la cédula después de comprar en Shein?',
      '¿Hay una tienda de Shein en Uruguay?',
      '¿Se puede traer maquillaje de Shein a Uruguay?',
    ])
      expect(preguntas).toContain(q)

    const related = (g.related ?? []).map(r => r.to)
    expect(related.length).toBeGreaterThanOrEqual(3)
    expect(related.length).toBeLessThanOrEqual(6)
    for (const to of [
      '/impuesto-temu-uruguay',
      '/guias/impuesto-temu-uruguay',
      '/franquicia-aduana-uruguay',
      '/envio-directo-o-casillero-uruguay',
    ])
      expect(related).toContain(to)
  })

  it('cada fuente es https y las de Shein y la norma están', () => {
    const urls = (g.sources ?? []).map(s => s.url)
    expect(urls.length).toBeGreaterThanOrEqual(8)
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
    expect(urls).toContain('https://www.shein.com/Shipping-Info-a-280.html')
    expect(urls).toContain('https://www.shein.com/Return-Policy-a-281.html')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/50-2026')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/19920-2020/50')
    expect(urls).toContain('https://www.shein.com/Terms-and-Conditions-a-399.html')
    expect(urls).toContain('https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/')
    expect(urls).toContain('https://www.shein.com/faq/detail?id=57507')
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('es prosa plana en español uruguayo y sin promesas', () => {
    expect(text()).not.toMatch(/\*\*|^#|^\s*[-•] /m)
    expect(text()).not.toMatch(/septiembre/i)
    expect(text()).not.toMatch(/\bel mejor\b|garantizad/i)
  })
})
