// app/utils/mercadoPagoPromos.ts
// La letra chica de las promociones de Mercado Pago Uruguay: el TOPE, la VENTANA y el PAGO MÍNIMO.
//
// El mapa de Bankos —que es lo que /descuentos-con-tarjeta-uruguay ya sirve en vivo— trae el
// porcentaje y, en tres marcas, los días. No trae ninguna de estas tres cifras, y son las que
// cambian la decisión: un 20 % con tope de $ 300 por mes NO es un 20 %. Se agota a los $ 1.500 de
// consumo mensual y a partir de ahí el descuento marginal es cero. Con ese tope, un 20 % y un 10 %
// devuelven exactamente lo mismo a fin de mes: $ 300.
//
// POR QUÉ ESTO ES UN ARCHIVO Y NO UN JOB. Las cifras viven en
// `api.mercadopago.com/v2/discounts/campaign/<id>/terms/html`, y el `robots.txt` de ESE host dice
// `User-agent: * / Disallow: /`. La página que las enlaza (`mercadopago.com.uy/mp/promociones`) sí
// está permitida, pero publica sólo el nombre del comercio. Así que no hay barrido programado: una
// persona corre `npm run mp_promos`, lee lo que salió y lo escribe acá con la fecha del día. Es el
// mismo trato que reciben los tarifarios bancarios en `transferFees.ts`, que también se leen a
// mano y se publican fechados y enlazados.
//
// MÓDULO PURO (sin Vue/Nuxt) para que la página y su test unitario compartan una sola fuente de
// verdad. Informativo: cada fila enlaza los términos oficiales de los que salió.

/** Fecha (YYYY-MM-DD) en que se leyó cada campaña contra su documento de términos. */
export const MERCADO_PAGO_PROMOS_REVIEWED = '2026-09-10'

/** La página de la que salen los identificadores de campaña. */
export const MERCADO_PAGO_LISTING = 'https://www.mercadopago.com.uy/mp/promociones'

export type MercadoPagoChannel = 'dinero_en_cuenta' | 'qr' | 'web' | 'app'

export interface MercadoPagoPromo {
  /** Número de cupón / campaña: la clave estable, y lo que permite reauditar la fila. */
  campaignId: string
  /** Marca(s) de Bankos a las que corresponde. Vacío = la campaña no se pudo atribuir. */
  bankosBrandIds: string[]
  /** Nombre de la marca tal como lo escribe el propio texto de términos. */
  brandLabel: string
  percent: number | null
  capUyu: number | null
  capPeriod: 'mes' | 'campania' | null
  minPaymentUyu: number | null
  /** Días que acota el TEXTO DE TÉRMINOS. `null` = el texto no los acota. */
  days: string | null
  channels: MercadoPagoChannel[]
  startsAt: string | null
  endsAt: string | null
  /** El fin declarado cae antes del inicio declarado. Pasa: ver la campaña 13753764. */
  datesInconsistent: boolean
  termsUrl: string
  /**
   * Discrepancia contra lo que publica el mapa de Bankos para la misma marca.
   *
   * No se resuelve acá. Las dos fuentes son públicas y se contradicen; la página muestra las dos y
   * dice de dónde sale cada una, que es lo único que se puede afirmar sin datos de adentro.
   */
  disagreement?: string
}

/**
 * Las once campañas que la página enlazaba y cuyos términos Mercado Pago sirvió el 2026-09-10.
 *
 * `rawTerms` no se guarda: el párrafo entero pesa ~1 kB por fila, viaja en el HTML de la página y
 * `termsUrl` lleva a la fuente sin intermediarios. Lo que sí se conserva es todo lo que la página
 * afirma.
 */
export const MERCADO_PAGO_PROMOS: readonly MercadoPagoPromo[] = [
  {
    campaignId: '14063740',
    bankosBrandIds: ['mcdonalds'],
    brandLabel: "McDonald's",
    percent: 20,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: 'lunes a viernes',
    channels: ['dinero_en_cuenta', 'qr', 'app'],
    startsAt: '2026-08-05T09:10:00.000Z',
    endsAt: '2026-09-30T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/14063740/terms/html',
  },
  {
    campaignId: '13613532',
    bankosBrandIds: ['subway'],
    brandLabel: 'Subway',
    percent: 20,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'app'],
    startsAt: '2026-05-06T16:00:00.000Z',
    endsAt: '2026-09-30T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13613532/terms/html',
    disagreement:
      'El mapa de Bankos la publica como "los lunes, martes y miércoles". El texto de términos de Mercado Pago no acota ningún día.',
  },
  {
    campaignId: '13424690',
    bankosBrandIds: ['tata'],
    brandLabel: 'Tata Supermercados',
    percent: 10,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'app'],
    startsAt: '2026-04-01T00:00:00.000Z',
    endsAt: '2026-09-30T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13424690/terms/html',
    disagreement:
      'El mapa de Bankos la publica como "los jueves y viernes". El texto de términos de Mercado Pago no acota ningún día.',
  },
  {
    campaignId: '13025745',
    bankosBrandIds: ['radiotaxi141'],
    brandLabel: 'Radio Taxi 141',
    percent: 10,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'app'],
    startsAt: '2026-05-01T00:00:00.000Z',
    endsAt: '2027-03-31T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13025745/terms/html',
  },
  {
    campaignId: '13037960',
    bankosBrandIds: ['lahacienda'],
    brandLabel: 'Mundo Canino y La Hacienda',
    percent: 15,
    capUyu: 500,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'qr'],
    startsAt: '2026-02-01T00:00:00.000Z',
    endsAt: '2026-09-30T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13037960/terms/html',
  },
  {
    campaignId: '13753764',
    bankosBrandIds: ['veterinariaalem'],
    brandLabel: 'Veterinaria Alem',
    percent: 15,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'app'],
    startsAt: '2026-06-01T11:11:00.000Z',
    endsAt: '2026-03-31T23:59:00.000Z',
    datesInconsistent: true,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13753764/terms/html',
    disagreement:
      'Los propios términos se contradicen: declaran vigencia "del 01/06/2026 al 31/03/2026", o sea que terminan tres meses antes de empezar. No se puede decir si está vigente o vencida sin elegir una de las dos lecturas.',
  },
  {
    campaignId: '13173706',
    bankosBrandIds: ['eramio'],
    brandLabel: 'Era Mio',
    percent: 15,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'app'],
    startsAt: '2026-02-20T00:00:00.000Z',
    endsAt: '2026-10-31T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13173706/terms/html',
  },
  {
    campaignId: '13317324',
    bankosBrandIds: ['guapa!'],
    brandLabel: 'Guapa, Pappolino, Paprika y Grego',
    percent: 15,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'qr', 'web'],
    startsAt: '2026-03-16T00:00:00.000Z',
    endsAt: '2026-09-30T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13317324/terms/html',
  },
  {
    campaignId: '13126893',
    bankosBrandIds: ['elreydelentretenimiento'],
    brandLabel: 'El Rey del Entretenimiento',
    percent: 10,
    capUyu: 500,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'qr', 'web'],
    startsAt: '2026-05-21T16:00:00.000Z',
    endsAt: '2026-12-31T23:45:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13126893/terms/html',
  },
  {
    campaignId: '12297789',
    bankosBrandIds: ['disershop'],
    brandLabel: 'Diser LTDA (Disershop)',
    percent: 15,
    capUyu: 300,
    capPeriod: 'mes',
    minPaymentUyu: 1,
    days: null,
    channels: ['dinero_en_cuenta', 'app'],
    startsAt: '2025-07-14T00:00:00.000Z',
    endsAt: '2026-09-30T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/12297789/terms/html',
  },
  {
    campaignId: '13535609',
    // La tarjeta de La Espumería es la que enlaza esta campaña —por posición, que es lo único que
    // la página ofrece—, pero su texto no la nombra: habla de "productos o servicios seleccionados"
    // y la firma MercadoLibre S.R.L. La atribución queda vacía a propósito.
    bankosBrandIds: [],
    brandLabel: 'Productos o servicios seleccionados',
    percent: 10,
    capUyu: 10_000,
    capPeriod: 'campania',
    minPaymentUyu: 1,
    days: null,
    channels: ['web', 'app'],
    startsAt: '2026-08-26T17:15:00.000Z',
    endsAt: '2026-09-30T23:59:00.000Z',
    datesInconsistent: false,
    termsUrl: 'https://api.mercadopago.com/v2/discounts/campaign/13535609/terms/html',
    disagreement:
      'Es la campaña que enlaza la tarjeta de La Espumería, pero su texto no menciona esa marca y declara 10 % donde el mapa de Bankos publica 15 %. No se le atribuye la marca.',
  },
] as const

/**
 * Campañas que la página enlaza en su HTML y cuyos términos Mercado Pago ya no sirve.
 *
 * Se declaran en vez de omitirse: una promoción sin términos no se puede publicar con tope ni con
 * vigencia, y decir "no está" es más útil que dejar el hueco sin explicación.
 */
export const MERCADO_PAGO_UNAVAILABLE: readonly string[] = ['12445280']

const BY_BRAND = new Map<string, MercadoPagoPromo>()
for (const promo of MERCADO_PAGO_PROMOS) {
  for (const brandId of promo.bankosBrandIds) BY_BRAND.set(brandId, promo)
}

/** La campaña que corresponde a una marca del mapa de Bankos, si se pudo atribuir. */
export function mercadoPagoPromoFor(brandId: string | null | undefined): MercadoPagoPromo | null {
  if (!brandId) return null
  return BY_BRAND.get(brandId) ?? null
}

/**
 * Estado de una promoción a una fecha dada.
 *
 * `indeterminado` no es un caso teórico: la campaña 13753764 termina antes de empezar. Publicarla
 * como vigente o como vencida sería elegir una de las dos mentiras.
 */
export function mercadoPagoStatus(
  promo: Pick<MercadoPagoPromo, 'startsAt' | 'endsAt' | 'datesInconsistent'>,
  now: Date = new Date()
): 'vigente' | 'vencida' | 'futura' | 'indeterminado' {
  if (promo.datesInconsistent) return 'indeterminado'
  if (!promo.startsAt || !promo.endsAt) return 'indeterminado'
  const iso = now.toISOString()
  if (iso < promo.startsAt) return 'futura'
  if (iso > promo.endsAt) return 'vencida'
  return 'vigente'
}

/**
 * Consumo a partir del cual el tope deja el descuento en cero marginal.
 *
 * Es la cifra que ninguna de las dos fuentes publica y la única que vuelve comparable un 20 % con
 * un 10 %: con tope de $ 300, el 20 % se agota a los $ 1.500 de consumo y el 10 % a los $ 3.000.
 */
export function mercadoPagoSaturation(
  promo: Pick<MercadoPagoPromo, 'percent' | 'capUyu'>
): number | null {
  if (!promo.percent || promo.percent <= 0 || promo.capUyu === null) return null
  return Math.round((promo.capUyu / promo.percent) * 100)
}

/** Cuánto ahorra de verdad un consumo mensual dado, ya con el tope aplicado. */
export function mercadoPagoSavings(
  promo: Pick<MercadoPagoPromo, 'percent' | 'capUyu'>,
  spendUyu: number
): number | null {
  if (!promo.percent || promo.percent <= 0) return null
  const gross = (Math.max(0, spendUyu) * promo.percent) / 100
  return promo.capUyu === null ? gross : Math.min(gross, promo.capUyu)
}

/** Días que faltan para el fin declarado, o `null` si no hay fin utilizable. */
export function mercadoPagoDaysLeft(
  promo: Pick<MercadoPagoPromo, 'endsAt' | 'datesInconsistent'>,
  now: Date = new Date()
): number | null {
  if (promo.datesInconsistent || !promo.endsAt) return null
  const ms = new Date(promo.endsAt).getTime() - now.getTime()
  if (!Number.isFinite(ms)) return null
  return Math.ceil(ms / 86_400_000)
}
