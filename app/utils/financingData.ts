// Baseline figures for "¿cuotas o contado?" — the verified snapshot the page falls back to
// when the live refresh has nothing better.
//
// PURE module. Every number here was checked against a primary source (BCU, INE, DGI, BROU's
// pizarra, Antel's own product page) in July 2026, and every one carries its as-of date,
// because all of them move.
//
// A note on why the guardrails in the backend `classes/financing/bands.ts` are as tight as they are:
// the internet is full of numbers that would flip this page's conclusion the wrong way.
// See BAD_NUMBERS below — they are not hypothetical, they are the top search results.

export interface Figure {
  /** The number itself. */
  value: number
  /** What it is, in the page's own words. */
  label: string
  unit: '%' | 'UYU' | 'UI' | 'pp'
  asOf: string
  source: string
  nota?: string
}

/** Macro anchors. Everything a peso investment can pay hangs off these. */
export const MACRO = {
  tpm: {
    value: 5.75,
    label: 'Tasa de Política Monetaria (BCU)',
    unit: '%',
    asOf: '2026-07-01',
    source: 'BCU — COPOM, decisión unánime',
    nota: 'Bajó de 7,50% a 5,75% en el primer semestre de 2026. El mercado descuenta subas hacia 6,5%.',
  },
  inflacion: {
    value: 4.25,
    label: 'Inflación interanual (IPC)',
    unit: '%',
    asOf: '2026-06',
    source: 'INE',
    nota: 'La empujan combustibles y servicios. Es el piso que cualquier rendimiento tiene que superar para no perder.',
  },
  inflacionTransables: {
    value: 1.51,
    label: 'Inflación de bienes transables',
    unit: '%',
    asOf: '2026-06',
    source: 'INE',
    nota: 'Un celular es un transable. Por eso "el celu va a subir con la inflación" no se sostiene.',
  },
  expectativas24m: {
    value: 4.5,
    label: 'Inflación esperada a 24 meses',
    unit: '%',
    asOf: '2026-07',
    source: 'BCU — Encuesta de Expectativas',
    nota: 'Analistas 4,5%; empresas 5,0%. La banda meta del BCU es 3%–6%.',
  },
} as const satisfies Record<string, Figure>

/** What a retail saver with ~UYU 50.000 can actually earn, for 24 months. Net of fees and IRPF. */
export interface Instrumento {
  id: string
  nombre: string
  bruto: number
  /** IRPF withheld on the interest. Public debt is exempt; peso deposits of 1–3 years pay 2,5%. */
  irpf: number
  neto: number
  minimo: number
  liquidez: string
  riesgo: 'muy bajo' | 'bajo' | 'medio'
  asOf: string
  fuente: string
  nota?: string
}

export const INSTRUMENTOS: readonly Instrumento[] = Object.freeze([
  {
    id: 'brou-pf-ebrou',
    nombre: 'Plazo fijo BROU en pesos (e-BROU, 732–1096 días)',
    bruto: 5.5,
    irpf: 2.5,
    neto: 5.37,
    minimo: 5000,
    liquidez: 'Inmovilizado 24 meses',
    riesgo: 'muy bajo',
    asOf: '2026-07-01',
    fuente: 'BROU — pizarra',
    nota: 'El mejor rendimiento seguro y verificable. En sucursal la misma imposición paga 4,13%: entrar por la web vale 137 puntos básicos.',
  },
  {
    id: 'fondo-pesos',
    nombre: 'Fondo de dinero en pesos (LRM, liquidez diaria)',
    bruto: 4.5,
    irpf: 0,
    neto: 4.4,
    minimo: 4000,
    liquidez: 'Rescate diario (t+0)',
    riesgo: 'bajo',
    asOf: '2026-06',
    fuente: 'Fondo Centenario Gestión de Liquidez / Prex Inversión Violeta',
    nota: 'Exento de IRPF porque solo tiene deuda del BCU y del Estado. Es el único vehículo compatible con ir pagando cuotas, porque podés sacar cuando querés. No lo cubre el seguro de depósitos (COPAB).',
  },
  {
    id: 'brou-pf-ui',
    nombre: 'Plazo fijo BROU en UI (e-BROU, 732–1096 días)',
    bruto: 1.7,
    irpf: 7,
    neto: 5.6,
    minimo: 9900,
    liquidez: 'Inmovilizado 24 meses',
    riesgo: 'muy bajo',
    asOf: '2026-07-01',
    fuente: 'BROU — pizarra',
    nota: '1,70% REAL, por encima de la inflación. El neto de 5,6% supone inflación de 4,25%. Ojo: la UI se grava al 7% e incluye la compensación por inflación, no solo el rendimiento real.',
  },
  {
    id: 'itau-pf',
    nombre: 'Plazo fijo Itaú en pesos (732 días)',
    bruto: 5,
    irpf: 2.5,
    neto: 4.88,
    minimo: 10000,
    liquidez: 'No se puede cancelar antes',
    riesgo: 'muy bajo',
    asOf: '2026-07-01',
    fuente: 'Itaú — tarifario',
  },
  {
    id: 'scotia-pf',
    nombre: 'Plazo fijo Scotiabank en pesos ($25k–$250k, 367–999 días)',
    bruto: 1.95,
    irpf: 2.5,
    neto: 1.9,
    minimo: 25000,
    liquidez: 'Inmovilizado',
    riesgo: 'muy bajo',
    asOf: '2026-07-12',
    fuente: 'Scotiabank',
    nota: 'Pierde 2,3% al año contra la inflación. Menos de la mitad de lo que paga BROU por lo mismo.',
  },
  {
    id: 'caja-ahorro',
    nombre: 'Caja de ahorro en pesos',
    bruto: 0,
    irpf: 0,
    neto: 0,
    minimo: 0,
    liquidez: 'Total',
    riesgo: 'muy bajo',
    asOf: '2026-07-12',
    fuente: 'BROU',
    nota: 'Cero. Dejar la plata en la cuenta pierde 4,25% al año contra la inflación.',
  },
])

/** The realistic hurdle: the best safe, verifiable net return for this ticket size. */
export const MEJOR_RENDIMIENTO_NETO = 5.4

/** The rendimiento to default the calculator to — the fund, because it is the only vehicle
 *  compatible with drawing cash down every month to pay a cuota. */
export const RENDIMIENTO_DEFAULT = 4.5

/** Costs of the financing side that people forget. These are what flip the verdict. */
export const COSTOS_OCULTOS = {
  ivaDebitoPuntos: {
    value: 2,
    label: 'Puntos de IVA que da el débito (y no da el crédito)',
    unit: 'pp',
    asOf: '2026-07',
    source: 'Ley 19.210 art. 87 + Decreto 203/014',
    nota: 'Del 22% al 20%. Sobre el precio con IVA eso es 1,64% (DGI lo publica como alícuota ficta). La tarjeta de crédito no lo tiene, ni en 1 pago ni en 24. El efectivo tampoco.',
  },
  seguroSaldoPermil: {
    value: 3,
    label: 'Seguro sobre saldo deudor',
    unit: '%',
    asOf: '2026-06',
    source: 'Santander e Itaú — tarifarios',
    nota: '3 por mil por mes sobre el saldo que todavía debés. Un plan a 24 cuotas mantiene saldo vivo dos años.',
  },
  moraTea: {
    value: 81,
    label: 'Interés de mora en tarjeta, pesos',
    unit: '%',
    asOf: '2026-05',
    source: 'Santander — tarifario',
    nota: 'La financiación normal ya es 69% TEA. El tope legal de mora es 144,25%.',
  },
  topeUsura: {
    value: 125.12,
    label: 'Tope legal de usura (consumo, pesos, hasta 366 días)',
    unit: '%',
    asOf: '2026-07-01',
    source: 'BCU — tasas medias',
    nota: 'Tasa media del mercado: 80,72%. El BCU lo recalcula cada trimestre.',
  },
} as const satisfies Record<string, Figure>

/** Loyalty programs that publish a hard peso value per point. The ones that do not are omitted
 *  on purpose — see PROGRAMAS_OPACOS. */
export interface Programa {
  id: string
  nombre: string
  creditoPct: number
  debitoPct: number | null
  vencimiento: string
  nota?: string
}

export const PROGRAMAS: readonly Programa[] = Object.freeze([
  {
    id: 'brou',
    nombre: 'BROU Recompensa',
    creditoPct: 1,
    debitoPct: 0.33,
    vencimiento: '24 meses',
    nota: '1 punto = $1. Crédito: 1 punto cada $100. Débito y prepaga: 1 punto cada $300. Sin tope de acumulación; canje mínimo 400 puntos.',
  },
  {
    id: 'santander',
    nombre: 'Soy Santander',
    creditoPct: 1.25,
    debitoPct: 0.42,
    vencimiento: 'Solo por 12 meses de inactividad',
    nota: 'Escalonado: Internacional 1,00%, Platinum 1,11%, Black/Infinite 1,25%. Los que superan a BROU tienen costo anual y requisitos de ingreso que se comen la diferencia en una compra puntual.',
  },
  {
    id: 'scotia',
    nombre: 'Scotia Puntos',
    creditoPct: 1.25,
    debitoPct: null,
    vencimiento: '36 meses',
    nota: 'Visa Infinite 1,25%, Platinum 1,00%, Internacional 0,67%. Trampa: si no usás la tarjeta por 6 meses perdés TODO el saldo, y no se puede canjear parcialmente.',
  },
])

/** Programs whose effective % literally cannot be computed, because they never publish what a
 *  point is worth. That they do not publish it IS the finding. */
export const PROGRAMAS_OPACOS = Object.freeze([
  {
    nombre: 'Itaú Volar',
    gana: '1 milla por USD 1 (crédito)',
    falta: 'No publica el valor en pesos de la milla.',
  },
  {
    nombre: 'OCA Metraje',
    gana: 'No publica la tasa de acumulación',
    falta: 'No publica el valor del Metro, y se reserva el derecho de cambiarlo.',
  },
  {
    nombre: 'Creditel Credipuntos',
    gana: '1 punto cada $25',
    falta: 'No publica el valor del Credipunto.',
  },
])

/**
 * The market, as of 2026-07-12. Prices and promos rotate weekly in Uruguay — this is a dated
 * snapshot, and the page says so out loud. The point of the table is not the prices; it is
 * that the same phone carries implicit rates from 0% to 24% depending only on where you sign.
 */
export interface CasoMercado {
  id: string
  vendedor: string
  producto: string
  precioContado: number
  cuota: number
  cuotas: number
  financiacion: 'tarjeta' | 'factura'
  /** Null when the seller does not disclose enough to compute it. */
  nota: string
  destacado?: boolean
}

export const CASOS: readonly CasoMercado[] = Object.freeze([
  {
    id: 'antel-ptf',
    vendedor: 'Antel',
    producto: 'iPhone 17 256GB — plan 40 GIGAS, financiado en la factura (PTF)',
    precioContado: 46190,
    cuota: 2389,
    cuotas: 24,
    financiacion: 'factura',
    nota: 'Antel publica el precio contado (PCE $46.190) y el total financiado (PTF $57.339), pero nunca la tasa. Sale de ahí: 23,97% anual. El factor es idéntico en los 11 planes y a 6, 12, 18 y 24 cuotas — no hay plazo barato.',
    destacado: true,
  },
  {
    id: 'antel-itau-0',
    vendedor: 'Antel × Visa Itaú',
    producto: 'iPhone 17 256GB — "24 cuotas sin recargo", solo en locales físicos',
    precioContado: 46190,
    cuota: 1925,
    cuotas: 24,
    financiacion: 'tarjeta',
    nota: 'ESCENARIO A VERIFICAR. Si el 0% va sobre el precio contado, la cuota es de $1.925 y es el mejor negocio del mercado. Si va sobre el PTF ya recargado, la cuota es de $2.389 y el 24% sigue adentro. Antel no lo aclara. Preguntá el monto de la cuota.',
    destacado: true,
  },
  {
    id: 'tigo',
    vendedor: 'Tigo (ex-Movistar)',
    producto: 'iPhone 17 256GB',
    precioContado: 50031,
    cuota: 4169,
    cuotas: 12,
    financiacion: 'tarjeta',
    nota: '12 × $4.169 = $50.028, contra un contado de $50.031. Es un 0% de verdad: la cuota × 12 da el precio contado.',
  },
  {
    id: 'claro-oca',
    vendedor: 'Claro + 20% OCA',
    producto: 'iPhone 17 256GB (lista $66.000)',
    precioContado: 52800,
    cuota: 4400,
    cuotas: 12,
    financiacion: 'tarjeta',
    nota: 'El descuento de 20% con OCA vale $13.200 — seis veces más que todo lo que se gana o se pierde discutiendo cuotas. Y solo lo conseguís con esa tarjeta: pagando en efectivo lo perdés.',
  },
])

/**
 * Antel's plan tiers. The handset gets cheaper as the plan gets dearer, which is a subsidy
 * dressed as a discount — and it costs far more than the financing question the thread argued
 * about. Total = precio contado del equipo + 24 meses de plan.
 */
export const PLANES_ANTEL: readonly {
  plan: string
  equipo: number
  mensual: number
  total: number
}[] = Object.freeze([
  { plan: '40 GB', equipo: 46190, mensual: 635, total: 61430 },
  { plan: '50 GB', equipo: 44673, mensual: 790, total: 63633 },
  { plan: '130 GB', equipo: 41024, mensual: 1435, total: 75464 },
  { plan: '160 GB', equipo: 40088, mensual: 1695, total: 80768 },
  { plan: '180 GB', equipo: 39386, mensual: 1890, total: 84746 },
  { plan: '210 GB', equipo: 35198, mensual: 2290, total: 90158 },
  { plan: 'Ent. Disney', equipo: 33715, mensual: 2599, total: 96091 },
  { plan: 'Ent. Netflix', equipo: 30740, mensual: 2799, total: 97916 },
  { plan: 'Ent. Plus', equipo: 25670, mensual: 3420, total: 107750 },
])

/**
 * Numbers that are circulating, are wrong, and would flip this page's conclusion. Kept in the
 * source so that whoever edits this file later does not "fix" our figures to match them, and
 * so the live-refresh guardrails have a documented reason to exist.
 */
export const BAD_NUMBERS = Object.freeze([
  {
    dato: 'LRM a 8,54% / 8,74% / 8,78%',
    donde: 'Ámbito, 28-jun-2026 — primer resultado de búsqueda',
    porQueEsFalso:
      'Contradice la TPM de 5,75%, la call de 5,80% y una Nota del Tesoro a 19 meses que cortó a 6,61%. Una letra a 30 días no puede pagar 275 puntos por encima de la tasa de política: los bancos la arbitrarían al instante. Las LRM pagan ~6%.',
  },
  {
    dato: 'Prex 20,81% TNA · AstroPay 17%',
    donde: 'Buscadores, al mezclar marcas iguales',
    porQueEsFalso:
      'Son productos en pesos ARGENTINOS. Con la TPM en 5,75%, ningún instrumento en pesos uruguayos paga eso.',
  },
  {
    dato: 'Débito da 4 puntos de IVA',
    donde: 'Blogs uruguayos que no se actualizaron',
    porQueEsFalso: 'Son 2 desde 2016. El Decreto 97/020 bajó de 4 a 2 en mayo de 2020.',
  },
  {
    dato: 'Tabla comparativa de fondos "República Renta Pesos", "Itaú Renta Fija UYU", "Scotia Ahorro Pesos"',
    donde: 'ahorrin.app y sitios similares',
    porQueEsFalso:
      'Esos fondos no existen. Itaú publica dos fondos locales (Liquidez en Pesos y en Dólares) y República AFISA no tiene fondos minoristas. Es contenido generado automáticamente.',
  },
])
