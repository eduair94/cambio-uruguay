// app/utils/cardRewards.ts
// Data + helpers for the credit-card rewards pages:
//   - /tarjetas-de-credito-uruguay  (objective ranking + comparison of points/benefits programs)
//   - /pagar-cuentas-con-tarjeta     (paying bills by credit card via totalnet; worth-it calculator)
//
// PURE module (no Vue/Nuxt) so the pages and tests share one source of truth.
// The ranking is deliberately transparent: a fixed weighted RUBRIC lives here, each
// program is scored 0–100 per dimension, and the overall is COMPUTED in code from
// those scores (not hand-set), so the ranking is reproducible and auditable.
//
// Scores are our best objective judgement from web research + an adversarial
// fact-check pass; where a program's terms are unpublished or unconfirmed we score
// conservatively and say so in the rationale. Informational, not financial advice.

export type IssuerType = 'banco' | 'emisor_no_bancario' | 'fintech' | 'cooperativa' | 'retail'
export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'oca' | 'cabal' | 'otro'

/** One scoring dimension of the ranking rubric. */
export interface RubricDimension {
  id: RubricId
  label: string
  /** Weight in the overall score; the set sums to 100. */
  weight: number
  what: string
}

export type RubricId =
  | 'acumulacion'
  | 'canje'
  | 'descuentos'
  | 'costo'
  | 'flexibilidad'
  | 'cobertura'

/**
 * The transparent, weighted rubric. Weights reflect what matters most to a typical
 * cardholder in Uruguay: the everyday discount network and the real earn rate weigh
 * most, then redemption value and annual cost, then flexibility and acceptance.
 */
export const REWARD_RUBRIC: readonly RubricDimension[] = Object.freeze([
  {
    id: 'acumulacion',
    label: 'Acumulación',
    weight: 25,
    what: 'Cuánto valor real devuelve por cada peso gastado (puntos, millas o cashback).',
  },
  {
    id: 'descuentos',
    label: 'Red de descuentos',
    weight: 25,
    what: 'Amplitud y utilidad de los descuentos y beneficios (súper, gastronomía, combustible, cuotas).',
  },
  {
    id: 'canje',
    label: 'Canje',
    weight: 20,
    what: 'Qué se puede canjear y qué tan fácil y conveniente es hacerlo.',
  },
  {
    id: 'costo',
    label: 'Costo',
    weight: 15,
    what: 'Costo anual y de mantenimiento frente al beneficio que devuelve.',
  },
  {
    id: 'flexibilidad',
    label: 'Flexibilidad',
    weight: 8,
    what: 'Vencimiento de los puntos, transferencia y opciones de uso.',
  },
  {
    id: 'cobertura',
    label: 'Cobertura',
    weight: 7,
    what: 'Aceptación de la red y disponibilidad para distintos perfiles.',
  },
])

export interface CardProgram {
  id: string
  name: string
  issuer: string
  issuerType: IssuerType
  networks: CardNetwork[]
  pointsProgramName: string
  earnRateNote: string
  pointValueNote?: string
  redemptionNote: string
  discountNote: string
  feeNote: string
  pros: string[]
  cons: string[]
  bestFor: string
  note?: string
  /** 0–100 per rubric dimension. */
  scores: Record<RubricId, number>
  /** One-paragraph objective justification of the scores. */
  rationale?: string
  /** true when the core program facts were confirmed against an authoritative source. */
  verified: boolean
}

export const ISSUER_TYPE_LABELS: Readonly<Record<IssuerType, string>> = Object.freeze({
  banco: 'Banco',
  emisor_no_bancario: 'Emisor no bancario',
  fintech: 'Fintech',
  cooperativa: 'Cooperativa',
  retail: 'Retail',
})

export const NETWORK_LABELS: Readonly<Record<CardNetwork, string>> = Object.freeze({
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  oca: 'OCA',
  cabal: 'Cabal',
  otro: 'Otra',
})

// Populated after research (see the research + verify + rank workflow output).
export const CARD_PROGRAMS: readonly CardProgram[] = Object.freeze([
  {
    id: 'brou-recompensa',
    name: 'BROU Recompensa Mastercard (Crédito)',
    issuer: 'Banco República (BROU)',
    issuerType: 'banco',
    networks: ['mastercard'],
    pointsProgramName: 'Programa BROU Recompensa',
    earnRateNote:
      'Sí tiene programa de puntos (no es solo descuentos): 1 punto por cada $U 100 pagados con la tarjeta de crédito BROU Recompensa, equivalente a $U 1. Acumula en compras nacionales e internacionales y débitos automáticos reflejados en el estado de cuenta. Confirmado en brou.com.uy.',
    pointValueNote:
      '1 punto = $U 1 (equivale a ~1% del consumo devuelto en puntos canjeables). Valor confirmado en fuentes oficiales y comparativas.',
    redemptionNote:
      "Los puntos equivalen a dinero ('Puntos = dinero') y se usan para tus propias compras / canje en el programa BROU Recompensa. 1 punto = $U 1 (aprox. 1% de retorno / cashback en forma de puntos). Gestión vía plataforma Recompensa (loyaltygateway).",
    discountNote:
      'Fuerte red de descuentos automáticos, principal atractivo de la tarjeta: descuentos en supermercados seleccionados, farmacias, combustible en estaciones ANCAP, gastronomía y hotelería. Ejemplos citados: 10% en farmacias (mié/sáb/dom, tope reintegro $U 1.000/mes por cuenta) según BROU; comparativas de mercado mencionan 10% supermercados (mar/jue, tope ~$U 2.000/mes) y 5% ANCAP (lun/vie, tope ~$U 500/mes). Los días y topes exactos varían por campaña vigente — verificar promociones activas. verified=false para días/topes puntuales.',
    feeNote:
      'Sin costo el primer año. Referencia de mercado: ~$U 3.200/año, bonificable total o parcialmente según consumo (por ejemplo con consumo mensual desde ~$U 25.000). El costo exacto post primer año depende del uso. verified=false para la cifra anual precisa.',
    pros: [
      'Red de descuentos automáticos amplia y concreta (supermercados, farmacias, ANCAP, gastronomía) — el mayor diferencial.',
      'Puntos con valor claro: 1 punto = $U 1, canjeables como dinero.',
      'Sin costo el primer año y anualidad bonificable por consumo.',
      'Respaldo del banco más grande y con mayor red de cajeros del país (RedBROU).',
    ],
    cons: [
      'Solo red Mastercard (sin opción Visa/Amex en esta línea).',
      'Topes mensuales de reintegro en los descuentos limitan el ahorro máximo.',
      'Días/topes de las promociones cambian por campaña; hay que estar atento a la letra chica.',
      'Tasa de acumulación estándar (~1%), sin bonos por categoría más allá de los descuentos.',
    ],
    bestFor:
      'Familias y usuarios de consumo cotidiano en Uruguay (supermercado, farmacia y combustible ANCAP): la combinación de descuentos automáticos + 1% en puntos suele rendir más que los programas de solo puntos.',
    scores: {
      acumulacion: 72,
      canje: 82,
      descuentos: 82,
      costo: 78,
      flexibilidad: 65,
      cobertura: 80,
    },
    rationale:
      'Combinacion mas equilibrada del set: acumulacion confirmada de 1 punto por $100 con 1 punto = $1 (~1% liquido tratado como dinero para tus propias compras), una de las redes de descuentos automaticos mas fuertes del pais (farmacias, supermercados, ANCAP, gastronomia) y costo bajo (1er ano gratis, ~$3.200 bonificable). Valor y tasa confirmados en fuente oficial; solo dias/topes puntuales quedan como verified=false, lo que baja levemente flexibilidad y cobertura.',
    verified: true,
  },
  {
    id: 'mercado-pago-uruguay',
    name: 'Mercado Pago (tarjeta prepaga Mastercard + Meli+ + rendimientos)',
    issuer: 'Mercado Pago Uruguay',
    issuerType: 'fintech',
    networks: ['mastercard'],
    pointsProgramName:
      'Sin puntos: cashback en ecosistema + rendimientos diarios sobre saldo + Meli+',
    earnRateNote:
      'Cashback en pesos en compras de Mercado Libre y comercios afiliados (porcentaje variable, no publicado como tasa fija). Meli+ reintegra hasta 5% dentro del ecosistema Mercado Libre. Además rendimientos diarios sobre el saldo (~5,75% anual al lanzamiento, atado a la tasa de política monetaria del BCU).',
    pointValueNote:
      'Cashback y rendimientos en pesos 1:1 (líquidos). Meli+ hasta 5% dentro del ecosistema; rendimiento del saldo ~5,75% anual al lanzamiento (varía con la tasa BCU).',
    redemptionNote:
      'Cashback y reintegros en saldo/pesos (líquido). Los rendimientos se acreditan automáticamente sin inmovilizar fondos.',
    discountNote:
      'Reintegros de hasta 5% dentro del ecosistema Mercado Libre vía Meli+; envíos gratis desde compras >$500. Descuentos en comercios afiliados (variables). Fuera del ecosistema Meli, la oferta de descuentos locales es más acotada que OCA/Prex.',
    feeNote:
      'Tarjeta prepaga gratuita, sin emisión ni mantenimiento, sin cargos por compra internacional. Meli+ cuesta $199/mes (opcional).',
    pros: [
      "Rendimiento diario sobre el saldo (raro en prepagas): el dinero parado 'trabaja'",
      'Cashback fuerte si comprás mucho en Mercado Libre',
      'Prepaga internacional gratis sin recargos en compras del exterior',
    ],
    cons: [
      'El mejor cashback (5%) exige suscripción Meli+ paga ($199/mes) y gastar en el ecosistema',
      'Menor red de descuentos en comercio físico local vs OCA/Prex',
      'Tasa de cashback general no publicada como % fijo (verified parcial)',
    ],
    bestFor:
      'Usuario intensivo de Mercado Libre que quiere rendimientos sobre el saldo y reintegros dentro del ecosistema.',
    scores: {
      acumulacion: 70,
      canje: 90,
      descuentos: 55,
      costo: 95,
      flexibilidad: 92,
      cobertura: 68,
    },
    rationale:
      'Puntaje alto por liquidez total (cashback y reintegros en pesos 1:1, sin catalogo ni vencimiento), costo cero de emision/mantenimiento y el diferencial de rendimiento diario sobre el saldo (~5,75% anual atado al BCU) que ningun otro programa ofrece. Penaliza que el cashback es de tasa variable no publicada y que fuera del ecosistema Mercado Libre la red de descuentos locales es mas acotada que OCA/Prex.',
    verified: true,
  },
  {
    id: 'club-tienda-inglesa-puntos',
    name: 'Tienda Inglesa — Programa de Puntos (Puntos Card / Club Card)',
    issuer:
      'Tienda Inglesa (retail); tarjeta de crédito Club Card American Express emitida por Scotiabank',
    issuerType: 'retail',
    networks: ['amex'],
    pointsProgramName: 'Programa de Puntos Tienda Inglesa (Puntos Card); Club Card duplica puntos',
    earnRateNote:
      "1 punto por cada $600 de compra en Tienda Inglesa, Tienda Deli, Tienda Farma y Barny's; además se genera un 'puntito' (0,1 punto) cuando la compra/saldo supera $60 pero es menor a $600. Con la tarjeta Club Card las compras generan el DOBLE de puntos. Tasa confirmada por fuentes.",
    pointValueNote:
      'Valor transparente y fijo: 1 punto = $10 de descuento (equivalencia ≈ acumulación de $600 → $10, es decir ~1,67% de retorno base; ~3,3% con Club Card por doble punto).',
    redemptionNote:
      "Cada punto acumulado equivale a $10 de descuento aplicable a la compra de cualquier producto en Tienda Inglesa/Farma/Deli/Barny's, o a vales de combustible Petrobras. Se puede pagar total o parcialmente con puntos. Mínimo 15 puntos para canjear. Vigencia 6 meses (se renueva con cada acumulación/canje).",
    discountNote:
      'Descuentos y promociones exclusivas para socios del Club/Club Card; la tarjeta de crédito Club Card American Express (emitida por Scotiabank) agrega beneficios bancarios además de duplicar puntos.',
    feeNote:
      'El programa de Puntos del super es gratuito (adhesión con documento en caja). La tarjeta Club Card American Express es producto de Scotiabank con sus propios costos (no confirmados aquí).',
    pros: [
      'Valor del punto TRANSPARENTE y fijo: 1 punto = $10 (raro en el mercado local)',
      'Se puede pagar la compra directamente con puntos (o combustible Petrobras)',
      'Club Card duplica la acumulación (~3,3% de retorno)',
      'Adhesión gratuita solo con documento; acepta cualquier medio de pago para acumular',
    ],
    cons: [
      'Retorno base modesto (~1,67%) y acotado al ecosistema Tienda Inglesa/Petrobras',
      'Vigencia de puntos de solo 6 meses obliga a canjear seguido',
      'La duplicación de puntos requiere la Club Card, que es tarjeta de un banco (Scotiabank), no de un emisor no bancario',
      'Mínimo de 15 puntos para empezar a canjear',
    ],
    bestFor:
      'Clientes habituales de Tienda Inglesa que valoran un programa de puntos con valor claro y canjeable directamente en la compra o en combustible.',
    note: 'Tasa 1 pt/$600, valor 1 pt = $10, mínimo 15 puntos, vigencia 6 meses y doble punto Club Card confirmados por el sitio/bases oficiales de Tienda Inglesa. Club Card Amex la emite Scotiabank (banco).',
    scores: {
      acumulacion: 82,
      canje: 78,
      descuentos: 55,
      costo: 85,
      flexibilidad: 62,
      cobertura: 72,
    },
    rationale:
      'La mejor tasa efectiva verificable del set: 1 punto cada $600 = $10 de descuento (~1,67% base y ~3,3% con Club Card por doble punto), con valor transparente y fijo. El programa del super es gratuito. Baja por alcance limitado al ecosistema Tienda Inglesa/Farma/Deli/Petrobras, vigencia de solo 6 meses (renovable) y minimo de 15 puntos para canjear.',
    verified: true,
  },
  {
    id: 'prex-uruguay',
    name: 'Prex (tarjeta prepaga Mastercard)',
    issuer: 'Prex Uruguay',
    issuerType: 'fintech',
    networks: ['mastercard'],
    pointsProgramName: 'Sin programa de puntos: cashback rotativo + descuentos + ahorro de IVA',
    earnRateNote:
      'Cashback variable 1%-5% en comercios seleccionados que rotan semanalmente (según Prex y comparativa Ahorrin). El promedio real efectivo es bajo (~0,5%-1%) porque aplica solo a comercios rotativos, no a todo el gasto. Verificar semana a semana en la app.',
    pointValueNote:
      'Cashback en pesos 1:1 (líquido). Rendimiento real estimado 0,5%-1% del gasto total, no el 5% nominal.',
    redemptionNote:
      'Cashback acreditado en saldo de la cuenta Prex (líquido, sin catálogo). Reembolso directo utilizable en cualquier compra.',
    discountNote:
      "20% OFF en gastronomía/comercios adheridos típicamente lunes y martes; 'Prex Week' con promos más agresivas. Ahorro de 2 puntos de IVA (Ley de inclusión financiera) en compras gravadas. Descuentos internacionales en experiencias.",
    feeNote:
      'Emisión y mantenimiento sin costo; tarjeta física ~$U 150-200 (dato de comparativa, no oficial). Mastercard internacional gratuita.',
    pros: [
      'App muy valorada por usuarios (transferencias P2P instantáneas y gratis)',
      'Cashback líquido en saldo, sin catálogo ni fricción de canje',
      'Ahorro de IVA + descuentos concretos en gastronomía',
      'Sin costo de mantenimiento; internacional gratis',
    ],
    cons: [
      'El 5% de cashback es de máximo y rota; el promedio efectivo es mucho menor',
      'Descuentos concentrados en pocos días/comercios',
      'Prepaga: no genera historial crediticio ni cuotas',
    ],
    bestFor:
      'Usuario digital que quiere una prepaga gratis, buena app, cashback líquido y ahorro de IVA para el gasto cotidiano.',
    scores: {
      acumulacion: 55,
      canje: 90,
      descuentos: 62,
      costo: 90,
      flexibilidad: 92,
      cobertura: 60,
    },
    rationale:
      'Cashback liquido acreditado en saldo (utilizable en cualquier compra, sin vencimiento) y costo esencialmente nulo elevan canje, costo y flexibilidad. Se puntua conservador en acumulacion porque el 1%-5% nominal aplica solo a comercios rotativos y el rendimiento real estimado es ~0,5%-1%; los datos de costo del plastico y descuentos provienen de comparativas no oficiales.',
    verified: true,
  },
  {
    id: 'scotia-puntos',
    name: 'Scotia Puntos',
    issuer: 'Scotiabank Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard', 'amex'],
    pointsProgramName: 'Scotia Puntos',
    earnRateNote:
      '1 Scotia Punto por cada $U 100 gastados con la tarjeta de crédito (y también con productos Scotia si sos titular de una tarjeta Scotia Puntos). Confirmado en el sitio oficial.',
    pointValueNote:
      '1 Scotia Punto = $U 1 al canjear (equivale aprox. a 1% de retorno sobre el consumo). Valor confirmado en el sitio oficial.',
    redemptionNote:
      "Canje 100% autogestionado desde la App Scotia Móvil: podés canjear puntos por cualquier compra que se pueda pagar con la tarjeta ('si lo podés pagar con la tarjeta, lo podés canjear con puntos'). Cada Scotia Punto vale $U 1 para canjear. Los puntos vencen a los 36 meses de generados.",
    discountNote:
      'El foco del programa es la acumulación de puntos; los descuentos con comercios se ofrecen por campañas puntuales (no un cuadro fijo de días como BROU). Scotiabank también mantiene programas de terceros asociados: Membership Rewards (Amex), Club Card (Tienda Inglesa, puntos dobles), ConnectMiles (Copa), MileagePlus (United), Smiles, Gaviotas (Montevideo Shopping), Sonrisas (Tres Cruces).',
    feeNote:
      'Costo anual según categoría de tarjeta. Referencias de mercado (no oficiales): Amex ~US$ 120/año; Visa Platinum ~$U 6.000/año. verified=false para las cifras exactas; confirmar en el tarifario vigente de Scotiabank.',
    pros: [
      'Valor del punto simple y transparente: 1 punto = $U 1 (sin catálogos con tasas de canje ocultas).',
      'Canje flexible desde la App por cualquier compra pagable con la tarjeta, no un catálogo cerrado.',
      'Programa unificado: puntos de Visa, Mastercard y Amex acumulan en la misma bolsa Scotia Puntos.',
      'Combinable con la tarjeta Amex para viajes/compras en el exterior sin recargo.',
    ],
    cons: [
      'Los puntos vencen a los 36 meses.',
      'Tasa de acumulación modesta (~1%), similar a la competencia.',
      'Descuentos fijos con comercios menos estructurados que el esquema de días/topes de BROU.',
      'Costos anuales por categoría no publicados de forma clara; hay que pedir el tarifario.',
    ],
    bestFor:
      'Clientes Scotiabank que quieren un programa de puntos simple y de canje flexible desde el celular, especialmente si combinan una Visa/Mastercard local con una Amex para el exterior.',
    scores: {
      acumulacion: 74,
      canje: 95,
      descuentos: 60,
      costo: 52,
      flexibilidad: 72,
      cobertura: 82,
    },
    rationale:
      "Canje sobresaliente y confirmado oficialmente: 1 punto = $U1 aplicable a 'cualquier compra que puedas pagar con la tarjeta', maxima liquidez del set entre programas bancarios. Acumulacion 1 pt/$100 (~1%) y valor confirmados. Puntos vencen a 36 meses. Baja por costo anual relativamente alto (referencias de mercado ~$U6.000 Visa Platinum / ~US$120 Amex, no oficiales) y red de descuentos solo por campanas.",
    verified: true,
  },
  {
    id: 'midinero-uruguay',
    name: 'MiDinero (tarjeta prepaga Mastercard)',
    issuer: 'MiDinero Uruguay',
    issuerType: 'fintech',
    networks: ['mastercard'],
    pointsProgramName:
      'Sin programa de puntos: ~1% cashback + descuentos + devolución IMESI combustible + ahorro de IVA',
    earnRateNote:
      '~1% de cashback fijo sobre compras (según comparativa Ahorrin, no confirmado en sitio oficial). Su beneficio distintivo es la devolución de hasta 32% del IMESI al cargar nafta en estaciones adheridas.',
    pointValueNote:
      'Cashback en pesos 1:1 (líquido). ~1% del gasto según comparativa; devolución IMESI hasta 32% solo sobre el gasto en combustible.',
    redemptionNote:
      'Cashback/devoluciones acreditadas en saldo de la cuenta MiDinero (líquido). Pago de +2.000 facturas y servicios desde la app.',
    discountNote:
      "10% en Tata.com.uy (almacén, bebidas, perfumería, limpieza) sáb/dom; devolución IMESI combustible hasta 32%; ahorro de 2 puntos de IVA. Red de descuentos ('un millón de descuentos').",
    feeNote:
      'Emisión sin costo; mantenimiento gratis el primer año, luego $297 + IVA anual (dato del sitio). Primer plástico gratis.',
    pros: [
      'Devolución de IMESI en combustible: beneficio fuerte y poco común para quien maneja',
      'Cashback fijo ~1% sobre todo el gasto (más previsible que Prex)',
      'Ahorro de IVA + descuentos en supermercado',
    ],
    cons: [
      'Cobra mantenimiento anual tras el primer año ($297 + IVA)',
      "App considerada 'correcta pero no al nivel de Prex' por usuarios",
      'Cashback ~1% no confirmado en fuente oficial (verified parcial)',
    ],
    bestFor:
      'Automovilista que carga nafta seguido (por la devolución de IMESI) y quiere cashback previsible.',
    scores: {
      acumulacion: 58,
      canje: 88,
      descuentos: 62,
      costo: 88,
      flexibilidad: 90,
      cobertura: 58,
    },
    rationale:
      'Cashback liquido (~1% segun comparativa) mas su diferencial fuerte: devolucion de hasta 32% del IMESI en combustible, muy valioso para quien carga nafta. Emision gratis y bajo costo (luego $297+IVA/ano). Se puntua conservador en acumulacion y cobertura porque el 1% y el descuento no estan confirmados en fuente oficial, sino en comparativa Ahorrin.',
    verified: false,
  },
  {
    id: 'santander-soy-santander-puntos',
    name: 'Soy Santander (Puntos)',
    issuer: 'Banco Santander Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Soy Santander',
    earnRateNote:
      'Acumulación por consumo con tarjeta de crédito, escalonada por segmento: Internacional 1 punto cada $U100; Platinum 1 punto cada $U90; Black/Infinite 1 punto cada $U80; Black/Infinite Banca Privada 1 punto cada $U70. (Débito acumula mucho menos: Internacional 1 pto/$U240, Infinite 1 pto/$U200). No suman: adelantos de efectivo, comisiones bancarias, débitos automáticos de cuenta ni retiros de cajero. Los puntos de crédito se acreditan dentro de los 5 días hábiles posteriores al cierre del estado de cuenta. Confirmado en el centro de ayuda oficial.',
    pointValueNote:
      '1 punto = $U1 (confirmado por el banco); hasta $U1,5 en canjes durante promociones especiales.',
    redemptionNote:
      '1 punto = $U1. Canje en Tienda Soy Santander (electrodomésticos, muebles, tecnología, cientos de productos), Viajes Soy Santander (pasajes, hoteles, experiencias) y vales/gift cards. Se puede pagar parte en puntos y parte con tarjeta en cuotas (sin canje mínimo del 100%). En promociones especiales cada punto puede valer hasta $U1,5 (hasta +50%). Bonos de bienvenida de 1.000 a 5.000 puntos tras la primera compra, más bonos por acreditación de sueldo, pagos automáticos y saldos mínimos.',
    discountNote:
      "Red de descuentos 'Descuentos Santander' en comercios adheridos (gastronomía, indumentaria, viajes, etc.) y promociones/cuotas sin recargo puntuales publicadas en 'Bases y condiciones de promociones'. No se pudo confirmar en fuente oficial un esquema fijo y permanente de descuento por día en supermercados ni un reintegro fijo en combustible bajo esta marca; las promos son rotativas. Detalle de rubros y topes no verificado punto por punto.",
    feeNote:
      'Costo anual/mantenimiento de la tarjeta no confirmado en fuente oficial (varía por producto y suele bonificarse con acreditación de sueldo). No verificado.',
    pros: [
      'Punto con valor claro y estable: 1 punto = $U1, fácil de calcular',
      'Acumulación acelerada en segmentos altos (hasta 1 pto/$U70 en Black Banca Privada)',
      'Canje flexible: productos, viajes y vales, sin necesidad de juntar el 100% en puntos',
      'Bonus de hasta +50% del valor del punto en promos y bonos de bienvenida/sueldo',
    ],
    cons: [
      'El catálogo de canje suele estar por encima del precio de mercado, licuando el valor real del punto',
      'Descuentos en supermercado/combustible son promocionales y rotativos, no un beneficio fijo garantizado',
      'Débito acumula a tasa muy baja (1 pto cada $U200-240)',
      'Costo anual de la tarjeta no transparente públicamente',
    ],
    bestFor:
      'Clientes que ya operan con Santander (sueldo acreditado) y consumen alto con tarjeta de crédito, buscando canjear puntos por viajes o electrodomésticos con un valor de punto predecible.',
    note: '1 punto = 1 peso al canjear (el valor promocional "hasta 1,5" es condicional, no un valor oficial general).',
    scores: {
      acumulacion: 72,
      canje: 80,
      descuentos: 68,
      costo: 60,
      flexibilidad: 70,
      cobertura: 82,
    },
    rationale:
      'Programa solido y bien documentado oficialmente: 1 punto = $U1 (hasta $U1,5 en promos), acumulacion escalonada por segmento (1 pt/$100 Internacional hasta 1 pt/$70 Banca Privada), canje flexible con pago parcial en puntos y bonos de bienvenida. Baja porque el costo anual no esta confirmado en fuente oficial y la red de descuentos es rotativa sin esquema fijo verificable.',
    verified: true,
  },
  {
    id: 'bbva-puntos-bbva',
    name: 'Puntos BBVA (Tarjetas de Crédito)',
    issuer: 'Banco Bilbao Vizcaya Argentaria (BBVA) Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Puntos BBVA',
    earnRateNote:
      'Acumulación por consumo con tarjeta de crédito: Internacional y Oro/Gold generan 1 Punto BBVA cada $100 consumidos; Platinum, Infinite y Black generan 1 Punto BBVA cada $80. Todos los titulares de una tarjeta de crédito BBVA participan automáticamente, sin necesidad de alta. Confirmado en la página oficial del Programa de Beneficios de BBVA Uruguay.',
    pointValueNote:
      '1 punto = $1 UYU (equivalencia declarada por el banco); valor efectivo real sujeto a los precios de la plataforma Despegar y a qué compras habilita el banco como canjeables.',
    redemptionNote:
      "1 Punto BBVA = $1 peso uruguayo (o su equivalente en USD según corresponda). Canje principalmente en la plataforma 'Powered by Despegar': vuelos, hoteles, paquetes y experiencias (locales como bodegas, cabalgatas, fin de semana de campo, e internacionales). Además, cada mes se habilitan 'Compras Canjeables' que se pueden pagar con puntos desde la app, sin mínimo de canje. El canje NO aplica a la totalidad de las compras, solo a las que BBVA define como canjeables.",
    discountNote:
      'Amplia red de descuentos: más de 300 comercios adheridos todos los días. Supermercados: promo Tienda Inglesa 20% de descuento (tope de devolución $U2.000 por cédula y por mes). Gastronomía: descuentos en restaurantes y tiendas gourmet todo el año en todo el país. Combustible/otros: la tarjeta Comunidad Plus permite canjear puntos en estaciones de servicio, cines y tiendas Sodimac. Promos con reintegro de hasta 15% (7,5% en POS + 7,5% en estado de cuenta) con topes de $U8.000-10.000 por cierre en campañas puntuales.',
    feeNote:
      'Costo anual/mantenimiento de la tarjeta no confirmado en fuente oficial (varía por producto; suele bonificarse con acreditación de haberes). No verificado.',
    pros: [
      'Alta automática: todos los tarjetahabientes de crédito acumulan sin inscribirse',
      'Fuerte red de descuentos diarios (300+ comercios) y promos potentes en supermercado (Tienda Inglesa 20%) y gastronomía',
      'Acumulación mejorada en segmentos altos (1 pto cada $80 en Platinum/Infinite/Black)',
      'Canje de viajes vía Despegar con inventario amplio y experiencias locales',
    ],
    cons: [
      'El canje de puntos está muy orientado a viajes (Despegar); menos flexible para productos o efectivo',
      "Solo un subconjunto de compras ('Compras Canjeables') se puede pagar con puntos, no todas",
      'Riesgo de vencimiento: a la finalización del programa los puntos deben canjearse dentro de los 30 días o se pierden',
      "Los mejores descuentos (topes de reintegro) dependen de campañas y clientes 'seleccionados'",
    ],
    bestFor:
      'Clientes BBVA que compran seguido en la red de comercios (Tienda Inglesa, gastronomía) y que valoran canjear puntos por viajes y experiencias vía Despegar.',
    note: 'Tasas de acumulación (1 pto/$100 Internacional-Oro; 1 pto/$80 Platinum-Infinite-Black) y equivalencia 1 punto = $1 UYU confirmadas en la web oficial de BBVA Uruguay. Descuentos como Tienda Inglesa 20% (tope $U2.000/mes) confirmados en campaña oficial. Costo anual no confirmado.',
    scores: {
      acumulacion: 66,
      canje: 65,
      descuentos: 85,
      costo: 60,
      flexibilidad: 68,
      cobertura: 80,
    },
    rationale:
      'Acumulacion confirmada (1 pt/$100 base, 1 pt/$80 gama alta, 1 punto = $1) y la red de descuentos mas potente y concreta del set (300+ comercios, 20% Tienda Inglesa, reintegros hasta 15%). Penaliza que el canje esta concentrado en la plataforma Despegar y solo sobre compras que BBVA define como canjeables, reduciendo el valor efectivo real del punto; costo anual no confirmado.',
    verified: true,
  },
  {
    id: 'bbva-comunidad-plus',
    name: 'Tarjeta de Crédito BBVA Comunidad Plus',
    issuer: 'Banco Bilbao Vizcaya Argentaria (BBVA) Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Puntos BBVA (con canje ampliado Comunidad Plus)',
    earnRateNote:
      'Acumula Puntos BBVA según el segmento de la tarjeta (base 1 punto cada $100 en gama Internacional/Oro; 1 cada $80 en gama alta), dentro del mismo programa Puntos BBVA. La particularidad de Comunidad Plus no es una tasa distinta sino un canje/beneficios ampliados. Tasa específica de esta variante no verificada de forma independiente.',
    pointValueNote: '1 punto = $1 UYU (misma equivalencia del programa Puntos BBVA).',
    redemptionNote:
      'Además del canje estándar de Puntos BBVA (Despegar), la Comunidad Plus habilitó canjear puntos acumulados por compras en cines, restaurantes, estaciones de servicio y tiendas Sodimac de todo el país (según campaña con vigencia definida). Sin mínimo de canje en las compras canjeables de la app.',
    discountNote:
      'Orientada a beneficios/descuentos en la comunidad de comercios adheridos y a un canje de puntos más útil en el día a día (combustible en estaciones de servicio, cines, gastronomía, Sodimac). Detalle de topes y vigencias sujeto a las bases de cada campaña; no todos permanentes.',
    feeNote: 'Costo anual no confirmado en fuente oficial. No verificado.',
    pros: [
      'Canje de puntos más práctico y cotidiano (combustible, cines, gastronomía, Sodimac), no solo viajes',
      'Se apoya en la misma red amplia de descuentos de BBVA',
      'Sin mínimo de canje en compras habilitadas',
    ],
    cons: [
      'Varias ventajas atadas a campañas con vigencia limitada (ej. canjes disponibles hasta cierta fecha)',
      'Detalle de tasa de acumulación específica y costo anual no verificado de forma independiente',
      "Comparte la limitación de 'Compras Canjeables' del programa Puntos BBVA",
    ],
    bestFor:
      'Clientes BBVA que prefieren gastar sus puntos en consumo local recurrente (nafta, cine, comida, Sodimac) en lugar de guardarlos solo para viajes.',
    note: 'Existencia de la tarjeta y del canje ampliado (cines, restaurantes, estaciones de servicio, Sodimac) confirmada en campaña oficial de BBVA Uruguay, pero la tasa de acumulación específica, los topes permanentes y el costo anual NO están confirmados; algunos beneficios citados tenían vigencia acotada. Por eso verified=false.',
    scores: {
      acumulacion: 66,
      canje: 72,
      descuentos: 82,
      costo: 58,
      flexibilidad: 60,
      cobertura: 68,
    },
    rationale:
      'Misma base de Puntos BBVA (1 punto = $1) pero con canje mas util en el dia a dia (combustible, cines, gastronomia, Sodimac) que mejora la nota de canje frente a la variante estandar. Baja por depender de campanas con vigencia y topes definidos (no permanentes), tasa especifica de la variante no verificada de forma independiente y costo no confirmado.',
    verified: false,
  },
  {
    id: 'itau-volar',
    name: 'Itaú Volar (Visa/Mastercard Internacional)',
    issuer: 'Banco Itaú Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Volar (millas Itaú)',
    earnRateNote:
      'Crédito: 1 milla Itaú por cada US$1 (o su equivalente en pesos) gastado en compras. Débito Volar: 1 milla cada US$2. Confirmado en FAQ oficial y millasItauVolar.html.',
    pointValueNote:
      'Sin ratio oficial publicado; el valor efectivo por milla depende del ítem canjeado en el catálogo/Jetmar. No confirmado.',
    redemptionNote:
      'Millas canjeables por pasajes aéreos (cualquier aerolínea, sin restricción de fechas), paquetes de turismo interno, tecnología, moda, espectáculos, libros y productos para el hogar. Pasajes provistos por Jetmar Viajes. Canje solo por el titular (adicionales no canjean). Acreditación dentro de 10 días hábiles del cierre.',
    discountNote:
      'Acceso a la red de beneficios Itaú: descuentos todo el año en farmacias, restaurantes, supermercados, moda y espectáculos. Los porcentajes/días concretos rotan y no se publican en la ficha del producto (detalle no verificado).',
    feeNote:
      '1er año sin costo; luego UI 864/año (aprox. UYU 5.300-5.500 a julio 2026, según valor UI). Ingreso mínimo declarado ~$26.000. Primer adicional sin costo.',
    pros: [
      'Millas sin aerolínea fija: canje de pasajes en cualquier compañía y sin bloqueo de fechas',
      'Tasa simple y transparente: 1 milla = US$1 en crédito',
      'Bono de bienvenida de 3.500 millas con la primera compra',
      'Adhesión automática al sacar la tarjeta y primer adicional gratis',
      'Catálogo amplio (viajes, tecnología, hogar) además de pasajes',
    ],
    cons: [
      'Valor monetario de la milla no publicado; depende del catálogo/Jetmar (rendimiento real incierto)',
      'No acumulan retiros de efectivo, préstamos tasa 0, intereses/cargos del banco ni pagos por Abitab/Redpagos',
      'Millas vencen a los 5 años',
      'El detalle de la red de descuentos exige login/app, poco transparente en la web pública',
      'Al adherir crédito a Volar se deja de acumular en otros programas del banco (p. ej. LATAM)',
    ],
    bestFor:
      'Usuario que gasta en pesos/dólares y quiere flexibilidad total para canjear pasajes en cualquier aerolínea, sin atarse a un programa de millas específico.',
    note: "Programa de fidelidad principal de Itaú Uruguay. 'Partiu' es un programa de Itaú Brasil, no existe con ese nombre en Uruguay.",
    scores: {
      acumulacion: 62,
      canje: 72,
      descuentos: 68,
      costo: 65,
      flexibilidad: 65,
      cobertura: 68,
    },
    rationale:
      'Acumulacion confirmada de 1 milla por US$1 (~1-1,5% asumiendo valor de mercado de la milla, no publicado por Itau) y canje flexible (pasajes en cualquier aerolinea sin restriccion de fechas + catalogo). Costo razonable (1er ano gratis, luego ~$5.300-5.500). Se puntua conservador en acumulacion/canje porque Itau no publica ratio oficial de valor por milla; canje limitado al titular.',
    verified: true,
  },
  {
    id: 'itau-volar-platinum',
    name: 'Itaú Volar Visa Platinum',
    issuer: 'Banco Itaú Uruguay',
    issuerType: 'banco',
    networks: ['visa'],
    pointsProgramName: 'Volar (millas Itaú)',
    earnRateNote:
      '1 milla Itaú por cada US$1 (o su equivalente en pesos) en compras con crédito. Mismas reglas de acumulación que la línea Volar. Confirmado en tarjetaVolar.html.',
    pointValueNote: 'Sin ratio oficial publicado; valor efectivo depende del canje. No confirmado.',
    redemptionNote:
      'Igual que Volar base: pasajes en cualquier aerolínea + catálogo (tecnología, turismo interno, moda, espectáculos), vía itauvolar.com.uy/SuperApp. Canje solo por el titular.',
    discountNote:
      'Red de beneficios Itaú + beneficios de nivel Platinum: acceso a salas VIP de aeropuerto y asistencia al viajero (coberturas vía AXA / Universal Assistance).',
    feeNote:
      '1er año sin costo; luego UI 1.058/año (aprox. UYU 6.500-6.700 a julio 2026). Requiere límite/crédito mínimo declarado ~$125.000.',
    pros: [
      'Acceso a salas VIP de aeropuerto',
      'Asistencia al viajero (médica/dental/legal) incluida',
      'Misma tasa 1 milla = US$1 y flexibilidad de canje de pasajes',
      'Bono de bienvenida de 3.500 millas',
    ],
    cons: [
      'Costo anual mayor (UI 1.058) que la Internacional',
      'Requiere ingreso/límite alto',
      'Millas vencen a los 5 años y sin valor de milla publicado',
      'Mismas exclusiones de acumulación (efectivo, intereses, redes de cobranza)',
    ],
    bestFor:
      'Cliente de ingresos medios-altos que viaja y valora salas VIP y asistencia, manteniendo la flexibilidad de canje de Volar.',
    note: 'Crédito mínimo declarado $120.000; costo desde el año 2 UI 1.058/año. Valor de la milla sin ratio oficial publicado.',
    scores: {
      acumulacion: 62,
      canje: 72,
      descuentos: 75,
      costo: 55,
      flexibilidad: 65,
      cobertura: 68,
    },
    rationale:
      'Misma mecanica de acumulacion y canje que Volar base pero con beneficios de nivel Platinum (salas VIP, asistencia al viajero) que elevan la nota de descuentos/beneficios. El mayor costo anual (~$6.500) frente a la version base compensa esos beneficios y deja el overall practicamente empatado con Volar Internacional.',
    verified: true,
  },
  {
    id: 'itau-latam-pass-platinum',
    name: 'Itaú Visa LATAM Pass Platinum',
    issuer: 'Banco Itaú Uruguay',
    issuerType: 'banco',
    networks: ['visa'],
    pointsProgramName: 'LATAM Pass',
    earnRateNote:
      '1 milla LATAM Pass por cada US$1 (1 dólar = 1 milla) en compras con crédito. Confirmado en tarjetaLatam.html.',
    pointValueNote:
      'Valor de la milla LATAM Pass no publicado por Itaú; estimación de mercado ~US$0,01-0,015/milla, variable. No confirmado oficialmente.',
    redemptionNote:
      'Millas acreditadas en la cuenta LATAM Pass del socio; canje en programa LATAM Pass (vuelos LATAM/asociados, upgrades). Válidas 36 meses, renovables con 5.000 millas/año.',
    discountNote:
      'Red de beneficios Itaú + nivel Platinum: acceso a salas VIP de aeropuerto (10 visitas anuales con descuento según la ficha) y asistencia al viajero (médica/dental/legal). Check-in preferente y upgrades LATAM.',
    feeNote:
      '1er año sin costo; luego UI 1.058/año (aprox. UYU 6.500-6.700). Límite/crédito mínimo declarado ~$125.000. Bono de bienvenida 3.500 millas. Primer adicional sin costo.',
    pros: [
      'Mejor tasa LATAM: 1 milla por US$1 (el doble que la Internacional)',
      'Salas VIP de aeropuerto y asistencia al viajero premium',
      'Millas directo a la cuenta LATAM Pass del socio',
      'Bono de bienvenida de 3.500 millas',
    ],
    cons: [
      'Costo anual mayor (UI 1.058) y requisito de ingreso/límite alto',
      'Millas atadas a LATAM/socios; menos flexible que Volar',
      'Vencimiento a 36 meses salvo renovación por actividad',
      'Mismas exclusiones (intereses, adelantos, casinos, tributos, reestructuras, préstamos)',
    ],
    bestFor:
      'Viajero LATAM de gasto alto que quiere maximizar acumulación (1:1) más salas VIP y asistencia al viajero.',
    note: 'Variante premium de la afinidad LATAM Pass.',
    scores: {
      acumulacion: 62,
      canje: 62,
      descuentos: 76,
      costo: 55,
      flexibilidad: 70,
      cobertura: 72,
    },
    rationale:
      "Mejor tasa dentro de la linea LATAM (1 milla por US$1, confirmada) con beneficios Platinum (salas VIP, asistencia, check-in preferente, upgrades) y millas validas 36 meses renovables. Baja frente a Volar porque el canje esta atado al programa LATAM Pass (menos flexible que 'cualquier aerolinea') y el valor de la milla LATAM no es oficial (~US$0,01-0,015 estimado de mercado).",
    verified: true,
  },
  {
    id: 'itau-volar-black',
    name: 'Itaú Volar Mastercard Black',
    issuer: 'Banco Itaú Uruguay',
    issuerType: 'banco',
    networks: ['mastercard'],
    pointsProgramName: 'Volar (millas Itaú)',
    earnRateNote:
      '1 milla Itaú por cada US$1 (o equivalente en pesos) en compras con crédito, mismas reglas Volar. Una tasa diferenciada para el tramo Black no se detalla en la ficha pública (asumida igual a la línea; no verificada específicamente).',
    pointValueNote: 'Sin ratio oficial publicado. No confirmado.',
    redemptionNote:
      'Igual que Volar: pasajes cualquier aerolínea + catálogo, vía itauvolar.com.uy/SuperApp. Canje solo titular.',
    discountNote:
      'Red de beneficios Itaú + nivel Mastercard Black (típicamente salas VIP y asistencia premium; beneficios concretos no detallados en la ficha pública, no verificado).',
    feeNote:
      "Costo anual UI 1.454/año (aprox. UYU 9.000 a julio 2026). Ingreso/límite: 'a consultar' según la ficha.",
    pros: [
      'Nivel más alto de la gama Volar (Mastercard Black)',
      'Misma flexibilidad de canje de pasajes en cualquier aerolínea',
      'Beneficios premium de red Mastercard Black',
    ],
    cons: [
      'Costo anual más alto de la gama (UI 1.454)',
      'Beneficios específicos del tramo Black poco detallados en la web pública',
      'Millas vencen a los 5 años; sin valor de milla oficial',
      'Mismas exclusiones de acumulación',
    ],
    bestFor:
      'Cliente de alto gasto/patrimonio que quiere el tope de la gama Volar en red Mastercard con beneficios premium.',
    note: 'Variante tope Mastercard del programa Volar.',
    scores: {
      acumulacion: 60,
      canje: 70,
      descuentos: 78,
      costo: 42,
      flexibilidad: 63,
      cobertura: 60,
    },
    rationale:
      'Beneficios premium de nivel Black (salas VIP y asistencia premium, aunque no detallados en ficha publica) suben descuentos, pero el costo anual mas alto de la linea (~$9.000) castiga fuerte el overall. Ademas la tasa diferenciada para el tramo Black no se detalla en la ficha (asumida igual a Volar, no verificada), lo que reduce cobertura.',
    verified: true,
  },
  {
    id: 'scotia-puntos-american-express',
    name: 'Tarjeta Scotia Puntos American Express (Green / Gold / Platinum)',
    issuer: 'Scotiabank Uruguay',
    issuerType: 'banco',
    networks: ['amex'],
    pointsProgramName: 'Scotia Puntos (histórico: Membership Rewards de American Express)',
    earnRateNote:
      'Premia todas las compras en Uruguay y el exterior con Scotia Puntos; los adelantos en efectivo NO acumulan puntos. La tasa puntual por compra de la línea Amex no está publicada en la ficha oficial (se integra a Scotia Puntos, 1 pt/$U100). verified=false sobre una tasa Amex diferenciada.',
    pointValueNote:
      'Se integra a Scotia Puntos (1 pt = $U 1 en canje estándar); el valor en canje de viajes/experiencias no está publicado. verified=false.',
    redemptionNote:
      'Canje por productos y viajes / experiencias (programa Membership Rewards a nivel global de Amex, integrado hoy a Scotia Puntos). El valor exacto del punto en el canje de viajes no está publicado.',
    discountNote:
      'Beneficios de viaje más que descuentos de góndola: acceso a Sala VIP del Aeropuerto de Carrasco (Gold y Platinum), seguro de accidentes en viaje hasta US$ 75.000, asistencia en viaje 24/7 hasta US$ 12.000, compras en el exterior sin recargo, tarjetas adicionales sin cargo, Express Cash en sucursales y cajeros Banred.',
    feeNote:
      'Costo anual referencia de mercado ~US$ 120/año para la línea Amex (verified=false; confirmar tarifario Scotiabank). Adicionales sin cargo.',
    pros: [
      'Orientada a viajero: Sala VIP Carrasco, seguros y asistencia de viaje robustos.',
      'Compras en el exterior sin recargo.',
      'Acumula en la misma bolsa Scotia Puntos que las tarjetas Visa/Mastercard del banco.',
      'Adicionales sin costo.',
    ],
    cons: [
      'Red American Express: menor aceptación que Visa/Mastercard en comercios chicos de Uruguay.',
      'Adelantos en efectivo no generan puntos.',
      'Tasa de acumulación específica y valor del punto en viajes no publicados oficialmente.',
      'Costo anual en dólares, más alto que tarjetas locales.',
    ],
    bestFor:
      'Viajeros frecuentes clientes de Scotiabank que valoran Sala VIP, seguros de viaje y compras en el exterior sin recargo, y que usan otra tarjeta Visa/MC para el día a día local.',
    scores: {
      acumulacion: 62,
      canje: 60,
      descuentos: 68,
      costo: 52,
      flexibilidad: 62,
      cobertura: 60,
    },
    rationale:
      'Fuerte en beneficios de viaje (Sala VIP Carrasco en Gold/Platinum, seguro hasta US$75.000, asistencia 24/7, compras en el exterior sin recargo). Baja porque la tasa Amex diferenciada no esta publicada (se integra a Scotia Puntos), el valor en canje de viajes no es transparente, el costo ~US$120 es alto y la aceptacion Amex en Uruguay es mas estrecha que Visa/Mastercard.',
    verified: true,
  },
  {
    id: 'itau-latam-pass-internacional',
    name: 'Itaú Visa LATAM Pass Internacional',
    issuer: 'Banco Itaú Uruguay',
    issuerType: 'banco',
    networks: ['visa'],
    pointsProgramName: 'LATAM Pass',
    earnRateNote:
      '1 milla LATAM Pass cada US$2 (o su equivalente en pesos) en compras con crédito. Confirmado en tarjetaLatam.html.',
    pointValueNote:
      'Valor de la milla LATAM Pass no publicado por Itaú; en el mercado se estima ~US$0,01-0,015 por milla, variable según ruta/disponibilidad. No confirmado oficialmente.',
    redemptionNote:
      'Acumula en la cuenta LATAM Pass del socio; millas se canjean en el programa LATAM Pass (vuelos LATAM y aerolíneas asociadas, upgrades), no en el catálogo Volar. Millas válidas 36 meses, renovables si se acumulan 5.000 millas/año.',
    discountNote:
      'Red de beneficios Itaú (farmacias, restaurantes, supermercados, moda, espectáculos) + beneficios LATAM Pass (check-in preferente, upgrade de cabina según nivel).',
    feeNote:
      '1er año sin costo; luego UI 864/año (aprox. UYU 5.300-5.500). Ingreso mínimo declarado ~$26.000. Bono de bienvenida 3.500 millas. Primer adicional sin costo.',
    pros: [
      'Millas se integran directo a la cuenta LATAM Pass del socio',
      'Bono de bienvenida de 3.500 millas',
      'Beneficios de viaje LATAM (check-in preferente, upgrades)',
      'Costo anual accesible (UI 864) y primer adicional gratis',
    ],
    cons: [
      'Tasa baja: solo 1 milla cada US$2 (mitad que la Volar crédito)',
      'Millas atadas a LATAM y socios; menos flexible que Volar',
      'Vencimiento a 36 meses (más corto que Volar) salvo renovación por actividad',
      'No acumulan intereses, adelantos, juegos de azar/casinos, reestructuras, préstamos contra límite ni pago de tributos',
    ],
    bestFor:
      'Viajero frecuente de LATAM Airlines que prefiere concentrar millas en el programa LATAM Pass y usar sus asociados.',
    note: 'Tarjeta de afinidad LATAM; alternativa al programa Volar (no se acumula en ambos con la misma tarjeta de crédito).',
    scores: {
      acumulacion: 45,
      canje: 62,
      descuentos: 68,
      costo: 65,
      flexibilidad: 70,
      cobertura: 70,
    },
    rationale:
      'Acumulacion confirmada pero baja (1 milla cada US$2, ~0,5-0,75% de retorno estimado), la mas floja entre las tarjetas de millas Itau, lo que arrastra el overall pese a costo moderado (1er ano gratis, ~$5.300) y bono de 3.500 millas. Millas validas 36 meses renovables; valor de la milla LATAM no oficial.',
    verified: true,
  },
  {
    id: 'oca-oca-blue',
    name: 'OCA — Programa Metraje (Metros)',
    issuer: 'OCA S.A.',
    issuerType: 'emisor_no_bancario',
    networks: ['mastercard', 'visa'],
    pointsProgramName: 'Metros (programa de puntos OCA) + amplia red de descuentos',
    earnRateNote:
      'OCA (crédito): acumulás "Metros" por consumos locales e internacionales y débitos automáticos; OCA no publica cuántos Metros por peso (varía con campañas x2/x3). Importante: OCA Blue NO acumula por consumos internacionales, débitos automáticos, nafta ni pagos en redes de cobranza — solo por consumos locales.',
    pointValueNote:
      '1 Metro ≈ $37 / US$1,5 (cifra de prensa, no oficial; OCA puede modificar el valor a su criterio)',
    redemptionNote:
      'Metros canjeables por beneficios del catálogo OCA (entradas de cine, productos). OCA Blue enfoca en descuentos directos más que en canje de puntos.',
    discountNote:
      'Amplísima red: 20% los viernes con crédito + 12 cuotas todos los días (tope $5.500/cuenta/mes en comercios adheridos); +5% extra pagando con OCA App / Apple Pay / Google Pay; 10% diario en comercios seleccionados. Descuentos 10%-30% en gastronomía, moda, electrónica y educación.',
    feeNote:
      'Varía por producto (crédito OCA vs OCA Blue prepaga). OCA Blue: plástico gratis. Costo anual no verificado aquí.',
    pros: [
      'La red de descuentos en comercio físico más amplia del mercado local',
      '20% los viernes + 12 cuotas es de las promos más agresivas de Uruguay',
      'Extra 5% con billetera digital; emisor no bancario muy extendido',
    ],
    cons: [
      'Sin cashback líquido: el beneficio es descuento condicionado a días/comercios y con topes ($5.500/mes)',
      'Programa de puntos (Metros) con canje de catálogo, menos flexible que cashback',
      'El valor real depende de comprar en comercios adheridos los días indicados',
    ],
    bestFor:
      'Quien compra mucho en comercio físico local y organiza sus compras para los días de mayor descuento (viernes 20%).',
    scores: {
      acumulacion: 45,
      canje: 55,
      descuentos: 88,
      costo: 65,
      flexibilidad: 52,
      cobertura: 55,
    },
    rationale:
      'Una de las redes de descuentos mas amplias del pais (20% viernes + 12 cuotas todos los dias, +5% con app/wallet, 10%-30% en multiples rubros) es su gran fortaleza. Baja porque el fuerte no es la acumulacion: la tasa de Metros por peso no se publica como % claro y el valor de canje es menos transparente que un cashback; OCA Blue prepaga con plastico gratis ayuda al costo.',
    verified: true,
  },
  {
    id: 'scotia-club-card-tienda-inglesa',
    name: 'Club Card (co-brand Tienda Inglesa)',
    issuer: 'Scotiabank Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Club Card (Tienda Inglesa) integrado con Scotia Puntos',
    earnRateNote:
      'Cada $900 en compras dentro de Tienda Inglesa generás 15 puntos, que se duplican a 30 pagando con Club Card ("puntos dobles"); 1 punto = $1 dentro de Tienda Inglesa (retorno efectivo ~3,3% en vales).',
    pointValueNote:
      "Puntos dobles en Tienda Inglesa; valor unitario asociado a Scotia Puntos (1 pt = $U 1) pero la mecánica exacta del 'doble' no está publicada. verified=false.",
    redemptionNote:
      'Canje dentro del ecosistema Club Card / Tienda Inglesa y Scotia Puntos. Detalle de catálogo no publicado en la página de resumen.',
    discountNote:
      'Beneficio central: acumulación acelerada (puntos dobles) en Tienda Inglesa. Pensada para el cliente que compra habitualmente en esa cadena.',
    feeNote:
      'Costo anual no publicado en la ficha de resumen; consultar tarifario Scotiabank. verified=false.',
    pros: [
      'Puntos dobles en Tienda Inglesa todos los días para clientes fieles a esa cadena.',
      'Se apoya en la infraestructura de canje de Scotia Puntos.',
    ],
    cons: [
      'Beneficio muy concentrado en un solo retailer (Tienda Inglesa).',
      'Tasa exacta de acumulación, valor del punto y costo anual no publicados oficialmente.',
      'Poco atractivo si no comprás regularmente en Tienda Inglesa.',
    ],
    bestFor:
      'Clientes de Scotiabank que hacen buena parte de sus compras de supermercado en Tienda Inglesa y quieren maximizar la acumulación en esa cadena.',
    note: 'Los puntos vencen a los 6 meses; desde el 01/01/2026 no se acumulan puntos por compras fuera de Tienda Inglesa. Gratis el primer año.',
    scores: {
      acumulacion: 60,
      canje: 58,
      descuentos: 55,
      costo: 55,
      flexibilidad: 60,
      cobertura: 55,
    },
    rationale:
      "Ventaja concreta de puntos dobles diarios en Tienda Inglesa (acumulacion acelerada) para el cliente habitual de esa cadena. Se puntua con reservas porque la mecanica exacta del 'doble' y la equivalencia en pesos no estan publicadas (verified=false), el canje se limita al ecosistema Club Card / Scotia Puntos y el costo no aparece en la ficha de resumen.",
    verified: false,
  },
  {
    id: 'pronto-visa',
    name: 'Pronto! — Tarjeta Visa Pronto+ (puntos + beneficios)',
    issuer: 'Pronto! (Scotiabank Uruguay)',
    issuerType: 'emisor_no_bancario',
    networks: ['visa'],
    pointsProgramName: 'Programa de puntos Visa Pronto+ (con Alerta de Compra Gratis de Visa)',
    earnRateNote:
      'Según fuentes comerciales, se acumula 1 punto por cada $30 de consumo, con 1.000 puntos de bienvenida. Tasa ($30 = 1 punto) NO confirmada en letra chica oficial; tratar como aproximada.',
    pointValueNote:
      'Valor monetario del punto no publicado; el atractivo principal es la red de descuentos, no la acumulación. No confirmado.',
    redemptionNote:
      "Puntos canjeables por productos/beneficios; además el programa incluye 'Alerta de Compra Gratis' de Visa (una compra puede resultar bonificada). Detalle de catálogo de canje no confirmado.",
    discountNote:
      "Red de descuentos muy amplia: p. ej. 25% McDonald's, 50% Grido, 50% cines, 25% Colonia Express; hasta 35% hospedajes, hasta 50% gastronomía, hasta 60% entretenimiento; 15% fijo en confiterías, jugueterías y pizzerías del país.",
    feeNote:
      'Primer año sin costo (según promo); sin costo por compras en el exterior. Costo de mantenimiento posterior no confirmado.',
    pros: [
      'Red de descuentos muy fuerte y variada (comida rápida, cines, viajes)',
      'Se solicita solo con cédula, sin recibo de sueldo ni cuenta bancaria',
      'Primer año gratis y sin recargo por compras en el exterior',
      'Bonos de bienvenida y Alerta de Compra Gratis de Visa',
    ],
    cons: [
      'La tasa de acumulación de puntos ($30 = 1 pto) proviene de fuentes comerciales, no oficiales',
      'Foco en descuentos: el sistema de puntos es secundario y de valor poco transparente',
      'Requisitos laxos suelen ir de la mano de tasas de financiación altas (verificar recargos)',
    ],
    bestFor:
      'Personas sin cuenta bancaria o sin historial crediticio (jóvenes, primer plástico) que quieren descuentos amplios de consumo cotidiano.',
    note: 'Descuentos confirmados en el sitio oficial de Pronto; tasa de puntos y bono de bienvenida provienen de fuentes comerciales (tarjetasdecredito.com.uy), no de la letra chica.',
    scores: {
      acumulacion: 45,
      canje: 45,
      descuentos: 85,
      costo: 68,
      flexibilidad: 50,
      cobertura: 48,
    },
    rationale:
      "Red de descuentos muy amplia y agresiva (25% McDonald's, 50% Grido/cines, hasta 50% gastronomia, hasta 60% entretenimiento) mas 1er ano sin costo y sin recargo en el exterior. Baja fuerte en acumulacion/canje: la tasa (1 pt/$30) no esta confirmada en letra chica y el valor monetario del punto no se publica; el atractivo es el descuento, no el programa de puntos.",
    verified: false,
  },
  {
    id: 'mas-grupo-disco-sumaclub',
    name: 'Programa Más / SumaClub (Grupo Disco–Devoto–Géant)',
    issuer:
      'Grupo Disco (Devoto, Disco, Géant, Fresh Market); programa de puntos gestionado con Santander (tarjeta Hipermás)',
    issuerType: 'retail',
    networks: ['otro'],
    pointsProgramName: 'Programa Más (puntos del supermercado) / SumaClub (variante Santander)',
    earnRateNote:
      'Consumos DENTRO de Devoto/Disco/Devoto Express/Géant/Fresh Market: 2 puntos cada $420. Consumos FUERA de esas cadenas (con tarjeta Hipermás Santander): 1 punto cada $650. Se generan pagando con efectivo, débito o tarjetas de crédito Visa/Mastercard Hipermás Santander. Tasas confirmadas por fuentes; verificar vigencia.',
    pointValueNote:
      'Valor del punto no publicado como cifra fija; se materializa en el catálogo de regalos canjeable en los supermercados. No confirmado.',
    redemptionNote:
      'Canje de puntos por productos y servicios del catálogo de regalos; las redenciones se realizan en locales Disco, Devoto o Géant.',
    discountNote:
      'Beneficios y descuentos del ecosistema del supermercado; la variante con tarjeta Hipermás Santander suma descuentos del banco (moda, cines, heladerías, gastronomía, +200 marcas) y primer año sin costo.',
    feeNote:
      'El programa Más de acumulación en el super es gratuito (adhesión con documento). La tarjeta de crédito Hipermás Santander (que potencia la acumulación fuera del super) es un producto bancario con sus propios costos; primer año sin costo según promo.',
    pros: [
      'Acumulación clara y diferenciada (2 pts/$420 dentro, 1 pt/$650 fuera)',
      'Se acumula incluso pagando en efectivo o débito, no solo con la tarjeta',
      'Catálogo de regalos canjeable directamente en el super',
      'La tarjeta Hipermás potencia la acumulación fuera del super y agrega descuentos del banco',
    ],
    cons: [
      'El máximo valor se logra comprando dentro del ecosistema Disco/Devoto/Géant',
      "La acumulación potenciada 'fuera del super' depende de la tarjeta Hipermás, que es producto de un banco (Santander), no de un emisor no bancario",
      'Valor monetario del punto no transparente',
    ],
    bestFor:
      'Clientes habituales de Disco/Devoto/Géant que quieren acumular puntos incluso pagando en efectivo/débito y canjear por productos del super.',
    note: 'Tasas 2 pts/$420 (dentro) y 1 pt/$650 (fuera) y canje en super confirmadas por prensa/fuentes. Nota de alcance: SumaClub/Hipermás es programa asociado a Santander (banco); se incluye por el componente retail del Grupo Disco solicitado.',
    scores: {
      acumulacion: 45,
      canje: 50,
      descuentos: 65,
      costo: 75,
      flexibilidad: 52,
      cobertura: 58,
    },
    rationale:
      'Tasas de acumulacion conocidas (2 pt/$420 dentro de las cadenas, 1 pt/$650 fuera con Hipermas Santander) y adhesion gratuita al programa de super. Baja porque el valor del punto no se publica como cifra fija, el canje se realiza solo en los locales del grupo y el diferencial fuera del super depende de un producto bancario con costos propios.',
    verified: false,
  },
  {
    id: 'creditel-credipuntos',
    name: 'Creditel — Credipuntos',
    issuer: 'Creditel S.A. (Grupo Santander)',
    issuerType: 'emisor_no_bancario',
    networks: ['mastercard'],
    pointsProgramName: 'Credipuntos',
    earnRateNote:
      'Cada $25 en compras con la tarjeta Mastercard Creditel genera 1 Credipunto (según comunicación oficial de Creditel). Tasa confirmada para pesos; equivalencia para consumos en dólares no confirmada aquí.',
    pointValueNote:
      'Valor monetario por Credipunto (equivalencia $ del punto en canje) NO publicado claramente; con acumulación de $25 = 1 punto, el retorno efectivo depende del catálogo. No confirmado.',
    redemptionNote:
      'Canje por productos del catálogo en la tienda ShopCreditel (web/app). Se solicita el canje enviando la palabra CANJE al 4242 seguido del código de artículo, o desde la app/web; envío a domicilio.',
    discountNote:
      'Fuerte foco en descuentos: hasta 20% de descuento todos los días en distintos rubros y promociones/cuotas sin recargo. Primer año de tarjeta internacional bonificado según campaña.',
    feeNote:
      'Costo de emisión/mantenimiento no confirmado en las fuentes consultadas; frecuentes promos de bonificación el primer año.',
    pros: [
      'Regla de acumulación clara y simple ($25 = 1 Credipunto)',
      'Tienda de canje online (ShopCreditel) + canje por SMS',
      'Descuentos diarios de hasta 20% competitivos',
      'Respaldo de Grupo Santander',
    ],
    cons: [
      'El valor real del punto en el canje no es transparente',
      'El programa está más orientado a descuentos que a la acumulación como generador de valor',
      'Costo/mantenimiento no aclarado públicamente',
    ],
    bestFor:
      'Usuario que prioriza descuentos diarios inmediatos y una mecánica de puntos simple, sin depender de un banco.',
    note: 'Acumulación $25 = 1 Credipunto y tienda ShopCreditel confirmadas por comunicación oficial; valor monetario del punto y costo de mantenimiento sin confirmar.',
    scores: {
      acumulacion: 45,
      canje: 50,
      descuentos: 75,
      costo: 58,
      flexibilidad: 52,
      cobertura: 55,
    },
    rationale:
      'Buen foco en descuentos (hasta 20% todos los dias, cuotas sin recargo) y tasa de acumulacion comunicada ($25 = 1 Credipunto). Se puntua conservador porque la equivalencia monetaria del Credipunto no esta publicada (el retorno efectivo depende del catalogo ShopCreditel), la acumulacion en dolares no esta confirmada y el costo de mantenimiento no aparece en las fuentes.',
    verified: false,
  },
  {
    id: 'passcard-puntos-pass',
    name: 'PassCard — Puntos Pass',
    issuer: 'PassCard (vinculada a supermercados Líder / Grupo Ta-Ta)',
    issuerType: 'emisor_no_bancario',
    networks: ['otro'],
    pointsProgramName: 'Puntos Pass',
    earnRateNote:
      '1 Punto Pass por cada $100 de consumo con la tarjeta; al canjear, 1 punto = $1 del valor del producto.',
    pointValueNote: '1 punto = $1 (canje en la Tienda Passcard)',
    redemptionNote:
      'Canje por productos en la Tienda PassCard; se puede usar hasta un máximo del 80% del valor del producto con puntos y el saldo restante debe abonarse con la propia tarjeta PassCard.',
    discountNote:
      'Descuentos diarios fuertes por rubro: hasta 30% lunes (librerías), martes (peluquerías), miércoles (gastronomía), jueves (pasajes), viernes (cines/teatros); 50% sábados (heladerías) y 50% domingos (telepeaje). Descuentos principales en cadena Líder. Versiones Passcard Like (18–29 estudiantes) y Experta (60+).',
    feeNote:
      'Primer año sin cargo de mantenimiento al obtener la primera PassCard de crédito; costo de mantenimiento posterior no confirmado. Tarjetas adicionales sin costo.',
    pros: [
      'Descuentos diarios muy marcados (hasta 50% ciertos días)',
      'Se obtiene y opera vía Redpagos, sin necesidad de cuenta bancaria',
      'Primer año sin cargo y adicionales gratis',
      'Versiones segmentadas (jóvenes/estudiantes y 60+)',
    ],
    cons: [
      'El canje cubre solo hasta 80% del producto: siempre hay que pagar el resto con PassCard',
      'Tasa de acumulación y valor del punto no transparentes',
      'Beneficios muy atados a la cadena Líder; menos útil fuera de ese ecosistema',
    ],
    bestFor:
      'Quien compra en Líder y quiere aprovechar descuentos diarios agresivos por rubro, sin depender de un banco.',
    note: 'Tope de canje: hasta el 50% del valor del producto (el resto se abona con la tarjeta de crédito Passcard); sin mínimo de puntos.',
    scores: {
      acumulacion: 42,
      canje: 45,
      descuentos: 80,
      costo: 68,
      flexibilidad: 45,
      cobertura: 48,
    },
    rationale:
      'Descuentos diarios fuertes por rubro (hasta 30%-50% segun dia, foco en cadena Lider) y 1er ano sin cargo. Penaliza que la equivalencia pesos por punto no esta publicada, el canje topea al 80% del valor del producto (obliga a completar con la propia tarjeta) reduciendo flexibilidad, y el valor efectivo del punto no es verificable.',
    verified: false,
  },
  {
    id: 'tarjeta-anda',
    name: 'ANDA — Tarjeta de crédito ANDA + Programa Dale + Prepaga DEANDA',
    issuer: 'Asociación Nacional de Afiliados (ANDA)',
    issuerType: 'cooperativa',
    networks: ['otro'],
    pointsProgramName: 'Dale (programa de fidelización con acumulación de puntos)',
    earnRateNote:
      'Los socios acumulan puntos usando distintos servicios de la institución (no solo compras). La tasa exacta de acumulación (puntos por peso o por servicio) NO está publicada / NO confirmada.',
    pointValueNote:
      'Valor del punto Dale no publicado; canje limitado a la tienda Dale. No confirmado.',
    redemptionNote:
      "Canje de puntos por productos exclusivos, descuentos y beneficios en la tienda 'Dale'.",
    discountNote:
      "'Días de descuentos' por rubro para socios; convenios en educación, deporte, salud, hogar y recreación. Con la prepaga DEANDA se accede a descuentos de IVA aprobados por ley (restaurantes −9 puntos, comercios en general −2 puntos) y devolución de IMESI en estaciones de servicio de frontera. Planes de 2 a 6 o hasta 12 cuotas sin recargo en comercios adheridos.",
    feeNote:
      'Requiere ser socio de ANDA (cuota social). Financiación de compras a T.E.A. 27,50% + IVA (dato de fuente oficial). Retiros de préstamos en Abitab, Redpagos, cajeros Banred y sucursales ANDA.',
    pros: [
      'Modelo cooperativo con convenios sociales (educación, salud, deporte) además de la tarjeta',
      'Prepaga DEANDA con descuentos de IVA por ley y beneficio IMESI en frontera',
      'Cuotas sin recargo y adicionales sin cargo (incluso a mayores de 15 sin vínculo familiar)',
      'Amplia red de comercios adheridos en todo el país',
    ],
    cons: [
      'Exige ser socio (cuota social) para acceder a los beneficios plenos',
      'Tasa de financiación explícita y relativamente alta (27,50% + IVA)',
      'Tasa de acumulación y valor del punto Dale poco transparentes',
      'Aceptación como red de pago menor que Visa/Mastercard',
    ],
    bestFor:
      'Socios de ANDA que aprovechan convenios sociales, cuotas sin recargo y, con la prepaga DEANDA, los descuentos de IVA por ley.',
    note: 'Programa Dale, días de descuento, prepaga DEANDA (IVA/IMESI) y T.E.A. 27,50%+IVA confirmados por el sitio oficial de ANDA. La tasa de acumulación de puntos Dale no está publicada.',
    scores: {
      acumulacion: 35,
      canje: 45,
      descuentos: 68,
      costo: 45,
      flexibilidad: 48,
      cobertura: 45,
    },
    rationale:
      'Aporta beneficios sociales concretos: ahorro de IVA via prepaga DEANDA (restaurantes -9 pts, comercios -2 pts), devolucion de IMESI en frontera, convenios y cuotas sin recargo. Baja fuerte porque la tasa de acumulacion de puntos Dale no esta publicada, el canje se limita a la tienda Dale, exige ser socio (cuota social) y la financiacion (TEA 27,50%+IVA) encarece el uso.',
    verified: false,
  },
  {
    id: 'cabal-uruguay',
    name: 'Cabal Uruguay — Tarjeta de crédito Cabal',
    issuer: 'Cabal (red cooperativa; emitida vía cooperativas de ahorro y crédito en Uruguay)',
    issuerType: 'cooperativa',
    networks: ['cabal'],
    pointsProgramName:
      'Sin programa de puntos masivo propio claramente publicado (foco en asistencias, descuentos y financiación; existen programas de fidelidad puntuales)',
    earnRateNote:
      'Cabal Uruguay NO comunica de forma clara un programa de acumulación de puntos por consumo tipo catálogo. Su propuesta se centra en asistencias, descuentos y cuotas sin recargo. Cualquier tasa de puntos NO está confirmada.',
    pointValueNote:
      'No aplica un valor de punto claro: el programa no es de puntos-catálogo sino de asistencias/descuentos. No confirmado.',
    redemptionNote:
      "No hay un catálogo de canje por puntos claramente publicado en Uruguay; el 'retorno' es vía asistencias, descuentos y financiación (no vía redención de puntos).",
    discountNote:
      'Beneficios de asistencia (viajero, auxilio mecánico auto/moto, hogar, mascotas, tarjeta blindada), 40% en medicamentos con receta, cuotas sin recargo (p. ej. Ta-Ta 2 y 3 cuotas, hasta 24 cuotas sin recargo en pesos). Más de 30.000 comercios adheridos en Uruguay y 3.000.000 en la región.',
    feeNote:
      'Costo de emisión/mantenimiento no confirmado; adicionales sin cargo para familiares (cónyuge, padres, hijos 16+).',
    pros: [
      'Fuerte paquete de asistencias incluidas (viajero, auxilio mecánico, hogar, mascotas)',
      '40% en medicamentos con receta',
      'Red de comercios regional muy amplia (Cono Sur)',
      'Origen y lógica cooperativa; adicionales sin cargo',
    ],
    cons: [
      'No ofrece un programa de puntos/canje por catálogo claro en Uruguay',
      'El retorno depende de usar las asistencias/descuentos, no de acumular',
      'Aceptación como marca es menor que Visa/Mastercard en algunos comercios',
    ],
    bestFor:
      'Usuario del ecosistema cooperativo que valora asistencias y financiación en cuotas sin recargo por encima de acumular puntos.',
    note: 'Asistencias, 40% medicamentos y red de comercios confirmados por fuentes de Cabal. La ausencia de un programa de puntos-catálogo claro es una inferencia; conviene verificar programas de fidelidad locales puntuales.',
    scores: {
      acumulacion: 20,
      canje: 25,
      descuentos: 78,
      costo: 55,
      flexibilidad: 45,
      cobertura: 50,
    },
    rationale:
      'Propuesta valiosa en asistencias (viajero, auxilio mecanico, hogar, mascotas), 40% en medicamentos, cuotas sin recargo y red muy amplia (30.000 comercios locales, 3.000.000 regionales). Puntua muy bajo en acumulacion y canje porque no comunica un programa de puntos-catalogo: el retorno es via descuentos/financiacion, no por redencion de puntos.',
    verified: false,
  },
  {
    id: 'tarjeta-lider',
    name: 'Tarjeta Líder (Italmundo / ACAC)',
    issuer:
      'Emitida por Italmundo (Líder Plata/Oro) y por ACAC (cooperativa); marca Líder sobre red Mastercard/First Data',
    issuerType: 'emisor_no_bancario',
    networks: ['mastercard'],
    pointsProgramName:
      'Sin programa de puntos-catálogo destacado (propuesta centrada en accesibilidad, descuentos y cuotas)',
    earnRateNote:
      'No se identifica un programa de acumulación de puntos propio claramente publicado para Líder. La propuesta gira en torno a accesibilidad (requisitos flexibles), descuentos y financiación. Cualquier tasa de puntos NO está confirmada.',
    pointValueNote:
      'No aplica un valor de punto (sin programa de puntos-catálogo claro). No confirmado.',
    redemptionNote:
      'No hay catálogo de canje por puntos claramente publicado; el beneficio es vía descuentos/promos y cuotas sin recargo en comercios adheridos.',
    discountNote:
      'Descuentos y promociones en comercios adheridos; validez en países del Cono Sur; retiro de efectivo disponible en cajeros. Red y descuentos varían según el emisor (Italmundo vs ACAC).',
    feeNote:
      'Tarjeta titular y adicionales gratis el primer año (según promo). Algunas variantes/versiones pueden requerir cuenta en un banco (p. ej. Discount Bank) según el emisor. Costo posterior no confirmado.',
    pros: [
      'Requisitos de acceso flexibles: buena opción para primer plástico o sin historial',
      'Marca Mastercard/First Data válida en el Cono Sur',
      'Titular y adicionales gratis el primer año',
      'Emisión también por cooperativa (ACAC), con lógica cooperativa',
    ],
    cons: [
      'Sin programa de puntos/canje destacado: el valor está en descuentos y financiación, no en acumular',
      'La propuesta (red, costos, requisitos) varía según el emisor (Italmundo vs ACAC)',
      'Algunas variantes pueden exigir cuenta bancaria, contradiciendo la promesa de accesibilidad',
      'Menor red de descuentos frente a OCA/Pronto/Passcard',
    ],
    bestFor:
      'Personas que buscan un primer plástico Mastercard de acceso flexible, priorizando aprobación y financiación por sobre un programa de puntos.',
    note: 'Marca Líder sobre First Data/Mastercard y emisores Italmundo/ACAC confirmados por fuentes especializadas (UruCards, infonegocios). Ausencia de programa de puntos es inferencia; verificar por emisor.',
    scores: {
      acumulacion: 18,
      canje: 25,
      descuentos: 50,
      costo: 62,
      flexibilidad: 45,
      cobertura: 45,
    },
    rationale:
      'Su valor es la accesibilidad (requisitos flexibles) mas descuentos/promos y cuotas sin recargo; titular y adicionales gratis el 1er ano. Puntua bajo porque no tiene un programa de acumulacion de puntos claro ni catalogo de canje, la red/descuentos varian segun emisor (Italmundo vs ACAC) y el costo posterior no esta confirmado.',
    verified: false,
  },
  {
    id: 'btg-uruguay-tdc',
    name: 'Tarjetas de Crédito BTG Pactual, ex HSBC (Visa Internacional / Oro / Infinite; Mastercard Premier)',
    issuer: 'Banco BTG Pactual Uruguay S.A. (ex HSBC Bank (Uruguay) S.A.)',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Sin programa de puntos propio en Uruguay',
    earnRateNote:
      "No hay programa de puntos/recompensas propio en estas tarjetas: la cartilla oficial vigente (julio 2026, heredada de HSBC) lista solo beneficios de descuento y control, sin acumulación de puntos. Los programas 'HSBC Rewards / Puntos Premia / Más' correspondían a HSBC México y Argentina, no a Uruguay. El 10/07/2026 HSBC Uruguay pasó a operar como BTG Pactual y avisó que no cambian productos ni servicios; falta reverificar la cartilla bajo la marca nueva.",
    redemptionNote:
      'No aplica: no hay canje de puntos. El retorno al cliente pasa por descuentos y beneficios directos, no por acumulación.',
    discountNote:
      'Beneficios centrados en descuentos, no en puntos: reducción del 9% del IVA en restaurantes al pagar con la tarjeta de crédito Visa/Mastercard (sujeto a Ley de Inclusión Financiera y Ley 17.934); aviso gratis vía SMS por cada compra. Perfil de banca Premier/premium (hoy "Excellence" en BTG) más que de acumulación de puntos.',
    feeNote:
      'Costos oficiales (cartilla jul-2026, + IVA): Visa Internacional US$ 85/año; Visa Oro US$ 100/año; Visa Infinite US$ 120/año; Mastercard Premier ~$U 5.974 residente / $U 7.294 no residente (ajustable trimestral por IPC). Sin costo de emisión el primer año (Visa/Master). Adicionales sin costo. Costo mensual de estado de cuenta $ 43 + IVA. Ingreso mínimo: $U 25.000 nominales/mes (nuevos/existentes) o $U 15.000 (nómina).',
    pros: [
      'Descuento del 9% de IVA en restaurantes al pagar con la tarjeta.',
      'Aviso por SMS de cada consumo (control y seguridad).',
      'Primer año sin costo de emisión (Visa/Mastercard).',
      'Tarjetas de alto rango (Infinite / Premier) para perfil premium y uso internacional.',
    ],
    cons: [
      'No hay programa de puntos ni cashback: cero acumulación por consumo.',
      'Costos anuales en dólares relativamente altos a partir del segundo año.',
      'Ingreso mínimo elevado ($U 25.000/mes) orientado a segmento medio-alto/Premier.',
      'Menos competitiva que BROU o Scotiabank para quien busca puntos o descuentos de góndola.',
    ],
    bestFor:
      'Clientes de perfil Premier/premium que priorizan servicio bancario internacional, tarjetas de alto rango y el descuento de IVA en gastronomía, y a quienes no les interesa acumular puntos.',
    scores: {
      acumulacion: 15,
      canje: 25,
      descuentos: 45,
      costo: 48,
      flexibilidad: 45,
      cobertura: 55,
    },
    rationale:
      'Ultimo puesto de forma objetiva: estas tarjetas NO tienen programa de puntos/recompensas (verificado en la cartilla oficial jul-2026, heredada de HSBC), por lo que carecen de acumulacion y canje, las dos dimensiones de mayor peso. El retorno se limita a la reduccion del 9% de IVA en restaurantes y a un perfil premium con costos anuales en USD (85-120) mas cargo mensual de estado de cuenta, lo que tambien castiga la dimension costo. Desde el 10/07/2026 el emisor es BTG Pactual (ex HSBC): la cartilla bajo la marca nueva esta pendiente de reverificacion.',
    verified: true,
  },
])

const WEIGHT_SUM = REWARD_RUBRIC.reduce((s, d) => s + d.weight, 0)

/** Weighted 0–100 overall score computed from a program's per-dimension scores. */
export function computeOverall(scores: Record<RubricId, number>): number {
  const total = REWARD_RUBRIC.reduce((s, d) => s + (scores[d.id] ?? 0) * d.weight, 0)
  return Math.round(total / WEIGHT_SUM)
}

export interface RankedProgram extends CardProgram {
  overall: number
  rank: number
}

/** Programs with computed overall score, sorted best-first, 1-indexed rank. */
export function rankedPrograms(programs: readonly CardProgram[] = CARD_PROGRAMS): RankedProgram[] {
  return programs
    .map(p => ({ ...p, overall: computeOverall(p.scores) }))
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name))
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

/** Medal for the top three, else null. */
export function medalFor(rank: number): string | null {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
}

export function getCardProgram(id: string): CardProgram | undefined {
  return CARD_PROGRAMS.find(p => p.id === id)
}

// ─────────────────────────────────────────────────────────────────────────────
// "¿Conviene pagar cuentas con tarjeta de crédito?" — worth-it calculator
// ─────────────────────────────────────────────────────────────────────────────

export interface BillPayInputs {
  /** Monthly amount paid in bills through the card, in UYU. */
  monthlyBills: number
  /** Effective reward rate as a percentage of spend (e.g. 0.5 means 0.5%). */
  rewardRatePct: number
  /** Surcharge/recargo charged for paying by credit card, as a percentage. */
  surchargePct: number
}

export interface BillPayResult {
  /** Yearly reward value earned, in UYU. */
  yearlyReward: number
  /** Yearly surcharge cost, in UYU. */
  yearlySurcharge: number
  /** Net yearly benefit (reward − surcharge), in UYU. */
  net: number
  /** True when it comes out ahead (net > 0). */
  worthIt: boolean
}

/**
 * Pure economics of routing bill payments through a rewards card: yearly reward
 * value vs. yearly surcharge. Ignores financing cost — the page states the
 * assumption that you pay the statement in full (otherwise interest dwarfs any
 * reward). Negative/invalid inputs are clamped to zero.
 */
export function billPayWorthIt(inputs: BillPayInputs): BillPayResult {
  const bills = Math.max(0, inputs.monthlyBills || 0)
  const reward = Math.max(0, inputs.rewardRatePct || 0)
  const surcharge = Math.max(0, inputs.surchargePct || 0)
  const yearlySpend = bills * 12
  const yearlyReward = Math.round((yearlySpend * reward) / 100)
  const yearlySurcharge = Math.round((yearlySpend * surcharge) / 100)
  const net = yearlyReward - yearlySurcharge
  return { yearlyReward, yearlySurcharge, net, worthIt: net > 0 }
}
