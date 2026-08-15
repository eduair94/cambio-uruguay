// Ways to send a gift FROM ABROAD to a friend or relative IN URUGUAY, and the
// customs outlook of each — for `pages/enviar-regalos-a-uruguay.vue`.
//
// The non-obvious fact this whole guide turns on: URUGUAY HAS NO SEPARATE "GIFT"
// REGIME. A gift (obsequio) that physically crosses the border is taxed under the
// exact same courier / encomiendas-postales regime as an online purchase — Correo
// Uruguayo's own declaration form is literally titled "Cómo declarar su compra u
// obsequio". So the annual franquicia (USD 800 / 3 shipments / 20 kg, Decreto
// 50/026) that gets consumed is the RECIPIENT's, tracked by their cédula — not the
// sender's. The only genuinely tax-free ways to gift are the ones that never cross
// customs at all (digital gift cards, sending money).
//
// PURE data + pure functions (no Vue/Nuxt, no I/O) so the page, search and vitest
// share one source of truth. The tax arithmetic is delegated to `./importTax`
// (`courierImport`), whose numbers are sourced to the primary norms in
// `./importRules`. This file adds NO new tax figure of its own.
import { courierImport } from './importTax'
import { FRANCHISE_ANNUAL_USD, USA_IVA_EXEMPTION_USD, type ImportOrigin } from './importRules'

/** Date the facts below were last checked against the guides they cite. */
export const GIFT_LAST_RESEARCHED = '2026-08-09'

export type GiftMethodId = 'digital' | 'money' | 'courier' | 'postal' | 'platform'

/** Does the method cross customs, and therefore fall under the import regime? */
export type GiftCustoms = 'none' | 'regime'

export interface GiftMethod {
  id: GiftMethodId
  name: string
  icon: string
  /** `'none'` = never touches Aduana (no import tax); `'regime'` = courier/postal regime applies. */
  customs: GiftCustoms
  /** Rough delivery speed, plain language. */
  speed: string
  /** One-line tax summary. */
  taxNote: string
  /** When this is the right pick. */
  bestFor: string
  /** How to do it, step by step. */
  steps: readonly string[]
  /** The catch, if any. */
  caveat?: string
}

/**
 * Ordered best-to-most-friction. The two `customs: 'none'` methods come first on purpose: for the
 * common "I just want to give them something nice" case, a digital gift or sending money is faster,
 * cheaper and tax-free, and it doesn't burn the recipient's limited annual franquicia.
 */
export const GIFT_METHODS: readonly GiftMethod[] = Object.freeze([
  {
    id: 'digital',
    name: 'Gift card o saldo digital',
    icon: 'mdi-gift-outline',
    customs: 'none',
    speed: 'Inmediato',
    taxNote: 'No cruza aduana: no paga ningún impuesto de importación.',
    bestFor: 'La opción más simple cuando el regalo puede ser digital.',
    steps: [
      'Elegí una tarjeta de regalo que se use en Uruguay: MercadoLibre / Mercado Pago, PedidosYa, Netflix, Spotify, Steam, App Store / Google Play, o una eGift de Amazon.',
      'La comprás con tu tarjeta desde el exterior y la enviás por email al celular o correo de la persona.',
      'La persona la canjea desde Uruguay. No hay paquete, ni courier, ni Aduana.',
    ],
    caveat:
      'Verificá que la marca opere en Uruguay antes de comprar: una gift card de una tienda que no envía ni cobra acá no le sirve a quien la recibe.',
  },
  {
    id: 'money',
    name: 'Enviar dinero para que compre acá',
    icon: 'mdi-cash-fast',
    customs: 'none',
    speed: 'Minutos a 1–2 días',
    taxNote: 'Es una transferencia, no una importación: no hay impuesto de aduana.',
    bestFor: 'Cuando querés que elija el regalo, o cuando lo que hay en Uruguay alcanza y sobra.',
    steps: [
      'Usá Wise, Prex, AstroPay, Western Union / MoneyGram o una transferencia a la cuenta de la persona.',
      'La persona recibe pesos o dólares y compra el regalo en una tienda uruguaya.',
      'Comprando dentro de Uruguay no hay régimen de importación de por medio.',
    ],
    caveat:
      'Mirá la comisión y el tipo de cambio del servicio: ahí está el costo real, no en la aduana.',
  },
  {
    id: 'courier',
    name: 'Courier puerta a puerta',
    icon: 'mdi-truck-fast-outline',
    customs: 'regime',
    speed: '3–10 días',
    taxNote:
      'Entra al régimen de courier: usa la franquicia de quien recibe, o paga la prestación única.',
    bestFor: 'Un objeto físico concreto que querés que llegue rápido y con seguimiento.',
    steps: [
      'Enviá con un courier internacional (DHL, FedEx, UPS) o comprá en una tienda y despachá a un casillero/courier uruguayo, poniendo a tu amigo o familiar como destinatario.',
      'El destinatario declara el envío con su cédula y su valor real.',
      'Si entra en la franquicia anual del destinatario, queda exento de aranceles; si no, paga el 60% del valor (mínimo US$ 20).',
    ],
    caveat:
      'El envío consume la franquicia del DESTINATARIO (US$ 800 y 3 envíos al año). Coordiná con la persona para no dejarla sin franquicia justo cuando la necesite.',
  },
  {
    id: 'platform',
    name: 'Comprar en una tienda que envía a Uruguay',
    icon: 'mdi-cart-outline',
    customs: 'regime',
    speed: '1–4 semanas',
    taxNote:
      'Mismo régimen de courier/postal; con factura de EE.UU. hasta US$ 200 puede quedar sin IVA.',
    bestFor: 'Regalar un producto puntual sin tener que manipularlo ni reenviarlo vos.',
    steps: [
      'Comprá en Amazon (Global), Tiendamia, AliExpress, Shein u otra tienda que despache a Uruguay, con la dirección y datos de la persona como destinatario.',
      'La factura de compra viaja con el paquete: eso simplifica la valoración en Aduana.',
      'Al llegar, el destinatario paga según el régimen (franquicia o 60%), igual que cualquier compra online.',
    ],
    caveat:
      'La exoneración de IVA para compras de EE.UU. de hasta US$ 200 exige (desde el 1.º de octubre de 2026) que el vendedor esté registrado ante la Aduana. Un regalo de un particular no tiene vendedor registrado.',
  },
  {
    id: 'postal',
    name: 'Correo internacional',
    icon: 'mdi-mailbox-outline',
    customs: 'regime',
    speed: '1–6 semanas',
    taxNote:
      'Mismo régimen: llega al Correo Uruguayo y el destinatario lo declara como "obsequio".',
    bestFor: 'Lo más barato para mandar un objeto físico si no hay apuro.',
    steps: [
      'Despachá el paquete por el correo de tu país (USPS, Correos, etc.) a la dirección de la persona en Uruguay, declarándolo como regalo con su valor real.',
      'Llega al Correo Uruguayo, que notifica al destinatario para declararlo y pagar si corresponde.',
      'El destinatario usa el formulario "Cómo declarar su compra u obsequio" del Correo con su cédula.',
    ],
    caveat:
      'Sin factura comercial (típico de un regalo de un particular), es el destinatario quien declara el valor; si Aduana lo considera subvaluado, puede aplicar su propia valoración.',
  },
])

export function getGiftMethod(id: GiftMethodId): GiftMethod {
  return GIFT_METHODS.find(m => m.id === id) ?? GIFT_METHODS[0]!
}

export interface GiftAdviceInput {
  /** Must the gift be a physical object, or could a digital gift / money work just as well? */
  mustBePhysical: boolean
  /** Approximate value of the gift, in USD. */
  valueUsd: number
}

export interface GiftAdvice {
  methodId: GiftMethodId
  /** Short "why this one" line. */
  reason: string
}

/**
 * Order the methods best-first for a given intent. Deliberately steers a flexible (non-physical)
 * gift towards the tax-free digital/money routes, and warns when a physical gift is large enough
 * to blow past the annual franquicia into taxed territory.
 */
export function recommendGiftMethods(input: GiftAdviceInput): GiftAdvice[] {
  const value = Math.max(input.valueUsd || 0, 0)

  if (!input.mustBePhysical) {
    return [
      {
        methodId: 'digital',
        reason: 'No cruza aduana: llega al instante y sin impuestos.',
      },
      {
        methodId: 'money',
        reason: 'Que elija el regalo en Uruguay, también sin régimen de importación.',
      },
    ]
  }

  const overFranchise = value > FRANCHISE_ANNUAL_USD
  const courierReason = overFranchise
    ? `Supera los US$ ${FRANCHISE_ANNUAL_USD} de franquicia anual: entra al régimen general (importación formal).`
    : value <= USA_IVA_EXEMPTION_USD
      ? `Rápido y con seguimiento; con factura de EE.UU. de hasta US$ ${USA_IVA_EXEMPTION_USD} puede quedar sin IVA.`
      : 'Rápido y con seguimiento; usa la franquicia de quien recibe o paga el 60%.'

  return [
    { methodId: 'courier', reason: courierReason },
    {
      methodId: 'postal',
      reason: 'La alternativa más barata para el mismo objeto, si no hay apuro.',
    },
    {
      methodId: 'money',
      reason: 'Si el objeto se consigue en Uruguay, mandar la plata evita la aduana por completo.',
    },
  ]
}

export interface GiftTaxOutlook {
  /** True when the shipment pays nothing (fits the recipient's franchise and escapes IVA). */
  taxFree: boolean
  /** Estimated tax the recipient pays, in USD. */
  estimatedTaxUsd: number
  /** Which regime applied. */
  regime: 'franquicia' | 'simplificado' | 'general'
  /** Plain-language reasons from the underlying resolver. */
  reasons: string[]
}

export interface GiftTaxInput {
  valueUsd: number
  origin: ImportOrigin
  /** Try to apply the recipient's annual franquicia to this gift. */
  useRecipientFranchise: boolean
  /** Franquicia (USD) the recipient still has this calendar year. */
  recipientFranchiseAvailableUsd: number
  /** Franquicia shipments the recipient already used this year (max 3). */
  recipientShipmentsUsed: number
  /** Injectable date so the dated rules stay testable. */
  today?: Date
}

/**
 * What the person IN URUGUAY would pay to receive a physical gift, from THEIR franquicia's point of
 * view. Thin wrapper over `courierImport` so the page can talk about "the gift" and "the recipient"
 * without re-deriving the regime. The USD 200 IVA carve-out only ever applies to a US-origin invoice
 * — a bare personal gift with no registered seller is flagged by the same rules underneath.
 */
export function giftTaxOutlook(input: GiftTaxInput): GiftTaxOutlook {
  const result = courierImport({
    value: Math.max(input.valueUsd || 0, 0),
    origin: input.origin,
    channel: 'courier',
    useFranchise: input.useRecipientFranchise,
    franchiseAvailable: Math.max(input.recipientFranchiseAvailableUsd || 0, 0),
    shipmentsUsed: Math.max(input.recipientShipmentsUsed || 0, 0),
    today: input.today,
  })

  return {
    taxFree: result.totalTax === 0 && result.regime !== 'general',
    estimatedTaxUsd: result.totalTax,
    regime: result.regime ?? 'simplificado',
    reasons: result.reasons ?? [],
  }
}
