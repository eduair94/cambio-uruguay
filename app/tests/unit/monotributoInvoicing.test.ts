import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  CASOS,
  COST_LEVERS,
  CORE_ANSWER,
  DISCLAIMER,
  FAQ,
  FIGURES,
  IVA_MINIMO_2026,
  LEYENDAS,
  MONO_APORTES_2026,
  MONO_CASOS_VERIFIED_AT,
  MONO_INVOICING_VERIFIED_AT,
  MONO_MORA_2026,
  MONO_TOPES_UI,
  MONO_VENCIMIENTOS_2026,
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
  it('is verified against BPS on 2026-09-22, separate from the invoicing figures', () => {
    expect(MONO_APORTES_2026.verifiedAt).toBe('2026-09-22')
  })

  it('matches the ley 19.942 gradualidad (25/50/100%, tramos de 12 meses)', () => {
    expect(MONO_APORTES_2026.ley19942.primerAnio.sinFonasa).toBe(1071)
    expect(MONO_APORTES_2026.ley19942.segundoAnio.sinFonasa).toBe(1594)
    expect(MONO_APORTES_2026.ley19942.pleno.sinFonasa).toBe(2637)
    // El tramo pleno de la 19.942 coincide con la 18.083 (sin gradualidad).
    expect(MONO_APORTES_2026.ley19942.pleno.conFonasaSinConyuge).toBe(6996)
    expect(MONO_APORTES_2026.ley19942.pleno.conFonasaConConyuge).toBe(7888)
  })

  // Corrección del 2026-09-22: la página decía que BPS no publicaba columnas «sin hijos» para la
  // ley 19.942. El PDF de detalle sí las trae; son estas.
  it('publishes the «sin hijos» columns from the BPS PDF for ley 19.942', () => {
    const { primerAnio, segundoAnio, pleno } = MONO_APORTES_2026.ley19942
    expect([primerAnio, segundoAnio, pleno].map(t => t.conFonasaSinConyugeSinHijos)).toEqual([
      4761, 5284, 6327,
    ])
    expect([primerAnio, segundoAnio, pleno].map(t => t.conFonasaConConyugeSinHijos)).toEqual([
      5653, 6176, 7219,
    ])
    // Con hijos siempre cuesta más que sin hijos, y con cónyuge a cargo más que sin.
    for (const t of [primerAnio, segundoAnio, pleno]) {
      expect(t.conFonasaSinConyuge).toBeGreaterThan(t.conFonasaSinConyugeSinHijos)
      expect(t.conFonasaConConyuge).toBeGreaterThan(t.conFonasaSinConyuge)
      expect(t.conFonasaConConyugeSinHijos).toBeGreaterThan(t.conFonasaSinConyugeSinHijos)
    }
    expect(MONO_APORTES_2026.sources.some(s => s.url.endsWith('.pdf'))).toBe(true)
  })

  it('composes the cuota the way the BPS PDF explains it (5 BFC, jubilatorio+FRL, 8 % de 1 BPC)', () => {
    const c = MONO_APORTES_2026.composicion
    expect(c.montoGravado).toBe(9240)
    expect(c.jubilatorioFrlPleno).toBe(2088)
    expect(c.seguroEnfermedadSinFonasa).toBe(549)
    expect(c.bpc).toBe(6864)
    expect(c.fonasaBaseBpc).toBe(6.5)
    // 8 % de una BPC redondeado = los $549 que paga quien no opta por FONASA.
    expect(Math.round(c.bpc * 0.08)).toBe(c.seguroEnfermedadSinFonasa)
    // 25 % del jubilatorio+FRL más el seguro de enfermedad = la cuota sin FONASA del primer año.
    expect(c.jubilatorioFrlPleno * 0.25 + c.seguroEnfermedadSinFonasa).toBe(
      MONO_APORTES_2026.ley19942.primerAnio.sinFonasa
    )
    expect(c.jubilatorioFrlPleno + c.seguroEnfermedadSinFonasa).toBe(
      MONO_APORTES_2026.ley19942.pleno.sinFonasa
    )
  })

  it('publishes the sociedad de hecho table (jubilatorio + FRL only, por socio)', () => {
    const sh = MONO_APORTES_2026.sociedadDeHecho
    expect(sh.unSocio).toEqual([522, 1045, 2088])
    expect(sh.dosSocios).toEqual([1045, 2088, 4176])
    expect(sh.tresSocios).toEqual([1566, 3132, 6265])
    // Un socio pleno = el jubilatorio+FRL pleno de la composición.
    expect(sh.unSocio[2]).toBe(MONO_APORTES_2026.composicion.jubilatorioFrlPleno)
  })

  it('matches the Mides gradualidad (25/50/75/100%, cuatro tramos de 12 meses)', () => {
    expect(MONO_APORTES_2026.mides.sinFonasa).toEqual([659, 1320, 1979, 2637])
    expect(MONO_APORTES_2026.mides.conFonasa[3]!.sinConyugeConHijos).toBe(6996)
    expect(MONO_APORTES_2026.mides.conFonasa[0]!.sinConyugeConHijos).toBe(5430)
    expect(MONO_APORTES_2026.mides.conFonasa[0]!.sinConyugeSinHijos).toBe(4761)
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

describe('CASOS (Qué pasa si…)', () => {
  const PRIMARY = /^https:\/\/(www\.)?(gub\.uy|bps\.gub\.uy|impo\.com\.uy)\//

  it('is dated 2026-09-22 and covers the seven situations the brief asked for', () => {
    expect(MONO_CASOS_VERIFIED_AT).toBe('2026-09-22')
    expect(CASOS.map(c => c.id)).toEqual([
      'no-facturo',
      'me-paso-del-tope',
      'debo-cuotas',
      'fonasa-opcional',
      'cambiar-mutualista',
      'quien-paga',
      'monotributo-social-mides',
    ])
  })

  it('answers first, details after, and dates every source to a primary domain', () => {
    for (const c of CASOS) {
      expect(c.question, c.id).toMatch(/\?$/)
      expect(c.short.length, c.id).toBeGreaterThan(30)
      expect(c.short.length, c.id).toBeLessThan(120)
      expect(c.detail.length, c.id).toBeGreaterThanOrEqual(3)
      for (const d of c.detail) expect(d.length).toBeGreaterThan(80)
      expect(c.sources.length, c.id).toBeGreaterThanOrEqual(1)
      for (const s of c.sources) {
        expect(s.url, `${c.id}: ${s.url}`).toMatch(PRIMARY)
        expect(s.seenOn).toBe(MONO_CASOS_VERIFIED_AT)
        expect(s.label.length).toBeGreaterThan(10)
      }
    }
  })

  it('renders every table with rows that match its header count and no empty cells', () => {
    const withTable = CASOS.filter(c => c.table)
    expect(withTable.length).toBeGreaterThanOrEqual(5)
    for (const c of withTable) {
      const t = c.table!
      expect(t.headers.length).toBeGreaterThanOrEqual(2)
      for (const row of t.rows) {
        expect(row.length, `${c.id}: ${row.join(' | ')}`).toBe(t.headers.length)
        for (const cell of row) expect(cell.trim().length, c.id).toBeGreaterThan(0)
      }
    }
  })

  // Las cifras que deciden: si alguien las «corrige», la página pasa a responder mal.
  it('pins the 2026 figures the answers hinge on', () => {
    const all = CASOS.map(c => [c.short, ...c.detail].join(' ')).join(' ')
    // Topes en pesos Y en UI, sin una conversión propia.
    expect(all).toContain('$1.175.537')
    expect(all).toContain('$1.959.229')
    expect(all).toContain('183.000 UI')
    expect(all).toContain('305.000 UI')
    expect(MONO_TOPES_UI).toEqual({
      unipersonalUi: 183_000,
      sociedadDeHechoUi: 305_000,
      activosUi: 152_500,
    })
    // Suspensión de oficio a los 2 meses; mora 5/10/20 % y 0,80 % mensual.
    expect(MONO_MORA_2026.mesesSinPagarParaSuspension).toBe(2)
    expect([
      MONO_MORA_2026.multaDentroDe5DiasHabiles,
      MONO_MORA_2026.multaHasta90Dias,
      MONO_MORA_2026.multaDespuesDe90Dias,
    ]).toEqual([5, 10, 20])
    expect(MONO_MORA_2026.recargoMensualPct).toBe(0.8)
    expect(all).toContain('0,80 % mensual')
    // FONASA opcional: $549 sin la opción, código 9.
    expect(all).toContain('$549')
    expect(all).toMatch(/opcional/)
    // IVA mínimo 2026 como escalón siguiente.
    expect(IVA_MINIMO_2026).toEqual({
      cuota: 5910,
      cuotaNuevaEmpresaAnio1: 1478,
      cuotaNuevaEmpresaAnio2: 2955,
      topeIngresos: 1_959_229,
      topeIngresosUi: 305_000,
    })
    expect(all).toContain('$5.910')
    // Regla del tercer año civil.
    expect(all).toMatch(/tercer año civil/)
    // Cambio de mutualista: 23 meses, y la fecha de la fuente a la vista.
    expect(all).toContain('23 meses')
    expect(all).toContain('14/9/2023')
  })

  it('never claims what the dossier forbids', () => {
    const all = CASOS.map(c => [c.short, ...c.detail, c.table?.note ?? ''].join(' ')).join(' ')
    // Ni categorías argentinas, ni «se cierra sola», ni FONASA obligatorio, ni 72 cuotas vigentes.
    expect(all).not.toMatch(/categor[íi]a [A-K]\b/)
    // La frase del mito sólo aparece citada y negada, nunca afirmada.
    expect(all).toMatch(/No es que «la empresa se cierra sola y no debés nada»/)
    expect(all.split('se cierra sola').length - 1).toBe(1)
    expect(all).not.toMatch(/FONASA (es )?obligatori/i)
    const debo = CASOS.find(c => c.id === 'debo-cuotas')!
    expect(debo.detail.join(' ')).toMatch(
      /72 cuotas al 2 % anual y sin multas de la ley 19\.942 no están abiertas/
    )
    expect(all).not.toMatch(/mayores de 18/)
    // La inactividad del unipersonal común se publica como lo que BPS lista, no como regla.
    const noFacturo = CASOS.find(c => c.id === 'no-facturo')!
    expect(noFacturo.detail.join(' ')).toMatch(/BPS no lista un trámite de inactividad/)
    expect(noFacturo.detail.join(' ')).toMatch(/Confirmalo con BPS/)
    // El tope en pesos no se deriva de la UI.
    expect(all).not.toMatch(/6,6468|1\.216\.364/)
  })

  it('ships the 2026 payment calendar, one row per month, in house spelling', () => {
    expect(MONO_VENCIMIENTOS_2026).toHaveLength(12)
    expect(MONO_VENCIMIENTOS_2026.map(v => v.dia)).toEqual([
      23, 24, 20, 24, 25, 22, 21, 21, 21, 22, 23, 21,
    ])
    expect(MONO_VENCIMIENTOS_2026.map(v => v.mes)).toContain('setiembre')
    expect(MONO_VENCIMIENTOS_2026.map(v => v.mes)).not.toContain('septiembre')
    // Y el no-facturo lo publica como tabla, con la fuente del Mides además de la del común.
    const noFacturo = CASOS.find(c => c.id === 'no-facturo')!
    expect(noFacturo.table?.rows).toHaveLength(12)
    expect(noFacturo.sources.some(s => s.url.includes('vencimientos-de-monotributo-social'))).toBe(
      true
    )
  })

  it('adds the exact search phrases to the FAQ (and so to the FAQPage schema)', () => {
    const questions = FAQ.map(f => f.question)
    for (const c of CASOS) {
      if (c.id === 'monotributo-social-mides') continue
      expect(questions, c.question).toContain(c.question)
    }
    expect(questions).toContain(
      '¿Cuál es la facturación anual máxima del Monotributo Social MIDES?'
    )
    expect(FAQ.length).toBeGreaterThanOrEqual(18)
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

  it('publishes the «Qué pasa si…» section with dated sources and the new columns', () => {
    expect(page).toContain('id="que-pasa-si"')
    expect(page).toContain('CASOS')
    expect(page).toContain('MONO_CASOS_VERIFIED_AT')
    expect(page).toContain('conFonasaSinConyugeSinHijos')
    expect(page).toContain('SOCIEDAD_ROWS')
    // La fecha de verificación ya no está a mano: sale de la constante.
    expect(page).not.toContain('15 de setiembre de 2026')
    expect(page).toContain('aportesVerifiedAt')
  })

  // Las dos frases que la verificación del 2026-09-22 encontró mal en producción.
  it('no longer carries the two stale claims about the BPS tables', () => {
    expect(page).not.toMatch(/no publica para este régimen una columna separada sin hijos/)
    expect(page).not.toMatch(/«con cónyuge» es el hogar\s+con cónyuge o concubino con FONASA/)
    expect(page).toMatch(/no tiene cobertura FONASA por su propia\s+actividad o pasividad/)
  })

  it('keeps the meta description inside the SERP budget with the new promise up front', () => {
    const m = page.match(/const description =\s+'([^']+)'/)
    expect(m).not.toBeNull()
    expect(m![1]!.length).toBeLessThanOrEqual(155)
    expect(m![1]).toMatch(/qué pasa si/)
  })

  it('emits exactly one FAQPage graph node and one <h1>', () => {
    expect((page.match(/'@type':\s*'FAQPage'/g) ?? []).length).toBe(1)
    expect((page.match(/<h1[ >]/g) ?? []).length).toBe(1)
  })
})
