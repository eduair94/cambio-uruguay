// Guardarraíl de /envio-directo-o-casillero-uruguay.
//
// La página existe para desmentir con norma el consejo más repetido del rubro ("mandalo a Estados
// Unidos"). El riesgo no es de render: es publicar un ahorro que no existe. Dos reglas que estos
// tests fijan y que son justamente las que se equivocan afuera:
//   1. el desvío por EE.UU. NO habilita la exoneración uruguaya (sigue al vendedor, no a la ruta);
//   2. el desvío por España mete IVA europeo DENTRO de la factura, y esa factura es la base
//      uruguaya — el impuesto se paga dos veces.
import { describe, expect, it } from 'vitest'

import { courierImport } from '../../utils/importTax'
import {
  DIRECT_STEPS,
  EU_VAT_ES_PCT,
  EU_VAT_IT_PCT,
  ROUTE_TRAITS,
  ROUTE_TRAPS,
  SHIPPING_ROUTES_FAQS,
  SHIPPING_ROUTES_SOURCES,
  SHIPPING_ROUTES_VERIFIED_AT,
  US_MPF_INFORMAL_USD,
  US_SECTION_301_EU_COMBINED_PCT,
  embeddedEuVat,
  shippingLegs,
  type ShipRoute,
} from '../../utils/shippingRoutes'

/** El caso testigo: reloj de USD 260, vendedor italiano con IVA, "free shipping". */
const CASO = {
  priceUsd: 260,
  sellerShippingUsd: 0,
  sellerRegion: 'ue' as const,
  sellerKind: 'empresa' as const,
  weightKg: 0.5,
  usaPerKgUsd: 17.5,
  euPerKgUsd: 21.5,
}

function byRoute(route: ShipRoute) {
  return shippingLegs(CASO).find(l => l.route === route)!
}

describe('el IVA europeo incrustado', () => {
  it('se extrae del precio, no se le suma (Directiva 98/6/CE art. 2.a)', () => {
    // 260 × 22/122 = 46,89. Si alguien lo calculara como 260 × 0,22 daría 57,20 y la página
    // publicaría un ahorro un 22% más grande del que existe.
    expect(embeddedEuVat(260, EU_VAT_IT_PCT)).toBeCloseTo(46.89, 2)
    expect(embeddedEuVat(260, EU_VAT_ES_PCT)).toBeCloseTo(45.12, 2)
  })

  it('la diferencia entre 21% y 22% es marginal frente a pagarlo o no', () => {
    const it22 = embeddedEuVat(260, EU_VAT_IT_PCT)
    const es21 = embeddedEuVat(260, EU_VAT_ES_PCT)
    expect(Math.abs(it22 - es21)).toBeLessThan(2)
    expect(it22).toBeGreaterThan(40)
  })

  it('no existe si el vendedor es particular o usa el régimen del margen', () => {
    const legs = shippingLegs({ ...CASO, sellerKind: 'particular' })
    for (const leg of legs) {
      expect(leg.euVatUsd).toBe(0)
      expect(leg.euVat).toBe('sin-iva-incrustado')
    }
    // Y entonces la factura es la misma por las tres rutas: el rodeo cuesta sólo el tramo extra.
    expect(new Set(legs.map(l => l.invoiceUsd)).size).toBe(1)
  })
})

describe('el desvío por Estados Unidos', () => {
  it('cobra Sección 301 al 10% combinado más el MPF de la entrada informal', () => {
    const usa = byRoute('casillero-usa')
    const base = usa.invoiceUsd
    expect(usa.foreignTaxUsd).toBeCloseTo(
      (base * US_SECTION_301_EU_COMBINED_PCT) / 100 + US_MPF_INFORMAL_USD,
      2
    )
    expect(usa.foreignTaxUsd).toBeGreaterThan(20)
  })

  it('no aplica el arancel de Sección 301 a un vendedor que no es de la UE', () => {
    const usa = shippingLegs({ ...CASO, sellerRegion: 'usa' }).find(
      l => l.route === 'casillero-usa'
    )!
    expect(usa.foreignTaxUsd).toBe(US_MPF_INFORMAL_USD)
  })

  it('cruza dos aduanas, contra una del envío directo', () => {
    expect(byRoute('casillero-usa').customsCrossings).toBe(2)
    expect(byRoute('directo').customsCrossings).toBe(1)
  })

  it('nunca sale más barato que el directo para una compra europea', () => {
    // Es la afirmación central de la página. Si un cambio la rompe, la página miente.
    const directo = byRoute('directo')
    const usa = byRoute('casillero-usa')
    const totalDirecto = directo.invoiceUsd + directo.foreignTaxUsd + directo.forwarderFreightUsd
    const totalUsa = usa.invoiceUsd + usa.foreignTaxUsd + usa.forwarderFreightUsd
    expect(totalUsa).toBeGreaterThan(totalDirecto)
  })
})

describe('el desvío por Europa', () => {
  it('no paga arancel: España e Italia son el mismo territorio aduanero', () => {
    expect(byRoute('casillero-ue').foreignTaxUsd).toBe(0)
    expect(byRoute('casillero-ue').customsCrossings).toBe(1)
  })

  it('deja el IVA europeo DENTRO de la factura que se declara en Uruguay', () => {
    const ue = byRoute('casillero-ue')
    const directo = byRoute('directo')
    expect(ue.euVatUsd).toBeGreaterThan(0)
    expect(ue.invoiceUsd).toBe(260)
    // Y por eso la base uruguaya es más grande justo por el importe de ese IVA.
    expect(ue.invoiceUsd - directo.invoiceUsd).toBeCloseTo(ue.euVatUsd, 2)
  })

  it('hace que el impuesto uruguayo se cobre también sobre el IVA europeo', () => {
    const ue = byRoute('casillero-ue')
    const directo = byRoute('directo')
    const opts = { useFranchise: true, franchiseAvailable: 600, shipmentsUsed: 1 }
    const taxUe = courierImport({ value: ue.invoiceUsd, ...opts }).totalTax
    const taxDirecto = courierImport({ value: directo.invoiceUsd, ...opts }).totalTax
    expect(taxUe).toBeGreaterThan(taxDirecto)
  })
})

describe('la garantía del comprador', () => {
  it('sólo sobrevive en el envío directo', () => {
    expect(byRoute('directo').buyerProtectionLost).toBe(false)
    expect(byRoute('casillero-usa').buyerProtectionLost).toBe(true)
    expect(byRoute('casillero-ue').buyerProtectionLost).toBe(true)
  })
})

describe('el caso testigo de r/uruguay', () => {
  it('con franquicia el reloj de USD 260 paga 57,20 de IVA, y por el 60% paga 156', () => {
    const con = courierImport({
      value: 260,
      useFranchise: true,
      franchiseAvailable: 600,
      shipmentsUsed: 1,
    })
    expect(con.regime).toBe('franquicia')
    expect(con.totalTax).toBeCloseTo(57.2, 2)

    const sin = courierImport({ value: 260, useFranchise: false })
    expect(sin.regime).toBe('simplificado')
    expect(sin.totalTax).toBeCloseTo(156, 2)

    // El ahorro de usar la franquicia, que es la decisión que la página tiene que dejar clara.
    expect(sin.totalTax - con.totalTax).toBeCloseTo(98.8, 2)
  })

  it('el vendedor italiano no accede a la exoneración de EE.UU. ni pasando por Miami', () => {
    // `origin: 'other'` es lo que corresponde a una factura italiana, viaje por donde viaje.
    const porMiami = courierImport({
      value: byRoute('casillero-usa').invoiceUsd,
      origin: 'other',
      useFranchise: true,
      franchiseAvailable: 600,
      shipmentsUsed: 1,
    })
    expect(porMiami.ivaExempt).toBeFalsy()
    expect(porMiami.totalTax).toBeGreaterThan(0)
  })
})

describe('la disciplina de fuentes', () => {
  const ALLOWED_KINDS = ['norma', 'operador', 'practica']

  it('cada afirmación declara su origen y trae al menos una fuente', () => {
    const withSources = [
      ...ROUTE_TRAITS.flatMap(t => t.sources),
      ...ROUTE_TRAPS.flatMap(t => t.sources),
      ...DIRECT_STEPS.flatMap(s => s.sources),
      ...SHIPPING_ROUTES_SOURCES,
    ]
    expect(withSources.length).toBeGreaterThan(20)
    for (const source of withSources) {
      expect(ALLOWED_KINDS).toContain(source.kind)
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.label.length).toBeGreaterThan(3)
    }
    for (const trap of ROUTE_TRAPS) expect(trap.sources.length).toBeGreaterThan(0)
    for (const step of DIRECT_STEPS) expect(step.sources.length).toBeGreaterThan(0)
    for (const trait of ROUTE_TRAITS) expect(trait.sources.length).toBeGreaterThan(0)
  })

  it('no cita la página de Aduanas que sigue publicando el decreto derogado', () => {
    // aduanas.gub.uy/innovaportal/v/27950 ("Encomiendas Postales") publica el Decreto 356/014:
    // mínimo USD 10 y tope USD 200 por envío. Citarla "confirma" cifras muertas.
    const urls = [
      ...ROUTE_TRAITS.flatMap(t => t.sources),
      ...ROUTE_TRAPS.flatMap(t => t.sources),
      ...DIRECT_STEPS.flatMap(s => s.sources),
      ...SHIPPING_ROUTES_SOURCES,
    ].map(s => s.url)
    for (const url of urls) expect(url).not.toContain('/v/27950')
  })

  it('cada ruta tiene una respuesta en toda comparación cualitativa', () => {
    const routes: ShipRoute[] = ['directo', 'casillero-usa', 'casillero-ue']
    for (const trait of ROUTE_TRAITS) {
      for (const route of routes) {
        expect(trait.byRoute[route]).toBeTruthy()
        expect(trait.byRoute[route].length).toBeGreaterThan(10)
      }
    }
  })

  it('la fecha de verificación es una fecha ISO real', () => {
    expect(SHIPPING_ROUTES_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(SHIPPING_ROUTES_VERIFIED_AT).getTime())).toBe(false)
  })

  it('las preguntas frecuentes contestan, no derivan', () => {
    expect(SHIPPING_ROUTES_FAQS.length).toBeGreaterThanOrEqual(6)
    for (const faq of SHIPPING_ROUTES_FAQS) {
      expect(faq.q.length).toBeGreaterThan(10)
      expect(faq.a.length).toBeGreaterThan(60)
    }
  })
})
