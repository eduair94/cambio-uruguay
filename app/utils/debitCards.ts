// app/utils/debitCards.ts
// Data + helpers for /tarjetas-de-debito-uruguay — the ranking + cost calculator
// for using Uruguayan DEBIT / PREPAID / fintech cards to pay INTERNATIONAL and
// in-game purchases in US dollars (Steam, PlayStation, Google Play, Xbox…).
//
// It answers the recurring question: "pagué un ítem de USD 49,99 y me descontaron
// $2.168 — ¿por qué?" The page shows the two costs that stack on every such
// purchase:
//   (a) the issuer's international-purchase COMMISSION (% + a fixed USD fee + IVA
//       on that commission), and
//   (b) the peso→USD CONVERSION, done at the issuer's selling rate with a spread
//       over the wholesale/BCU rate — this is the "me cobraron por pasar de pesos
//       a dólares" part.
//
// PURE module (no Vue/Nuxt) so the page and its unit test share one source of
// truth. The ranking is transparent: a fixed weighted RUBRIC lives here, each
// card is scored 0–100 per dimension, and the overall is COMPUTED from those
// scores (never hand-set), so the ranking is reproducible and auditable.
//
// Figures come from each issuer's official T&C / help center where published; a
// few are secondary (press/comparators) or derived — those carry estimate=true
// and say so in feeNote. Informational, not financial advice.

/** Date (YYYY-MM-DD) the fees below were last verified against sources. */
export const DEBIT_CARDS_LAST_REVIEWED = '2026-07-22'

/** IVA rate applied on the issuer's international-purchase commission in Uruguay. */
export const IVA_RATE = 0.22

export type CardKind = 'banco' | 'prepaga' | 'fintech'
export type CardNetwork = 'visa' | 'mastercard' | 'otro'

/** One scoring dimension of the ranking rubric. */
export interface RubricDimension {
  id: DimId
  label: string
  short: string
  icon: string
  /** Weight in the overall score; the set sums to 100. */
  weight: number
  what: string
}

export type DimId =
  | 'comisionExterior'
  | 'spreadCambio'
  | 'saldoUSD'
  | 'costo'
  | 'aceptacion'
  | 'recarga'

/**
 * Transparent, weighted rubric for the "pagar en dólares / comprar ítems de
 * juegos" use case. The two costs the user actually feels — the international
 * commission and the peso→USD spread — weigh most; then whether you can hold a
 * USD balance to skip the conversion, general cost, acceptance and top-up.
 */
export const DEBIT_RUBRIC: readonly RubricDimension[] = Object.freeze([
  {
    id: 'comisionExterior',
    label: 'Comisión en el exterior',
    short: 'Comisión',
    icon: 'mdi-percent-outline',
    weight: 28,
    what: 'Cuánto cobra el emisor por una compra internacional (% sobre el monto + cargo fijo + IVA sobre la comisión). Menos es mejor.',
  },
  {
    id: 'spreadCambio',
    label: 'Spread de cambio',
    short: 'Spread',
    icon: 'mdi-swap-horizontal',
    weight: 24,
    what: 'El margen que se lleva el emisor al convertir tus pesos a dólares, sobre el tipo mayorista. Menos spread, mejor.',
  },
  {
    id: 'saldoUSD',
    label: 'Saldo en dólares',
    short: 'Saldo USD',
    icon: 'mdi-cash-multiple',
    weight: 18,
    what: '¿Podés tener o cargar saldo directamente en USD y así saltear la conversión pesos→dólar (y su spread)?',
  },
  {
    id: 'costo',
    label: 'Costo de la tarjeta',
    short: 'Costo',
    icon: 'mdi-tag-outline',
    weight: 12,
    what: 'Emisión, mantenimiento y costos fijos frente al beneficio para comprar en dólares.',
  },
  {
    id: 'aceptacion',
    label: 'Aceptación',
    short: 'Aceptación',
    icon: 'mdi-check-decagram-outline',
    weight: 10,
    what: 'Red (Visa/Mastercard) y que funcione de verdad en tiendas de juegos internacionales (Steam, PSN, Google Play), con 3-D Secure.',
  },
  {
    id: 'recarga',
    label: 'Recarga',
    short: 'Recarga',
    icon: 'mdi-plus-circle-outline',
    weight: 8,
    what: 'Qué tan fácil y barato es cargar fondos (transferencia, red de cobranzas, débito automático).',
  },
])

export interface SourceLink {
  label: string
  url: string
  publisher: string
}

/** A real, sourced data point rendered as a credibility chip. */
export interface Signal {
  label: string
  value: string
  tone: 'pos' | 'neg' | 'neutral'
}

export interface DebitCard {
  id: string
  name: string
  issuer: string
  kind: CardKind
  networks: CardNetwork[]
  /** % commission on the international purchase amount. null = no official figure. */
  comisionExteriorPct: number | null
  /** Fixed per-transaction fee in USD. null = none / unknown. */
  cargoFijoUsd: number | null
  /** Does the 22% IVA apply on the commission? */
  ivaSobreComision: boolean
  /** Can the user hold/fund a USD balance to skip the peso→USD conversion? */
  fundeaEnUsd: boolean
  /** How peso→USD conversion works and at what rate when the balance is in pesos. */
  fxSpreadNote: string
  /** Human-readable one-line cost structure for an international USD purchase. */
  feeNote: string
  /** true when any figure above is an estimate/secondary, not an official published number. */
  estimate: boolean
  /** 0–100 per rubric dimension. */
  scores: Record<DimId, number>
  signals: readonly Signal[]
  pros: readonly string[]
  cons: readonly string[]
  bestFor: string
  verdict: string
  /** true when the core cost facts were confirmed against an authoritative source. */
  verified: boolean
  sources: readonly SourceLink[]
}

export const KIND_LABELS: Readonly<Record<CardKind, string>> = Object.freeze({
  banco: 'Débito bancario',
  prepaga: 'Prepaga',
  fintech: 'Fintech / billetera',
})

export const NETWORK_LABELS: Readonly<Record<CardNetwork, string>> = Object.freeze({
  visa: 'Visa',
  mastercard: 'Mastercard',
  otro: 'Otra',
})

// ─────────────────────────────────────────────────────────────────────────────
// DATA — from the research + adversarial-verify workflow (2026-07-19).
// Each commission/fee is an issuer official figure unless estimate=true.
// Key verified corrections vs. street lore:
//   - OCA *Blue* (débito/prepaga) has 0% foreign-purchase recargo; the 2%+IVA is
//     the OCA *credit* card — a different product.
//   - Itaú and BBVA débito charge 0% recargo (their 3%+IVA is for credit cards).
//   - Mercado Pago has 0% commission but is peso-only with a large hidden FX
//     spread (~4% "dólar tarjeta"), so it is the priciest here for USD buys.
// Uruguay-only admission rule: a card enters this catalogue only when an official
// source shows that a resident can request it in Uruguay. TakeCard and AstroCard
// were removed on 2026-07-22 because their issuers document other markets but do
// not document consumer-card availability for residents of Uruguay.
// ─────────────────────────────────────────────────────────────────────────────
export const DEBIT_CARDS: readonly DebitCard[] = Object.freeze([
  {
    id: 'prex',
    name: 'Prex',
    issuer: 'Prex (Fortigold S.A.)',
    kind: 'fintech',
    networks: ['mastercard'],
    comisionExteriorPct: 2.5,
    cargoFijoUsd: 0.5,
    ivaSobreComision: true,
    fundeaEnUsd: true,
    fxSpreadNote:
      'Cuenta bimoneda. El consumo en USD se debita primero del saldo en dólares; si no tenés USD, convierte tus pesos al "cambio preferencial" de Prex (un tipo venta con spread propio, no publicado). Fondeando en dólares evitás esa conversión.',
    feeNote:
      'Compra internacional: 2,5% + US$ 0,50 fijo + IVA 22% sobre la comisión (≈ 4,3% en un ítem de US$ 50). El cargo fijo pega más fuerte en compras chicas.',
    estimate: false,
    scores: {
      comisionExterior: 55,
      spreadCambio: 65,
      saldoUSD: 90,
      costo: 90,
      aceptacion: 85,
      recarga: 88,
    },
    signals: [
      { label: 'Comisión exterior', value: '2,5% + US$ 0,50 + IVA', tone: 'neg' },
      { label: 'Saldo en dólares', value: 'Sí (bimoneda)', tone: 'pos' },
      { label: 'Fuente', value: 'T&C oficial', tone: 'neutral' },
    ],
    pros: [
      'Gratis y muy usada para compras online y juegos',
      'Podés fondear en dólares y saltear el spread',
      'Recarga fácil por redes de cobranza',
    ],
    cons: [
      'Comisión de exterior alta (2,5% + fijo + IVA)',
      'El cargo fijo de US$ 0,50 castiga las compras chicas',
      'El spread de conversión no está publicado',
    ],
    bestFor:
      'Quien ya la usa por comodidad y carga saldo en dólares para bajar el costo; para compras chicas frecuentes conviene comparar.',
    verdict:
      'Cómoda y ubicua, pero no la más barata: la comisión de 2,5% + US$ 0,50 + IVA más el spread de conversión explican el ~6–7% que sentiste. Fondeá en USD para pagar solo la comisión.',
    verified: true,
    sources: [
      {
        label: 'Prex — comisión por compras en el exterior (centro de ayuda)',
        url: 'https://www.prexcard.com/ayuda/2.318',
        publisher: 'Prex',
      },
      {
        label: 'Prex — Términos y Condiciones',
        url: 'https://www.prexcard.com/html/terminosCondiciones',
        publisher: 'Prex',
      },
    ],
  },
  {
    id: 'oca-blue',
    name: 'OCA Blue',
    issuer: 'OCA Dinero Electrónico S.A.',
    kind: 'prepaga',
    networks: ['visa'],
    comisionExteriorPct: 0,
    cargoFijoUsd: 0,
    ivaSobreComision: false,
    fundeaEnUsd: true,
    fxSpreadNote:
      'Cuenta doble pesos/dólares. Con saldo en USD, la compra en dólares se debita directo sin conversión ni spread. Con saldo en pesos, convierte al tipo vendedor de Itaú (o al TC del sello Visa en el exterior); ese spread no se publica.',
    feeNote:
      'Compras internacionales sin recargo: tarifario oficial "$0 + IVA". Ojo: NO confundir con la tarjeta de crédito OCA, que sí cobra 2% + IVA.',
    estimate: false,
    scores: {
      comisionExterior: 100,
      spreadCambio: 75,
      saldoUSD: 95,
      costo: 82,
      aceptacion: 80,
      recarga: 80,
    },
    signals: [
      { label: 'Comisión exterior', value: '0% (sin recargo)', tone: 'pos' },
      { label: 'Saldo en dólares', value: 'Sí (cuenta doble)', tone: 'pos' },
      { label: 'Fuente', value: 'Cartilla oficial', tone: 'neutral' },
    ],
    pros: [
      '0% de comisión por compra en el exterior',
      'Podés tener saldo en dólares y evitar el spread',
      'Visa internacional ampliamente aceptada',
    ],
    cons: [
      'Con saldo en pesos, corrés el spread del tipo vendedor Itaú/Visa',
      'Tope de compras internacionales US$ 500/día',
      'La versión de crédito OCA sí cobra 2%+IVA (no confundir)',
    ],
    bestFor:
      'Comprar en dólares barato manteniendo saldo en USD; una de las mejores prepagas para juegos y suscripciones.',
    verdict:
      'De lo más barato del cuadro para compras en dólares: 0% de recargo por reglamento y saldo en USD para saltear el spread. La confusión con la tarjeta de crédito OCA (2%+IVA) hace que muchos crean que cobra más de lo que cobra.',
    verified: true,
    sources: [
      {
        label: 'OCA Blue — cartilla oficial (Compras Internacionales $0 + IVA)',
        url: 'https://www.oca.com.uy/download/Cartilla_OCABlue.pdf',
        publisher: 'OCA Dinero Electrónico',
      },
      {
        label: 'OCA Blue — compras en el exterior sin recargo',
        url: 'https://ocablue.uy/beneficios.html?id=88&name=ComprasSinRecargoOCABlue',
        publisher: 'OCA Blue',
      },
      {
        label: 'OCA — preguntas frecuentes (crédito 2%+IVA, para distinguir del débito)',
        url: 'https://oca.uy/preguntas-frecuentes.html',
        publisher: 'OCA',
      },
    ],
  },
  {
    id: 'itau-debito',
    name: 'Itaú Visa Débito',
    issuer: 'Itaú Uruguay',
    kind: 'banco',
    networks: ['visa'],
    comisionExteriorPct: 0,
    cargoFijoUsd: null,
    ivaSobreComision: false,
    fundeaEnUsd: true,
    fxSpreadNote:
      'Con débito asociado a cuenta en pesos, Visa convierte al tipo mayorista de Visa Internacional e Itaú suma ~3% sobre ese tipo. Con débito sobre cuenta en dólares y compra en USD, no hay conversión ni ese 3%.',
    feeNote:
      'Débito sin recargo por compra en el exterior (0%). El costo aparece solo si pagás desde pesos: ~3% de markup sobre el tipo de Visa. La tarjeta de crédito Itaú sí cobra 3% + IVA.',
    estimate: false,
    scores: {
      comisionExterior: 100,
      spreadCambio: 65,
      saldoUSD: 90,
      costo: 62,
      aceptacion: 78,
      recarga: 85,
    },
    signals: [
      { label: 'Recargo exterior (débito)', value: '0%', tone: 'pos' },
      { label: 'Markup si pagás en pesos', value: '~3% sobre TC Visa', tone: 'neg' },
      { label: 'Cuenta en dólares', value: 'Sí', tone: 'pos' },
    ],
    pros: [
      'Débito sin recargo por compra en el exterior',
      'Pagando desde cuenta en dólares, costo ~0',
      'Más barato que la tarjeta de crédito Itaú para comprar en USD',
    ],
    cons: [
      'Desde saldo en pesos, ~3% de markup sobre el tipo de Visa',
      'Algunas tiendas de juegos rechazan débito',
      'Atado a tener cuenta/paquete en el banco',
    ],
    bestFor:
      'Clientes Itaú que mantienen una cuenta en dólares y pagan sus compras en USD desde ahí.',
    verdict:
      'Muy conveniente si tenés cuenta en dólares: 0% de recargo y sin conversión. Si pagás desde pesos, el ~3% sobre el tipo de Visa lo vuelve parecido a las prepagas con comisión.',
    verified: true,
    sources: [
      {
        label: 'Itaú Uruguay — tarifario (débito 0% recargo; 3% sobre TC Visa si pagás en pesos)',
        url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
        publisher: 'Itaú Uruguay',
      },
      {
        label: 'Itaú Uruguay — tarjetas de débito',
        url: 'https://www.itau.com.uy/inst/tarjetasDebito.html',
        publisher: 'Itaú Uruguay',
      },
    ],
  },
  {
    id: 'bbva-debito',
    name: 'BBVA Visa Débito',
    issuer: 'BBVA Uruguay',
    kind: 'banco',
    networks: ['visa'],
    comisionExteriorPct: 0,
    cargoFijoUsd: 0,
    ivaSobreComision: false,
    fundeaEnUsd: true,
    fxSpreadNote:
      'Con caja de ahorro en USD asociada, la compra en dólares se debita por el monto exacto, sin conversión ni spread. Con solo cuenta en pesos, convierte al tipo de venta del día (spread no publicado como %).',
    feeNote:
      'Cartilla oficial: comisión por compra en el exterior US$ 0 con débito. El 3%+IVA que circula es de las tarjetas de crédito/prepagas BBVA, no del débito.',
    estimate: false,
    scores: {
      comisionExterior: 100,
      spreadCambio: 75,
      saldoUSD: 90,
      costo: 62,
      aceptacion: 78,
      recarga: 82,
    },
    signals: [
      { label: 'Comisión exterior (débito)', value: 'US$ 0', tone: 'pos' },
      { label: 'Caja de ahorro en USD', value: 'Sí', tone: 'pos' },
      { label: 'Fuente', value: 'Cartilla oficial', tone: 'neutral' },
    ],
    pros: [
      '0% de comisión por compra en el exterior con débito',
      'Con caja de ahorro en USD pagás el monto exacto',
      'Visa internacional para e-commerce',
    ],
    cons: [
      'Desde pesos, corrés el spread del tipo de venta del banco',
      'Tope diario US$ 500 en compras',
      'Algunas tiendas rechazan débito',
    ],
    bestFor: 'Clientes BBVA con caja de ahorro en dólares que quieren pagar en USD sin recargo.',
    verdict:
      'Como Itaú, el débito no cobra comisión de exterior: manteniendo saldo en dólares es de lo más barato. El "3%+IVA" que ves por ahí es de sus tarjetas de crédito/prepaga, no del débito.',
    verified: true,
    sources: [
      {
        label: 'BBVA — Cartilla de Instrumentos Electrónicos (comisión compra exterior US$ 0)',
        url: 'https://www.bbva.com.uy/content/dam/public-web/uruguay/documents/cartilla-contractual-de-producto/Cartilla-Instrumentos-Electronicos.pdf',
        publisher: 'BBVA Uruguay',
      },
      {
        label: 'BBVA — tarjeta de débito',
        url: 'https://www.bbva.com.uy/personas/productos/tarjetas/tarjeta-de-debito.html',
        publisher: 'BBVA Uruguay',
      },
    ],
  },
  {
    id: 'midinero',
    name: 'MiDinero',
    issuer: 'MiDinero (Correo Uruguayo / República)',
    kind: 'prepaga',
    networks: ['mastercard'],
    comisionExteriorPct: 2.5,
    cargoFijoUsd: 0.5,
    ivaSobreComision: true,
    fundeaEnUsd: true,
    fxSpreadNote:
      'Mantiene saldo en pesos y en dólares por separado. Sin saldo USD, convierte a la pizarra BROU (lado venta) sin cobrar comisión extra por la conversión. Fondeando en dólares evitás ese spread.',
    feeNote:
      'Compra internacional: 2,5% + US$ 0,50 fijo + IVA 22% (≈ 4,3% en un ítem de US$ 50). Misma estructura que Prex.',
    estimate: false,
    scores: {
      comisionExterior: 55,
      spreadCambio: 72,
      saldoUSD: 85,
      costo: 80,
      aceptacion: 78,
      recarga: 85,
    },
    signals: [
      { label: 'Comisión exterior', value: '2,5% + US$ 0,50 + IVA', tone: 'neg' },
      { label: 'Conversión', value: 'Pizarra BROU, sin comisión extra', tone: 'neutral' },
      { label: 'Saldo en dólares', value: 'Sí', tone: 'pos' },
    ],
    pros: [
      'Podés mantener saldo en dólares',
      'Convierte a pizarra BROU sin comisión de conversión extra',
      'Recarga por mostrador, TuCajero, transferencia y Mercado Pago',
    ],
    cons: [
      'Comisión de exterior igual a Prex (2,5% + fijo + IVA)',
      'El cargo fijo castiga las compras chicas',
      'Prepaga: alguna tienda puede rechazarla',
    ],
    bestFor:
      'Quien quiere una prepaga local con respaldo estatal y carga saldo en dólares para bajar el costo.',
    verdict:
      'Estructura de costo idéntica a Prex (2,5% + US$ 0,50 + IVA), con la ventaja de convertir a pizarra BROU sin comisión extra. Fondeá en dólares para pagar solo la comisión.',
    verified: true,
    sources: [
      {
        label: 'MiDinero — detalle de tarifas (exterior 2,5% + US$ 0,50 + IVA)',
        url: 'https://www.midinero.com.uy/detalle-de-tarifas-midinero/',
        publisher: 'MiDinero',
      },
      {
        label: 'MiDinero — ¿qué es una conversión de moneda? (pizarra BROU)',
        url: 'https://www.midinero.com.uy/pregunta/que-es-una-conversion-de-moneda/',
        publisher: 'MiDinero',
      },
    ],
  },
  {
    id: 'brou-debito',
    name: 'BROU Débito',
    issuer: 'Banco República (BROU)',
    kind: 'banco',
    networks: ['visa', 'mastercard'],
    comisionExteriorPct: 3,
    cargoFijoUsd: null,
    ivaSobreComision: false,
    fundeaEnUsd: true,
    fxSpreadNote:
      'Desde cuenta en pesos, convierte "al tipo de cambio de pizarra en la transacción" (lado venta), más la comisión de exterior. Asociando una caja de ahorro en dólares, las compras en USD se debitan directo en dólares.',
    feeNote:
      'Compra internacional: 3% con la Mastercard Débito estándar (2% en Visa Institucional y Recompensa). El tarifario no explicita IVA sobre esta comisión de débito. Sin cargo fijo por compra online.',
    estimate: false,
    scores: {
      comisionExterior: 52,
      spreadCambio: 70,
      saldoUSD: 85,
      costo: 70,
      aceptacion: 75,
      recarga: 85,
    },
    signals: [
      { label: 'Comisión exterior', value: '3% (2% en algunos plásticos)', tone: 'neg' },
      { label: 'Caja de ahorro en USD', value: 'Sí', tone: 'pos' },
      { label: 'IVA sobre comisión', value: 'No explícito en el tarifario', tone: 'neutral' },
    ],
    pros: [
      'Podés asociar caja de ahorro en dólares',
      'Algunos plásticos cobran 2% en vez de 3%',
      'La tarjeta que ya tiene casi todo el mundo',
    ],
    cons: [
      '3% de comisión en la Mastercard Débito estándar',
      'Desde pesos, spread de pizarra (lado venta)',
      'Algunas tiendas de juegos rechazan débito',
    ],
    bestFor: 'Clientes BROU que ya tienen caja de ahorro en dólares y prefieren usar su banco.',
    verdict:
      'Funciona y permite pagar desde una caja de ahorro en dólares, pero el 3% de comisión (2% en algunos plásticos) la deja por encima de OCA Blue o el débito de Itaú/BBVA para comprar en USD.',
    verified: true,
    sources: [
      {
        label: 'BROU — costos y exoneraciones Visa y Mastercard Débito',
        url: 'https://www.brou.com.uy/personas/tarjetas/costos-y-exoneraciones-visa-y-master/debito',
        publisher: 'BROU',
      },
      {
        label: 'BROU — destacados para viajeros (cuenta en dólares)',
        url: 'https://www.brou.com.uy/personas/tarjetas/redbrou-visa/destacados-para-viajeros',
        publisher: 'BROU',
      },
    ],
  },
  {
    id: 'scotiabank-debito',
    name: 'Scotiabank Visa Débito',
    issuer: 'Scotiabank Uruguay',
    kind: 'banco',
    networks: ['visa'],
    comisionExteriorPct: 3,
    cargoFijoUsd: null,
    ivaSobreComision: true,
    fundeaEnUsd: true,
    fxSpreadNote:
      'Con débito sobre cuenta en pesos, convierte al tipo vendedor del banco (spread no publicado). Asociando una cuenta de depósito en dólares, la Visa Débito debita directo del saldo en USD y evita la conversión.',
    feeNote:
      'Compra en el exterior: 3% de recargo (FAQ oficial de Visa Débito). El IVA sobre esa comisión sigue la norma habitual en UY, aunque la página de débito no lo deletrea.',
    estimate: false,
    scores: {
      comisionExterior: 52,
      spreadCambio: 72,
      saldoUSD: 88,
      costo: 62,
      aceptacion: 78,
      recarga: 85,
    },
    signals: [
      { label: 'Recargo exterior', value: '3% (FAQ oficial)', tone: 'neg' },
      { label: 'Cuenta en dólares', value: 'Sí', tone: 'pos' },
      { label: 'Límite', value: 'Hasta US$ 2.000/día', tone: 'neutral' },
    ],
    pros: [
      'Podés debitar desde una cuenta en dólares',
      'Visa internacional apta para servicios y tiendas del exterior',
      'Límite alto en compras en dólares',
    ],
    cons: [
      '3% de recargo por compra en el exterior',
      'El IVA sobre la comisión no está deletreado para débito',
      'Desde pesos, spread del tipo vendedor',
    ],
    bestFor:
      'Clientes Scotiabank con cuenta en dólares que compran servicios y suscripciones del exterior.',
    verdict:
      'El 3% de recargo la ubica junto a BROU y Santander estándar. Su ventaja es debitar desde una cuenta en dólares, lo que elimina el spread pero no ese 3%.',
    verified: true,
    sources: [
      {
        label: 'Scotiabank — Visa Débito, preguntas frecuentes (exterior 3%)',
        url: 'https://www.scotiabank.com.uy/Personas/Tarjetas/Mas-informacion/preguntas-frecuentes-sobre-visa-debito',
        publisher: 'Scotiabank Uruguay',
      },
      {
        label: 'Scotiabank — comisiones por compra en el exterior',
        url: 'https://www.scotiabank.com.uy/Acerca-de/novedades/comisiones-tdc-compra-exterior',
        publisher: 'Scotiabank Uruguay',
      },
    ],
  },
  {
    id: 'santander-debito',
    name: 'Santander Visa Débito',
    issuer: 'Banco Santander Uruguay',
    kind: 'banco',
    networks: ['visa'],
    comisionExteriorPct: 3,
    cargoFijoUsd: null,
    ivaSobreComision: true,
    fundeaEnUsd: true,
    fxSpreadNote:
      'La comisión 3% + IVA se cobra igual, tengas saldo en pesos o en dólares. Con cuenta en dólares evitás el spread; desde pesos, el banco convierte a su tipo vendedor del día (spread no publicado).',
    feeNote:
      'Visa Débito estándar (Internacional): 3% + IVA ≈ 3,66% sobre la compra internacional, sin cargo fijo. Las Visa Débito Select/Platinum no cobran recargo (US$ 0).',
    estimate: false,
    scores: {
      comisionExterior: 50,
      spreadCambio: 72,
      saldoUSD: 88,
      costo: 62,
      aceptacion: 78,
      recarga: 85,
    },
    signals: [
      { label: 'Recargo exterior (estándar)', value: '3% + IVA (~3,66%)', tone: 'neg' },
      { label: 'Débito Select/Platinum', value: 'Sin recargo', tone: 'pos' },
      { label: 'Cuenta bimonetaria', value: 'Sí', tone: 'pos' },
    ],
    pros: [
      'Las versiones Select/Platinum no cobran recargo',
      'Cuenta bimonetaria para pagar desde dólares',
      'Sin cargo fijo por compra',
    ],
    cons: [
      'La Visa Débito estándar cobra 3% + IVA',
      'El spread desde pesos no se publica',
      'La versión sin recargo requiere segmento premium',
    ],
    bestFor:
      'Clientes Santander Select/Platinum (sin recargo) o quienes pagan desde una cuenta en dólares.',
    verdict:
      'Depende de tu plástico: la Visa Débito estándar cobra 3% + IVA (~3,66%), pero las Select/Platinum no cobran recargo. Si sos premium, es de las más baratas; si no, queda en el pelotón del 3%.',
    verified: true,
    sources: [
      {
        label:
          'Santander — Manual de Tarifas (Visa Débito estándar 3% + IVA; Select/Platinum sin recargo)',
        url: 'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20250503.pdf',
        publisher: 'Santander Uruguay',
      },
      {
        label: 'Santander — centro de ayuda, viajes',
        url: 'https://www.santander.com.uy/centro-de-ayuda/tarjetas/viajes',
        publisher: 'Santander Uruguay',
      },
    ],
  },
  {
    id: 'mercado-pago',
    name: 'Mercado Pago',
    issuer: 'Mercado Pago Uruguay',
    kind: 'fintech',
    networks: ['mastercard'],
    comisionExteriorPct: 0,
    cargoFijoUsd: null,
    ivaSobreComision: false,
    fundeaEnUsd: false,
    fxSpreadNote:
      'Cuenta y tarjeta solo en pesos: NO podés tener saldo en dólares, así que toda compra en USD se convierte. La referencia en los T&C es el dólar vendedor BROU; la prensa estima que el tipo efectivo queda ~4% por encima del oficial.',
    feeNote:
      'Sin comisión del emisor (0%) ni cargo fijo por compra internacional. El costo real está escondido en el spread del "dólar tarjeta" (~4% estimado sobre el oficial).',
    estimate: true,
    scores: {
      comisionExterior: 100,
      spreadCambio: 30,
      saldoUSD: 0,
      costo: 92,
      aceptacion: 80,
      recarga: 90,
    },
    signals: [
      { label: 'Comisión del emisor', value: '0% (oficial)', tone: 'pos' },
      { label: 'Saldo en dólares', value: 'No existe', tone: 'neg' },
      { label: 'Spread "dólar tarjeta"', value: '~4% sobre oficial (prensa)', tone: 'neg' },
    ],
    pros: [
      'Sin comisión de compra ni cargos fijos',
      'Recarga instantánea desde tu saldo de Mercado Pago',
      'Emisión y mantenimiento $0',
    ],
    cons: [
      'No hay saldo en dólares: la conversión es inevitable',
      'El "dólar tarjeta" queda ~4% arriba del oficial (estimado)',
      'El costo real no aparece como línea: está en el tipo de cambio',
    ],
    bestFor:
      'Compras internacionales ocasionales por comodidad; para gastar seguido en dólares hay opciones más baratas.',
    verdict:
      'Trampa clásica del "0% de comisión": como no podés tener dólares, todo pasa por un tipo de cambio que la prensa estima ~4% sobre el oficial. En la práctica, de las más caras del cuadro para comprar en USD, pese a no cobrar comisión.',
    verified: false,
    sources: [
      {
        label: 'Mercado Pago — tarifas de la tarjeta (0% comisión, cargos $0)',
        url: 'https://www.mercadopago.com.uy/ayuda/26442',
        publisher: 'Mercado Pago',
      },
      {
        label: 'Mercado Pago — T&C (conversión: dólar vendedor BROU)',
        url: 'https://www.mercadopago.com.uy/ayuda/terminos-y-condiciones-uy_299',
        publisher: 'Mercado Pago',
      },
      {
        label: 'Cuidado al pagar en dólares con Mercado Pago: aplican un TC más alto (prensa)',
        url: 'https://www.iprofesional.com/finanzas/447464-cuidado-al-pagar-en-dolares-con-mercado-pago-aplican-un-tipo-de-cambio-mas-alto',
        publisher: 'iProfesional (secundaria)',
      },
    ],
  },
])

export const DEBIT_SOURCES: readonly SourceLink[] = Object.freeze([
  {
    label:
      '¿Qué costos tiene usar la tarjeta de débito o crédito en el exterior? (comisión + IVA + spread)',
    url: 'https://www.elobservador.com.uy/nota/-que-costos-tiene-usar-la-tarjeta-de-debito-o-credito-en-el-exterior--20195205043',
    publisher: 'El Observador',
  },
  {
    label: 'Visa Uruguay — cómo se calcula el tipo de cambio de las compras en el exterior',
    url: 'https://www.visa.com.uy/soporte/consumidores/viajes/tipo-de-cambio.html',
    publisher: 'Visa Uruguay',
  },
  {
    label:
      'Reducción de IVA por Ley 19.210 (2 puntos con débito; aplica a compras internas gravadas)',
    url: 'https://www.brou.com.uy/personas/tarjetas/redbrou/reduccion-de-iva',
    publisher: 'BROU',
  },
  {
    label:
      'Tratamiento fiscal de las plataformas digitales en Uruguay (Ley 19.535: streaming sí, tiendas de juegos no)',
    url: 'https://ccea.com.uy/items/informe-tecnico-tratamiento-fiscal-de-las-plataformas-digitales-en-uruguay/',
    publisher: 'CCEAU',
  },
])

/**
 * Which Reddit-tracked issuer each card belongs to (ids from REDDIT_ENTITIES in
 * utils/redditSentiment.ts). Reddit talks about the *issuer* ("Prex", "OCA"), not
 * about a specific plastic, so several cards can map to the same entity. A card
 * with no entry simply shows no Reddit block — silence beats a wrong attribution.
 */
export const DEBIT_REDDIT_ENTITY: Readonly<Record<string, string>> = Object.freeze({
  prex: 'prex',
  'oca-blue': 'oca',
  'itau-debito': 'itau',
  'bbva-debito': 'bbva',
  midinero: 'midinero',
  'brou-debito': 'brou',
  'scotiabank-debito': 'scotiabank',
  'santander-debito': 'santander',
  'mercado-pago': 'mercadopago',
})

/** The distinct Reddit entities behind the debit/prepaid cards we rank. */
export const DEBIT_REDDIT_IDS: readonly string[] = Object.freeze([
  ...new Set(Object.values(DEBIT_REDDIT_ENTITY)),
])

// ─────────────────────────────────────────────────────────────────────────────
// Scoring — overall is computed from per-dimension scores (never hand-set).
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHT_SUM = DEBIT_RUBRIC.reduce((s, d) => s + d.weight, 0)

/** Weighted 0–100 overall score computed from a card's per-dimension scores. */
export function computeOverall(scores: Record<DimId, number>): number {
  const total = DEBIT_RUBRIC.reduce((s, d) => s + (scores[d.id] ?? 0) * d.weight, 0)
  return Math.round(total / WEIGHT_SUM)
}

export interface RankedCard extends DebitCard {
  overall: number
  rank: number
}

/** Cards with computed overall score, sorted best-first, 1-indexed rank. */
export function rankedCards(cards: readonly DebitCard[] = DEBIT_CARDS): RankedCard[] {
  return cards
    .map(c => ({ ...c, overall: computeOverall(c.scores) }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name))
    .map((c, i) => ({ ...c, rank: i + 1 }))
}

/** Medal for the top three, else null. */
export function medalFor(rank: number): string | null {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
}

export function getDebitCard(id: string): DebitCard | undefined {
  return DEBIT_CARDS.find(c => c.id === id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost calculator — "¿cuánto me sale de verdad una compra en dólares?"
// ─────────────────────────────────────────────────────────────────────────────

export interface IntlCostInput {
  /** Purchase amount abroad, in USD (e.g. a USD 49,99 game item). */
  purchaseUsd: number
  /** The card being used. */
  card: Pick<DebitCard, 'comisionExteriorPct' | 'cargoFijoUsd' | 'ivaSobreComision'>
  /** Selling rate the issuer applies to convert pesos→USD (UYU per USD). */
  fxVenta: number
  /**
   * Wholesale / BCU mid rate (UYU per USD), optional. When given, the effective
   * cost is measured against buying the same USD at the wholesale rate, so it
   * captures BOTH the commission AND the conversion spread. When omitted, the
   * effective cost is measured against the issuer's own selling rate, so it
   * reflects ONLY the commission (the spread stays hidden inside the FX rate).
   */
  fxMid?: number
}

export interface IntlCostResult {
  purchaseUsd: number
  /** Commission in USD: purchase × pct + fixed fee. */
  comisionUsd: number
  /** IVA in USD on the commission (0 if it does not apply). */
  ivaUsd: number
  /** purchase + commission + IVA, in USD. */
  subtotalUsd: number
  /** subtotal × selling rate, in UYU — what actually leaves the wallet. */
  totalPesos: number
  /** Pesos attributable to the conversion spread, or null if no mid rate given. */
  spreadPesos: number | null
  /** Total surcharge over buying the item's USD at the reference rate, as a %. */
  costoEfectivoPct: number
}

/**
 * Pure economics of an international USD purchase paid from a peso balance:
 * commission (% + fixed) + IVA on the commission, all converted at the issuer's
 * selling rate. Missing commission figures are treated as 0 (no cost) so the
 * calculator never invents a fee for a card with `comisionExteriorPct: null` —
 * the page flags that case separately. Negative/invalid inputs are clamped.
 */
export function estimateIntlCost(input: IntlCostInput): IntlCostResult {
  const purchaseUsd = Math.max(0, input.purchaseUsd || 0)
  const fxVenta = Math.max(0, input.fxVenta || 0)
  const pct = Math.max(0, input.card.comisionExteriorPct ?? 0)
  const fijo = Math.max(0, input.card.cargoFijoUsd ?? 0)
  const comisionUsd = (purchaseUsd * pct) / 100 + fijo
  const ivaUsd = input.card.ivaSobreComision ? comisionUsd * IVA_RATE : 0
  const subtotalUsd = purchaseUsd + comisionUsd + ivaUsd
  const totalPesos = subtotalUsd * fxVenta
  const hasMid = typeof input.fxMid === 'number' && input.fxMid > 0
  const refRate = hasMid ? (input.fxMid as number) : fxVenta
  const spreadPesos = hasMid ? (fxVenta - (input.fxMid as number)) * subtotalUsd : null
  const baseline = purchaseUsd * refRate
  const costoEfectivoPct = baseline > 0 ? (totalPesos / baseline - 1) * 100 : 0
  return {
    purchaseUsd,
    comisionUsd: round2(comisionUsd),
    ivaUsd: round2(ivaUsd),
    subtotalUsd: round2(subtotalUsd),
    totalPesos: Math.round(totalPesos),
    spreadPesos: spreadPesos === null ? null : Math.round(spreadPesos),
    costoEfectivoPct: round2(costoEfectivoPct),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** The canonical worked example: the Prex USD 49,99 game-item case from the post. */
export const PREX_CASE = Object.freeze({
  purchaseUsd: 49.99,
  comisionPct: 2.5,
  cargoFijoUsd: 0.5,
  fxVenta: 41.6,
  fxMid: 40.5,
  observedPesos: 2168.41,
})
