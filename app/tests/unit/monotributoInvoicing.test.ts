import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  COST_LEVERS,
  CORE_ANSWER,
  DISCLAIMER,
  FAQ,
  FIGURES,
  LEYENDAS,
  MONO_APORTES_2026,
  MONO_INVOICING_VERIFIED_AT,
  MYTHS,
  QUOTE_CHANNELS,
  ROUTES,
  SOURCES,
  SUPPORT_PROGRAMS,
  TALONARIO_STEPS,
  compareInvoicingCost,
  type Figure,
} from '../../utils/monotributoInvoicing'

const isFigure = (v: unknown): v is Figure =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Figure).value === 'number' &&
  typeof (v as Figure).label === 'string' &&
  typeof (v as Figure).source === 'string' &&
  typeof (v as Figure).verifiedAt === 'string'

describe('FIGURES', () => {
  it('exposes every numeric constant as a sourced Figure', () => {
    const entries = Object.entries(FIGURES)
    expect(entries.length).toBeGreaterThanOrEqual(13)
    for (const [key, value] of entries) {
      expect(isFigure(value), `FIGURES.${key} is not a Figure`).toBe(true)
    }
  })

  it('sources every figure to a primary domain with an ISO date', () => {
    const PRIMARY = ['gub.uy', 'dgi.gub.uy', 'bps.gub.uy', 'impo.com.uy']
    for (const [key, f] of Object.entries(FIGURES)) {
      expect(
        PRIMARY.some(d => f.source.includes(d)),
        `FIGURES.${key} is not sourced to a primary domain: ${f.source}`
      ).toBe(true)
      expect(f.verifiedAt, `FIGURES.${key} has a non-ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(f.source.startsWith('https://')).toBe(true)
    }
  })

  // El crédito de 80 UI es EL dato que da vuelta la decisión: si alguien lo "corrige" a otro
  // número o le cambia la fuente, la página pasa a recomendar mal.
  it('keeps the 80 UI credit tied to the DGI page that states the monotributo exclusion', () => {
    expect(FIGURES.creditoFacturaElectronicaUi.value).toBe(80)
    expect(FIGURES.creditoFacturaElectronicaUyu.value).toBe(514)
    for (const key of ['creditoFacturaElectronicaUi', 'creditoFacturaElectronicaUyu'] as const) {
      expect(FIGURES[key].source).toContain('credito-contratacion-servicios-soluciones')
    }
  })

  it('keeps the formal talonario requirements as the norm states them', () => {
    expect(FIGURES.constanciaVigenciaDias.value).toBe(15)
    expect(FIGURES.viasMinimas.value).toBe(2)
    expect(FIGURES.constanciaVigenciaDias.source).toContain('688-1992')
    expect(FIGURES.viasMinimas.source).toContain('688-1992')
    // Recuadro y caracteres salen de la Resolución 798/025, no de 688/992.
    expect(FIGURES.leyendaRecuadroLargoCm.source).toContain('798-2025')
    expect(FIGURES.leyendaCaracteresMm.source).toContain('798-2025')
  })
})

describe('contenido', () => {
  it('answers the actual question up front: papel no es la obligación cara', () => {
    expect(CORE_ANSWER).toMatch(/exceptuad/i)
    expect(CORE_ANSWER).toMatch(/voluntari/i)
  })

  it('publishes both routes with the electronic one flagged as optional', () => {
    expect(ROUTES.map(r => r.id)).toEqual(['talonario', 'cfe'])
    const cfe = ROUTES.find(r => r.id === 'cfe')!
    expect(cfe.status).toMatch(/opcional|voluntari/i)
    expect(cfe.costs.join(' ')).toMatch(/80 UI/)
  })

  it('cites a primary source on every myth', () => {
    expect(MYTHS.length).toBeGreaterThanOrEqual(5)
    for (const m of MYTHS) {
      expect(m.source).toMatch(
        /^https:\/\/(www\.)?(gub\.uy|dgi\.gub\.uy|impo\.com\.uy|efactura\.dgi\.gub\.uy)/
      )
      expect(m.claim.length).toBeGreaterThan(20)
      expect(m.reality.length).toBeGreaterThan(60)
    }
  })

  it('never promises a subsidy for the talonario', () => {
    for (const p of SUPPORT_PROGRAMS) {
      expect(p.caveat.length).toBeGreaterThan(30)
    }
    const prose = [
      ...COST_LEVERS.map(l => `${l.title} ${l.detail}`),
      ...FAQ.map(f => f.answer),
    ].join(' ')
    expect(prose).not.toMatch(/te devuelven el (costo|gasto)|reintegra el talonario/i)
  })

  // La pregunta que cierra todos los hilos es "¿cuál imprenta es la barata?". La respuesta
  // honesta es un método, no un nombre: nadie publica lista de precios. Si alguien agrega acá
  // una recomendación nominal, está inventando un precio que no verificó.
  it('never names a single imprenta as the cheap one', () => {
    expect(QUOTE_CHANNELS.length).toBeGreaterThanOrEqual(3)
    const prose = QUOTE_CHANNELS.map(q => `${q.title} ${q.detail}`).join(' ')
    expect(prose).not.toMatch(
      /la m[áa]s barata es|te recomiendo la imprenta|imprenta m[áa]s econ[óo]mica:/i
    )
    // Al menos un canal tiene que llevar a la nómina oficial de DGI.
    expect(QUOTE_CHANNELS.some(q => q.url?.includes('registro-imprentas-web'))).toBe(true)
    for (const q of QUOTE_CHANNELS) {
      if (q.url) expect(q.linkLabel, `${q.title} tiene URL sin etiqueta`).toBeTruthy()
    }
  })

  it('has an ordered, gapless talonario checklist', () => {
    expect(TALONARIO_STEPS.map(s => s.n)).toEqual(TALONARIO_STEPS.map((_, i) => i + 1))
  })

  it('publishes both legends verbatim', () => {
    expect(LEYENDAS.map(l => l.text)).toEqual(['MONOTRIBUTO', 'MONOTRIBUTO SOCIAL MIDES'])
  })

  it('ships an FAQ that opens with the obligation question', () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(8)
    expect(FAQ[0]!.question).toMatch(/obligad/i)
    for (const f of FAQ) {
      expect(f.answer.length).toBeGreaterThan(80)
      expect(f.short.length).toBeLessThan(45)
    }
  })

  it('lists only primary sources and dates the verification', () => {
    expect(SOURCES.length).toBeGreaterThanOrEqual(8)
    for (const s of SOURCES) {
      expect(s.url).toMatch(/gub\.uy|impo\.com\.uy/)
    }
    expect(MONO_INVOICING_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(DISCLAIMER).toMatch(/no asesoramiento contable|no es asesoramiento/i)
  })
})

describe('MONO_APORTES_2026', () => {
  it('is verified against BPS on 2026-09-15, separate from the invoicing figures', () => {
    expect(MONO_APORTES_2026.verifiedAt).toBe('2026-09-15')
  })

  it('matches the ley 19.942 gradualidad (25/50/100%, tramos de 12 meses)', () => {
    expect(MONO_APORTES_2026.ley19942.primerAnio.sinFonasa).toBe(1071)
    expect(MONO_APORTES_2026.ley19942.segundoAnio.sinFonasa).toBe(1594)
    expect(MONO_APORTES_2026.ley19942.pleno.sinFonasa).toBe(2637)
    // El tramo pleno de la 19.942 coincide con la 18.083 (sin gradualidad).
    expect(MONO_APORTES_2026.ley19942.pleno.conFonasaSinConyuge).toBe(6996)
    expect(MONO_APORTES_2026.ley19942.pleno.conFonasaConConyuge).toBe(7888)
  })

  it('matches the Mides gradualidad (25/50/75/100%, cuatro tramos de 12 meses)', () => {
    expect(MONO_APORTES_2026.mides.sinFonasa).toEqual([659, 1320, 1979, 2637])
    expect(MONO_APORTES_2026.mides.conFonasa[3]!.sinConyugeConHijos).toBe(6996)
    expect(MONO_APORTES_2026.mides.conFonasa[0]!.sinConyugeConHijos).toBe(5430)
  })

  it('publishes the 2026 caps (unipersonal, sociedad de hecho, activos)', () => {
    expect(MONO_APORTES_2026.topes.unipersonal).toBe(1_175_537)
    expect(MONO_APORTES_2026.topes.sociedadDeHecho).toBe(1_959_229)
    expect(MONO_APORTES_2026.topes.activos).toBe(979_614)
  })

  it('sources every table to bps.gub.uy over https', () => {
    expect(MONO_APORTES_2026.sources.length).toBeGreaterThanOrEqual(3)
    for (const s of MONO_APORTES_2026.sources) {
      expect(s.url).toMatch(/^https:\/\/(www\.)?bps\.gub\.uy\//)
    }
  })

  // FIGURES ya traía sueltos estos tres valores (aporte MIDES año 1, pleno, tope unipersonal):
  // tienen que coincidir con la tabla completa de BPS, no divergir.
  it('agrees with the standalone Figure values already published on the page', () => {
    expect(FIGURES.aporteMidesAnio1SinFonasa.value).toBe(MONO_APORTES_2026.mides.sinFonasa[0])
    expect(FIGURES.aporteMidesPlenoSinFonasa.value).toBe(MONO_APORTES_2026.mides.sinFonasa[3])
    expect(FIGURES.topeAnualUnipersonal.value).toBe(MONO_APORTES_2026.topes.unipersonal)
  })
})

describe('compareInvoicingCost', () => {
  const base = {
    talonarioPrecio: 1500,
    juegos: 50,
    comprobantesPorMes: 10,
    certificadoPrecio: 5000,
    certificadoMeses: 24,
    abonoMensual: 400,
  }

  it('prorrates the talonario over the comprobantes it holds', () => {
    const r = compareInvoicingCost(base)
    expect(r.talonarioPorComprobante).toBe(30)
    expect(r.mesesQueDura).toBe(5)
    expect(r.talonarioMensual).toBe(300)
  })

  it('adds the certificate amortization to the monthly abono', () => {
    const r = compareInvoicingCost(base)
    // 5000 / 24 = 208.33 + 400
    expect(r.cfeMensual).toBeCloseTo(608.33, 1)
    expect(r.cheaper).toBe('talonario')
    expect(r.diferenciaAnual).toBeCloseTo((608.333333 - 300) * 12, 1)
  })

  it('can favour CFE when the volume is high enough', () => {
    const r = compareInvoicingCost({ ...base, comprobantesPorMes: 100 })
    expect(r.talonarioMensual).toBe(3000)
    expect(r.cheaper).toBe('cfe')
  })

  it('does not divide by zero when nothing is declared', () => {
    const r = compareInvoicingCost({
      talonarioPrecio: 0,
      juegos: 0,
      comprobantesPorMes: 0,
      certificadoPrecio: 0,
      certificadoMeses: 0,
      abonoMensual: 0,
    })
    expect(r.mesesQueDura).toBeNull()
    expect(r.cfePorComprobante).toBeNull()
    expect(r.talonarioMensual).toBe(0)
    expect(r.cfeMensual).toBe(0)
    expect(r.cheaper).toBe('empate')
    expect(Number.isFinite(r.diferenciaAnual)).toBe(true)
  })

  it('ignores negative or NaN inputs instead of producing negative costs', () => {
    const r = compareInvoicingCost({ ...base, talonarioPrecio: -900, abonoMensual: Number.NaN })
    expect(r.talonarioMensual).toBe(0)
    expect(r.cfeMensual).toBeCloseTo(208.33, 1)
  })
})

describe('la página existe y usa la data', () => {
  const page = readFileSync(
    join(__dirname, '..', '..', 'pages', 'facturar-en-monotributo-uruguay.vue'),
    'utf8'
  )

  it('imports the module instead of hardcoding the numbers', () => {
    expect(page).toContain("from '~/utils/monotributoInvoicing'")
    expect(page).toContain('compareInvoicingCost')
  })

  it('carries canonical, FAQ schema and the OG image', () => {
    expect(page).toContain('https://cambio-uruguay.com/facturar-en-monotributo-uruguay')
    expect(page).toContain('FAQPage')
    expect(page).toContain('defineOgImageComponent')
  })

  it('publishes the 2026 monthly-amounts section as accessible, mobile-friendly tables', () => {
    expect(page).toContain('MONO_APORTES_2026')
    expect(page).toContain('id="montos-2026"')
    expect(page).toContain('cu-mobile-cards')
    // Cada tabla nueva declara scope="col" en su fila de encabezado.
    expect((page.match(/scope="col"/g) ?? []).length).toBeGreaterThanOrEqual(6)
    expect((page.match(/data-label="/g) ?? []).length).toBeGreaterThan(0)
  })

  it('never writes "septiembre" (house style is "setiembre")', () => {
    expect(page.toLowerCase()).not.toContain('septiembre')
  })

  it('emits exactly one FAQPage graph node and one <h1>', () => {
    expect((page.match(/'@type':\s*'FAQPage'/g) ?? []).length).toBe(1)
    expect((page.match(/<h1[ >]/g) ?? []).length).toBe(1)
  })
})
