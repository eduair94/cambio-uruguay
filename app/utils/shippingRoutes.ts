// app/utils/shippingRoutes.ts
// Envío directo a Uruguay vs. casillero en EE.UU. vs. casillero en Europa: qué te cuesta cada
// desvío ANTES de que el paquete toque la Aduana uruguaya.
//
// POR QUÉ EXISTE: el resto del sitio ya calcula bien el tramo uruguayo (`importTax.courierImport`
// resuelve franquicia vs. prestación única, `postalHandling` el cargo del Correo). Lo que no
// existía en ninguna página —ni en ninguna respuesta del ecosistema uruguayo— es el tramo de
// AFUERA: qué le pasa a una compra europea que se desvía por un casillero de Miami, y qué IVA
// europeo se te queda pegado si la desviás por uno de Madrid. Es la pregunta que la gente hace
// ("¿lo mando a EE.UU. o a España?") y la que se contesta con dos frases sueltas y ningún número.
//
// EL HALLAZGO QUE ORDENA TODO: el desvío nunca es neutro, y los dos desvíos fallan por motivos
// OPUESTOS.
//   - Por EE.UU.: desde el 29/08/2025 no existe más la exención de USD 800 (de minimis) y desde
//     el 24/07/2026 un producto de la UE paga un 10% combinado por la acción de Sección 301. El
//     paquete italiano entra a EE.UU. como una importación de verdad, y el casillero NO puede
//     despacharla por vos: la entrada sólo la puede presentar el dueño/comprador o un despachante
//     licenciado (19 CFR 143.26).
//   - Por España: Italia → España no cruza frontera aduanera, así que no hay arancel… pero la
//     venta deja de ser exportación y pasa a ser venta a distancia intracomunitaria, con IVA
//     europeo (21% ES / 22% IT) incrustado en el precio. Ese IVA después ENGORDA la base
//     uruguaya, porque el Decreto 50/026 art. 5 toma "el total de la factura original de compra".
//     Se paga dos veces y quema cupo de los USD 800 sin traer un gramo de mercadería.
//
// PURO: sin Vue, sin fetch. La página sólo renderiza y `compareShippingRoutes` decide.
//
// REGLA DE LA CASA (misma que `parcelDelivery.ts`): cada afirmación declara su origen — `norma`,
// `operador` o `practica` — y nunca se mezclan. Lo que no está publicado se declara como hueco
// (ver `US_ADVANCE_FEE_UNPUBLISHED`) en vez de estimarse.
//
// FUENTES PRIMARIAS verificadas el 2026-08-19:
//   EE.UU.
//   - EO 14324 (30/07/2025): suspende el de minimis de 19 U.S.C. 1321(a)(2)(C) desde el 29/08/2025
//     https://www.whitehouse.gov/presidential-actions/2025/07/suspending-duty-free-de-minimis-treatment-for-all-countries/
//   - CBP interim final rule 2026-12670 (CBP Dec. 26-12), vigente 24/06/2026: suspensión indefinida
//     https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other
//   - Sección 301 (trabajo forzoso), vigente 24/07/2026, partidas HTSUS 9903.05.38/9903.05.39
//     https://content.govdelivery.com/accounts/USDHSCBP/bulletins/421d887
//   - MPF FY2026 (CBP Dec. 25-10, 90 FR 35437): informal automatizada USD 2,69
//     https://www.federalregister.gov/documents/full_text/text/2025/07/23/2025-13869.txt
//   - 19 CFR 143.26(a): quién puede presentar la entrada
//     https://www.ecfr.gov/current/title-19/chapter-I/part-143/section-143.26
//   Unión Europea
//   - Ventas a distancia intracomunitarias + umbral EUR 10.000 (AEAT, manual de IVA)
//     https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-03-entregas-realizadas-empresarios-profesionales/ventas-distancia/ventas-intracomunitarias-distancia.html
//   - DPR 633/1972 art. 8 lett. a) / Directiva 2006/112/CE art. 146: exportación no imponible
//     "a cura o a nome dei cedenti"
//   - Reglamento (UE) 952/2013 art. 4: España e Italia son el mismo territorio aduanero
//     https://eur-lex.europa.eu/eli/reg/2013/952/oj/eng
//   - Reglamento Delegado (UE) 2015/2446 art. 141.4: envío postal ≤ EUR 1.000 se declara por su
//     sola salida (no hay costo de exportación por el canal postal)
//   Uruguay
//   - Decreto 50/026 arts. 3 y 5 (procedencia = embarcado por el vendedor residente fiscal; valor
//     = total de la factura)   https://www.impo.com.uy/bases/decretos/50-2026
//   eBay
//   - Política de Devolución de tu dinero (excluye expresamente el reenvío por casillero)
//     https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210
//
// TRAMPAS verificadas (no las repitas):
//   - Los aranceles "recíprocos" a la UE que cita toda guía de 2025 ya NO existen: la Corte Suprema
//     los volteó el 20/02/2026 (Learning Resources v. Trump) y la EO 14389 los terminó. Lo que NO
//     cayó es la suspensión del de minimis. Cayó el arancel, no cayó el fin del de minimis.
//   - El tax free de viajeros (DIVA) y la 13.ª Directiva NO sirven para recuperar el IVA europeo de
//     un casillero: el primero exige salir vos con la mercadería en el equipaje de mano, la segunda
//     es sólo para empresas.
//   - Punto Mío tiene depósito en Madrid pero NO publica dirección ni tarifa para ese origen, y su
//     calculadora sólo ofrece EE.UU. No inventar un número por ahí.

import { round } from './calculators'

/** De dónde sale lo que afirmamos. Misma taxonomía que `parcelDelivery.ts`. */
export type SourceKind = 'norma' | 'operador' | 'practica'

export interface RouteSource {
  label: string
  url: string
  kind: SourceKind
}

/** Fecha en que se contrastaron las cifras de este módulo contra la fuente primaria. */
export const SHIPPING_ROUTES_VERIFIED_AT = '2026-08-19'

/** Las tres formas de traer una compra del exterior. */
export type ShipRoute = 'directo' | 'casillero-usa' | 'casillero-ue'

/** Dónde factura el vendedor. Es lo que decide el IVA europeo y la exoneración uruguaya. */
export type SellerRegion = 'ue' | 'usa' | 'otro'

/**
 * Si el vendedor es empresa con IVA o un particular.
 *
 * No es un detalle: un particular que vende su reloj usado no repercute IVA, y los profesionales de
 * segunda mano usan el régimen del margen (que no se desglosa). En los dos casos no hay IVA europeo
 * incrustado, así que el rodeo por España no te cuesta ese 18% — te cuesta sólo el tramo extra.
 * Antes de razonar sobre el IVA hay que saber si el vendedor es empresa, y en eBay muchas veces no
 * lo es.
 */
export type SellerKind = 'empresa' | 'particular'

// ─────────────────────────────────────────────────────────────────────────────
// Tramo EE.UU.
// ─────────────────────────────────────────────────────────────────────────────

/** Día en que EE.UU. suspendió la exención de USD 800 para todos los países (EO 14324). */
export const US_DE_MINIMIS_SUSPENDED_FROM = '2025-08-29'

/**
 * Día desde el que rige la acción de Sección 301 que alcanza a la Unión Europea.
 *
 * Mecanismo "net of MFN": la partida 9903.05.39 del HTSUS grava el producto de un Estado miembro
 * cuya tasa ad valorem de columna 1 sea MENOR a 10% con "a combined column one and Section 301 duty
 * rate of 10%". Los relojes del capítulo 91 tienen arancel compuesto y bajo (p. ej. 9102.29.10:
 * 40¢ por reloj + 6% sobre la caja + 2,8% sobre la malla), así que en una compra chica el
 * equivalente ad valorem queda muy por debajo del 10% y aplica el combinado.
 */
export const US_SECTION_301_EU_FROM = '2026-07-24'

/** El combinado de la partida 9903.05.39 para mercadería de la UE con MFN < 10%. */
export const US_SECTION_301_EU_COMBINED_PCT = 10

/** Merchandise Processing Fee, entrada informal automatizada. Ejercicio fiscal 2026. */
export const US_MPF_INFORMAL_USD = 2.69

/** Techo de valor por debajo del cual la entrada es informal (19 CFR 143.21). */
export const US_INFORMAL_ENTRY_CEILING_USD = 2500

/**
 * El hueco que NO se precia: la comisión que el transportista cobra por adelantarle el impuesto a
 * la CBP y después cobrártelo a vos (disbursement / advancement fee).
 *
 * Circula que FedEx la subió a "USD 17,50 mínimo o 2,5%" el 20/07/2026, pero la página de tarifas
 * de fedex.com devuelve bloqueo y la cifra viene de un tercero que reproduce la tabla. Existe, se
 * paga, y no entra en el total que publicamos: se declara como texto, igual que el tramo día 11-30
 * del Correo en `postalHandling`.
 */
export const US_ADVANCE_FEE_UNPUBLISHED =
  'Encima del arancel y del MPF, el transportista cobra su propia comisión por adelantarle el impuesto a la CBP (disbursement fee). Circula que FedEx la subió a US$ 17,50 mínimo o 2,5% el 20/07/2026, pero su tarifario público no se puede leer y el dato viene de un tercero: existe y la vas a pagar, pero no la sumamos al total porque no la pudimos verificar en la fuente.'

// ─────────────────────────────────────────────────────────────────────────────
// Tramo Unión Europea
// ─────────────────────────────────────────────────────────────────────────────

/** Tipo general del IVA en Italia. */
export const EU_VAT_IT_PCT = 22

/** Tipo general del IVA en España (art. 90.Uno Ley 37/1992). */
export const EU_VAT_ES_PCT = 21

/**
 * Umbral ÚNICO para toda la UE de ventas a distancia intracomunitarias, neto de IVA. Por debajo el
 * vendedor cobra el IVA de SU país; por encima, el del país de entrega. Para el comprador el
 * resultado casi no cambia (en un reloj de 260 la diferencia entre 22% y 21% son EUR 1,76): la
 * pregunta grande no es "¿21 o 22?", es "¿IVA europeo sí o no?".
 */
export const EU_DISTANCE_SALES_THRESHOLD_EUR = 10000

/** Envío postal por debajo del cual la salida de la UE no lleva declaración de exportación. */
export const EU_POSTAL_EXPORT_FREE_CEILING_EUR = 1000

/**
 * IVA europeo incrustado en un precio que ya lo incluye.
 *
 * El precio publicado en la UE se entiende CON IVA (Directiva 98/6/CE art. 2.a: "el precio final de
 * una unidad del producto… incluidos el IVA y todos los demás impuestos"), así que el impuesto no
 * se suma al precio: se extrae de él.
 */
export function embeddedEuVat(grossPrice: number, vatPct: number): number {
  const gross = Math.max(grossPrice || 0, 0)
  const pct = Math.max(vatPct || 0, 0)
  if (gross <= 0 || pct <= 0) return 0
  return round((gross * pct) / (100 + pct))
}

/**
 * Qué pasa con el IVA europeo en un envío que sale de la UE, y por qué no lo prometemos.
 *
 * La norma es clara: una venta con transporte fuera de la UE "a cura o a nome dei cedenti" es
 * exportación NO IMPONIBLE (DPR 633/1972 art. 8 lett. a, trasposición del art. 146 de la Directiva
 * 2006/112/CE), así que un vendedor italiano que despacha directo a Uruguay no debería cobrarte
 * IVA. La práctica es otra: eBay NO publica ningún mecanismo que descuente el IVA europeo cuando la
 * dirección de entrega está fuera de la UE (lo único que documenta es el reembolso del sales tax de
 * EE.UU. por envíos vía freight forwarder). Así que el ahorro es real en la norma y NO está
 * garantizado en pantalla: se pregunta antes de comprar.
 */
export type EuVatOnExport = 'no-imponible' | 'no-publicado' | 'sin-iva-incrustado'

// ─────────────────────────────────────────────────────────────────────────────
// El modelo
// ─────────────────────────────────────────────────────────────────────────────

export interface RouteInput {
  /** Precio que muestra el anuncio, en USD (o en la moneda del ejemplo: el modelo es lineal). */
  priceUsd: number
  /** Flete que te cobra el VENDEDOR en la misma factura. Integra el valor declarado (art. 5). */
  sellerShippingUsd?: number
  /** Dónde factura el vendedor. */
  sellerRegion: SellerRegion
  /** Si el vendedor es empresa con IVA o un particular / régimen del margen. */
  sellerKind?: SellerKind
  /** Peso del envío en kg, para el flete del casillero. */
  weightKg?: number
  /** Tarifa del casillero desde EE.UU., USD por kg. */
  usaPerKgUsd?: number
  /** Tarifa del casillero desde Europa, USD por kg. */
  euPerKgUsd?: number
  /** Cargo fijo del casillero por envío, USD. */
  forwarderBaseUsd?: number
  /** Tipo del IVA europeo aplicable (21 español vía OSS o 22 italiano). */
  euVatPct?: number
}

/** Un renglón del costo de un tramo, con su origen declarado. */
export interface RouteCostLine {
  label: string
  amountUsd: number
  kind: SourceKind
}

/** Qué le pasa a la compra en cada ruta, antes de la Aduana uruguaya. */
export interface RouteLeg {
  route: ShipRoute
  /** Lo que va a figurar como valor de factura para la Aduana uruguaya. */
  invoiceUsd: number
  /** IVA europeo que queda incrustado en esa factura (0 si la venta es exportación). */
  euVatUsd: number
  /** Qué pasa con el IVA europeo en esta ruta. */
  euVat: EuVatOnExport
  /** Impuestos y tasas del país intermedio (0 en el envío directo). */
  foreignTaxUsd: number
  /** Flete del casillero hasta Uruguay (0 en el envío directo si el vendedor lo paga). */
  forwarderFreightUsd: number
  /** Desglose renglón por renglón. */
  lines: RouteCostLine[]
  /** ¿Se cae la garantía de eBay por usar un reenviador? */
  buyerProtectionLost: boolean
  /** Cuántas fronteras aduaneras cruza el paquete antes de llegar. */
  customsCrossings: number
}

/**
 * El costo del tramo de AFUERA para las tres rutas. No calcula el tributo uruguayo: eso lo hace
 * `courierImport`, que ya está bien resuelto — esta función le entrega el `invoiceUsd` correcto,
 * que es justamente lo que las respuestas de foro se equivocan.
 */
export function shippingLegs(input: RouteInput): RouteLeg[] {
  const price = Math.max(input.priceUsd || 0, 0)
  const sellerShipping = Math.max(input.sellerShippingUsd || 0, 0)
  const weight = Math.max(input.weightKg || 0, 0)
  const usaPerKg = Math.max(input.usaPerKgUsd ?? 17.5, 0)
  const euPerKg = Math.max(input.euPerKgUsd ?? 21.5, 0)
  const forwarderBase = Math.max(input.forwarderBaseUsd ?? 0, 0)
  const vatPct = input.euVatPct ?? EU_VAT_IT_PCT

  const isEuSeller = input.sellerRegion === 'ue'
  const hasEuVat = isEuSeller && (input.sellerKind ?? 'empresa') === 'empresa'

  const gross = round(price + sellerShipping)
  const vat = hasEuVat ? embeddedEuVat(gross, vatPct) : 0
  const net = round(gross - vat)
  const forwarderFreight = weight > 0 ? round(forwarderBase + weight * usaPerKg) : 0
  const euForwarderFreight = weight > 0 ? round(forwarderBase + weight * euPerKg) : 0

  // ── Directo ────────────────────────────────────────────────────────────────
  // La venta es exportación: no imponible en la UE. Pero eBay no publica ningún mecanismo que lo
  // descuente en pantalla, así que la factura puede llegar con el IVA adentro igual. Modelamos el
  // caso de la NORMA y la página avisa que hay que confirmarlo con el vendedor.
  const directo: RouteLeg = {
    route: 'directo',
    invoiceUsd: hasEuVat ? net : gross,
    euVatUsd: 0,
    euVat: hasEuVat ? 'no-publicado' : 'sin-iva-incrustado',
    foreignTaxUsd: 0,
    forwarderFreightUsd: 0,
    lines: [
      { label: 'Precio del anuncio', amountUsd: gross, kind: 'operador' },
      ...(hasEuVat
        ? [
            {
              label: `IVA europeo que NO corresponde en una exportación (${vatPct}%)`,
              amountUsd: -vat,
              kind: 'norma' as SourceKind,
            },
          ]
        : []),
    ],
    buyerProtectionLost: false,
    customsCrossings: 1,
  }

  // ── Casillero en EE.UU. ────────────────────────────────────────────────────
  // La venta sigue siendo exportación desde la UE (el destino está fuera), pero el paquete entra a
  // EE.UU. como importación de verdad: sin de minimis, con Sección 301 si es europeo, y con MPF.
  const usTariffBase = hasEuVat ? net : gross
  const usDuty = isEuSeller ? round((usTariffBase * US_SECTION_301_EU_COMBINED_PCT) / 100) : 0
  const usMpf = usTariffBase <= US_INFORMAL_ENTRY_CEILING_USD ? US_MPF_INFORMAL_USD : 0
  const casilleroUsa: RouteLeg = {
    route: 'casillero-usa',
    invoiceUsd: usTariffBase,
    euVatUsd: 0,
    euVat: hasEuVat ? 'no-publicado' : 'sin-iva-incrustado',
    foreignTaxUsd: round(usDuty + usMpf),
    forwarderFreightUsd: forwarderFreight,
    lines: [
      { label: 'Precio del anuncio', amountUsd: gross, kind: 'operador' },
      ...(hasEuVat
        ? [
            {
              label: `IVA europeo que NO corresponde en una exportación (${vatPct}%)`,
              amountUsd: -vat,
              kind: 'norma' as SourceKind,
            },
          ]
        : []),
      ...(usDuty > 0
        ? [
            {
              label: `Arancel de EE.UU. — Sección 301, ${US_SECTION_301_EU_COMBINED_PCT}% combinado para la UE`,
              amountUsd: usDuty,
              kind: 'norma' as SourceKind,
            },
          ]
        : []),
      ...(usMpf > 0
        ? [
            {
              label: 'Merchandise Processing Fee (entrada informal)',
              amountUsd: usMpf,
              kind: 'norma' as SourceKind,
            },
          ]
        : []),
      ...(forwarderFreight > 0
        ? [
            {
              label: 'Flete del casillero Miami → Montevideo',
              amountUsd: forwarderFreight,
              kind: 'operador' as SourceKind,
            },
          ]
        : []),
    ],
    buyerProtectionLost: true,
    customsCrossings: 2,
  }

  // ── Casillero en Europa ────────────────────────────────────────────────────
  // Italia → España no cruza frontera aduanera, así que no hay arancel. Pero la venta deja de ser
  // exportación: es venta a distancia intracomunitaria, con IVA europeo cobrado según la DIRECCIÓN
  // DE ENTREGA. Ese IVA queda dentro de la factura y por lo tanto dentro de la base uruguaya.
  const casilleroUe: RouteLeg = {
    route: 'casillero-ue',
    invoiceUsd: gross,
    euVatUsd: vat,
    euVat: hasEuVat ? 'no-imponible' : 'sin-iva-incrustado',
    foreignTaxUsd: 0,
    forwarderFreightUsd: euForwarderFreight,
    lines: [
      { label: 'Precio del anuncio', amountUsd: gross, kind: 'operador' },
      ...(vat > 0
        ? [
            {
              label: `IVA europeo que te quedás pagando (${vatPct}%, venta a distancia intracomunitaria)`,
              amountUsd: 0,
              kind: 'norma' as SourceKind,
            },
          ]
        : []),
      ...(euForwarderFreight > 0
        ? [
            {
              label: 'Flete del casillero Madrid → Montevideo',
              amountUsd: euForwarderFreight,
              kind: 'operador' as SourceKind,
            },
          ]
        : []),
    ],
    buyerProtectionLost: true,
    customsCrossings: 1,
  }

  return [directo, casilleroUsa, casilleroUe]
}

/** Etiqueta corta de cada ruta, para las pestañas y la tabla. */
export const ROUTE_LABEL: Record<ShipRoute, string> = {
  directo: 'Envío directo a Uruguay',
  'casillero-usa': 'Casillero en EE.UU. (Miami)',
  'casillero-ue': 'Casillero en Europa (Madrid)',
}

/** Una línea de la comparación cualitativa: lo que no es un número. */
export interface RouteTrait {
  id: string
  /** La dimensión que se compara. */
  dimension: string
  /** Qué pasa en cada ruta. */
  byRoute: Record<ShipRoute, string>
  sources: RouteSource[]
}

export const ROUTE_TRAITS: RouteTrait[] = [
  {
    id: 'exoneracion-uy',
    dimension: 'Exoneración de IVA uruguaya (compras de EE.UU. hasta US$ 200)',
    byRoute: {
      directo: 'Depende de dónde facture el vendedor, no de por dónde pase el paquete.',
      'casillero-usa':
        'NO la habilita. El Decreto 50/026 art. 3 pide que el envío sea "embarcado por el vendedor residente fiscal" en el país del acuerdo, y se acredita con la factura. El casillero no es el vendedor.',
      'casillero-ue': 'No aplica: no hay acuerdo comercial con la Unión Europea a estos efectos.',
    },
    sources: [
      {
        label: 'Decreto 50/026, art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
      {
        label: 'DNA — Régimen de franquicia',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'iva-europeo',
    dimension: 'IVA europeo',
    byRoute: {
      directo:
        'La venta es exportación no imponible: no debería llevar IVA europeo. Confirmalo con el vendedor — eBay no publica ningún mecanismo que lo descuente en pantalla.',
      'casillero-usa':
        'Igual que el directo: el destino está fuera de la UE, así que la venta es exportación.',
      'casillero-ue':
        'Lo pagás sí o sí. Con dirección de entrega en la UE la venta es intracomunitaria y el IVA se cobra "en función de la dirección de entrega": 21% español o 22% italiano.',
    },
    sources: [
      {
        label: 'DPR 633/1972 art. 8 lett. a) — exportación no imponible',
        url: 'https://www.to.camcom.it/143-cessioni-allesportazione',
        kind: 'norma',
      },
      {
        label: 'AEAT — ventas a distancia intracomunitarias y umbral de EUR 10.000',
        url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-03-entregas-realizadas-empresarios-profesionales/ventas-distancia/ventas-intracomunitarias-distancia.html',
        kind: 'norma',
      },
      {
        label: 'eBay — el vendedor de la UE cobra IVA según la dirección de entrega',
        url: 'https://www.ebay.com/help/selling/selling/vat-obligations-eu?id=4650',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'aduana-intermedia',
    dimension: 'Aduana del país intermedio',
    byRoute: {
      directo: 'Ninguna. El paquete cruza una sola frontera.',
      'casillero-usa':
        'Importación completa a EE.UU. Desde el 29/08/2025 no existe más la exención de US$ 800 y desde el 24/07/2026 un producto de la UE paga 10% combinado por Sección 301, más el MPF.',
      'casillero-ue':
        'Ninguna: España e Italia son el mismo territorio aduanero de la Unión. Por eso el rodeo europeo no tiene arancel — su costo es el IVA, no la aduana.',
    },
    sources: [
      {
        label: 'CBP — suspensión indefinida del de minimis (Federal Register, 24/06/2026)',
        url: 'https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other',
        kind: 'norma',
      },
      {
        label: 'CBP — acción de Sección 301 vigente 24/07/2026',
        url: 'https://content.govdelivery.com/accounts/USDHSCBP/bulletins/421d887',
        kind: 'norma',
      },
      {
        label: 'Reglamento (UE) 952/2013 art. 4 — territorio aduanero de la Unión',
        url: 'https://eur-lex.europa.eu/eli/reg/2013/952/oj/eng',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'quien-despacha',
    dimension: '¿Quién despacha en el país intermedio?',
    byRoute: {
      directo: 'Nadie tiene que despachar nada afuera.',
      'casillero-usa':
        'Vos, y no podés. La entrada sólo la puede presentar el dueño/comprador o un despachante licenciado (19 CFR 143.26). El casillero es consignatario: no despacha, no adelanta la plata y no discute con la CBP.',
      'casillero-ue':
        'Nadie: la salida de la UE de un envío postal de hasta EUR 1.000 se considera declarada por su sola salida del territorio aduanero.',
    },
    sources: [
      {
        label: '19 CFR 143.26(a) — quién puede presentar la entrada',
        url: 'https://www.ecfr.gov/current/title-19/chapter-I/part-143/section-143.26',
        kind: 'norma',
      },
      {
        label: 'Shipito — "packages are subject to refusal and may be returned to sender"',
        url: 'https://www.shipito.com/en/help/faq/customs',
        kind: 'operador',
      },
      {
        label: 'Reglamento Delegado (UE) 2015/2446 art. 141.4',
        url: 'https://www.legislation.gov.uk/eur/2015/2446/article/141',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'proteccion-ebay',
    dimension: 'Garantía de eBay si el paquete no llega',
    byRoute: {
      directo:
        'Viva. Si el vendedor no prueba la entrega, cobrás artículo + envío original (no los tributos uruguayos, que se los pagaste a la DNA).',
      'casillero-usa':
        'Se cae. La política excluye expresamente "el comprador usó un servicio de flete de terceros o redirección por correo", y la entrega en el casillero cuenta como entrega correcta.',
      'casillero-ue': 'Se cae, por la misma exclusión.',
    },
    sources: [
      {
        label: 'eBay — Política de Devolución de tu dinero (exclusiones)',
        url: 'https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'cupo',
    dimension: 'Qué le hace a tu cupo de franquicia',
    byRoute: {
      directo: 'Consume un envío de los 3 y el valor de factura contra los US$ 800.',
      'casillero-usa': 'Lo mismo, sobre la misma factura.',
      'casillero-ue':
        'Lo mismo, pero sobre una factura MÁS GRANDE: el IVA europeo integra "el total de la factura original de compra" (art. 5), así que te quema cupo sin traer un gramo de mercadería.',
    },
    sources: [
      {
        label: 'Decreto 50/026, arts. 4 y 5',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'tiempo',
    dimension: 'Tiempo',
    byRoute: {
      directo:
        'Un solo tramo. Por canal postal italiano no es rápido, pero no espera consolidación.',
      'casillero-usa':
        'Tres tramos (Italia → Miami → Montevideo) más el despacho estadounidense. Los casilleros publican 3 a 7 días sólo para el tramo Miami → Montevideo.',
      'casillero-ue':
        'Dos tramos. USX publica 9 a 15 días desde Madrid contra 3 a 7 desde Miami: un vuelo semanal en vez de dos.',
    },
    sources: [
      {
        label: 'USX Cargo — tarifas y frecuencias',
        url: 'https://usxcargo.com/',
        kind: 'operador',
      },
    ],
  },
]

/** Lo que hace perder plata o el paquete, con su origen. */
export interface RouteTrap {
  id: string
  title: string
  detail: string
  sources: RouteSource[]
}

export const ROUTE_TRAPS: RouteTrap[] = [
  {
    id: 'miami-no-convierte',
    title: 'Pasar por Miami no vuelve estadounidense a la compra',
    detail:
      'Es el error más repetido. La exoneración uruguaya sigue al VENDEDOR, no a la ruta: el envío tiene que ser "embarcado por el vendedor residente fiscal" en el país del acuerdo y se acredita con la factura. Un casillero no vende ni factura. El reloj sigue siendo italiano después de dormir una semana en un depósito de Doral.',
    sources: [
      {
        label: 'Decreto 50/026, art. 3',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'de-minimis-muerto',
    title: 'La exención de US$ 800 de EE.UU. ya no existe',
    detail:
      'Está suspendida para todos los países desde el 29/08/2025 y la CBP la llevó a reglamento por tiempo indefinido en junio de 2026; encima la ley "One Big Beautiful Bill" la deroga de forma permanente desde el 1/7/2027. Cualquier guía que diga "hasta US$ 800 entra libre a EE.UU." es de antes. Ojo con el error inverso: la Corte Suprema volteó en febrero de 2026 los aranceles "recíprocos" bajo IEEPA, pero eso NO revivió el de minimis.',
    sources: [
      {
        label: 'CBP — suspensión indefinida (Federal Register, 24/06/2026)',
        url: 'https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'iva-doble',
    title: 'Por España el IVA europeo se paga dos veces',
    detail:
      'Primero al vendedor, porque con dirección de entrega en la UE la venta es intracomunitaria y lleva IVA. Y después otra vez en Uruguay, porque la Aduana toma "el total de la factura original de compra, incluidos todos los conceptos" — y ese IVA está adentro. No se recupera: el tax free de viajeros exige que salgas vos con la mercadería en el equipaje de mano, y la devolución a no establecidos es sólo para empresas.',
    sources: [
      {
        label: 'Decreto 50/026, art. 5',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
      {
        label: 'AEAT — devolución de IVA a viajeros (DIVA)',
        url: 'https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Viajeros_Desplazados/DIVA/selladoDIVA_viajeros/folletoDIVA_devIVA.pdf',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'garantia-ebay',
    title: 'El casillero te deja sin la garantía de eBay',
    detail:
      'La política lo excluye en las dos ramas del programa: "el comprador usó un servicio de flete de terceros o redirección por correo" queda sin cobertura, y la excepción que salva es usar un programa de eBay (que un vendedor italiano no tiene). El mecanismo es que la dirección del checkout es la que cuenta como entrega correcta: el escaneo en el casillero cierra el caso a favor del vendedor y lo que pase después ya no es de eBay.',
    sources: [
      {
        label: 'eBay — Política de Devolución de tu dinero',
        url: 'https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'flete-declarado',
    title: 'El flete del vendedor integra el valor declarado',
    detail:
      'Si el anuncio dice "free shipping" tu factura es el precio y listo. Si te cobra envío, va sumado: el valor es "el total de la factura original de compra, incluidos todos los conceptos que figuren adicionados en la misma". Hay casos de paquetes de US$ 149 total retenidos por declarar solamente el producto.',
    sources: [
      {
        label: 'Decreto 50/026, art. 5',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
      {
        label: 'r/uruguay — retención por no declarar el flete (11/06/2026)',
        url: 'https://reddit.com/r/uruguay/comments/1u3encz/me_retuvieron_un_parquete_de_franquicia_porque_no/',
        kind: 'practica',
      },
    ],
  },
  {
    id: 'subdeclarar',
    title: 'Pedirle al vendedor que declare menos te deja peor',
    detail:
      'eBay lo prohíbe en las dos puntas y lo lista como comportamiento inapropiado del comprador. Y el detalle fino: la única excepción de la garantía que te cubre si el paquete queda trabado en Aduana es que el vendedor haya SOBREestimado el valor. Subdeclarar no te cubre nada, y el valor que mira la DNA es el total de la factura, que eBay tiene registrado en Detalles del pedido.',
    sources: [
      {
        label: 'eBay — Política de Devolución de tu dinero',
        url: 'https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'usado-revalua',
    title: 'Si es usado, la Aduana puede no creerle a tu factura',
    detail:
      'Es el caso donde más se revalúa contra precio de mercado en vez de tomar el valor de transacción. Hay casos de gente que presentó factura Y estado de cuenta y se la rechazaron igual porque el artículo "valía más". Guardá los dos papeles y no compres usado esperando que el valor bajo sea el que se liquida.',
    sources: [
      {
        label: 'Decreto 50/026, arts. 5, 11 y 12 (la DNA puede exigir documentación)',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
      {
        label: 'r/uruguay — dron usado revaluado (30/07/2026)',
        url: 'https://reddit.com/r/uruguay/comments/1vaew47/aduana_y_su_mafia/',
        kind: 'practica',
      },
    ],
  },
]

/** Un paso del procedimiento del envío directo. */
export interface DirectStep {
  id: string
  /** Cuándo. */
  when: string
  title: string
  detail: string
  sources: RouteSource[]
}

export const DIRECT_STEPS: DirectStep[] = [
  {
    id: 'antes-cupo',
    when: 'Antes de comprar',
    title: 'Mirá cuántas franquicias te quedan de verdad',
    detail:
      'La DNA publica la consulta: "Consulte aquí cuántos envíos tiene registrados bajo el régimen de franquicia". Necesitás identidad digital gub.uy de nivel intermedio (el usuario autorregistrado no alcanza). No es paranoia: hay casos documentados de gente a la que le quemaron las franquicias con su cédula sin haber comprado nada, y se resolvieron denunciando en Aduana. Ojo con el enlace que publica el Correo para esto: devuelve error 401. El que sirve es el de la DNA.',
    sources: [
      {
        label: 'DNA — Consulte franquicias utilizadas',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28224/1/innova.front/',
        kind: 'operador',
      },
      {
        label: 'LUCIA KIT — consulta de encomiendas postales',
        url: 'https://luciakit.aduanas.gub.uy/LuciaKit/encomiendaspostales.aspx',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'antes-registro',
    when: 'Antes de comprar',
    title: 'Registrate una vez ante la DNA',
    detail:
      'El art. 4 del Decreto 50/026 lo exige para usar la franquicia. Hoy la DNA lo describe como voluntario "en una etapa inicial" y avisa que "próximamente pasará a ser obligatorio". Se hace en LUCIA KIT y la propia DNA dice que lleva menos de dos minutos.',
    sources: [
      {
        label: 'Decreto 50/026, art. 4',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
      {
        label: 'DNA — formulario de identidad del usuario (RG 10/2026)',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28449/1/innova.front/',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'comprar-tarjeta',
    when: 'Al comprar',
    title: 'Pagá con tarjeta a tu nombre, y que las tres identidades coincidan',
    detail:
      'El requisito duro es que la titularidad del medio de pago coincida con la del titular de la compra y con el destinatario: las tres, la misma persona. Tiene que ser tarjeta de crédito o débito internacional, o dinero electrónico internacional de una institución regulada por el BCU — pagar con saldo de PayPal te deja sin el comprobante que el formulario pide. La DIRECCIÓN, en cambio, no es condición de la franquicia: podés recibirlo en el trabajo o en lo de un familiar sin romper nada.',
    sources: [
      {
        label: 'Decreto 50/026, art. 4 lits. d) y e)',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
      {
        label: 'RG DNA 14/2026, Anexo I num. 3 (se verifica de verdad)',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28482/1/rg-14-2026.pdf',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'declarar-antes',
    when: 'Cuando tengas el tracking',
    title: 'Declaralo ANTES de que el paquete llegue al país',
    detail:
      'Si entra por Correo Uruguayo declarás vos, en el portal que el Correo llama Ahíva. Te pide el número de envío (dos letras + nueve números + dos letras, no el número de orden de la tienda), si es compra u obsequio, tus datos idénticos a la cédula, el valor de factura y el medio de pago. Declarar antes del arribo cuesta US$ 1,50 en vez de US$ 5, y es lo que evita la retención: "de no ingresar la información requerida, el envío será retenido".',
    sources: [
      {
        label: 'Correo Uruguayo — Cómo declarar su compra u obsequio',
        url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
        kind: 'operador',
      },
      {
        label: 'Correo Uruguayo — Gestiones administrativas para envíos del exterior',
        url: 'https://www.correo.com.uy/gestiones-administrativas-envios-exterior',
        kind: 'operador',
      },
    ],
  },
  {
    id: 'elegir-regimen',
    when: 'En la declaración',
    title: 'Elegí el régimen vos',
    detail:
      'La declaración tiene que "determinar el régimen aduanero aplicable al envío", pudiendo optar por franquicia o por prestación única. En la práctica el courier declara por vos, pero la opción es del titular. Si no cumplís las condiciones de la franquicia, ese envío cae al 60% — con un premio consuelo: esa operación no te consume uno de los tres envíos del año.',
    sources: [
      {
        label: 'RG DNA 14/2026, Anexo I num. 15 lit. k',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28482/1/rg-14-2026.pdf',
        kind: 'norma',
      },
      {
        label: 'Decreto 50/026, art. 15',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
    ],
  },
  {
    id: 'plazos',
    when: 'Desde que entra al país',
    title: 'El reloj corre desde el ingreso, no desde que te avisan',
    detail:
      'Son 30 días desde el ingreso de la mercadería al país para pagar los tributos; vencido el plazo, la mercadería "se considerará en abandono no infraccional". Los "10 días de la notificación de retención" del Correo son el borde de su escalón tarifario, no el plazo legal: si te notifican el día 25, te quedan 5 días reales. Y una vez emitido el talón de pago, tenés otros 30 días para pagarlo o el sistema anula talón y declaración.',
    sources: [
      {
        label: 'Decreto 50/026, art. 14',
        url: 'https://www.impo.com.uy/bases/decretos/50-2026',
        kind: 'norma',
      },
      {
        label: 'RG DNA 14/2026, Anexo I nums. 17 y 18',
        url: 'https://www.aduanas.gub.uy/innovaportal/file/28482/1/rg-14-2026.pdf',
        kind: 'norma',
      },
    ],
  },
]

/** Las fuentes que la página lista al pie. */
export const SHIPPING_ROUTES_SOURCES: RouteSource[] = [
  {
    label: 'Decreto 50/026 (régimen de envíos postales internacionales)',
    url: 'https://www.impo.com.uy/bases/decretos/50-2026',
    kind: 'norma',
  },
  {
    label: 'Título 10 T.O. 2023, art. 13 lit. B — base del IVA y piso de US$ 20',
    url: 'https://www.impo.com.uy/bases/todgi-2023/10-2024',
    kind: 'norma',
  },
  {
    label: 'CBP — suspensión indefinida del de minimis (24/06/2026)',
    url: 'https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other',
    kind: 'norma',
  },
  {
    label: 'CBP — Sección 301, listado de partidas vigente desde el 24/07/2026',
    url: 'https://content.govdelivery.com/accounts/USDHSCBP/bulletins/421d887',
    kind: 'norma',
  },
  {
    label: '19 CFR 143.26(a) — quién puede presentar una entrada en EE.UU.',
    url: 'https://www.ecfr.gov/current/title-19/chapter-I/part-143/section-143.26',
    kind: 'norma',
  },
  {
    label: 'AEAT — ventas a distancia intracomunitarias (umbral EUR 10.000)',
    url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-03-entregas-realizadas-empresarios-profesionales/ventas-distancia/ventas-intracomunitarias-distancia.html',
    kind: 'norma',
  },
  {
    label: 'Reglamento (UE) 952/2013 art. 4 — territorio aduanero de la Unión',
    url: 'https://eur-lex.europa.eu/eli/reg/2013/952/oj/eng',
    kind: 'norma',
  },
  {
    label: 'eBay — Política de Devolución de tu dinero',
    url: 'https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210',
    kind: 'operador',
  },
  {
    label: 'Correo Uruguayo — Gestiones administrativas para envíos del exterior',
    url: 'https://www.correo.com.uy/gestiones-administrativas-envios-exterior',
    kind: 'operador',
  },
  {
    label: 'DNA — Consulte franquicias utilizadas',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28224/1/innova.front/',
    kind: 'operador',
  },
]

/** Preguntas que la comunidad hace y que ninguna página oficial contesta. */
export const SHIPPING_ROUTES_FAQS: { q: string; a: string }[] = [
  {
    q: '¿Mandarlo a mi casillero de Miami no me ahorra el IVA?',
    a: 'No. La exoneración uruguaya (compras de EE.UU. hasta US$ 200) sigue al vendedor, no al recorrido: el Decreto 50/026 art. 3 exige que el envío sea "embarcado por el vendedor residente fiscal" en el país del acuerdo, y eso se acredita con la factura. Si le comprás a un italiano, la factura es italiana y el casillero no cambia nada. Además, desde el 29/08/2025 el paquete que entra a EE.UU. ya no tiene la exención de US$ 800: paga arancel y tasas allá.',
  },
  {
    q: 'Entonces, ¿el casillero en España es mejor?',
    a: 'Es mejor que Miami, porque Italia → España no cruza frontera aduanera y no hay arancel. Pero tiene su propio costo: con dirección de entrega dentro de la UE la venta deja de ser exportación y lleva IVA europeo (21% o 22%), que después engorda la base uruguaya porque la Aduana toma el total de la factura. Sirve, sobre todo, cuando el vendedor europeo directamente no envía a Uruguay.',
  },
  {
    q: '¿Puedo recuperar el IVA europeo cuando el paquete sale hacia Uruguay?',
    a: 'No, si sos un consumidor final. El tax free de viajeros (DIVA) exige acreditar la residencia en la tienda al comprar y salir vos mismo con la mercadería en el equipaje personal no facturado; un casillero rompe las tres condiciones. Y la devolución de IVA a no establecidos (13.ª Directiva) es sólo para empresas.',
  },
  {
    q: '¿Y si el vendedor es un particular que vende su reloj usado?',
    a: 'Entonces no hay IVA europeo incrustado y todo el argumento del ahorro desaparece: el rodeo por España te cuesta sólo el tramo extra. Antes de razonar sobre el IVA hay que saber si el vendedor es empresa, y en eBay muchas veces no lo es. Lo mismo pasa con el régimen del margen que usan los profesionales de segunda mano.',
  },
  {
    q: 'Si uso un casillero, ¿pierdo la garantía de eBay?',
    a: 'Sí. La política excluye expresamente al comprador que "usó un servicio de flete de terceros o redirección por correo", y lo repite en las dos ramas del programa. El mecanismo es que la dirección del checkout es la que vale como entrega correcta: el escaneo en el casillero cierra el caso a favor del vendedor. La excepción que salva es usar un programa propio de eBay, que un vendedor italiano no tiene.',
  },
  {
    q: '¿Conviene franquicia o el 60%?',
    a: 'La franquicia te ahorra 38 puntos del valor (60% menos el 22% de IVA) más el 5% del cargo de gestión, que no corre en franquicia. Como cada envío quema una ficha completa sin importar el monto, conviene gastarla en la compra más cara del año y no en la primera que llega. Con la calculadora del sitio podés comparar las dos columnas con tu valor real.',
  },
  {
    q: '¿Qué pasa si no declaro nada?',
    a: 'El envío queda retenido y el reloj corre igual: son 30 días desde el ingreso de la mercadería al país, no desde que te avisan. Vencido ese plazo cae en abandono no infraccional, y después la Aduana lo remata "sin base y al mejor postor". No hay plazo posterior para recuperarlo.',
  },
]
