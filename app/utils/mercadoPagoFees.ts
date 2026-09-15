// Cuánto cobra Mercado Pago por cobrar en Uruguay, por medio de cobro y plazo de liberación.
// Fuente: páginas oficiales de mercadopago.com.uy (ayuda + landings comerciales), leídas con
// navegador real el 2026-09-15 — el fetch simple da 403. Ver dossier-mercadopago.md para las
// citas verbatim y las URLs de cada fila. Puro: sin Vue/Nuxt, sin I/O, así que se testea con
// Vitest plano y es la única fuente de verdad para la tabla, la calculadora y el FAQ de la página.
import type { FaqItem } from './faqAnswers'

export const MP_FEES_VERIFIED_AT = '2026-09-15'

export type MpMethod = 'qr' | 'link' | 'checkout' | 'suscripcion' | 'point'
export type MpRelease = 'instante' | '21 días'

export interface MpFeeRow {
  method: MpMethod
  label: string
  /** Con qué paga el cliente (o cuotas, en Point). */
  payer: string
  release: MpRelease
  /** Porcentaje sin IVA, tal como lo publica Mercado Pago ("+ IVA"). */
  pct: number
}

export const MP_FEES: readonly MpFeeRow[] = [
  { method: 'qr', label: 'Código QR', payer: 'Tarjeta de crédito', release: 'instante', pct: 3.59 },
  { method: 'qr', label: 'Código QR', payer: 'Tarjeta de crédito', release: '21 días', pct: 2.99 },
  {
    method: 'qr',
    label: 'Código QR',
    payer: 'Débito, dinero en Mercado Pago u otras billeteras',
    release: 'instante',
    pct: 1.15,
  },
  {
    method: 'link',
    label: 'Link de pago',
    payer: 'Todos los medios',
    release: 'instante',
    pct: 5.99,
  },
  {
    method: 'link',
    label: 'Link de pago',
    payer: 'Todos los medios',
    release: '21 días',
    pct: 4.99,
  },
  {
    method: 'checkout',
    label: 'Checkout (sitio web)',
    payer: 'Todos los medios',
    release: 'instante',
    pct: 5.99,
  },
  {
    method: 'checkout',
    label: 'Checkout (sitio web)',
    payer: 'Todos los medios',
    release: '21 días',
    pct: 4.99,
  },
  {
    method: 'suscripcion',
    label: 'Suscripciones',
    payer: 'Todos los medios',
    release: 'instante',
    pct: 5.99,
  },
  {
    method: 'suscripcion',
    label: 'Suscripciones',
    payer: 'Todos los medios',
    release: '21 días',
    pct: 4.99,
  },
  { method: 'point', label: 'Point Smart', payer: 'Débito', release: 'instante', pct: 2.25 },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito en 1 cuota',
    release: 'instante',
    pct: 5.99,
  },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito hasta 3 cuotas',
    release: 'instante',
    pct: 8.49,
  },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito hasta 6 cuotas',
    release: 'instante',
    pct: 9.49,
  },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito hasta 12 cuotas',
    release: 'instante',
    pct: 11.99,
  },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito en 1 cuota',
    release: '21 días',
    pct: 5.24,
  },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito hasta 3 cuotas',
    release: '21 días',
    pct: 7.74,
  },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito hasta 6 cuotas',
    release: '21 días',
    pct: 8.74,
  },
  {
    method: 'point',
    label: 'Point Smart',
    payer: 'Crédito hasta 12 cuotas',
    release: '21 días',
    pct: 11.24,
  },
]

/**
 * Recargo por ofrecer cuotas sin interés (+ IVA), fijo sin importar la cantidad de cuotas (3, 6, 9
 * o 12). No aplica a Point, que ya integra el costo de financiación en el % por tramo de `MP_FEES`.
 */
export const MP_INSTALLMENT_SURCHARGE = { link: 2.49, checkout: 2.49, qr: 2.99 } as const

export const IVA_PCT = 22

const round2 = (n: number) => Math.round(n * 100) / 100

/** Reparte una venta entre comisión, IVA de la comisión (22 %) y neto. `null` ante entradas inválidas. */
export function feeForSale(
  amount: number,
  pct: number
): { fee: number; iva: number; net: number } | null {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(pct) || pct < 0) return null
  const fee = round2((amount * pct) / 100)
  const iva = round2((fee * IVA_PCT) / 100)
  return { fee, iva, net: round2(amount - fee - iva) }
}

export interface MpPointDevice {
  name: string
  /** Precio de oferta vigente, en pesos uruguayos. */
  price: number
  note: string
}

/**
 * Point Smart (2) es el ÚNICO modelo Point a la venta en Uruguay al 2026-09-15 — Point Mini y
 * Point Tap/Air redirigen a la home del sitio uruguayo (existen en otros países de la región, acá
 * no). Precios y ficha técnica: dossier §5.
 */
export const MP_POINT_DEVICES: readonly MpPointDevice[] = [
  {
    name: 'Point Smart (2)',
    price: 3699,
    note: 'Precio de oferta (26% OFF sobre $ 5.000 de lista), o 12 cuotas de $ 308,25. Envío gratis a todo el país. Incluye rollos de impresión gratis de por vida, SIM 4G gratis, QR impreso gratis y 1 año de garantía. Pantalla táctil 6,0", batería 3.300 mAh, 4G + WiFi, Android 12. Point Mini y Point Tap no están a la venta en Uruguay.',
  },
]

export interface MpWithdrawal {
  cost: string
  timing: string
  forcedAfterDays: number
  forcedNote: string
}

/** Retiro a cuenta bancaria uruguaya en pesos: dossier §6. */
export const MP_WITHDRAWAL: MpWithdrawal = {
  cost: 'Gratis',
  timing: '1 día hábil',
  forcedAfterDays: 30,
  forcedNote:
    'Si el dinero queda disponible en tu cuenta más de 30 días, Mercado Pago lo transfiere sin costo adicional a la cuenta bancaria o al instrumento de dinero electrónico uruguayo que tengas registrado a tu nombre.',
}

export interface MpReleaseInfo {
  options: readonly MpRelease[]
  howToChange: string
}

/** Los dos plazos publicados hoy y dónde se elige cada uno: dossier §7. */
export const MP_RELEASE: MpReleaseInfo = {
  options: ['instante', '21 días'],
  howToChange:
    'Se elige por separado para cada medio de cobro desde Más > Tu negocio > Costos > "Configurar", tanto en la app como en el sitio web.',
}

export interface MpSource {
  label: string
  url: string
}

export const MP_SOURCES: readonly MpSource[] = [
  {
    label: 'Mercado Pago — ¿Cuánto cuesta recibir pagos con QR?',
    url: 'https://www.mercadopago.com.uy/ayuda/3605',
  },
  {
    label: 'Mercado Pago — Costos del link de pago',
    url: 'https://www.mercadopago.com.uy/ayuda/33392',
  },
  {
    label: 'Mercado Pago — Point Smart: precio y comisiones',
    url: 'https://www.mercadopago.com.uy/herramientas-para-vender/lectores-point/point-smart',
  },
  {
    label: 'Mercado Pago — ¿Cómo ofrezco cuotas sin interés?',
    url: 'https://www.mercadopago.com.uy/ayuda/3299',
  },
  {
    label: 'Mercado Pago — Cómo retirar el dinero a tu cuenta bancaria',
    url: 'https://www.mercadopago.com.uy/ayuda/retirar-para-cuenta-bancaria_273',
  },
]

export const MP_FAQ: readonly FaqItem[] = [
  {
    id: 'cuanto-cobra',
    question: '¿Cuánto cobra Mercado Pago por cada venta?',
    answer:
      'Entre 1,15 % y 11,99 % + IVA, según el medio de cobro (QR, link de pago, checkout, suscripción o Point), el medio de pago del cliente y el plazo elegido para tener el dinero disponible. El extremo más barato es QR pagado con débito o dinero en cuenta; el más caro es Point Smart con crédito en 12 cuotas al instante.',
  },
  {
    id: 'que-sale-mas-barato',
    question: '¿QR, link de pago o Point: qué sale más barato?',
    answer:
      'QR cobrado con débito o dinero en Mercado Pago es lo más barato: 1,15 % + IVA. El link de pago (o el checkout del sitio web) cobra 5,99 % + IVA al instante, sin importar el medio de pago. Point Smart depende del plazo y la tarjeta: 2,25 % + IVA con débito, desde 5,99 % + IVA con crédito.',
  },
  {
    id: 'cuando-libera-plata',
    question: '¿Cuándo me libera Mercado Pago el dinero de una venta?',
    answer:
      'Elegís entre dos plazos por cada medio de cobro: al instante o a 21 días. La diferencia la paga el propio porcentaje: pedir el dinero al instante cuesta más comisión que esperar los 21 días (por ejemplo, link de pago 5,99 % al instante contra 4,99 % a 21 días).',
  },
  {
    id: 'cuanto-sale-point',
    question: '¿Cuánto sale el lector Point de Mercado Pago?',
    answer:
      'El único modelo a la venta en Uruguay es el Point Smart (2), a $ 3.699 de oferta (26 % off sobre $ 5.000 de lista) o 12 cuotas de $ 308,25, con envío gratis. Point Mini y Point Tap no están disponibles en Uruguay.',
  },
  {
    id: 'iva-de-la-comision',
    question: '¿El porcentaje que cobra Mercado Pago ya incluye el IVA?',
    answer:
      'No: todos los porcentajes publicados son "+ IVA". Mercado Pago te factura la comisión con el 22 % de IVA agregado, así que el costo real de cobrar es el porcentaje de la tabla más ese 22 % sobre la propia comisión.',
  },
  {
    id: 'cuotas-sin-interes',
    question: '¿Cuánto cuesta ofrecer cuotas sin interés?',
    answer:
      'En QR, link de pago y checkout se suma un cargo fijo aparte de la comisión base: 2,49 % + IVA en link de pago y checkout, 2,99 % + IVA en QR, sea que el comprador elija 3, 6, 9 o 12 cuotas. En Point Smart no hay recargo aparte: el costo de la financiación ya está integrado en el porcentaje según el tramo de cuotas.',
  },
  {
    id: 'retirar-al-banco',
    question: '¿Cuánto sale y cuánto tarda retirar la plata a mi cuenta bancaria?',
    answer:
      'Es gratis. El dinero se acredita dentro del siguiente día hábil a que pedís el retiro, en pesos, a una cuenta bancaria o instrumento de dinero electrónico uruguayo.',
  },
  {
    id: 'iva-monotributo',
    question: '¿El IVA de la comisión se puede descontar si soy monotributista?',
    answer:
      'Mercado Pago no publica esto: es una regla del régimen tributario uruguayo, no de la comisión en sí. Consultá con tu contador antes de dar por sentado el tratamiento — en régimen general de IVA suele poder descontarse pidiendo la e-factura desde tu cuenta de Mercado Pago.',
  },
]
