// app/utils/plazoFijoBancos.ts
// Lo que paga cada banco por un plazo fijo, tal como lo publica en su propia página, leído a mano
// y fechado.
//
// POR QUÉ EXISTE. La calculadora de plazo fijo recibía búsquedas como "simulador plazo fijo
// uruguay brou dólares" o "simulador de plazo fijo brou", y lo único que ofrecía era el BROU contra
// la media del BCU. Quien busca eso quiere saber qué le paga SU banco por SU monto y SU plazo. El
// BCU no lo publica —sus tasas pasivas son un total del sistema, sin apertura por institución (ver
// `DEPOSIT_REFERENCE_ABSENCES` en `investments.ts`)—, así que la única forma de compararlas es ir
// a la pizarra de cada banco.
//
// POR QUÉ ES UN ARCHIVO Y NO UN JOB. Cada banco publica distinto: el BROU y Heritage en un PDF,
// Itaú dentro de su manual de tarifas, BBVA y Scotiabank en una tabla HTML. Cinco formatos que
// cambian cuando se le antoja al banco, para cifras que se mueven pocas veces por año. Es el mismo
// trato que `mercadoPagoPromos.ts` y `transferFees.ts`: una persona lee la fuente, la escribe acá
// con la fecha del día y la página dice "consultado el <fecha>". Nunca se presenta como dato en
// vivo.
//
// LO QUE SE TOMÓ DE CADA FUENTE (todas leídas el 2026-10-31):
//   - BROU: no se duplica. Sale de `BROU_DEPOSIT_BOARD` (`investments.ts`), que ya publica el
//     PDF "Pizarras de plazo fijo e-BROU y sucursales". Se volvió a bajar el PDF ese día: sigue
//     siendo el de vigencia 01/10/2026, con las mismas cifras. Acá sólo se agregan los mínimos
//     como número (el módulo los guarda como texto) y la fecha de lectura.
//   - Itaú: "Manual de tarifas, tasas y precios", versión del 01/10/2026, sección 2.1 "Plazos
//     Fijos por Itaú Link y Agencias". UNA columna de tasa para los dos canales: lo que cambia es
//     el monto (Itaú Link de $ 10.000 a $ 3.000.000; agencias desde $ 200.000). El PDF suelto
//     "Tasas de DPF" sigue en línea con la versión del 01/03/2026 y tasas más bajas: está viejo, no
//     se usa.
//   - BBVA: página del producto "Depósito Plazo Fijo", cuatro tablas (online y pizarra, pesos y
//     dólares), las cuatro "Tasas vigentes desde el 04/08/2026". El pie de la página repite un
//     "Tasas vigentes desde el 1/12/2020" debajo del texto de garantía de depósitos: no está pegado
//     a ninguna tabla y no se toma. La página dice "plazo mínimo 31 días" y la tabla abre en 30.
//   - Scotiabank: página del producto, tablas por monto y tramo de días. NO imprime fecha de
//     vigencia, y se dice. La misma página tiene, dentro de un comentario HTML (o sea, no se ve),
//     una promoción de 7,20 % / 7,50 % en pesos: el navegador no la muestra y acá tampoco.
//   - Heritage: PDF "Tasas de interés para depósitos a plazo fijo", pie "Página 1 de 1 -
//     02/2026". Es el que enlaza el banco hoy; la fecha es la del documento.
//
// LOS BANCOS QUE NO ESTÁN, Y POR QUÉ, viven en `PLAZO_FIJO_BANCOS_FUERA`. La página los nombra.
//
// PLAZOS: cada banco publica a su manera. BROU y Scotiabank publican TRAMOS ("181 – 366 días");
// Itaú, BBVA y Heritage publican PLAZOS PUNTUALES ("367 días"). La calculadora pide meses, y
// 12 meses son 365 días, no 367. Un plazo puntual coincide con el del visitante si está a
// `POINT_TERM_TOLERANCE_DAYS` días o menos, y la fila imprime el plazo tal cual lo escribe el
// banco. Lo que NO se hace es estirar un plazo puntual a un tramo: BBVA publica 91 y 181 días, y
// qué paga a 120 días no lo dice. Ahí la página dice qué plazos publica, no un número inventado.
//
// MONTOS: varios bancos pagan distinto según el monto, y la diferencia no es un detalle
// (Scotiabank, pesos a 181–366 días: 1,60 % hasta $ 250.000 y 4,60 % desde $ 5.000.001). Por eso
// la fila que se muestra es la del tramo de monto que ingresó el visitante, nunca la mejor.
//
// TODAS son tasas efectivas anuales e intereses al vencimiento: lo dicen el BROU (nota 1), BBVA
// ("Efectivas Anuales"), Scotiabank y Heritage ("Tasa Efectiva Anual"), e Itaú en su formulario
// de constitución ("Tasa de Interés: % efectiva anual").
// La variante de pago periódico del BROU es otro producto y no entra acá.
//
// MÓDULO PURO (sin Vue/Nuxt): la página y su test comparten una sola fuente de verdad.

import { BROU_DEPOSIT_BOARD, type DepositCurrency } from './investments'
import { formatNumber } from './format'

/** Fecha (YYYY-MM-DD) en que se leyó cada fuente de este archivo. */
export const PLAZO_FIJO_BANCOS_REVIEWED = '2026-10-31'

/** Distancia máxima, en días, entre el plazo del visitante y un plazo puntual publicado. */
export const POINT_TERM_TOLERANCE_DAYS = 5

export type PlazoFijoChannel = 'online' | 'sucursal' | 'sin-distincion'

export interface PlazoFijoTerm {
  /** El plazo como lo escribe el banco: "181 – 366 días" o "367 días". */
  label: string
  minDays: number
  /** Igual a `minDays` cuando el banco publica un plazo puntual. */
  maxDays: number
  /** Tasa efectiva anual, en %. */
  rate: number
}

export interface PlazoFijoBand {
  /** El tramo de monto como lo escribe el banco. */
  label: string
  /** Monto mínimo, incluido, en la moneda del depósito. */
  min: number
  /** Monto máximo, incluido. `null` = sin tope publicado. */
  max: number | null
  terms: readonly PlazoFijoTerm[]
}

export type PlazoFijoVigenciaKind = 'rige-desde' | 'version' | 'documento' | 'sin-fecha'

export interface PlazoFijoVigencia {
  kind: PlazoFijoVigenciaKind
  /** YYYY-MM-DD, o YYYY-MM cuando el banco sólo imprime el mes. `null` sólo en 'sin-fecha'. */
  date: string | null
}

export interface PlazoFijoBoard {
  currency: DepositCurrency
  channel: PlazoFijoChannel
  /** Cómo llama el banco a ese canal: "e-BROU", "Itaú Link", "Pizarra (sucursal)". */
  channelLabel: string
  vigencia: PlazoFijoVigencia
  bands: readonly PlazoFijoBand[]
}

export interface PlazoFijoBank {
  id: string
  name: string
  /** Documento o página de donde salen las cifras. */
  sourceUrl: string
  sourceTitle: string
  /** YYYY-MM-DD en que se leyó la fuente. */
  readOn: string
  /** Lo que la fuente dice y cambia el número que se puede conseguir. */
  notes: readonly string[]
  boards: readonly PlazoFijoBoard[]
}

export interface PlazoFijoExcludedBank {
  id: string
  name: string
  reason: string
  sourceUrl: string
  readOn: string
}

/** Un plazo puntual: el banco publica sólo ese número de días. */
function at(days: number, rate: number): PlazoFijoTerm {
  return { label: `${days} días`, minDays: days, maxDays: days, rate }
}

/** Un tramo de días, extremos incluidos, como lo imprime el banco. */
function span(minDays: number, maxDays: number, rate: number): PlazoFijoTerm {
  return { label: `${minDays} – ${maxDays} días`, minDays, maxDays, rate }
}

/** "01/10/2026" → "2026-10-01". */
function isoFromDmy(dmy: string): string {
  const [d, m, y] = dmy.split('/')
  return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
}

// ── BROU ──────────────────────────────────────────────────────────────────────────────────────
// Los mínimos de intereses al vencimiento, como número. El texto ("$ 5.000") vive en
// `BROU_DEPOSIT_BOARD.series[c].minimum` y el test cruza los dos.
export const BROU_MINIMUMS: Readonly<Record<DepositCurrency, number>> = Object.freeze({
  UYU: 5_000,
  USD: 500,
  UI: 1_500,
})

function brouBoards(): PlazoFijoBoard[] {
  const currencies: DepositCurrency[] = ['UYU', 'USD', 'UI']
  return currencies.flatMap(currency => {
    const series = BROU_DEPOSIT_BOARD.series[currency]
    const vigencia: PlazoFijoVigencia = {
      kind: 'rige-desde',
      date: isoFromDmy(series.vigenciaMoneda),
    }
    const band = (pick: 'online' | 'branch'): PlazoFijoBand => ({
      label: `desde ${series.minimum}`,
      min: BROU_MINIMUMS[currency],
      max: null,
      terms: series.tranches.map(t => span(t.minDays, t.maxDays, t[pick])),
    })
    return [
      {
        currency,
        channel: 'online' as const,
        channelLabel: 'e-BROU / App BROU',
        vigencia,
        bands: [band('online')],
      },
      {
        currency,
        channel: 'sucursal' as const,
        channelLabel: 'Sucursales',
        vigencia,
        bands: [band('branch')],
      },
    ]
  })
}

// ── Itaú ──────────────────────────────────────────────────────────────────────────────────────
const ITAU_VIGENCIA: PlazoFijoVigencia = { kind: 'version', date: '2026-10-01' }
const ITAU_TERMS: Readonly<Record<DepositCurrency, readonly PlazoFijoTerm[]>> = {
  UYU: [
    at(30, 2.75),
    at(60, 3.25),
    at(91, 3.75),
    at(120, 4.75),
    at(181, 4.75),
    at(270, 4.75),
    at(367, 4.75),
    at(547, 5.0),
    at(732, 5.25),
  ],
  USD: [at(90, 2.75), at(181, 2.75), at(270, 2.75), at(367, 3.0)],
  UI: [at(367, 0.75), at(547, 1.0), at(732, 1.25)],
}
/** Itaú Link tiene mínimo y máximo; las agencias, sólo mínimo. La tasa es la misma. */
const ITAU_LIMITS: Readonly<
  Record<DepositCurrency, { link: [number, number, string]; agencias: [number, string] }>
> = {
  UYU: {
    link: [10_000, 3_000_000, '$ 10.000 a $ 3.000.000'],
    agencias: [200_000, 'desde $ 200.000'],
  },
  USD: {
    link: [1_000, 100_000, 'U$S 1.000 a U$S 100.000'],
    agencias: [10_000, 'desde U$S 10.000'],
  },
  UI: { link: [10_000, 800_000, 'UI 10.000 a UI 800.000'], agencias: [50_000, 'desde UI 50.000'] },
}

function itauBoards(): PlazoFijoBoard[] {
  const currencies: DepositCurrency[] = ['UYU', 'USD', 'UI']
  return currencies.flatMap(currency => {
    const terms = ITAU_TERMS[currency]
    const { link, agencias } = ITAU_LIMITS[currency]
    return [
      {
        currency,
        channel: 'online' as const,
        channelLabel: 'Itaú Link',
        vigencia: ITAU_VIGENCIA,
        bands: [{ label: link[2], min: link[0], max: link[1], terms }],
      },
      {
        currency,
        channel: 'sucursal' as const,
        channelLabel: 'Agencias',
        vigencia: ITAU_VIGENCIA,
        bands: [{ label: agencias[1], min: agencias[0], max: null, terms }],
      },
    ]
  })
}

// ── BBVA ──────────────────────────────────────────────────────────────────────────────────────
const BBVA_VIGENCIA: PlazoFijoVigencia = { kind: 'rige-desde', date: '2026-08-04' }
/** Las cuatro tablas publican los mismos cuatro plazos, en este orden. */
function bbvaTerms(r30: number, r91: number, r181: number, r367: number): PlazoFijoTerm[] {
  return [at(30, r30), at(91, r91), at(181, r181), at(367, r367)]
}

const BBVA_BOARDS: readonly PlazoFijoBoard[] = [
  {
    currency: 'USD',
    channel: 'online',
    channelLabel: 'Online (BBVA Net / App)',
    vigencia: BBVA_VIGENCIA,
    bands: [
      // El mínimo online sale del texto de la página: "Online desde USD 1.000".
      {
        label: 'hasta USD 100.000',
        min: 1_000,
        max: 100_000,
        terms: bbvaTerms(2.25, 2.75, 2.8, 2.8),
      },
      {
        label: 'más de USD 100.000',
        min: 100_001,
        max: null,
        terms: bbvaTerms(2.5, 2.75, 2.8, 2.8),
      },
    ],
  },
  {
    currency: 'UYU',
    channel: 'online',
    channelLabel: 'Online (BBVA Net / App)',
    vigencia: BBVA_VIGENCIA,
    bands: [
      {
        label: 'hasta $ 150.000',
        min: 10_000,
        max: 150_000,
        terms: bbvaTerms(3.5, 3.5, 4.0, 4.25),
      },
      { label: 'más de $ 150.000', min: 150_001, max: null, terms: bbvaTerms(4.0, 4.0, 4.5, 4.75) },
    ],
  },
  {
    currency: 'USD',
    channel: 'sucursal',
    channelLabel: 'Pizarra (sucursal)',
    vigencia: BBVA_VIGENCIA,
    bands: [
      // "En sucursal desde USD 10.000".
      {
        label: 'hasta USD 100.000',
        min: 10_000,
        max: 100_000,
        terms: bbvaTerms(2.0, 2.0, 2.0, 2.0),
      },
      {
        label: 'más de USD 100.000',
        min: 100_001,
        max: null,
        terms: bbvaTerms(2.25, 2.6, 2.8, 2.8),
      },
    ],
  },
  {
    currency: 'UYU',
    channel: 'sucursal',
    channelLabel: 'Pizarra (sucursal)',
    vigencia: BBVA_VIGENCIA,
    bands: [
      {
        label: 'de $ 100.000 a $ 200.000',
        min: 100_000,
        max: 200_000,
        terms: bbvaTerms(2.0, 2.0, 2.5, 3.0),
      },
      { label: 'más de $ 200.000', min: 200_001, max: null, terms: bbvaTerms(3.5, 3.5, 4.0, 4.25) },
    ],
  },
]

// ── Scotiabank ────────────────────────────────────────────────────────────────────────────────
const SCOTIA_VIGENCIA: PlazoFijoVigencia = { kind: 'sin-fecha', date: null }
/** Pesos y dólares: seis tramos de días. El de "más de $ 5.000.001" abre en 1, no en 0. */
function scotiaShort(first: number, rates: readonly number[]): PlazoFijoTerm[] {
  const [a, b, c, d, e, f] = rates
  return [
    span(first, 30, a!),
    span(31, 60, b!),
    span(61, 90, c!),
    span(91, 180, d!),
    span(181, 366, e!),
    span(367, 999, f!),
  ]
}
function scotiaUi(rates: readonly number[]): PlazoFijoTerm[] {
  const [a, b, c, d] = rates
  return [span(181, 366, a!), span(367, 550, b!), span(551, 740, c!), span(741, 999, d!)]
}

const SCOTIA_BOARDS: readonly PlazoFijoBoard[] = [
  {
    currency: 'UYU',
    channel: 'sin-distincion',
    channelLabel: 'Tabla publicada',
    vigencia: SCOTIA_VIGENCIA,
    bands: [
      {
        label: '$ 25.000 a $ 250.000',
        min: 25_000,
        max: 250_000,
        terms: scotiaShort(0, [0.15, 0.5, 0.75, 1.4, 1.6, 1.95]),
      },
      {
        label: '$ 250.001 a $ 500.000',
        min: 250_001,
        max: 500_000,
        terms: scotiaShort(0, [0.15, 0.55, 0.85, 1.5, 1.8, 2.2]),
      },
      {
        label: '$ 500.001 a $ 2.000.000',
        min: 500_001,
        max: 2_000_000,
        terms: scotiaShort(0, [0.4, 0.7, 0.9, 2.4, 3.35, 3.75]),
      },
      {
        label: '$ 2.000.001 a $ 5.000.000',
        min: 2_000_001,
        max: 5_000_000,
        terms: scotiaShort(0, [1.0, 2.7, 3.0, 3.6, 4.1, 4.5]),
      },
      {
        label: 'más de $ 5.000.001',
        min: 5_000_001,
        max: null,
        terms: scotiaShort(1, [1.9, 3.5, 3.7, 4.4, 4.6, 5.0]),
      },
    ],
  },
  {
    currency: 'USD',
    channel: 'sin-distincion',
    channelLabel: 'Tabla publicada',
    vigencia: SCOTIA_VIGENCIA,
    bands: [
      {
        label: 'USD 2.000 a USD 50.000',
        min: 2_000,
        max: 50_000,
        terms: scotiaShort(0, [0.1, 0.9, 1.15, 1.5, 1.9, 1.8]),
      },
      {
        label: 'USD 50.001 a USD 100.000',
        min: 50_001,
        max: 100_000,
        terms: scotiaShort(0, [0.1, 0.9, 1.15, 2.05, 2.45, 2.3]),
      },
      {
        label: 'USD 100.001 a USD 250.000',
        min: 100_001,
        max: 250_000,
        terms: scotiaShort(0, [0.4, 1.45, 1.5, 2.05, 2.5, 2.35]),
      },
      {
        label: 'USD 250.001 a USD 500.000',
        min: 250_001,
        max: 500_000,
        terms: scotiaShort(0, [0.65, 1.7, 1.8, 2.1, 2.5, 2.4]),
      },
      {
        label: 'más de USD 500.001',
        min: 500_001,
        max: null,
        terms: scotiaShort(0, [0.9, 1.9, 1.9, 2.3, 2.6, 2.5]),
      },
    ],
  },
  {
    currency: 'UI',
    channel: 'sin-distincion',
    channelLabel: 'Tabla publicada',
    vigencia: SCOTIA_VIGENCIA,
    bands: [
      {
        label: 'UI 10.000 a UI 100.000',
        min: 10_000,
        max: 100_000,
        terms: scotiaUi([0.05, 0.15, 0.3, 0.5]),
      },
      {
        label: 'UI 100.001 a UI 250.000',
        min: 100_001,
        max: 250_000,
        terms: scotiaUi([0.05, 0.15, 0.3, 0.5]),
      },
      {
        label: 'UI 250.001 a UI 500.000',
        min: 250_001,
        max: 500_000,
        terms: scotiaUi([0.15, 0.3, 0.5, 0.7]),
      },
      { label: 'desde UI 500.001', min: 500_001, max: null, terms: scotiaUi([0.5, 0.6, 0.7, 0.8]) },
    ],
  },
]

// ── Heritage ──────────────────────────────────────────────────────────────────────────────────
const HERITAGE_VIGENCIA: PlazoFijoVigencia = { kind: 'documento', date: '2026-02' }
function heritageTerms(rates: readonly number[]): PlazoFijoTerm[] {
  const [a, b, c, d, e] = rates
  return [at(30, a!), at(60, b!), at(91, c!), at(181, d!), at(367, e!)]
}

const HERITAGE_BOARDS: readonly PlazoFijoBoard[] = [
  {
    currency: 'UYU',
    channel: 'sin-distincion',
    channelLabel: 'Tabla publicada',
    vigencia: HERITAGE_VIGENCIA,
    bands: [
      {
        label: '$ 10.000 a $ 500.000',
        min: 10_000,
        max: 500_000,
        terms: heritageTerms([3.0, 3.0, 3.25, 3.5, 3.75]),
      },
      {
        label: 'más de $ 500.000',
        min: 500_001,
        max: null,
        terms: heritageTerms([3.5, 3.5, 3.75, 4.0, 4.25]),
      },
    ],
  },
  {
    currency: 'USD',
    channel: 'sin-distincion',
    channelLabel: 'Tabla publicada',
    vigencia: HERITAGE_VIGENCIA,
    bands: [
      {
        label: 'USD 5.000 a USD 20.000',
        min: 5_000,
        max: 20_000,
        terms: heritageTerms([0.5, 0.5, 1.5, 1.8, 2.0]),
      },
      {
        label: 'más de USD 20.000',
        min: 20_001,
        max: null,
        terms: heritageTerms([1.0, 1.0, 2.0, 2.3, 2.5]),
      },
    ],
  },
]

/** Los bancos que publican su pizarra de plazo fijo. El orden de la página lo da la tasa. */
export const PLAZO_FIJO_BANCOS: readonly PlazoFijoBank[] = [
  {
    id: 'brou',
    name: 'BROU',
    sourceUrl: BROU_DEPOSIT_BOARD.pdfUrl,
    sourceTitle: 'Pizarras de plazo fijo e-BROU y sucursales (personas), PDF',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
    notes: [
      'La pizarra e-BROU sólo aplica a personas físicas y a depósitos constituidos por e-BROU o App BROU.',
      'Las tasas valen para constituciones y renovaciones hechas mientras rige la pizarra.',
    ],
    boards: brouBoards(),
  },
  {
    id: 'itau',
    name: 'Itaú',
    sourceUrl: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
    sourceTitle: 'Manual de tarifas, tasas y precios, sección 2.1 (PDF)',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
    notes: [
      'Una sola tasa para los dos canales: Itaú Link acepta de $ 10.000 a $ 3.000.000 (U$S 1.000 a U$S 100.000; UI 10.000 a UI 800.000) y las agencias, desde $ 200.000 (U$S 10.000; UI 50.000).',
    ],
    boards: itauBoards(),
  },
  {
    id: 'bbva',
    name: 'BBVA',
    sourceUrl: 'https://www.bbva.com.uy/personas/productos/inversion/deposito-plazo-fijo.html',
    sourceTitle: 'Depósito Plazo Fijo (página del producto)',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
    notes: [
      'Sólo pesos y dólares, de 30 a 367 días. Pide cuenta en el banco.',
      'La tabla publica 30, 91, 181 y 367 días; qué paga a un plazo intermedio no lo dice.',
    ],
    boards: BBVA_BOARDS,
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    sourceUrl:
      'https://www.scotiabank.com.uy/Personas/Cuentas/Hace-crecer-tus-Ahorros/deposito-plazo-fijo',
    sourceTitle: 'Depósito a Plazo Fijo (página del producto)',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
    notes: [
      'La página no imprime fecha de vigencia de sus tablas.',
      'Anuncia tasas preferenciales en Scotia en Línea y Scotia Móvil, pero no las publica: la tabla no distingue canal.',
    ],
    boards: SCOTIA_BOARDS,
  },
  {
    id: 'heritage',
    name: 'Heritage',
    sourceUrl: 'https://www.heritage.com.uy/Files/tarifarios/Tasas_de_interes.pdf',
    sourceTitle: 'Tasas de interés para depósitos a plazo fijo (PDF)',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
    notes: [
      'El documento es de febrero de 2026 y es el que el banco enlaza hoy.',
      'Sólo pesos y dólares; en dólares, desde USD 5.000.',
    ],
    boards: HERITAGE_BOARDS,
  },
]

/** Bancos que se buscaron y no entran, con el motivo. La página los nombra; no se rellenan. */
export const PLAZO_FIJO_BANCOS_FUERA: readonly PlazoFijoExcludedBank[] = [
  {
    id: 'santander',
    name: 'Santander',
    reason:
      'No publica su pizarra de plazo fijo: la ficha del producto dice que plazo, monto y tasa se completan en la orden de apertura de cada depósito, y su manual de tarifas no trae tasas de depósitos a plazo.',
    sourceUrl:
      'https://www.santander.com.uy/sites/default/files/2024-10/Depo%CC%81sito%20a%20Plazo%20Fijo%20-%20Santander_NOV29.pdf',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
  },
  {
    id: 'btg-pactual',
    name: 'BTG Pactual (ex HSBC)',
    reason:
      'HSBC Uruguay pasó a BTG Pactual en julio de 2026, y el sitio de BTG Pactual Uruguay no tiene una página de plazo fijo con tasas.',
    sourceUrl: 'https://www.btgpactual.uy/',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
  },
  {
    id: 'bandes',
    name: 'Bandes',
    reason:
      'Su plazo fijo en pesos figura en un tarifario con vigencia 2/2/2026 que no trae plazo fijo en dólares, y su página de documentos no deja confirmar si hay uno más nuevo.',
    sourceUrl:
      'https://www.bandes.com.uy/backend/uploads/documents/1770407617445-WEBTASASYCOMISIONESFebrero2026.pdf',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
  },
  {
    id: 'bhu',
    name: 'BHU',
    reason:
      'No ofrece un plazo fijo con tasa publicada: sus cuentas de ahorro en UI (Yo Ahorro, Yo te Ahorro) pagan 0 % de interés y lo que dan es acceso preferencial al crédito hipotecario.',
    sourceUrl:
      'https://www.bhu.com.uy/sites/default/files/2023-10/esahr02-especificaciones-de-cuentas-de-ahorro-previo-en-ui-yo-ahorro-y-yo-te-ahorro.pdf',
    readOn: PLAZO_FIJO_BANCOS_REVIEWED,
  },
]

// ── Lectura ───────────────────────────────────────────────────────────────────────────────────

/** ¿El plazo publicado cubre ese número de días? Tramo: dentro. Puntual: a ±5 días. */
export function termCovers(term: PlazoFijoTerm, days: number): boolean {
  if (!Number.isFinite(days) || days <= 0) return false
  if (term.minDays === term.maxDays) {
    return Math.abs(days - term.minDays) <= POINT_TERM_TOLERANCE_DAYS
  }
  return days >= term.minDays && days <= term.maxDays
}

/** ¿El tramo de monto incluye ese capital? Se redondea al entero: los tramos son en unidades enteras. */
export function bandCovers(band: PlazoFijoBand, amount: number): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false
  const a = Math.round(amount)
  return a >= band.min && (band.max == null || a <= band.max)
}

const MONEY_PREFIX: Readonly<Record<DepositCurrency, string>> = { UYU: '$', USD: 'USD', UI: 'UI' }
const MONEY_NAME: Readonly<Record<DepositCurrency, string>> = {
  UYU: 'pesos',
  USD: 'dólares',
  UI: 'unidades indexadas',
}

function money(currency: DepositCurrency, value: number): string {
  return `${MONEY_PREFIX[currency]} ${formatNumber(value, 0)}`
}

/** "rige desde el 04/08/2026" · "versión del 01/10/2026" · "documento de 02/2026" · "sin fecha impresa". */
export function vigenciaText(v: PlazoFijoVigencia): string {
  if (v.kind === 'sin-fecha' || !v.date) return 'sin fecha de vigencia impresa'
  const [y, m, d] = v.date.split('-')
  const shown = d ? `${d}/${m}/${y}` : `${m}/${y}`
  if (v.kind === 'rige-desde') return `rige desde el ${shown}`
  if (v.kind === 'version') return `versión del ${shown}`
  return `documento de ${shown}`
}

/** "2026-10-31" → "31 de octubre de 2026". Sin `Date`: no depende de la zona horaria. */
export function readOnText(iso: string): string {
  const MONTHS = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'setiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MONTHS[(m ?? 1) - 1]} de ${y}`
}

export interface PlazoFijoOffer {
  bankId: string
  bankName: string
  channel: PlazoFijoChannel
  channelLabel: string
  bandLabel: string
  termLabel: string
  rate: number
  vigencia: PlazoFijoVigencia
  sourceUrl: string
  readOn: string
}

export type PlazoFijoMissReason = 'moneda' | 'monto' | 'plazo'

export interface PlazoFijoMiss {
  bankId: string
  bankName: string
  reason: PlazoFijoMissReason
  /** Lo que el banco SÍ publica, en una frase: el mínimo o los plazos. */
  detail: string
  sourceUrl: string
}

export interface PlazoFijoComparison {
  /** De mayor a menor tasa. Empates: por banco y después por canal, para un orden estable. */
  offers: PlazoFijoOffer[]
  /** Un renglón por banco que no tiene fila para ese caso, con el motivo. */
  misses: PlazoFijoMiss[]
}

/** Enumera "30, 91, 181 y 367 días" o "91 – 180 y 181 – 366 días" sin repetir. */
function termsText(terms: readonly PlazoFijoTerm[]): string {
  const labels = [...new Set(terms.map(t => t.label.replace(/ días$/, '')))]
  if (labels.length <= 1) return `${labels[0] ?? ''} días`
  return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)} días`
}

/**
 * Qué publica cada banco para ese depósito: moneda, plazo en días y capital.
 *
 * Una oferta por canal y tramo de monto que cubra el capital y un plazo que cubra los días. Un
 * banco sin oferta va a `misses` con el motivo más útil para el visitante: si el monto entra en
 * algún canal, lo que falta es el plazo (y se listan los que publica); si no entra en ninguno, se
 * dice el mínimo; si no publica esa moneda, se dice eso.
 */
export function comparePlazoFijo(
  currency: DepositCurrency,
  days: number,
  amount: number,
  banks: readonly PlazoFijoBank[] = PLAZO_FIJO_BANCOS
): PlazoFijoComparison {
  const offers: PlazoFijoOffer[] = []
  const misses: PlazoFijoMiss[] = []

  for (const bank of banks) {
    const boards = bank.boards.filter(b => b.currency === currency)
    if (!boards.length) {
      misses.push({
        bankId: bank.id,
        bankName: bank.name,
        reason: 'moneda',
        detail: `no publica plazo fijo en ${MONEY_NAME[currency]}`,
        sourceUrl: bank.sourceUrl,
      })
      continue
    }

    const before = offers.length
    const amountFits: PlazoFijoBand[] = []
    for (const board of boards) {
      for (const band of board.bands) {
        if (!bandCovers(band, amount)) continue
        amountFits.push(band)
        const term = band.terms.find(t => termCovers(t, days))
        if (!term) continue
        offers.push({
          bankId: bank.id,
          bankName: bank.name,
          channel: board.channel,
          channelLabel: board.channelLabel,
          bandLabel: band.label,
          termLabel: term.label,
          rate: term.rate,
          vigencia: board.vigencia,
          sourceUrl: bank.sourceUrl,
          readOn: bank.readOn,
        })
      }
    }
    if (offers.length > before) continue

    if (amountFits.length) {
      misses.push({
        bankId: bank.id,
        bankName: bank.name,
        reason: 'plazo',
        detail: `para ese monto publica ${termsText(amountFits.flatMap(b => b.terms))}`,
        sourceUrl: bank.sourceUrl,
      })
      continue
    }

    const allBands = boards.flatMap(b => b.bands)
    const minimum = Math.min(...allBands.map(b => b.min))
    const tops = allBands.map(b => b.max)
    const maximum = tops.includes(null) ? null : Math.max(...(tops as number[]))
    misses.push({
      bankId: bank.id,
      bankName: bank.name,
      reason: 'monto',
      detail:
        maximum != null && Math.round(amount) > maximum
          ? `publica tasas hasta ${money(currency, maximum)}`
          : `el mínimo publicado es ${money(currency, minimum)}`,
      sourceUrl: bank.sourceUrl,
    })
  }

  const channelOrder: Record<PlazoFijoChannel, number> = {
    online: 0,
    'sin-distincion': 1,
    sucursal: 2,
  }
  offers.sort(
    (a, b) =>
      b.rate - a.rate ||
      a.bankName.localeCompare(b.bankName, 'es') ||
      channelOrder[a.channel] - channelOrder[b.channel]
  )
  return { offers, misses }
}
