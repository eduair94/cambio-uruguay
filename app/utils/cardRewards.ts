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

/** Fecha (YYYY-MM-DD) en que se reverificaron los programas contra fuente oficial. */
export const CARD_REWARDS_LAST_REVIEWED = '2026-08-17'

/**
 * Valor de la Unidad Indexada usado para convertir a pesos los costos que los
 * emisores publican en UI (Itaú, Scotiabank, BBVA, OCA). Fuente: INE, informe
 * "Unidad Indexada Agosto 2026" (valor del 17/8/2026).
 *
 * OJO: no tomar la conversión a pesos que imprime cada emisor. Itaú publica en su
 * ficha "Valor UI: $6,19" —un valor de fines de 2024— y su propio tarifario aclara
 * que los pesos que muestra son "a los solos efectos de referencia".
 */
export const UI_VALUE_UYU = 6.635

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
      'Sí tiene programa de puntos (no es solo descuentos): 1 punto por cada $U 100 pagados con la tarjeta de CRÉDITO BROU Recompensa, equivalente a $U 1. Con débito o prepaga la tasa es un tercio: 1 punto cada $U 300. Acumula en compras nacionales e internacionales y débitos automáticos reflejados en el estado de cuenta. Confirmado en brou.com.uy (agosto 2026).',
    pointValueNote:
      '1 punto = $U 1 (equivale a ~1% del consumo devuelto en puntos canjeables, y ~0,33% pagando con débito). Valor confirmado en fuente oficial.',
    redemptionNote:
      "Los puntos equivalen a dinero ('Puntos = dinero'), pero con dos condiciones duras que conviene saber antes: solo podés canjear si tenés al menos 400 puntos acumulados Y pagaste una compra con la tarjeta Recompensa en los últimos 7 días calendario. El canje se acredita como dinero a favor en la tarjeta de crédito o prepaga, o directo en tu cuenta BROU: a la cuenta llega dentro de las 48 horas, a la tarjeta puede demorar hasta 60 días según la proximidad al cierre.",
    discountNote:
      'Fuerte red de descuentos automáticos, principal atractivo de la tarjeta, y a diferencia de otros bancos NO son campañas rotativas: BROU los publica con vigencia declarada del 1º de mayo de 2024 al 30 de abril de 2027. (1) Supermercados: 10% en Ta-Ta, El Dorado, Macro Mercado, Micro Macro, Tienda Inglesa y Red Express, martes y jueves, tope de reintegro $U 2.000 por mes y por cuenta. (2) Farmacias: 10% en todas las farmacias del país salvo las de mutualistas, miércoles, sábados y domingos, tope $U 1.000/mes. (3) Combustible: 5% en estaciones ANCAP, lunes y viernes, tope $U 500/mes. Gastronomía y hotelería van por otro lado: son beneficios rotativos del portal beneficios.brou.com.uy, sin días ni topes fijos publicados.',
    feeNote:
      'Primer año sin costo y todas las adicionales exoneradas. El costo depende del segmento que te otorguen —BROU no publica una línea "Recompensa" en su tarifario—: vigente desde el 1/2/2025, con IVA, Internacional $U 1.281, Oro $U 2.928, Platinum $U 4.575 y Black $U 5.856, cobrados en 3 cuotas mensuales. La bonificación va por consumo promedio mensual del año anterior: en Internacional y Oro es 50% entre $U 25.000 y $U 35.000 y 100% desde $U 35.000; en Platinum y Black, 50% entre $U 35.000 y $U 60.000 y 100% desde $U 60.000. Es decir: con $U 25.000 por mes se bonifica la mitad, no todo.',
    pros: [
      'Red de descuentos automáticos amplia, concreta y con vigencia publicada hasta el 30/4/2027 — no depende de campañas.',
      'Puntos con valor claro: 1 punto = $U 1, canjeables como dinero.',
      'Sin costo el primer año, adicionales exoneradas y anualidad bonificable por consumo.',
      'Respaldo del banco más grande y con mayor red de cajeros del país (RedBROU).',
    ],
    cons: [
      'Para canjear hay que juntar 400 puntos Y haber comprado con la tarjeta en los últimos 7 días: no es "usá tus puntos cuando quieras".',
      'Los puntos vencen a los 24 meses de generados (más corto que los 36 de Scotia Puntos).',
      'Solo red Mastercard (sin opción Visa/Amex en esta línea).',
      'Topes mensuales de reintegro ($U 2.000 súper, $U 1.000 farmacias, $U 500 ANCAP) limitan el ahorro máximo a unos $U 3.500 por mes.',
      'Con débito o prepaga la acumulación cae a 1 punto cada $U 300 (~0,33%).',
    ],
    bestFor:
      'Familias y usuarios de consumo cotidiano en Uruguay (supermercado, farmacia y combustible ANCAP): la combinación de descuentos automáticos + 1% en puntos suele rendir más que los programas de solo puntos.',
    note: 'Los puntos vencen a los 24 meses desde su generación (asistencia.brou.com.uy). Reverificado el 17/8/2026: tasa, valor del punto, días/topes de los tres descuentos y tarifario de costos, todo con fuente oficial de BROU.',
    scores: {
      acumulacion: 72,
      canje: 74,
      descuentos: 86,
      costo: 80,
      flexibilidad: 60,
      cobertura: 80,
    },
    rationale:
      'Combinacion mas equilibrada del set: acumulacion confirmada de 1 punto por $100 con 1 punto = $1 (~1% liquido tratado como dinero) y la red de descuentos automaticos mejor documentada del pais, con dias, topes y vigencia hasta el 30/4/2027 publicados por el emisor (sube descuentos a 86). Costo tambien confirmado y mas barato de lo que se creia en la gama de entrada. Bajan canje y flexibilidad al verificarse la letra chica: minimo de 400 puntos, compra en los ultimos 7 dias y vencimiento a 24 meses.',
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
      'Dos cosas distintas. Rendimiento del saldo: Mercado Pago publica hoy "rendimientos de hasta 5,59% anual", con el asterisco de que es un rendimiento anual estimado calculado sobre el histórico del fondo. No está atado a la tasa de política monetaria del BCU: es un fondo administrado por BIND UY Administradora de Fondos de Inversión S.A., inscripta ante el BCU, y el dinero rinde desde $U 1 sin quedar inmovilizado. Reintegros: Meli+ devuelve 3% de cada compra en el Marketplace con cualquier medio de pago (tope $U 50 por ítem y $U 250 por mes) más un 2% adicional pagando con Dinero Disponible en Mercado Pago (tope $U 250 por mes). El "hasta 5%" solo se alcanza pagando con saldo, no aplica a productos usados ni a anuncios gratuitos, y el reintegro total topea en $U 500 por mes. Fuera del Marketplace no hay cashback general publicado.',
    pointValueNote:
      'Cashback y rendimientos en pesos 1:1 (líquidos). Meli+ 3% + 2% dentro del ecosistema, con tope conjunto de $U 500 por mes; rendimiento del saldo hasta 5,59% anual estimado, variable y sin garantía.',
    redemptionNote:
      'Cashback y reintegros en saldo/pesos (líquido). Los rendimientos se acreditan automáticamente sin inmovilizar fondos.',
    discountNote:
      'Reintegros de Meli+ dentro del ecosistema Mercado Libre (3% + 2% pagando con saldo, tope total $U 500 por mes). El envío gratis no aplica a toda compra mayor a $U 500: aplica solo a productos del Marketplace identificados con la etiqueta "MELI+" cuyo precio sea igual o superior a $U 500, y quedan excluidas la categoría Supermercado, las compras internacionales y los envíos cuyo costo supere los $U 400 (ahí el suscriptor paga la diferencia). Fuera del ecosistema Meli, la oferta de descuentos locales es más acotada que OCA/Prex.',
    feeNote:
      'Tarjeta prepaga gratuita: emisión $U 0, mantenimiento mensual/anual $U 0, retiro en cajeros de plaza (Banred/BROU) $U 0, retiro en ATM del exterior $U 0, comisión por compras internacionales 0% y —dato que la comparación suele omitir— reimpresión por extravío o robo $U 0. Es la única prepaga del set que no cobra el reemplazo del plástico (Prex cobra $U 207, MiDinero $U 246 + IVA). Meli+ cuesta $199/mes y es opcional.',
    pros: [
      "Rendimiento diario sobre el saldo: el dinero parado 'trabaja' sin quedar inmovilizado",
      'Reintegro publicado como tasa fija con topes (3% + 2% con saldo), no como promesa vaga',
      'Prepaga internacional gratis, sin comisión por compra en el exterior y sin costo de reimpresión del plástico. Ojo: sin comisión no es sin costo — el margen se lo puede llevar el tipo de cambio que te aplican, que no siempre es el mejor de plaza.',
    ],
    cons: [
      'El mejor reintegro (5%) exige suscripción Meli+ paga ($199/mes) y pagar con saldo dentro del ecosistema',
      'El reintegro de Meli+ topea en $U 500 por mes ($U 250 + $U 250): contra los $199/mes de la suscripción, el beneficio neto máximo es de $U 301 por mes, y el 3% general se agota con unos $U 8.333 de compra mensual',
      'Menor red de descuentos en comercio físico local vs OCA/Prex',
      'El rendimiento no es una tasa garantizada: es un fondo, y el porcentaje es estimado sobre su histórico',
    ],
    bestFor:
      'Usuario intensivo de Mercado Libre que quiere rendimientos sobre el saldo y reintegros dentro del ecosistema.',
    note: 'El rendimiento del saldo no es un depósito bancario ni una tasa garantizada: el dinero se invierte en un fondo administrado por BIND UY Administradora de Fondos de Inversión S.A., inscripta ante el BCU, y el porcentaje que muestra la app es un rendimiento anual estimado sobre el histórico del fondo, revisable sin aviso. La intervención de Mercado Pago se limita a proveer la plataforma como canal entre la administradora y el usuario. Dato para no confundirse: la TPM del BCU también está en 5,75%, así que la cifra vieja del ranking "parecía" seguir bien.',
    scores: {
      acumulacion: 70,
      canje: 90,
      descuentos: 55,
      costo: 95,
      flexibilidad: 92,
      cobertura: 68,
    },
    rationale:
      'Puntaje alto por liquidez total (reintegros en pesos 1:1, sin catalogo ni vencimiento), costo cero de emision, mantenimiento y hasta de reimpresion del plastico, y rendimiento diario sobre el saldo. Se corrigen dos cosas de la revision anterior: el rendimiento es "hasta 5,59% anual estimado" sobre un fondo de BIND UY AFISA, no 5,75% atado a la TPM del BCU, y el reintegro si esta publicado como tasa fija (3% + 2%) pero con tope de $U500 al mes, que contra los $199 de Meli+ deja un neto maximo de $U301. Ya no es el unico con rendimiento sobre el saldo: Prex lanzo Inversion Violeta el 30/3/2026, antes que Mercado Pago.',
    verified: true,
  },
  {
    id: 'club-tienda-inglesa-puntos',
    name: 'Tienda Inglesa — Programa de Puntos (Puntos Card / Club Card)',
    issuer:
      'Tienda Inglesa (retail); tarjeta Club Card emitida por Scotiabank Uruguay S.A. en Visa (Infinite, Platinum e Internacional), Mastercard Internacional y American Express Internacional',
    issuerType: 'retail',
    networks: ['visa', 'mastercard', 'amex'],
    pointsProgramName: 'Programa de Puntos Tienda Inglesa (Puntos Card); Club Card duplica puntos',
    earnRateNote:
      'Bases vigentes desde el 1 de enero de 2026: por operaciones mayores a $U 90 y menores a $U 900 se genera 1 Punto; por operaciones de $U 900 o más se generan 15 Puntos cada $U 900, sin prorrateo. Ya no existe la tasa vieja de "1 punto cada $600" ni el "puntito" de 0,1 punto. Pagando con tarjetas de débito o crédito Club Card emitidas por Scotiabank Uruguay S.A. se acumula el doble. El retorno efectivo no cambió —15 puntos de $U 1 sobre $U 900 son ~1,67% base y ~3,33% con Club Card—: lo que cambió es la unidad de medida.',
    pointValueNote:
      'Valor transparente y fijo: desde el 1/1/2026 cada Punto acumulado equivale a $U 1 (antes la equivalencia publicada era 1 punto = $10). Retorno: ~1,67% base ($U 15 cada $U 900) y ~3,33% con Club Card por doble punto.',
    redemptionNote:
      'Los puntos se descuentan contra la compra: se canjean total o parcialmente por cualquier producto excepto cigarros y servicios, en Tienda Inglesa y los locales del grupo. El mínimo de canje pasó a 150 Puntos (equivalen a los mismos $U 150 de antes, pero la cifra publicada cambió). La vigencia ahora depende del documento: con documento uruguayo son 6 meses, renovables cada vez que se genera y acumula un punto; con documento extranjero, 24 meses sin renovación.',
    discountNote:
      'Descuentos y promociones exclusivas para socios del Club/Club Card. Recorte importante del año: desde el 01/01/2026 las compras hechas FUERA de Tienda Inglesa con tarjetas Club Card ya no acumulan puntos. El doble punto sigue vigente, pero solo dentro de Tienda Inglesa y los locales del grupo, lo que achica bastante el alcance del programa. La Club Card la emite Scotiabank y agrega beneficios bancarios además de duplicar puntos.',
    feeNote:
      'El programa de Puntos del super es gratuito (adhesión con documento en caja). La tarjeta Club Card American Express es producto de Scotiabank con sus propios costos (no confirmados aquí).',
    pros: [
      'Valor del punto TRANSPARENTE y fijo: 1 punto = $U 1 (raro en el mercado local)',
      'Se puede pagar la compra directamente con puntos, total o parcialmente, por cualquier producto salvo cigarros y servicios',
      'Club Card duplica la acumulación dentro de Tienda Inglesa (~3,33% de retorno)',
      'Adhesión gratuita solo con documento; acepta cualquier medio de pago para acumular',
    ],
    cons: [
      "Retorno base modesto (~1,67%) y acotado al ecosistema Tienda Inglesa/Farma/Deli/Barny's",
      'Vigencia de 6 meses con documento uruguayo (renovable con cada acumulación); 24 meses sin renovación con documento extranjero',
      'Desde el 01/01/2026, con Club Card no se acumulan puntos por compras fuera de Tienda Inglesa',
      'La duplicación de puntos requiere la Club Card, que es tarjeta de un banco (Scotiabank), no de un emisor no bancario',
      'Mínimo de 150 Puntos para empezar a canjear',
    ],
    bestFor:
      'Clientes habituales de Tienda Inglesa que valoran un programa de puntos con valor claro y canjeable directamente contra la compra del súper.',
    note: 'Bases del Programa Puntos vigentes desde el 1/1/2026: 15 Puntos cada $U 900, 1 Punto = $U 1, mínimo de canje 150 Puntos, doble punto pagando con Club Card de Scotiabank y vigencia de 6 meses con documento uruguayo / 24 sin renovación con documento extranjero. El emisor de la Club Card sigue siendo Scotiabank Uruguay S.A. (confirmado en las bases de Tienda Inglesa y en scotiabank.com.uy a agosto de 2026): no hubo cambio de marca ni de emisor. Las cifras del régimen anterior (1 punto cada $600, 1 punto = $10, mínimo 15 puntos) quedaron sin efecto. También se retiró el canje por vales de combustible Petrobras: esa marca dejó de operar en Uruguay (DISA compró la red en 2022) y las bases 2026 no incluyen ninguna cláusula de combustible.',
    scores: {
      acumulacion: 82,
      canje: 78,
      descuentos: 48,
      costo: 85,
      flexibilidad: 60,
      cobertura: 66,
    },
    rationale:
      'La mejor tasa efectiva verificable del set: 15 Puntos cada $U 900 con 1 punto = $U 1 (~1,67% base y ~3,33% con Club Card por doble punto), valor transparente y fijo, y programa del super gratuito. Bajan descuentos y cobertura respecto de la revision anterior porque desde el 01/01/2026 las compras fuera de Tienda Inglesa con Club Card dejaron de acumular: el programa quedo encerrado en una sola cadena. La vigencia de 6 meses (documento uruguayo) y el minimo de 150 Puntos siguen frenando la flexibilidad.',
    verified: true,
  },
  {
    id: 'prex-uruguay',
    name: 'Prex (tarjeta prepaga Mastercard)',
    issuer: 'Prex Uruguay',
    issuerType: 'fintech',
    networks: ['mastercard'],
    pointsProgramName:
      'Sin programa de puntos ni cashback propio: ahorro de IVA por ley + promos rotativas + Inversión Violeta',
    earnRateNote:
      'Prex no publica hoy ningún programa de cashback propio: se barrieron el home, la página de beneficios, las 17 fichas de beneficio vigentes, las 16 secciones del centro de ayuda y la cartilla de uso, sin una sola mención. Lo que devuelve de forma permanente es IVA: 2 puntos en comercios, pagos, recargas, Abitab y STM (Ley 19.210) y 9 puntos en restaurantes (Ley 17.934) hasta el 30/9/2026, porque desde el 1/10/2026 esa reducción baja a 5 puntos. Ese ahorro no es un beneficio del programa: lo tiene cualquier medio de pago electrónico. Lo que sí es propio de Prex es Inversión Violeta, que desde el 30/3/2026 hace rendir el saldo.',
    pointValueNote:
      'Reintegros y rendimientos en pesos 1:1 (líquidos). No hay una tasa de cashback publicada por el emisor: el "1%-5% rotativo" que circulaba salía de una comparativa de terceros, no de Prex.',
    redemptionNote:
      'Los reintegros se acreditan en saldo de la cuenta Prex (líquido, sin catálogo), utilizables en cualquier compra.',
    discountNote:
      'Lo permanente en gastronomía es la devolución de 9 puntos de IVA en restaurantes, todos los días del año y en todos los restaurantes del país, acreditada por Prex en el estado de cuenta (baja a 5 puntos el 1/10/2026). El resto de la cartelera son promos puntuales y topeadas: en agosto de 2026, Cabify 30% con el código PREXAGO30 (tope $U 150, un viaje, del 1/8 al 31/8/2026), 25% de reintegro en la primera recarga de Telepeaje en la app (tope $U 200), 100% de reintegro del primer pago de Estacionamiento Tarifado (tope $U 100), $U 104 de regalo al recargar STM desde $U 1.000 (una sola vez), sorteo de 10 reintegros de hasta $U 4.000 en carga de combustible, Pax Assistance 50% y pop + refresco en Grupocine el mes del cumpleaños. La PrexWeek está entre ediciones; la última fue de 25% en comercios adheridos.',
    feeNote:
      'Cartilla de uso oficial: costo de solicitud $U 0, costo anual o de renovación $U 0, mantenimiento $U 0, costo por bajo promedio $U 0 y tarjetas de menores o adicionales $U 0. La tarjeta física no se cobra: lo que se cobra es el envío, $U 89 si la retirás en Abitab o Correo Uruguayo (gratis retirándola en las sucursales Fortex de Montevideo). La reimpresión por extravío cuesta $U 170 + IVA ($U 207 con IVA; Prex Sueldos tiene dos reimpresiones gratis) y la reimpresión de PIN $U 150 + IVA. Los importes en pesos se reajustan semestralmente por IPC.',
    pros: [
      'App muy valorada por usuarios (transferencias P2P instantáneas y gratis)',
      'Inversión Violeta (desde el 30/3/2026): cuenta de inversión en Gletir que abrís desde la app, gratuita, que pone el saldo en el "Fondo Liquidez Inmediata" (money market) administrado por VALO, ambos supervisados por el BCU. Rinde en días hábiles, sin plazo fijo y con disponibilidad inmediata. Primera suscripción desde $U 4.000 y después partidas de $U 100. La tasa es variable y no está publicada: la app muestra una referencia indicativa del promedio de los últimos 30 días',
      'Ahorro de IVA por ley (2 puntos en comercios, 9 en restaurantes hasta el 30/9/2026)',
      'Sin costo de solicitud, renovación ni mantenimiento; Mastercard internacional',
    ],
    cons: [
      'No tiene cashback propio: el "1%-5% rotativo" no aparece en ninguna fuente del emisor, y el ahorro de IVA lo da la ley, no Prex',
      'Los descuentos vigentes son promos puntuales, fechadas y con topes bajos ($U 100-200 en varias)',
      'El plástico tiene costos que la comparación suele omitir: $U 89 de envío y $U 207 la reimpresión',
      'La tarjeta es prepaga: no da cuotas ni genera historial crediticio (aunque el ecosistema sí ofrece crédito: el Prextamo, 100% online desde la app, lo otorga Floder S.A., regulada y supervisada por el BCU, sujeto a aprobación crediticia)',
    ],
    bestFor:
      'Usuario digital que quiere una prepaga gratis con buena app, hacer rendir el saldo y aprovechar el ahorro de IVA en el gasto cotidiano.',
    note: 'Prex es emitida por Econstar S.A., Institución Emisora de Dinero Electrónico regulada y supervisada por el BCU; Fortigold S.A. no emite la tarjeta, es quien realiza la conversión de divisas. Corrección de la revisión anterior: la ficha publicaba un cashback de 1%-5% rotativo y un 20% de gastronomía los lunes y martes que no existen en ninguna fuente oficial de Prex a agosto de 2026 — venían de una comparativa de terceros.',
    scores: {
      acumulacion: 45,
      canje: 90,
      descuentos: 52,
      costo: 88,
      flexibilidad: 92,
      cobertura: 60,
    },
    rationale:
      'Costo casi nulo, saldo liquido sin catalogo ni vencimiento y una app que los usuarios valoran: eso sostiene canje, costo y flexibilidad. Bajan acumulacion (55 a 45) y descuentos (62 a 52) por un motivo de método, no de gusto: el cashback de 1%-5% y el 20% de gastronomia de lunes y martes que justificaban esas notas no aparecen en ninguna fuente de Prex, solo en una comparativa de terceros. Lo que queda verificado es el ahorro de IVA —que lo da la ley y lo tiene cualquier medio electronico—, una cartelera de promos chicas y fechadas, y el diferencial nuevo: Inversion Violeta, que hace rendir el saldo desde el 30/3/2026, antes incluso que Mercado Pago.',
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
      'La tasa es escalonada por categoría de tarjeta, no un 1 punto cada $U 100 general: Visa Internacional y Mastercard Internacional acumulan 1 punto cada $U 150 (~0,67% de retorno), Visa Platinum 1 punto cada $U 100 (~1%) y Visa Infinite 1 punto cada $U 80 (~1,25%). Las tarjetas de entrada, que son las más masivas, rinden un tercio menos de lo que sugiere el "1%" con el que se asocia al programa.',
    pointValueNote:
      '1 Scotia Punto = $U 1 al canjear. El retorno real depende de la categoría: ~0,67% en las Internacionales, ~1% en Platinum y ~1,25% en Infinite. Valor confirmado en el sitio oficial.',
    redemptionNote:
      "Canje 100% autogestionado desde la App Scotia Móvil: podés canjear puntos por cualquier compra que se pueda pagar con la tarjeta ('si lo podés pagar con la tarjeta, lo podés canjear con puntos'), a razón de 1 punto = $U 1. Pero el eslogan tiene letra chica: la compra tiene que superar los $U 700, tener menos de 90 días desde la fecha de compra y hay que tener puntos para cubrir el monto TOTAL (no se admite canje parcial). Se canjea únicamente por la App: no hay canje por web ni por sucursal. Los puntos vencen a los 36 meses de generados.",
    discountNote:
      'El foco del programa es la acumulación de puntos; los descuentos con comercios van por campañas puntuales (no un cuadro fijo de días como BROU). Programas asociados vigentes a agosto de 2026: Scotia Puntos, Membership Rewards (American Express), Copa ConnectMiles y Club Card (Tienda Inglesa, puntos dobles). Dos que el ranking listaba y ya no corresponden: Gaviotas fue discontinuado el 1 de febrero de 2026 (saldo canjeable hasta el 31/12/2026 en Montevideo Shopping) y Sonrisas fue reemplazado por Scotia Puntos. MileagePlus (United) y Smiles figuran en el sitio solo como enlaces de consulta, sin texto de vigencia ni aviso de baja: quedan como a confirmar.',
    feeNote:
      'Tarifario oficial vigente (Cartilla Tarjetas de Crédito Personas Físicas F.2540, 20/03/2026): emisión sin costo y primer año sin costo. Cargo anual obligatorio con IVA incluido y denominado en Unidades Indexadas —o sea indexado a la inflación en pesos, no al dólar—: Visa y Mastercard Internacional UI 1.000 (≈ $U 6.635), Platinum UI 1.250 (≈ $U 8.294) e Infinite UI 1.600 (≈ $U 10.616). Adicionales sin costo. Compras en el exterior, cargo obligatorio + IVA por compra: 3% en las Internacionales y Mastercard Oro, 1,5% en American Express Oro y Visa Platinum, 0% en American Express Platinum y Visa Infinite. Conversión a pesos con la UI del 17/8/2026 ($U 6,6350). La referencia de mercado de "~$U 6.000/año" para la Platinum quedó corta: el valor real es ~38% más alto.',
    pros: [
      'Valor del punto simple y transparente: 1 punto = $U 1 (sin catálogos con tasas de canje ocultas).',
      'Canje por cualquier compra pagable con la tarjeta, no un catálogo cerrado: sigue siendo de lo más líquido entre los programas bancarios.',
      'Programa unificado: los puntos de Visa y Mastercard acumulan en la misma bolsa Scotia Puntos.',
      'Emisión, primer año y adicionales sin costo, con tarifario público y fechado (cartilla F.2540 del 20/03/2026).',
    ],
    cons: [
      'Los puntos vencen a los 36 meses, y además se vence el TOTAL acumulado si pasás 6 meses corridos sin comprar con la tarjeta.',
      'Las tarjetas Internacionales acumulan 1 punto cada $U 150 (~0,67%), no el ~1% que se le atribuye al programa.',
      'Para canjear, la compra debe superar $U 700, tener menos de 90 días y cubrirse 100% con puntos: no hay canje parcial.',
      'El canje es solo por la App Scotia Móvil: no hay web ni sucursal.',
      'Descuentos con comercios menos estructurados que el esquema fijo de días y topes de BROU.',
    ],
    bestFor:
      'Clientes Scotiabank de gama Platinum o Infinite que usan la tarjeta seguido: el canje por App es de lo más flexible del mercado, pero castiga al que la deja guardada.',
    note: 'Reverificado el 17/8/2026 contra el sitio oficial y la cartilla F.2540 (vigencia 20/03/2026). Scotiabank Uruguay sigue operando con normalidad: la venta a Davivienda alcanzó Colombia, Costa Rica y Panamá, no Uruguay.',
    scores: {
      acumulacion: 58,
      canje: 72,
      descuentos: 58,
      costo: 55,
      flexibilidad: 60,
      cobertura: 80,
    },
    rationale:
      'Correccion grande respecto de la revision anterior. La acumulacion baja de 74 a 58 porque la tasa no es 1 punto cada $U100 de forma general: las Internacionales, que son el grueso de la cartera, acumulan 1 cada $U150 (~0,67%). El canje baja de 95 a 72 porque el eslogan "si lo podes pagar con la tarjeta, lo podes canjear" tiene cuatro condiciones que el ranking no contemplaba (minimo $U700, menos de 90 dias, cubrir el 100% del monto y solo por App) y una clausula de inactividad que borra TODO el saldo a los 6 meses sin comprar. Sube levemente costo al aparecer el tarifario oficial, que ademas confirma que el cargo esta en UI y no en dolares.',
    verified: true,
  },
  {
    id: 'midinero-uruguay',
    name: 'MiDinero (tarjeta prepaga Mastercard)',
    issuer: 'MiDinero Uruguay',
    issuerType: 'fintech',
    networks: ['mastercard'],
    pointsProgramName:
      'Sin programa de puntos ni cashback permanente: devolución de IMESI en frontera + ahorro de IVA + promos puntuales',
    earnRateNote:
      'No hay cashback: el buscador del propio sitio de MiDinero para "cashback" devuelve "No se ha encontrado nada". Lo que publica son dos acciones comerciales acotadas y de una sola vez: la "Escalera de devoluciones en Midinero App" (del 4/8/2026 al 31/10/2026), que paga $U 50 por el primer pago de servicios de $U 500 o más hecho en la app, $U 75 por el segundo y $U 100 por el tercero, con tope de $U 225 por cliente; y "Alta + Carga en el día" (del 11/5/2026 al 30/9/2026), 20% de devolución sobre la primera compra con tope $U 200 para clientes nuevos que recarguen $U 1.000 o más el día del alta. No hay ningún porcentaje permanente sobre todo el gasto. Su diferencial real es la devolución de IMESI en la franja fronteriza.',
    pointValueNote:
      'Devoluciones en pesos 1:1 (líquidas). El "~1% de cashback" que figuraba antes no existe en fuente oficial: venía de una comparativa de terceros.',
    redemptionNote:
      'Devoluciones acreditadas en saldo de la cuenta MiDinero (líquido). Pago de +2.000 facturas y servicios desde la app.',
    discountNote:
      "Devolución de IMESI en combustible, pero solo en la franja fronteriza y con topes duros: 22% en estaciones dentro de un radio de hasta 20 km de determinados pasos de frontera con Argentina y 34% en estaciones dentro de hasta 20 km de pasos con Brasil; entre 20 y 60 km del paso, la devolución es la mitad (11% y 17%). Aplica solo a Nafta Premium 97 SP, Súper 95 SP y Especial 85 SP para consumidores finales, en la lista cerrada de estaciones de Artigas, Cerro Largo, Paysandú, Río Negro, Rivera, Rocha y Salto. No aplica a cargas de más de 50 litros de Súper 95 SP en una sola carga y el tope mensual es de UI 600 por persona (≈ $U 3.981), considerando todas las cuentas y tarjetas MiDinero del titular. Ahorro de 2 puntos de IVA. El 10% en Tata.com.uy fue dado de baja: MiDinero no tiene hoy ningún descuento destacado en supermercados. Los destacados vigentes son Coderhouse 20%, You Print 20%, Cofa's 10% + 2 puntos de IVA, DT Transportes 15% + 2 puntos, Senpai Academy 15% + 2 puntos, Instituto Dickens 30%, Kroser 10%, Restaurante Americano 5% y TADI Libros 5%.",
    feeNote:
      'Emisión sin costo; mantenimiento gratis el primer año, luego $297 + IVA anual. Primer plástico gratis, pero las reimpresiones por extravío, reposición o reimpresión de PIN (que implica recambio de plástico) cuestan $U 246 + IVA cada una: el reemplazo más caro del set, contra $U 207 de Prex y $U 0 de Mercado Pago. Mismas tarifas para Midinero y Midinero+, ajustadas anualmente por IPC en enero.',
    pros: [
      'Devolución de IMESI en combustible: 22% en frontera con Argentina y 34% con Brasil, fuerte para quien vive o carga cerca del paso',
      'Devoluciones líquidas en saldo, sin catálogo',
      'Ahorro de 2 puntos de IVA y pago de +2.000 facturas desde la app',
    ],
    cons: [
      'No tiene cashback: el ~1% que se le atribuía no existe en fuente oficial. Solo hay promos de una sola vez y con tope ($U 225 y $U 200)',
      'El IMESI sirve solo en la franja fronteriza, con tope de UI 600 al mes (≈ $U 3.981) y de 50 litros por carga: para quien maneja en Montevideo no aplica',
      'Perdió el descuento de supermercado: el 10% en Tata está dado de baja',
      'Cobra mantenimiento anual tras el primer año ($297 + IVA) y $U 246 + IVA por reponer el plástico',
      "App considerada 'correcta pero no al nivel de Prex' por usuarios",
    ],
    bestFor:
      'Quien vive o carga combustible en la franja fronteriza: ahí la devolución de IMESI es un beneficio real. Fuera de esa franja, su propuesta hoy es floja.',
    note: 'Corrección de la revisión anterior: la ficha publicaba un cashback de ~1% y una devolución de IMESI de "hasta 32%" que no coinciden con ninguna fuente vigente. La devolución de IMESI no es un beneficio del emisor sino un régimen fiscal (Decreto 398/007 y modificativos) abierto a cualquier tarjeta de débito, crédito o dinero electrónico emitida en Uruguay, pagando de forma presencial; los porcentajes los actualiza la DGI por resolución (22% y 34% desde el 1/7/2026).',
    scores: {
      acumulacion: 38,
      canje: 88,
      descuentos: 48,
      costo: 82,
      flexibilidad: 90,
      cobertura: 58,
    },
    rationale:
      'Devoluciones liquidas en saldo y costo bajo sostienen canje, costo y flexibilidad. Bajan acumulacion (58 a 38) y descuentos (62 a 48) por dos hallazgos concretos: el ~1% de cashback no existe en ninguna fuente de MiDinero —solo hay dos promos de una sola vez, con tope de $U225 y $U200— y el IMESI, su diferencial, no es un 32% general sino 22% en frontera con Argentina y 34% con Brasil, solo dentro de 20 km del paso (la mitad entre 20 y 60 km), con tope de UI 600 al mes y 50 litros por carga. Ademas perdio el 10% de Tata, su unico descuento de supermercado.',
    verified: true,
  },
  {
    id: 'santander-soy-santander-puntos',
    name: 'Soy Santander (Puntos)',
    issuer: 'Banco Santander Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Soy Santander',
    earnRateNote:
      'Acumulación por consumo con tarjeta de crédito, escalonada por segmento: Internacional 1 punto cada $U 100; Platinum 1 cada $U 90; Black e Infinite 1 cada $U 80; Black e Infinite Private Banking 1 cada $U 70. Con débito se acumula bastante menos: Internacional 1 cada $U 240, Infinite 1 cada $U 200 e Infinite Private Banking 1 cada $U 180. Las exclusiones son distintas según el plástico: en CRÉDITO no acumulan los adelantos de efectivo en cajeros locales o del exterior, los cargos del banco y sus impuestos ni los préstamos con débito automático en cuenta; en DÉBITO no acumulan los débitos automáticos, los retiros en cajeros ni los consumos en redes de cobranza. Los puntos de crédito se acreditan dentro de los 5 días hábiles posteriores al cierre.',
    pointValueNote:
      '1 punto = $U 1 para gastar en cualquiera de los centros de canje habilitados (confirmado en dos páginas oficiales vigentes). Dato material que faltaba: el saldo total de puntos se vence si pasan 12 meses corridos sin al menos una compra válida con tarjeta de crédito o débito Santander. El "hasta $U 1,5 en promociones" se retiró: ya no figura en ninguna página oficial vigente.',
    redemptionNote:
      '1 punto = $U 1. Canje en Tienda Soy Santander (electrodomésticos, muebles, tecnología), Viajes Soy Santander (pasajes, hoteles, experiencias) y vales/gift cards. Dato clave que explica el precio del catálogo: esos centros de canje NO los opera el banco. La Tienda la administra RIOLUX S.A. y Viajes la administra DIEGAL S.A., y Santander se deslinda expresamente de la venta y la posventa. No hay canje mínimo: podés pagar parte con puntos y el saldo en pesos o dólares, incluso en cuotas. Dos plazos a tener en cuenta: los vales canjeados vencen a los 60 días corridos y no se reembolsan, y los cambios y devoluciones en la tienda se piden dentro de los 5 días hábiles de recibido el producto y con el embalaje intacto. Bonos de bienvenida de 1.000 a 5.000 puntos tras la primera compra, más bonos por acreditación de sueldo, pagos automáticos y saldos mínimos.',
    discountNote:
      "Red de descuentos 'Descuentos Santander' en comercios adheridos (gastronomía, indumentaria, viajes, etc.) y promociones/cuotas sin recargo puntuales publicadas en 'Bases y condiciones de promociones'. No se pudo confirmar en fuente oficial un esquema fijo y permanente de descuento por día en supermercados ni un reintegro fijo en combustible bajo esta marca; las promos son rotativas. Detalle de rubros y topes no verificado punto por punto.",
    feeNote:
      'Costo anual/mantenimiento de la tarjeta no confirmado en fuente oficial (varía por producto y suele bonificarse con acreditación de sueldo). No verificado.',
    pros: [
      'Punto con valor claro y estable: 1 punto = $U 1, fácil de calcular',
      'Acumulación acelerada en segmentos altos (hasta 1 pto/$U 70 en Private Banking)',
      'Canje flexible: productos, viajes y vales, sin necesidad de juntar el 100% en puntos',
      'Bonos de bienvenida (1.000 a 5.000 puntos) y bonos por sueldo, pagos automáticos y saldos mínimos',
    ],
    cons: [
      'El catálogo cotiza por encima de la tienda oficial de la marca en la mayoría de los modelos, aunque no en todos: en un relevamiento propio del 17/8/2026 sobre 9 televisores Samsung con modelo coincidente, 7 salían más caros en la Tienda Soy Santander (entre +1,1% y +8,7%, mediana +6,3%) y 2 más baratos. Los dos catálogos corren promos rotativas, así que es una foto del día.',
      'Los centros de canje los operan terceros (RIOLUX S.A. la Tienda, DIEGAL S.A. Viajes): el precio no lo fija el banco y la posventa tampoco',
      'El saldo entero de puntos se vence si pasás 12 meses corridos sin una compra válida',
      'Descuentos en supermercado/combustible son promocionales y rotativos, no un beneficio fijo garantizado',
      'Débito acumula a tasa muy baja (1 pto cada $U 180-240)',
      'Costo anual de la tarjeta no publicado: remite al manual de tarifas',
    ],
    bestFor:
      'Clientes que ya operan con Santander (sueldo acreditado) y consumen alto con tarjeta de crédito, buscando canjear puntos por viajes o electrodomésticos con un valor de punto predecible.',
    note: 'El valor oficial es 1 punto = 1 peso al canjear; el "hasta 1,5" ya no figura en ninguna página oficial vigente y se retiró. Los puntos se vencen en bloque si pasan 12 meses corridos sin una compra válida. Comparación de precios del catálogo: relevamiento propio del 17/8/2026 sobre 9 televisores Samsung con modelo coincidente entre tienda.soysantander.com.uy y stienda.uy (Tienda Oficial Samsung en Uruguay), 7 más caros en Santander y 2 más baratos.',
    scores: {
      acumulacion: 72,
      canje: 70,
      descuentos: 68,
      costo: 58,
      flexibilidad: 64,
      cobertura: 82,
    },
    rationale:
      'Programa solido y bien documentado: 1 punto = $U1, acumulacion escalonada por segmento (1 pt/$100 Internacional hasta 1 pt/$70 Private Banking), canje flexible con pago parcial en puntos y bonos de bienvenida. Baja el canje de 80 a 70 tras verificar dos cosas: el catalogo lo operan terceros (RIOLUX y DIEGAL, con deslinde expreso del banco) y en un relevamiento propio del 17/8/2026 cotiza por encima de la tienda oficial de la marca en 7 de 9 televisores comparables (mediana +6,3%), o sea que el punto vale $U1 nominal pero compra menos. Baja flexibilidad por el vencimiento en bloque a los 12 meses sin compras, y costo porque el banco sigue sin publicar la anualidad.',
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
      '1 Punto BBVA = $1 peso uruguayo. Canje principalmente en BBVA Viajes, la plataforma "Powered by Despegar" (operada por Holidays S.A.): vuelos, hoteles, paquetes y experiencias locales e internacionales; ahí sí se puede pagar una parte con puntos y el resto con tarjeta BBVA. Aparte, cada mes se habilitan "Compras Canjeables" que se pagan con puntos desde la app, sin mínimo de canje pero con letra chica dura: tenés 15 días corridos desde la compra para canjear; solo entran compras en pesos uruguayos, en una sola cuota y en comercios dentro de Uruguay; no se permite canje parcial (necesitás puntos para el 100% del importe); se canjea de a una compra por vez; y quedan excluidas las compras hechas por Mercado Pago, Mercado Libre y PedidosYa, porque no muestran el comercio original.',
    discountNote:
      'Amplia red de descuentos: más de 300 comercios adheridos todos los días. Supermercados: promo Tienda Inglesa 20% de descuento (tope de devolución $U 2.000 por cédula y por mes, vigente del 16/6/2022 al 15/6/2027). Gastronomía: descuentos en restaurantes y tiendas gourmet todo el año en todo el país. Promos con reintegro de hasta 15% (7,5% en el punto de venta + 7,5% en el estado de cuenta, acreditado en un plazo máximo de 30 días): los topes los fija cada comercio y hoy van desde sin tope hasta $U 6.000 por cierre —por ejemplo Zona Tecno aplica 7,5% + 7,5% sin tope y Prodéco 7,5% en POS sin tope más 7,5% en estado de cuenta con tope de $U 6.000—, no los $U 8.000-10.000 que figuraban antes. Ojo con una campaña que caducó: el canje de puntos en estaciones de servicio, restaurantes y cines era del programa general (no de la Comunidad Plus) y la propia página oficial declara vigencia hasta el 30/06/2026, así que a agosto de 2026 está caído.',
    feeNote:
      'El costo está publicado en el tarifario oficial (Manual de tarifas y comisiones, actualizado el 20 de julio de 2026): emisión gratuita, primer año sin costo y después renovación anual con IVA, en 3 cuotas sin recargo. Costo estándar: Internacional 743 UI (≈ $U 4.930), Oro 872 UI (≈ $U 5.786), Platinum 969 UI (≈ $U 6.429), Infinite y Black 1.308 UI (≈ $U 8.679). Con pago de sueldos en BBVA baja a la mitad: 372 UI (≈ $U 2.468), 436 UI (≈ $U 2.893), 485 UI (≈ $U 3.218) y 645 UI (≈ $U 4.280). Adicionales sin costo hasta 9. Las tarjetas con co-branding quedan excluidas de la bonificación y pagan el 100% del costo estándar. Conversión con la UI del 17/8/2026 ($U 6,6350).',
    pros: [
      'Alta automática: no hay que inscribirse. Con exclusiones expresas: no acumulan las tarjetas de débito y prepagas, las Mastercard Black adheridas a otro programa de puntos/millas/avios (se elige uno solo), las tarjetas de crédito ex-regionales ni las corporativas, y BBVA puede modificar esa lista avisando con 30 días hábiles',
      'Fuerte red de descuentos diarios (300+ comercios) y promos potentes en supermercado (Tienda Inglesa 20%) y gastronomía',
      'Acumulación mejorada en segmentos altos (1 pto cada $80 en Platinum/Infinite/Black)',
      'Canje de viajes vía Despegar con inventario amplio y experiencias locales',
      'Costo anual publicado en el tarifario y bonificado al 50% acreditando sueldo en el banco',
    ],
    cons: [
      'Los Puntos BBVA caducan a los 24 meses de acreditados y se debitan solos de la cuenta',
      'El banco puede darlos de baja antes si cortás el vínculo, si la tarjeta deja de estar activa y vigente o si tenés deuda de tarjeta; y no son transferibles en ningún caso',
      'El canje de puntos está muy orientado a viajes (Despegar); menos flexible para productos o efectivo',
      'Las "Compras Canjeables" tienen 15 días de plazo, exigen una sola cuota en pesos y en Uruguay, no admiten canje parcial y excluyen Mercado Pago, Mercado Libre y PedidosYa',
      "Los mejores descuentos (topes de reintegro) dependen de campañas y clientes 'seleccionados'",
    ],
    bestFor:
      'Clientes BBVA que compran seguido en la red de comercios (Tienda Inglesa, gastronomía) y que valoran canjear puntos por viajes y experiencias vía Despegar.',
    note: 'Tasas de acumulación (1 pto/$100 Internacional-Oro; 1 pto/$80 Platinum-Infinite-Black), equivalencia 1 punto = $1 UYU, vencimiento a 24 meses y costo anual confirmados en los T&C legales del programa y en el Manual de tarifas y comisiones (actualizado el 20/7/2026). Cuidado al reverificar: las páginas de campaña de BBVA reciclan plantillas y dejan copy viejo; lo que manda son los T&C, el tarifario y la ficha de producto.',
    scores: {
      acumulacion: 66,
      canje: 62,
      descuentos: 85,
      costo: 62,
      flexibilidad: 62,
      cobertura: 80,
    },
    rationale:
      'Acumulacion confirmada (1 pt/$100 base, 1 pt/$80 gama alta, 1 punto = $1) y la red de descuentos mas potente y concreta del set (300+ comercios, 20% Tienda Inglesa, reintegros de hasta 15%). Sube costo porque el tarifario oficial aparecio y el cargo se bonifica a la mitad acreditando sueldo. Bajan canje y flexibilidad al leerse la letra chica: los puntos caducan a los 24 meses, el canje esta concentrado en Despegar y las "Compras Canjeables" exigen 15 dias, una sola cuota, cubrir el 100% con puntos y excluyen Mercado Pago, Mercado Libre y PedidosYa.',
    verified: true,
  },
  {
    id: 'bbva-comunidad-plus',
    name: 'Tarjeta de Crédito BBVA Comunidad Plus (co-brand Ta-Ta / BAS / Multi Ahorro Hogar)',
    issuer:
      'Banco Bilbao Vizcaya Argentaria (BBVA) Uruguay, en co-brand con GDN Uruguay (Grupo Vierci)',
    issuerType: 'banco',
    networks: ['visa'],
    pointsProgramName: 'Puntos BBVA + Puntos Plus (programa de fidelidad de GDN Uruguay)',
    earnRateNote:
      'La Comunidad Plus es una Visa Internacional (el tarifario y la ficha le aplican el costo de Internacional), así que acumula 1 Punto BBVA cada $100 consumidos, la tasa base del programa. Lo distintivo no es la tasa sino la acumulación dual: la misma compra suma Puntos BBVA y Puntos Plus, el programa de fidelidad de GDN Uruguay.',
    pointValueNote: '1 punto = $1 UYU (misma equivalencia del programa Puntos BBVA).',
    redemptionNote:
      'Lo que distingue a la Comunidad Plus no es un canje especial sino que acumula en dos programas en paralelo: Puntos BBVA (canjeables en BBVA Viajes, operado por Despegar, y en las Compras Canjeables de la app, sin mínimo de canje) y Puntos Plus, el de GDN Uruguay. El canje en cines, restaurantes y estaciones de servicio nunca fue una función de esta tarjeta: era una campaña del programa general Puntos BBVA y la propia página oficial declara vigencia hasta el 30/06/2026, o sea que a agosto de 2026 está caída.',
    discountNote:
      'Es el co-brand de BBVA con GDN Uruguay (Grupo Vierci): sus beneficios propios son de súper y retail, no de combustible ni cines. En Ta-Ta: 20% extra en Ofertata todos los días en productos seleccionados, 10% los miércoles y Hometech sin IVA los viernes (18,03% de descuento). En BAS: 25% los miércoles y 12 cuotas sin recargo todos los días. En Multi Ahorro Hogar: 10% los miércoles e IVA Off los viernes en productos Hometech. En las tres cadenas hay 25% de descuento de bienvenida en la primera compra. Además accede a la red general de BBVA de más de 300 comercios adheridos. Los topes puntuales de cada descuento remiten a las condiciones de cada beneficio.',
    feeNote:
      'Primer año gratis (emisión y mantenimiento bonificados). A partir del segundo año, el mantenimiento es de 743 UI con IVA incluido, ≈ $U 4.930 con la UI del 17/8/2026 — el mismo valor que la Internacional del tarifario, porque la Comunidad Plus es una Visa Internacional. Adicionales sin costo (de 2 a 9). Atención: por ser tarjeta con co-branding queda excluida de la bonificación del 50% por pago de sueldos y paga el 100% del costo estándar.',
    pros: [
      'Acumula en dos programas con la misma compra: Puntos BBVA y Puntos Plus de GDN Uruguay',
      'Descuentos concretos y fuertes en Ta-Ta, BAS y Multi Ahorro Hogar (miércoles de 10%-25%, IVA off los viernes, 12 cuotas sin recargo en BAS)',
      'Se apoya además en la red general de BBVA de 300+ comercios',
      'Primer año gratis, adicionales sin costo y requisito de ingreso bajo ($U 10.000 líquidos)',
    ],
    cons: [
      'El descuento fuerte está atado a tres cadenas (Ta-Ta, BAS, Multi Ahorro Hogar): fuera de ahí es la red general de BBVA',
      'Por ser co-branded queda excluida de la bonificación del 50% del costo anual por pago de sueldos: paga el 100%',
      'Comparte la letra chica de las "Compras Canjeables" del programa Puntos BBVA (15 días, un pago, sin canje parcial, sin Mercado Pago/Mercado Libre/PedidosYa)',
      'Los topes puntuales de cada descuento no están publicados en la ficha: remiten a las condiciones de cada beneficio',
    ],
    bestFor:
      'Quien hace el súper en Ta-Ta, BAS o Multi Ahorro Hogar y quiere exprimir los miércoles de descuento, el IVA off de los viernes y las cuotas sin recargo, sumando en dos programas de puntos a la vez.',
    note: 'Co-brand de BBVA con GDN Uruguay (Grupo Vierci) para Ta-Ta, BAS y Multi Ahorro Hogar, lanzado el 5 de julio de 2024. Es Visa Internacional (no Mastercard). Costo anual, acumulación dual Puntos BBVA + Puntos Plus, descuentos por cadena y requisitos de ingreso ($U 10.000 líquidos, 18 a 79 años, sin antecedentes en Clearing ni BCU) confirmados en la ficha oficial del producto el 17/8/2026. Solo quedan sin confirmar los topes puntuales de cada descuento. Corrección respecto de la revisión anterior: esta ficha describía un "canje ampliado en cines, estaciones de servicio y Sodimac" que no es de esta tarjeta y además venció el 30/06/2026.',
    scores: {
      acumulacion: 68,
      canje: 60,
      descuentos: 84,
      costo: 62,
      flexibilidad: 60,
      cobertura: 66,
    },
    rationale:
      'Ficha reescrita entera: la version anterior describia una tarjeta que no existe. La Comunidad Plus es el co-brand con GDN Uruguay (Ta-Ta, BAS, Multi Ahorro Hogar) y su ventaja real es la acumulacion dual —Puntos BBVA + Puntos Plus con la misma compra— mas descuentos de gondola concretos, lo que sube acumulacion y descuentos. Baja canje de 72 a 60 porque el "canje ampliado en nafta, cines y Sodimac" que justificaba esa nota nunca fue de esta tarjeta y vencio el 30/06/2026. Costo publicado y moderado, aunque el co-branding la deja afuera de la bonificacion del 50% por sueldo.',
    verified: true,
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
      '1er año sin costo; luego UI 864/año, que son ≈ $U 5.733 con la UI del 17/8/2026 ($U 6,6350, valor INE). Costo confirmado en el tarifario oficial vigente desde el 1/8/2026 para la línea Internacional, Visa y Mastercard. Se cobra en 3 cuotas en moneda nacional, IVA incluido. Ingreso mínimo declarado ~$26.000. Primera adicional bonificada al 100%, las siguientes al 50%. Ojo: el tarifario imprime "$5.010" al lado de UI 864, pero es un valor de referencia congelado a la fecha de impresión, no el importe a cobrar.',
    pros: [
      'Millas sin aerolínea fija: canje de pasajes en cualquier compañía y sin bloqueo de fechas',
      'Tasa simple y transparente: 1 milla = US$1 en crédito',
      'Bono de bienvenida de 2.500 millas con la primera compra (las 3.500 son de Platinum y Mastercard Black; 10.000, de la Infinite de Personal Bank)',
      'Adhesión automática al sacar la tarjeta y primera adicional bonificada al 100%',
      'Catálogo amplio (viajes, tecnología, hogar) además de pasajes',
    ],
    cons: [
      'Recargo por compras en el exterior: 3% + IVA (~3,66% efectivo) en toda tarjeta de crédito Itaú, y en Visa un 3% adicional sobre el tipo de cambio de Visa Internacional. Entre las dos cosas se comen varias veces el ~1% que devuelve la milla, justo en el gasto que la tarjeta promete premiar. Solo la Visa Infinite de Personal Bank tiene 0% de recargo',
      'Valor monetario de la milla no publicado; depende del catálogo/Jetmar (rendimiento real incierto)',
      'No acumulan retiros de efectivo, préstamos tasa 0, intereses/cargos del banco ni pagos por Abitab/Redpagos',
      'Millas vencen a los 5 años',
      'El detalle de la red de descuentos exige login/app, poco transparente en la web pública',
      'Al adherir crédito a Volar se deja de acumular en otros programas del banco (p. ej. LATAM)',
    ],
    bestFor:
      'Usuario que gasta en pesos/dólares y quiere flexibilidad total para canjear pasajes en cualquier aerolínea, sin atarse a un programa de millas específico.',
    note: 'Programa de fidelidad principal de Itaú Uruguay. \'Partiu\' es un programa de Itaú Brasil, no existe con ese nombre en Uruguay. Sobre el vencimiento de las millas hay dos documentos oficiales en conflicto: un PDF alojado en itau.com.uy dice 24 meses, pero es de 2013 (habla del "Programa Volare" y ni menciona la tasa de débito); las bases vigentes en tiendavolar.com.uy dicen 5 años, que es lo que publicamos.',
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
      'Red de beneficios Itaú más los beneficios de nivel Platinum, con la letra chica que cambió el 1/2/2026: el acceso a salas VIP no es gratuito, el titular Visa Platinum tiene 10 ingresos a US$ 10 cada uno por año calendario y desde el 11° paga US$ 38 por ingreso (se entra por la app Visa Airport Companion y los ingresos de las adicionales se descuentan de los 10 del titular). Lo que sí es sin costo son dos coberturas distintas y no acumulables entre sí: Universal Assistance hasta US$ 15.000 por persona en todo el mundo salvo Uruguay, para titular, cónyuge e hijos dependientes menores de 21 años, y AXA USA para emergencias médicas en viajes de hasta 60 días consecutivos, que exige haber comprado el pasaje con la Visa Platinum y generar el certificado antes de cada viaje.',
    feeNote:
      '1er año sin costo; luego UI 1.058/año, ≈ $U 7.020 con la UI del 17/8/2026 ($U 6,6350). Confirmado en el tarifario oficial vigente desde el 1/8/2026; se cobra en 3 cuotas en moneda nacional, IVA incluido. Requiere límite/crédito mínimo declarado $U 125.000.',
    pros: [
      '10 ingresos anuales a salas VIP a US$ 10 cada uno (tarifa preferencial, no acceso libre: desde el 11° son US$ 38)',
      'Universal Assistance sin costo hasta US$ 15.000 por persona para el titular y su familia (todo el mundo salvo Uruguay)',
      'Misma tasa 1 milla = US$1 y flexibilidad de canje de pasajes',
      'Bono de bienvenida de 3.500 millas',
    ],
    cons: [
      'Costo anual mayor (UI 1.058 ≈ $U 7.020) que la Internacional',
      'Recargo por compras en el exterior: 3% + IVA, más 3% adicional sobre el tipo de cambio de Visa Internacional',
      'Requiere ingreso/límite alto ($U 125.000)',
      'Millas vencen a los 5 años y sin valor de milla publicado',
      'Mismas exclusiones de acumulación (efectivo, intereses, redes de cobranza)',
    ],
    bestFor:
      'Cliente de ingresos medios-altos que viaja y valora la asistencia incluida y la sala VIP a tarifa preferencial, manteniendo la flexibilidad de canje de Volar.',
    note: 'Límite mínimo declarado $125.000 (Itaú aclara que si tu ingreso es mayor, el crédito otorgado será mayor); mismo mínimo que la Visa LATAM Pass Platinum. Costo desde el año 2: UI 1.058/año ≈ $U 7.020. Valor de la milla sin ratio oficial publicado.',
    scores: {
      acumulacion: 62,
      canje: 72,
      descuentos: 70,
      costo: 55,
      flexibilidad: 65,
      cobertura: 68,
    },
    rationale:
      'Misma mecanica de acumulacion y canje que Volar base, con beneficios de nivel Platinum que siguen valiendo (asistencia Universal Assistance sin costo hasta US$15.000). Baja descuentos de 75 a 70 tras verificar el tarifario: desde el 1/2/2026 la Platinum ya no tiene ingresos gratis a salas VIP, son 10 ingresos a US$10 y US$38 a partir del 11, o sea una tarifa preferencial y no un acceso incluido. El mayor costo anual (~$7.020) frente a la version base la deja practicamente empatada con Volar Internacional.',
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
      'Red de beneficios Itaú más el nivel Platinum, con dos precisiones. Salas VIP: no son gratis; desde el 1/2/2026 el titular tiene 10 ingresos a US$ 10 cada uno por año calendario y US$ 38 desde el 11°, y los ingresos de las adicionales se restan de los del titular. Y la Platinum NO tiene check-in preferente: en la tabla oficial de LATAM Pass esa fila lleva cruz para Platinum (solo la tiene el nivel Personal Bank, con acompañante). Lo que sí tiene: 3 tramos anuales de cortesía para postular a upgrade dentro de Sudamérica + 1 fuera de Sudamérica, 25% extra de acumulación en vuelos LATAM, 5% de descuento en Shopping LATAM Pass y asistencia al viajero.',
    feeNote:
      '1er año sin costo; luego UI 1.058/año, ≈ $U 7.020 con la UI del 17/8/2026, confirmado en el tarifario vigente desde el 1/8/2026. Límite/crédito mínimo declarado $U 125.000. Bono de bienvenida 3.500 millas. Primera adicional bonificada.',
    pros: [
      'Mejor tasa LATAM: 1 milla por US$1 (el doble que la Internacional)',
      '3 + 1 tramos anuales de cortesía para postular a upgrade de cabina y 25% extra de acumulación en vuelos LATAM',
      '5% de descuento en Shopping LATAM Pass y 1 punto calificable cada 2 millas sin tope, más 50% extra de puntos calificables sobre las millas acreditadas cada mes (los calificables son los que suben o mantienen categoría Elite; las millas solas no lo hacen)',
      'Millas directo a la cuenta LATAM Pass del socio',
      'Bono de bienvenida de 3.500 millas',
    ],
    cons: [
      'Para mantener los beneficios hay que acumular 15.625 millas en consumos entre el 1 de enero y el 31 de diciembre del año siguiente al de activación: a 1 milla por US$ 1, son US$ 15.625 de gasto anual solo para no perder el nivel que estás pagando',
      'Recargo por compras en el exterior: 3% + IVA, más 3% adicional sobre el tipo de cambio de Visa Internacional',
      'Costo anual mayor (UI 1.058 ≈ $U 7.020) y requisito de límite alto ($U 125.000)',
      'Millas atadas a LATAM/socios; menos flexible que Volar',
      'Vencimiento a 36 meses salvo renovación por actividad',
      'Mismas exclusiones (intereses, adelantos, casinos, tributos, reestructuras, préstamos)',
    ],
    bestFor:
      'Viajero LATAM de gasto alto (US$ 15.000+ al año) que quiere maximizar acumulación 1:1 y usar los tramos de cortesía de upgrade.',
    note: 'Variante premium de la afinidad LATAM Pass. LATAM Pass eliminó la categoría Elite Gold Plus: sus beneficios rigieron hasta el 31 de marzo de 2026 y desde el 1 de abril esos socios fueron reasignados según los Puntos Calificables acumulados en 2025.',
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
      'Red de beneficios Itaú más el nivel Mastercard Black, hoy publicado en el tarifario vigente desde el 1/8/2026: desde el 1/2/2026 el titular tiene 4 ingresos sin costo a salas VIP más 10 ingresos a US$ 10 cada uno por año calendario, y desde el 15° paga US$ 38 por ingreso; los ingresos de las adicionales se descuentan de los del titular. Además, en la línea Mastercard de Itaú la asistencia en viaje sin costo de Universal Assistance aplica exclusivamente a las tarjetas Black, titular y adicional.',
    feeNote:
      'UI 1.454/año, ≈ $U 9.647 con la UI del 17/8/2026 ($U 6,6350), confirmado en el tarifario oficial vigente desde el 1/8/2026. El primer año es sin costo también en la Black: el tarifario lo declara para todo tipo de tarjeta, aunque la ficha del producto no lo repita. Se cobra en 3 cuotas en moneda nacional, IVA incluido. Bono de bienvenida de 3.500 millas Itaú con la primera compra. Límite/crédito mínimo: a consultar.',
    pros: [
      'Nivel más alto de la gama Volar (Mastercard Black)',
      '4 ingresos anuales sin costo a salas VIP (el único nivel Itaú que conserva accesos gratis) más 10 a US$ 10',
      'Universal Assistance sin costo, exclusiva de la línea Black, para titular y adicional',
      'Misma flexibilidad de canje de pasajes en cualquier aerolínea',
      'Bono de bienvenida de 3.500 millas',
    ],
    cons: [
      'Costo anual más alto de la gama (UI 1.454 ≈ $U 9.647)',
      'Recargo por compras en el exterior: 3% + IVA en toda la línea de crédito de Itaú',
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
      'Beneficios premium de nivel Black ahora confirmados en el tarifario del 1/8/2026: es el unico nivel Itau que conserva ingresos gratis a salas VIP (4 al ano) y el unico de la linea Mastercard con Universal Assistance sin costo. El costo anual mas alto de la gama (UI 1.454 = $U 9.647, no los $9.000 que decia la conversion vieja) sigue castigando el overall, y la tasa diferenciada para el tramo Black no se detalla en la ficha (asumida igual a Volar), lo que reduce cobertura.',
    verified: true,
  },
  {
    id: 'scotia-puntos-american-express',
    name: 'Tarjeta Scotia Puntos American Express (Gold / Platinum)',
    issuer: 'Scotiabank Uruguay',
    issuerType: 'banco',
    networks: ['amex'],
    pointsProgramName:
      'Scotia Puntos (la línea Amex Internacional/Centurión acumula en Membership Rewards, programa vigente y separado)',
    earnRateNote:
      'Cuidado con la unidad: la Amex Gold acumula un punto por cada dólar (o su equivalente en pesos uruguayos) consumido en Uruguay y en el exterior, dentro de Membership Rewards. La tabla oficial del programa Scotia Puntos lista únicamente Visa Internacional, Mastercard Internacional, Visa Platinum y Visa Infinite: no incluye ninguna American Express, así que atribuirle a la línea Amex el 1 punto cada $U 100 de Scotia Puntos no tiene respaldo. Los adelantos en efectivo no acumulan.',
    pointValueNote:
      'En Scotia Puntos, 1 punto = $U 1. En Membership Rewards, el valor del punto en canjes de viajes o experiencias no está publicado por el emisor: revisadas las fichas de Scotia Puntos American Express, Amex Internacional, Amex Gold, Amex Metal y la página de programas de premios, ninguna publica equivalencia ni tabla de conversión.',
    redemptionNote:
      'Conviven dos esquemas distintos y conviene no mezclarlos: las Amex de la línea Internacional/Centurión acumulan en Membership Rewards, el programa global de American Express, que sigue vigente, separado y con puntos que no vencen; la línea Scotia Puntos American Express acumula en Scotia Puntos (1 punto = $U 1, canje por App). En la Amex Internacional el cliente elige al contratar entre Membership Rewards y ConnectMiles.',
    discountNote:
      'Beneficios de viaje más que descuentos de góndola, pero con topes: acceso a Sala VIP del Aeropuerto de Carrasco con máximo de 3 ingresos anuales por titular y por adicional en las Gold (no acumulables; desde el cuarto se paga un precio preferencial), y acceso vía Priority Pass en las Platinum con 10 ingresos anuales para el titular y 5 para el adicional. Ambas suman 12 accesos anuales de 72 horas al parking del Aeropuerto de Carrasco. Seguro de accidentes en viaje de hasta US$ 75.000 para socios Gold según la ficha de Scotia Puntos American Express (la ficha de la Amex Gold de Membership Rewards declara US$ 300.000: el monto depende de la línea, no hay una cifra única), asistencia en viaje 24/7 hasta US$ 12.000, adicionales sin cargo y Express Cash en sucursales y cajeros Banred. Compras en el exterior con recargo 0% (Platinum) o 1,5% (Oro) + IVA según el tarifario vigente.',
    feeNote:
      'Tarifario oficial vigente (Cartilla F.2540, 20/03/2026): emisión sin costo, primer año sin costo y adicionales sin costo. Cargo anual obligatorio con IVA, en Unidades Indexadas: American Express Blue Box Internacional UI 1.000 (≈ $U 6.635), Gold UI 1.250 (≈ $U 8.294) y Platinum UI 1.600 (≈ $U 10.616); American Express Centurión Green UI 1.000, Internacional/Gold UI 1.250 y Platinum UI 2.100 (≈ $U 13.934). La referencia de mercado de "~US$ 120/año" no corresponde a ninguna categoría y además estaba mal denominada: el cargo está en UI, no en dólares. Conversión con la UI del 17/8/2026 ($U 6,6350).',
    pros: [
      'Orientada a viajero: Sala VIP Carrasco, seguros y asistencia de viaje robustos, más 12 accesos anuales al parking del Aeropuerto de Carrasco.',
      'Compras en el exterior con recargo escalonado según el tarifario vigente: 0% en American Express Platinum, 1,5% en American Express Oro y 3% en las Internacionales, siempre + IVA. La ficha comercial dice "sin recargo", pero el tarifario del 20/03/2026 manda.',
      'Los puntos Membership Rewards no vencen, a diferencia de los 36 meses de Scotia Puntos.',
      'Adicionales sin costo.',
    ],
    cons: [
      'Red American Express: menor aceptación que Visa/Mastercard en comercios chicos de Uruguay.',
      'El "sin recargo en el exterior" dejó de ser general el 1 de octubre de 2025: Amex Internacional pasó a 3% + IVA y Amex Oro a 1,5% + IVA; el 0% quedó para The Platinum Card y ConnectMiles Platinum.',
      'Las salas VIP tienen tope: 3 ingresos anuales en Gold (después, precio preferencial) y 10 en Platinum.',
      'Adelantos en efectivo no generan puntos.',
      'Valor del punto Membership Rewards en viajes/experiencias no publicado por el emisor.',
      'Costo anual en Unidades Indexadas (indexado a la inflación en pesos, no al dólar): Blue Box Internacional UI 1.000 (≈ $U 6.635), Gold UI 1.250 (≈ $U 8.294), Platinum UI 1.600 (≈ $U 10.616); Centurión Platinum llega a UI 2.100 (≈ $U 13.934).',
    ],
    bestFor:
      'Viajeros frecuentes clientes de Scotiabank que valoran Sala VIP y seguros de viaje, y que usan otra tarjeta Visa/MC para el día a día local. Para el exterior sin recargo, hoy hay que ir a la gama Platinum.',
    note: 'Corrección de la revisión anterior: "Green" no pertenece a esta línea sino a la Amex Internacional (The Green Card con Membership Rewards), que acumula en Membership Rewards o ConnectMiles y paga 3% + IVA en el exterior. Y Membership Rewards no es un programa "histórico integrado a Scotia Puntos": es uno de los cuatro programas activos que Scotiabank Uruguay lista hoy, con 1 punto por cada US$ 1 y puntos que no vencen.',
    scores: {
      acumulacion: 62,
      canje: 58,
      descuentos: 64,
      costo: 48,
      flexibilidad: 68,
      cobertura: 60,
    },
    rationale:
      'Fuerte en beneficios de viaje (Sala VIP Carrasco, seguros, asistencia 24/7, parking de Carrasco) y sube flexibilidad al confirmarse que los puntos Membership Rewards no vencen, contra los 36 meses de Scotia Puntos. Bajan descuentos y costo por dos hallazgos con fuente oficial: el "sin recargo en el exterior" dejo de ser general el 1/10/2025 (hoy 3% en Internacional y 1,5% en Oro, 0% solo en Platinum) y el cargo anual real del tarifario va de UI 1.000 a UI 2.100 ($U 6.635 a $U 13.934), muy por encima de la referencia de ~US$120 que se usaba antes. El valor del punto Membership Rewards en viajes sigue sin publicarse.',
    verified: true,
  },
  {
    id: 'scotia-connectmiles',
    name: 'Copa ConnectMiles American Express (Clásica / Gold / Platinum)',
    issuer: 'Scotiabank Uruguay',
    issuerType: 'banco',
    networks: ['amex'],
    pointsProgramName: 'Copa ConnectMiles (programa de viajero frecuente de Copa Airlines)',
    earnRateNote:
      'Una milla ConnectMiles por cada US$ 1 consumido, igual en los tres niveles de la línea (Clásica, Gold y Platinum). Es la misma tasa que las tarjetas LATAM Pass Platinum de Itaú y el doble que la LATAM Pass Internacional.',
    pointValueNote:
      'Scotiabank no publica el valor de la milla ConnectMiles en canjes: depende de la tarifa del vuelo que canjees en el programa de Copa. Sin ratio oficial, el retorno real no se puede calcular.',
    redemptionNote:
      'Las millas se acreditan en la cuenta ConnectMiles del socio y se canjean dentro del programa de Copa Airlines (vuelos de Copa y de la red Star Alliance, upgrades). No hay catálogo de productos.',
    discountNote:
      'Beneficios escalonados por nivel: Clásica, descuentos desde 15% en más de 300 comercios y recargo de 3% + IVA en el exterior; Gold, descuentos desde 25% y recargo de 1,5% + IVA; Platinum, descuentos desde 25%, 0% de recargo en compras en el exterior, 5 ingresos anuales a salas VIP por Priority Pass y acceso al status PreferMember Silver por US$ 60 anuales. Bonos de lanzamiento por consumo: 2.000 millas gastando US$ 1.500 en 4 meses (Clásica), 3.500 por US$ 2.000 (Gold) y 7.000 por US$ 3.000 (Platinum).',
    feeNote:
      'Primer año bonificado y adicionales sin costo. El cargo anual sigue la tabla American Express del tarifario de Scotiabank (Cartilla F.2540, 20/03/2026), en Unidades Indexadas: UI 1.000 (≈ $U 6.635), UI 1.250 (≈ $U 8.294) o UI 2.100 (≈ $U 13.934) según categoría. Ingreso mínimo declarado: $U 30.000 (Clásica), $U 50.000 (Gold) y $U 100.000 (Platinum).',
    pros: [
      'Tasa clara y de las mejores del mercado local: 1 milla por cada US$ 1, en los tres niveles',
      'Única alternativa local de millas de aerolínea fuera de LATAM Pass',
      'La Platinum no cobra recargo por compras en el exterior, algo raro en plaza',
      'Bonos de lanzamiento por consumo de 2.000 a 7.000 millas',
    ],
    cons: [
      'El valor de la milla ConnectMiles no está publicado: sabés cuántas millas ganás, no cuánto valen',
      'Las millas solo sirven dentro del ecosistema Copa / Star Alliance: sin canje por productos',
      'Recargo de 3% + IVA en el exterior en la Clásica y 1,5% en la Gold; el 0% es solo Platinum',
      'Red American Express: menor aceptación que Visa/Mastercard en comercios chicos',
      'Ingreso mínimo alto en las categorías que traen los beneficios buenos ($U 50.000 y $U 100.000)',
    ],
    bestFor:
      'Quien vuela seguido por Copa o Star Alliance y quiere concentrar millas ahí en lugar de LATAM, y —en la Platinum— comprar en el exterior sin recargo.',
    note: 'Programa ausente del ranking hasta esta revisión, pese a estar plenamente vigente: Scotiabank Uruguay lo lista entre sus cuatro programas de premios activos. Tasa, niveles, recargos, bonos e ingresos mínimos confirmados en el sitio del emisor el 17/8/2026.',
    scores: {
      acumulacion: 62,
      canje: 55,
      descuentos: 68,
      costo: 48,
      flexibilidad: 52,
      cobertura: 58,
    },
    rationale:
      'Entra al ranking en esta revision. Acumulacion confirmada y competitiva (1 milla por US$1, el doble que la LATAM Pass Internacional de Itau) y beneficios reales en la gama alta: 0% de recargo en el exterior y salas VIP en la Platinum. Puntua bajo en canje y flexibilidad porque las millas solo sirven dentro de Copa/Star Alliance y el emisor no publica cuanto vale la milla, y bajo en costo porque el cargo anual va de UI 1.000 a UI 2.100 ($U 6.635 a $U 13.934) y el 0% en el exterior exige el nivel mas caro.',
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
      'Red de beneficios Itaú (farmacias, restaurantes, supermercados, moda, espectáculos) más lo que efectivamente trae este nivel de LATAM Pass, que es menos de lo que suele creerse: 1 punto calificable cada 2 millas sin tope, 50% extra de puntos calificables sobre las millas acreditadas cada mes, prioridad de postulación a upgrade (no tramos de cortesía), renovación de la vigencia de las millas acumulando 5.000 al año y 5% de descuento en Shopping LATAM Pass. En la tabla oficial de LATAM Pass Uruguay, la columna Internacional lleva cruz en check-in preferente, tramos de cortesía de upgrade dentro y fuera de Sudamérica, selección anticipada de asiento, equipaje prioritario, equipaje adicional de 23 kg, acceso a Lounge Visa y 25% extra de acumulación.',
    feeNote:
      '1er año sin costo; luego UI 864/año, ≈ $U 5.733 con la UI del 17/8/2026, confirmado en el tarifario vigente desde el 1/8/2026. Ingreso mínimo declarado ~$26.000. Bono de bienvenida 2.500 millas. Primera adicional bonificada.',
    pros: [
      'Millas se integran directo a la cuenta LATAM Pass del socio',
      'Bono de bienvenida de 2.500 millas con la primera compra',
      '5% de descuento en Shopping LATAM Pass y 1 punto calificable cada 2 millas sin tope, más 50% extra de puntos calificables sobre las millas acreditadas cada mes',
      'Costo anual accesible (UI 864 ≈ $U 5.733) y primera adicional bonificada',
    ],
    cons: [
      'Tasa baja: solo 1 milla cada US$2 (mitad que la Volar crédito)',
      'No trae los beneficios de viaje que se le suelen atribuir: sin check-in preferente, sin tramos de cortesía de upgrade, sin selección anticipada de asiento, sin equipaje prioritario y sin acceso a Lounge Visa',
      'Recargo por compras en el exterior: 3% + IVA, más 3% adicional sobre el tipo de cambio de Visa Internacional',
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
      descuentos: 58,
      costo: 65,
      flexibilidad: 70,
      cobertura: 70,
    },
    rationale:
      'Acumulacion confirmada pero baja (1 milla cada US$2, ~0,5-0,75% de retorno estimado), la mas floja entre las tarjetas de millas Itau. Baja descuentos de 68 a 58 tras leer la tabla oficial de LATAM Pass columna por columna: este nivel NO tiene check-in preferente, tramos de cortesia de upgrade, seleccion de asiento, equipaje prioritario ni Lounge Visa, beneficios que la ficha anterior le atribuia. Le quedan la red Itau, el 5% de Shopping LATAM Pass y los puntos calificables. Costo moderado (1er ano gratis, luego ~$5.733) y bono de 2.500 millas.',
    verified: true,
  },
  {
    id: 'oca-oca-blue',
    name: 'OCA — Programa Metraje (Metros)',
    issuer: 'OCA S.A. (Grupo Itaú Unibanco); OCA Blue emitida por OCA Dinero Electrónico S.A.',
    issuerType: 'emisor_no_bancario',
    networks: ['mastercard', 'visa'],
    pointsProgramName: 'Metros (programa de puntos OCA) + amplia red de descuentos',
    earnRateNote:
      'OCA Blue: 1 Metro cada $U 104 de consumo (cartilla oficial vigente desde el 01/10/2025). Cruzado con el valor de canje real de $U 0,20 por Metro, el retorno de OCA Blue es ≈ 0,19% del gasto, el más bajo del set. Para la tarjeta de crédito OCA la tasa por peso sigue sin publicarse (la cartilla de crédito vigente desde el 04/08/2026 no menciona el Metraje) y varía con campañas x2/x3. No acumulan Metros los pagos, los retiros en efectivo, los costos de tarjetas, los préstamos amortizables ni las refinanciaciones; con OCA VISA, además, solo acumulan los consumos locales, no las compras en el exterior.',
    pointValueNote:
      'El valor de canje real es $U 0,20 por Metro. Sale de la propia tabla de vales de combustible del Metraje: $U 500 por 2.500 Metros, $U 1.500 por 7.500 Metros y $U 1.000 de gasoil por 5.000 Metros — las tres relaciones dan exactamente $U 0,20. Cuidado con el "Valor del metro" del tarifario ($U 52 / US$ 1,30 desde el 04/08/2026; era $U 37 / US$ 1,5 en el tarifario de 2019, que es de donde salía la cifra que publicábamos antes): esa cifra es una referencia tarifaria, una tasa de sustitución de Metros faltantes por dinero, NO lo que el Metro rinde al canjear. Combinarla con la tasa de acumulación daría un retorno del 50%, que es absurdo.',
    redemptionNote:
      'Metros canjeables por vales de combustible Nafta Súper 95, Premium 97 o Gasoil en estaciones DISA de todo el país, garrafas y recargas Riogas, recarga de saldo de celular, entradas Movie en modalidad dinero + Metros (2D $U 260 + 360 Metros) y viajes vía Hiperviajes. El canje exige estar al día con todos los productos de OCA. Corrección importante: OCA Blue también acumula y canjea Metros (la cartilla le fija tasa propia, 1 Metro cada $U 104); no es una tarjeta de "solo descuentos".',
    discountNote:
      'Amplísima red: 20% los viernes con crédito + 12 cuotas todos los días, con tope de $U 5.500 por cuenta y por mes en comercios adheridos, según la página de beneficios de OCA (vigencia declarada del 1/6/2026 al 31/5/2027). Tres condiciones que cambian el cálculo: el +5% extra pagando con OCA App, Apple Pay o Google Pay tiene tope propio de $U 500 por mes, compartido entre todas las promociones activas de OCA App; las 12 cuotas son exclusivas de Mastercard; y la promo no aplica a compras hechas vía Mercado Pago ni es acumulable con otros descuentos. Además, 10% diario en comercios seleccionados y descuentos de 10%-30% en gastronomía, moda, electrónica y educación.',
    feeNote:
      'Tarifario oficial vigente desde el 04/08/2026: servicio de la tarjeta OCA UI 130 por trimestre con IVA (UI 520 al año, ≈ $U 3.450 con la UI del 17/8/2026), adicional cónyuge sin costo, Visa Internacional UI 130 por trimestre y Visa Oro UI 162,50 por trimestre (≈ $U 4.313 al año). Comisión por uso de la tarjeta en el exterior 2,44% con IVA. Financiación de saldos: 63% TEA en pesos y 12% en dólares (+ IVA); mora 72%. OCA Blue: $0 en tarjeta titular, adicional, mantenimiento de cuenta, comisión por bajo promedio y reposición hasta la 2ª, pero cobra 0,35% + IVA sobre el monto de la factura por pagos en redes de cobranza, y tiene topes diarios de $U 20.000 / US$ 500 en compras locales e internacionales y $U 20.000 / US$ 520 en retiros.',
    pros: [
      'La red de descuentos en comercio físico más amplia del mercado local',
      '20% los viernes + 12 cuotas es de las promos más agresivas de Uruguay',
      'Los Metros no vencen y son transferibles entre las tarjetas OCA, OCA Blue y OCA VISA del mismo titular',
      'Canje concreto y útil: vales de combustible en estaciones DISA, garrafas Riogas, recarga de celular, cine y viajes',
      'Extra 5% con billetera digital; emisor no bancario muy extendido',
    ],
    cons: [
      'El Metro rinde poquísimo: con la única tasa publicada (OCA Blue, 1 Metro cada $U 104) y el canje real de $U 0,20 por Metro, el retorno es ≈ 0,19% del gasto, un quinto del ~1% de los programas bancarios',
      'La tasa de acumulación de la tarjeta de crédito OCA no se publica y varía por campañas x2/x3',
      'Sin cashback líquido: el beneficio es descuento condicionado a días/comercios y con topes ($U 5.500 al mes, y $U 500 el extra de la app)',
      'El +5% de la app, las 12 cuotas (solo Mastercard) y la exclusión de compras vía Mercado Pago achican la promo estrella',
    ],
    bestFor:
      'Quien compra mucho en comercio físico local y organiza sus compras para los días de mayor descuento (viernes 20%). Por los Metros, no vale la pena: el valor está en el descuento.',
    note: 'Los Metros no tienen vencimiento. Solo caducan de forma anticipada por mora superior a 60 días corridos, fallecimiento del titular, tarjeta OCA/OCA VISA inactiva durante 24 meses o devolución de la tarjeta (en OCA Blue, la única causal es el fallecimiento). Esto desmiente la versión de prensa de que "vencen a los 24 meses": los 24 meses son de inactividad de la tarjeta, no de vida del punto. Titularidad: OCA S.A. es propiedad de Itaú Unibanco desde 2007; OCA Blue no la emite OCA S.A. sino OCA Dinero Electrónico S.A., empresa independiente, ambas reguladas por el BCU.',
    scores: {
      acumulacion: 30,
      canje: 58,
      descuentos: 86,
      costo: 62,
      flexibilidad: 62,
      cobertura: 55,
    },
    rationale:
      'La correccion mas grande de esta revision. El ranking valuaba el Metro en $U37 tomando el "Valor del metro" del tarifario, que es una referencia tarifaria y no el valor de canje: las tres relaciones de vales de combustible que publica el propio Metraje ($U500 por 2.500 Metros y equivalentes) dan $U 0,20 por Metro. Con la unica tasa publicada (OCA Blue, 1 Metro cada $U104) el retorno real es ~0,19%, asi que acumulacion baja de 45 a 30. Sube flexibilidad de 52 a 62 porque los Metros no vencen y son transferibles entre las tarjetas del titular, mejor que casi todo el set. La red de descuentos sigue siendo su verdadero producto.',
    verified: true,
  },
  {
    id: 'scotia-club-card-tienda-inglesa',
    name: 'Club Card (co-brand Tienda Inglesa)',
    issuer: 'Scotiabank Uruguay',
    issuerType: 'banco',
    networks: ['visa', 'mastercard', 'amex'],
    pointsProgramName: 'Club Card (Tienda Inglesa), emitida por Scotiabank',
    earnRateNote:
      'Cada $900 en compras dentro de Tienda Inglesa generás 15 puntos, que se duplican a 30 pagando con Club Card ("puntos dobles"); 1 punto = $1 dentro de Tienda Inglesa (retorno efectivo ~3,33%).',
    pointValueNote:
      'Scotiabank publica que "cada punto generado vale por $1 en compras dentro de Tienda Inglesa" y que todas las compras en la cadena generan puntos dobles todos los días. Las bases de Tienda Inglesa (vigentes desde el 1/1/2026) precisan la mecánica: base de 15 Puntos cada $U 900 y el doble pagando con tarjeta Club Card de Scotiabank, o sea 30 Puntos cada $U 900 (~3,33% de retorno). Precisión importante: es el punto del programa de Tienda Inglesa y vale $U 1 DENTRO de Tienda Inglesa, no es la bolsa genérica de Scotia Puntos.',
    redemptionNote:
      'El canje se rige por las bases del Programa Puntos de Tienda Inglesa vigentes desde el 1/1/2026: mínimo 150 Puntos, canjeables total o parcialmente por cualquier producto excepto cigarros y servicios, en los locales del grupo. No es un catálogo cerrado ni una bolsa Scotia Puntos: se descuenta contra la compra del súper.',
    discountNote:
      'Beneficio central: acumulación acelerada (puntos dobles) dentro de Tienda Inglesa. Recorte del año: desde el 01/01/2026 las compras fuera de Tienda Inglesa con Club Card ya no acumulan puntos, así que el beneficio quedó encerrado en la cadena.',
    feeNote:
      'Scotiabank publica que la tarjeta es gratis el primer año. El costo a partir del segundo año no está publicado en la web (ni en la ficha de Club Card ni en la de Club Card American Express): hay que pedir el tarifario.',
    pros: [
      'Puntos dobles en Tienda Inglesa todos los días para clientes fieles a esa cadena (~3,33% de retorno).',
      'El punto vale $U 1 y se descuenta contra la compra del súper, sin catálogo intermedio.',
      'Disponible en Visa (Infinite, Platinum e Internacional), Mastercard Internacional y American Express Internacional.',
      'Gratis el primer año.',
    ],
    cons: [
      'Beneficio muy concentrado en un solo retailer (Tienda Inglesa).',
      'Desde el 01/01/2026 las compras fuera de Tienda Inglesa no acumulan puntos.',
      'El costo anual a partir del segundo año no está publicado; el primero es gratis.',
      'Poco atractivo si no comprás regularmente en Tienda Inglesa.',
    ],
    bestFor:
      'Clientes de Scotiabank que hacen buena parte de sus compras de supermercado en Tienda Inglesa y quieren maximizar la acumulación en esa cadena.',
    note: 'Con documento uruguayo los puntos vencen a los 6 meses, renovables con cada acumulación; con documento extranjero, 24 meses sin renovación. Desde el 01/01/2026 no se acumulan puntos por compras fuera de Tienda Inglesa. Gratis el primer año; costo desde el 2º año no publicado.',
    scores: {
      acumulacion: 78,
      canje: 70,
      descuentos: 52,
      costo: 55,
      flexibilidad: 58,
      cobertura: 55,
    },
    rationale:
      'Ventaja concreta y ahora confirmada en fuente oficial: 15 Puntos cada $U900 en Tienda Inglesa que se duplican a 30 pagando con Club Card (~3,33% de retorno), con el punto valiendo $U1 dentro de la cadena y descontandose directo de la compra. Sube acumulacion y canje respecto de la revision anterior, que castigaba con "la mecanica exacta del doble no esta publicada" cuando ya lo esta. Baja por el corte del 01/01/2026 (fuera de Tienda Inglesa no acumula), la concentracion en un solo retailer y el costo del segundo ano, que sigue sin publicarse.',
    verified: true,
  },
  {
    id: 'pronto-visa',
    name: 'Pronto! — Tarjeta Visa Pronto+ (puntos + beneficios)',
    issuer: 'Pronto! (Scotiabank Uruguay)',
    issuerType: 'emisor_no_bancario',
    networks: ['visa'],
    pointsProgramName: 'Pronto Premios (con Alerta de Compra Gratis de Visa como beneficio aparte)',
    earnRateNote:
      'Tasa confirmada en el sitio oficial de Pronto!: 1 punto cada $30 de compra, con 1.000 puntos de bienvenida al solicitar la Pronto+. El programa se llama Pronto Premios y tiene sitio propio (prontopremios.com.uy).',
    pointValueNote:
      'La equivalencia del punto en pesos no se publica, y tampoco el vencimiento de los puntos: sabés cuántos puntos ganás, no cuánto valen. El atractivo principal sigue siendo la red de descuentos.',
    redemptionNote:
      'El catálogo es público: en prontopremios.com.uy los puntos se canjean por electrodomésticos, hogar, moda, artículos infantiles, entretenimiento y tecnología, más vales de recarga de celular y de Mercado Libre. Aparte del programa, la "Alerta de Compra Gratis" de Visa puede bonificar una compra.',
    discountNote:
      "Red de descuentos muy amplia: p. ej. 25% McDonald's, 50% Grido, 50% cines, 25% Colonia Express; hasta 35% hospedajes, hasta 50% gastronomía, hasta 60% entretenimiento; 15% fijo en confiterías, jugueterías y pizzerías del país.",
    feeNote:
      'Los costos están publicados en los términos y condiciones oficiales (vigencia agosto 2026) y el "primer año gratis" NO es general: depende de la cartera que te asignen. Cargo anual: cartera 259 $ 1.308 + IVA ya desde el primer año; cartera 52 $ 3.468 + IVA; carteras 299 y 312 $ 5.148 + IVA; cartera 313 $ 0 el primer año y $ 1.308 + IVA después; cartera 201 $ 0 el primer año y $ 2.970 + IVA después. Adicional: entre $ 594 y $ 1.485 + IVA al año. Envío de estado de cuenta 10 UI + IVA por mes; denuncia y reposición 90 UI + IVA. La comisión del 3% por compra internacional existe: lo que Pronto! ofrece es bonificarla, y solo en su lista de "servicios favoritos" (compras, reservas o suscripciones adheridas), no en todo consumo en el exterior.',
    pros: [
      'Red de descuentos muy fuerte y variada (comida rápida, cines, viajes)',
      'Se solicita solo con cédula, sin recibo de sueldo ni cuenta bancaria',
      'Tasa publicada y de las más densas del mercado: 1 punto cada $30, más 1.000 puntos de bienvenida',
      'Catálogo de canje público (electrodomésticos, tecnología, vales de Mercado Libre y recarga de celular)',
      'Bonificación del 3% de comisión internacional en los "servicios favoritos" adheridos',
    ],
    cons: [
      'No se publica ni la equivalencia del punto en pesos ni el vencimiento de los puntos',
      'El "primer año gratis" depende de la cartera: hay carteras que pagan $ 1.308 + IVA desde el año uno y otras $ 5.148 + IVA',
      'La bonificación del 3% internacional aplica solo a los servicios adheridos, no a toda compra en el exterior',
      'Requisitos laxos suelen ir de la mano de tasas de financiación altas (verificar recargos)',
    ],
    bestFor:
      'Personas sin cuenta bancaria o sin historial crediticio (jóvenes, primer plástico) que quieren descuentos amplios de consumo cotidiano.',
    note: 'Reverificado el 17/8/2026: tasa (1 punto cada $30), bono de bienvenida, catálogo de canje y tarifario salen del sitio del emisor y de sus términos y condiciones con vigencia agosto 2026, no de comparadores comerciales. Existe además un nivel superior, Visa Pronto+ Premium, que acumula igual y suma el 3% de ahorro en servicios favoritos y beneficios en el exterior, pero no publica costo ni requisitos.',
    scores: {
      acumulacion: 58,
      canje: 58,
      descuentos: 85,
      costo: 58,
      flexibilidad: 50,
      cobertura: 48,
    },
    rationale:
      "Red de descuentos muy amplia y agresiva (25% McDonald's, 50% Grido/cines, hasta 50% gastronomia, hasta 60% entretenimiento). Suben acumulacion y canje respecto de la revision anterior porque desaparecio el motivo del castigo: la tasa de 1 punto cada $30 y el catalogo ya estan publicados por el emisor, no en comparadores. Baja costo de 68 a 58 al aparecer el tarifario: el primer ano gratis no es universal y hay carteras que pagan hasta $5.148 + IVA al ano. Sigue sin publicarse cuanto vale el punto en pesos.",
    verified: true,
  },
  {
    id: 'mas-grupo-disco-sumaclub',
    name: 'Programa Más (Grupo Disco–Devoto–Géant–Fresh Market) + tarjeta Hipermás Santander',
    issuer:
      'Grupo Disco (Devoto, Disco, Géant, Fresh Market); programa de puntos gestionado con Santander (tarjeta Hipermás)',
    issuerType: 'retail',
    networks: ['otro'],
    pointsProgramName: 'Programa Más (puntos del supermercado) / SumaClub (variante Santander)',
    earnRateNote:
      'Consumos DENTRO de Devoto/Disco/Devoto Express/Géant/Fresh Market: 2 puntos cada $420. Consumos FUERA de esas cadenas (con tarjeta Hipermás Santander): 1 punto cada $650. Tasas publicadas en la página oficial del producto en santander.com.uy. Se generan pagando con efectivo, débito, cheque, gift card o con las tarjetas de crédito Visa/Mastercard Hipermás Santander. Matiz del reglamento del supermercado: los puntos se generan "en relación al monto de compra y el valor del punto vigente", o sea que el $420 no está fijado en el reglamento y Supermercados Disco S.A. puede modificarlo publicándolo en sus sitios; además, las compras que no llegan al valor del punto igual generan un punto, hasta 3 veces por día, por local y por socio.',
    pointValueNote:
      'Valor del punto no publicado como cifra fija; se materializa en el catálogo de regalos canjeable en los supermercados. No confirmado.',
    redemptionNote:
      'Canje de puntos por productos y servicios del catálogo de regalos de Disco, Devoto, Géant y Fresh Market; las redenciones se realizan en los locales del grupo.',
    discountNote:
      'Beneficios y descuentos del ecosistema del supermercado; la variante con tarjeta Hipermás Santander suma descuentos del banco (moda, cines, heladerías, gastronomía, +200 marcas) y primer año sin costo.',
    feeNote:
      'El programa Más de acumulación en el súper es gratuito (adhesión con documento). La tarjeta de crédito Hipermás Santander tiene primer año gratis y tarjetas adicionales sin costo; para los años siguientes la propia página del producto remite al manual de tarifas sin publicar la cifra, así que el costo posterior sigue sin ser público — pero eso ahora lo dice el banco, no es una inferencia nuestra.',
    pros: [
      'Acumulación clara y diferenciada (2 pts/$420 dentro, 1 pt/$650 fuera)',
      'Se acumula pagando en efectivo, débito, cheque, gift card o con las tarjetas de crédito Hipermás Santander, no solo con la tarjeta',
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
    note: 'Tasas 2 puntos cada $420 (dentro de las cadenas) y 1 punto cada $650 (fuera, con Hipermás Santander) publicadas en la página oficial del producto en santander.com.uy, no en prensa. Aclaración de nombre: "SumaClub" fue el viejo programa de puntos de Santander (los "billetes"), discontinuado y reemplazado por Soy Santander en 2021; la página oficial de la Hipermás no lo menciona y llama al beneficio simplemente "Programa de fidelidad". El nombre correcto hoy es Programa Más del lado del supermercado y tarjeta Hipermás Santander del lado bancario; SumaClub queda solo como alias histórico. El cambio de control del Grupo Disco (Grupo Calleja, enero 2024) no alteró marcas ni esquema de puntos. Sigue sin publicarse el valor monetario del punto: por eso la ficha queda sin verificar.',
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
      'Canje por productos del catálogo desde la app o la web, con envío a domicilio. El canje por SMS enviando CANJE al 4242 y la marca "ShopCreditel" figuraban en comunicaciones de Creditel de 2021-2023 pero ya no aparecen en el sitio oficial: tomarlos como canal histórico, no confirmado hoy.',
    discountNote:
      'Fuerte foco en descuentos: hasta 20% de descuento todos los días en distintos rubros y promociones/cuotas sin recargo. Primer año de tarjeta internacional bonificado según campaña.',
    feeNote:
      'Costo de emisión/mantenimiento no confirmado en las fuentes consultadas; frecuentes promos de bonificación el primer año.',
    pros: [
      'Regla de acumulación clara y simple ($25 = 1 Credipunto)',
      'Canje online desde la app o la web, con envío a domicilio',
      'Descuentos diarios de hasta 20% competitivos',
      'Respaldo de Grupo Santander',
    ],
    cons: [
      'El valor real del punto en el canje no es transparente: la propia página tiene un acordeón titulado "¿Cuál es su valor?" cuya respuesta no llega a servirse',
      'Es el único emisor de su segmento que no publica cartilla ni tarifario descargable, pese a que la normativa BCU exige cartilla',
      'El programa está más orientado a descuentos que a la acumulación como generador de valor',
    ],
    bestFor:
      'Usuario que prioriza descuentos diarios inmediatos y una mecánica de puntos simple, sin depender de un banco.',
    note: 'Acumulación $25 = 1 Credipunto confirmada en el sitio oficial. Sigue sin publicarse el valor monetario del Credipunto y el costo de la tarjeta: la sección Documentación del sitio no expone PDFs y la respuesta del acordeón "¿Cuál es su valor?" se carga por JavaScript desde el back-office y no se sirve. El ~101,9% TEA en pesos que dan los comparadores de plaza es fuente secundaria sin respaldo del emisor, así que no se publica. Reverificado el 17/8/2026.',
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
    issuer: 'Pass Card S.A.',
    issuerType: 'emisor_no_bancario',
    networks: ['otro'],
    pointsProgramName: 'Puntos Pass',
    earnRateNote:
      '1 Punto Pass por cada $100 de consumo con la tarjeta; al canjear, 1 punto = $1 del valor del producto. Ambas cifras están en las bases oficiales de la Tienda Passcard: es de los programas más transparentes del segmento no bancario.',
    pointValueNote: '1 punto = $1 (canje en la Tienda Passcard)',
    redemptionNote:
      'Canje por productos en la Tienda Passcard, con 1 punto = $1 del valor del producto. El tope es el 50% del valor del producto: hay que contar con disponible en la tarjeta Passcard por al menos la otra mitad, que se abona únicamente con Passcard. Los puntos vencen a los 12 meses corridos desde su acreditación, no son transferibles a otra persona ni a otra cuenta, no se canjean por efectivo y los adicionales no pueden canjear, aunque el titular sí acumula por los consumos de sus adicionales.',
    discountNote:
      'Descuentos diarios por rubro, con bases vigentes desde el 31 de enero de 2026 y válidas hasta diciembre de 2027: lunes librerías, martes peluquerías, miércoles gastronomía, jueves transporte de pasajeros y viernes cine, teatros y red ticket (excluida la categoría Deportes), en todos los casos 25% con Passcard Clásica y Like y 30% con Passcard Black y Experta, con tope de reintegro de $U 400 por cierre. Sábados heladerías 50% con tope $U 400 y domingos telepeaje 50% con tope $U 200. Cuatro versiones: Clásica, Like (18–29, estudiantes), Black y Experta (60+).',
    feeNote:
      'Primer año sin costo. Después, la cartilla oficial de Pass Card S.A. fija un "Costo anual Grupo de Afinidad" de $U 78,58 + IVA con periodicidad MENSUAL y carácter obligatorio (≈ $U 95,9 por mes con IVA, ≈ $U 1.150 al año). Tarjetas adicionales sin costo. Otros cargos obligatorios: retiro en efectivo $U 24 + IVA por retiro, pago de servicios en redes de cobranza $U 24 + IVA por transacción y seguro sobre saldo de 6 por mil mensual; el envío del estado de cuenta ($U 41 con IVA) es opcional. Financiación: 113% TEA y mora 128% TEA.',
    pros: [
      'Descuentos diarios muy marcados (25%-30% de lunes a viernes, 50% sábados y domingos)',
      'Tasa y valor del punto publicados en las bases: 1 punto cada $100 y 1 punto = $1',
      'Se obtiene y opera vía Redpagos, sin necesidad de cuenta bancaria',
      'Primer año sin cargo y adicionales gratis',
      'Versiones segmentadas (jóvenes/estudiantes, Black y 60+)',
    ],
    cons: [
      'Los puntos vencen a los 12 meses corridos desde que se acreditan',
      'El canje topea al 50% del valor del producto: la otra mitad se paga sí o sí con la propia Passcard',
      'Financiación de 113% TEA (mora 128%), la más cara del segmento: contra 27,40% + IVA de ANDA y 63% de OCA',
      'Desde el segundo año el mantenimiento es de $U 78,58 + IVA MENSUAL (≈ $U 1.150 al año)',
      'Los puntos no son transferibles y los adicionales no pueden canjear',
    ],
    bestFor:
      'Quien quiere descuentos diarios agresivos por rubro (gastronomía, cines, heladerías, telepeaje) sin depender de un banco, y opera por Redpagos.',
    note: 'Tope de canje: hasta el 50% del valor del producto; la otra mitad se abona con la propia tarjeta Passcard. Las bases exigen además haber generado "puntos suficientes o mínimos" en la cuenta TiendaPass, tener la tarjeta activa y estar al día. El programa es gratuito (no paga suscripción) y la adhesión es automática al aceptar la tarjeta. Corrección de la revisión anterior: la ficha decía 80% en un campo y 50% en otro (el correcto es 50%) y atribuía a Passcard un vínculo con los supermercados Líder / Grupo Ta-Ta que no aparece en ninguna fuente del emisor —ni en las bases, ni en la home, ni en la cartilla—, así que se retiró.',
    scores: {
      acumulacion: 55,
      canje: 48,
      descuentos: 80,
      costo: 52,
      flexibilidad: 38,
      cobertura: 48,
    },
    rationale:
      'Descuentos diarios fuertes y ahora bien documentados (25%-30% de lunes a viernes segun version, 50% sabados y domingos, todos con tope de $U400 por cierre). Sube acumulacion porque el contra de "tasa y valor no transparentes" era falso: las bases publican 1 punto cada $100 y 1 punto = $1. Bajan costo (68 a 52) y flexibilidad (45 a 38) al aparecer la cartilla oficial: el mantenimiento es mensual desde el segundo ano, la financiacion es de 113% TEA y los puntos vencen a los 12 meses, no son transferibles y los adicionales no pueden canjear.',
    verified: true,
  },
  {
    id: 'tarjeta-anda',
    name: 'ANDA — Tarjeta de crédito ANDA + Programa Dale + Prepaga DEANDA',
    issuer: 'Asociación Nacional de Afiliados (ANDA)',
    issuerType: 'cooperativa',
    networks: ['visa', 'otro'],
    pointsProgramName: 'Dale (programa de fidelización con acumulación de puntos)',
    earnRateNote:
      'La tasa está publicada servicio por servicio: con la tarjeta de crédito, cada $U 40 gastados = 1 punto; en préstamos, cada $U 125 solicitados = 1 punto; en retiros de efectivo, cada $U 125 retirados = 1 punto; adelanto de pasividad, 4 puntos por adelanto; turismo, farmacia, clínica médica y odontológica y otros comercios internos, cada $U 40 = 1 punto; garantías de alquiler, 1.000 puntos por año de contrato al momento de la firma o renovación. Los puntos se acreditan diariamente, con un plazo máximo de 72 horas hábiles.',
    pointValueNote:
      'El valor monetario del punto Dale no se publica: ese es el dato que impide calcular un retorno real. Lo que sí está publicado: los puntos vencen a los 24 meses desde su generación y el canje se hace en andatienda.com.uy.',
    redemptionNote:
      "Canje de puntos por productos exclusivos, descuentos y beneficios en la tienda 'Dale' (andatienda.com.uy).",
    discountNote:
      "'Días de descuentos' por rubro para socios; convenios en educación, deporte, salud, hogar y recreación. Con la prepaga DEANDA se accede a los descuentos de IVA por ley: −2 puntos en comercios en general y −9 puntos en gastronomía hasta el 30/9/2026, porque desde el 1/10/2026 esa reducción baja a 5 puntos porcentuales (4,1% de descuento para contribuyentes de IVA Mínimo, según DGI). También devolución de IMESI en estaciones de la franja fronteriza. Planes de 2 a 6 o hasta 12 cuotas sin recargo en comercios adheridos. La Tarjeta ANDA VISA es internacional, sin costo anual, sin comisión por compra internacional ni por retiro de efectivo en el exterior, con tipo de cambio preferencial definido por ANDA y aceptación en toda la red VISA (más de 45.000 comercios en el país); la tarjeta ANDA vieja sigue funcionando hasta el recambio.",
    feeNote:
      'La tarjeta no tiene costo anual (ni la ANDA ni la ANDA VISA) y los adicionales son sin cargo. Financiación de compras a T.E.A. 27,40% + IVA, la más baja del segmento no bancario por amplio margen. Lo que sí se paga es la cuota social: Socio Integral $U 831, Socio suscriptor 50 UI (≈ $U 332 con la UI del 17/8/2026) en las categorías turismo y financiero, y servicio fúnebre $U 132 con IVA. Retiros de préstamos en Abitab, Redpagos, cajeros Banred y sucursales ANDA. Se puede acceder a la tarjeta estando en el Clearing de Informes (según antecedentes, eventualmente con garantía) y el pago se hace por retención de haberes.',
    pros: [
      'Tarjeta sin costo anual (ANDA y ANDA VISA) y adicionales sin cargo',
      'La financiación más barata del segmento no bancario: 27,40% + IVA, contra 63% de OCA y 113% de Passcard',
      'Tasa de acumulación publicada servicio por servicio, y la más densa en puntos por peso del set ($U 40 = 1 punto)',
      'La ANDA VISA es internacional y no cobra comisión por compra ni por retiro en el exterior',
      'Modelo cooperativo con convenios sociales (educación, salud, deporte) además de la tarjeta',
      'Se puede acceder estando en el Clearing de Informes',
    ],
    cons: [
      'Exige ser socio (cuota social: $U 831 Socio Integral, 50 UI suscriptor) para acceder a los beneficios plenos',
      'ANDA no publica el valor monetario del punto Dale: sabés cuántos puntos ganás, no cuánto valen',
      'Los puntos Dale vencen a los 24 meses y el canje se limita a andatienda.com.uy',
      'El pago por retención de haberes ata la tarjeta al vínculo laboral o jubilatorio',
    ],
    bestFor:
      'Socios de ANDA que aprovechan convenios sociales, cuotas sin recargo y una tarjeta internacional sin costo anual ni comisión en el exterior.',
    note: 'Reverificado el 17/8/2026 en el sitio oficial de ANDA: tasa del programa Dale servicio por servicio, vencimiento de los puntos a 24 meses, tarjeta sin costo anual, T.E.A. 27,40% + IVA y existencia de la ANDA VISA internacional. Lo único que sigue sin publicarse es el valor monetario del punto Dale. Corrección de la revisión anterior: decía que la tasa no estaba publicada, que la TEA era 27,50% y "relativamente alta" (es la más baja del segmento) y que la aceptación era menor que Visa/Mastercard, cosa que la ANDA VISA desmiente.',
    scores: {
      acumulacion: 45,
      canje: 45,
      descuentos: 68,
      costo: 62,
      flexibilidad: 48,
      cobertura: 62,
    },
    rationale:
      'Tres correcciones al alza con fuente oficial. Costo sube de 45 a 62: la tarjeta no tiene costo anual, los adicionales son sin cargo y la TEA de 27,40% + IVA es de lejos la mas barata del segmento no bancario (OCA 63%, Passcard 113%). Cobertura sube de 45 a 62 porque la ANDA VISA es internacional, con red VISA y sin comision por compra ni retiro en el exterior. Acumulacion sube de 35 a 45 porque la tasa del programa Dale si esta publicada servicio por servicio ($U40 = 1 punto con la tarjeta), y no sube mas porque ANDA sigue sin publicar cuanto vale el punto: sin eso no se puede calcular un retorno real. El lastre sigue siendo la cuota social, no la tarjeta.',
    verified: false,
  },
  {
    id: 'cabal-uruguay',
    name: 'Cabal Uruguay — Tarjeta de crédito Cabal',
    issuer:
      'Cabal Uruguay; emitida por Bandes Uruguay, Credicompras, Crédito de la Casa, Crédito Valor (Grupo BBVA), Credi Yi, Edenred, Fastcred, Fucerep y Nativa',
    issuerType: 'emisor_no_bancario',
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
      'Promos vigentes publicadas por Cabal: cine con 50% de descuento (su beneficio más fuerte), Macromercado 10% los miércoles con vigencia hasta el 31/12/2026, Ta-Ta 2 y 3 cuotas sin recargo en comestibles y limpieza, Sodimac y Divino hasta 24 cuotas sin recargo en pesos, Tienda Inglesa cuotas sin recargo en cualquier local, El Dorado hasta 3 cuotas en alimentos y $ 45 de descuento en telepeaje. Aparte, 40% en medicamentos con receta y un paquete de asistencias (viajero, auxilio mecánico auto/moto, hogar, mascotas, tarjeta blindada) con una condición importante: cada asistencia es "válida sólo para tarjetas con el servicio contratado" y para usarlas hay que registrar consumos facturados en el estado de cuenta del mes anterior; la asistencia al viajero además tiene costo mensual, bonificada solo en las tarjetas de Bandes y Crédito de Valor. Más de 30.000 comercios adheridos en Uruguay y 3.000.000 en la región.',
    feeNote:
      'Costo de emisión/mantenimiento no confirmado: ni cabal.com.uy ni la página de Cabal en Bandes publican tarifario (Bandes remite a FonoBandes 1716). Adicionales sin cargo para familiares (cónyuge, padres, hijos 16+).',
    pros: [
      'Paquete de asistencias amplio (viajero, auxilio mecánico, hogar, mascotas), aunque hay que contratarlas',
      '50% de descuento en cine y 40% en medicamentos con receta',
      'Cuotas sin recargo en cadenas grandes (hasta 24 en Sodimac y Divino)',
      'Red de comercios regional muy amplia (Cono Sur); adicionales sin cargo',
    ],
    cons: [
      'No ofrece un programa de puntos/canje por catálogo claro en Uruguay',
      'Las asistencias no vienen incluidas por defecto: son un servicio contratado y exigen consumos facturados el mes anterior',
      'No publica tarifario: el costo de emisión y mantenimiento hay que preguntarlo',
      'El retorno depende de usar las asistencias/descuentos, no de acumular',
    ],
    bestFor:
      'Usuario que valora asistencias y financiación en cuotas sin recargo por encima de acumular puntos, y que ya opera con alguno de sus emisores.',
    note: 'Corrección de la revisión anterior: Cabal en Uruguay no se emite solo vía cooperativas de ahorro y crédito. Su lista oficial de emisores son nueve entidades, en su mayoría administradoras de crédito: Bandes Uruguay (banco), Credicompras, Crédito de la Casa, Crédito Valor (Grupo BBVA), Credi Yi, Edenred, Fastcred, Fucerep y Nativa. El origen de la marca es cooperativo, la emisión local es mixta.',
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
    name: 'Tarjeta Líder / Italmundo (Platino, Oro y Plata)',
    issuer: 'Italmundo (sello Líder para la variante nacional; Mastercard para la internacional)',
    issuerType: 'emisor_no_bancario',
    networks: ['mastercard'],
    pointsProgramName:
      'Sin programa de puntos-catálogo destacado (propuesta centrada en accesibilidad, descuentos y cuotas)',
    earnRateNote:
      'No se identifica un programa de acumulación de puntos propio claramente publicado. La propuesta gira en torno a accesibilidad (requisitos flexibles), descuentos y financiación. Cualquier tasa de puntos NO está confirmada.',
    pointValueNote:
      'No aplica un valor de punto (sin programa de puntos-catálogo claro). No confirmado.',
    redemptionNote:
      'No hay catálogo de canje por puntos claramente publicado; el beneficio es vía descuentos/promos y cuotas sin recargo en comercios adheridos.',
    discountNote:
      'Italmundo sí publica descuentos concretos y fuertes, escalonados por nivel: Platino 30% en supermercados, 25% en combustible y 20% en débitos automáticos el primer mes, más hasta 6 cuotas sin interés en Mercado Libre; Oro 20% / 20% / 20% y hasta 6 cuotas en Mercado Libre; Plata 15% / 15% / 20% y hasta 3 cuotas. Los tres niveles permiten hasta 4 adicionales sin costo extra. Cobertura: la tarjeta Líder es NACIONAL únicamente (todo el país, donde veas el sello Líder o la marca Italmundo); la cobertura internacional, incluidas las compras online, la da la variante Mastercard.',
    feeNote:
      'Italmundo no publica tarifario, así que el costo anual sigue sin confirmarse. Lo que sí publica: las compras en el exterior tienen un cargo administrativo de 3% más IVA sobre el importe; la tarjeta Plata exige un "pago de activación" por única vez que funciona como garantía para emitirla (el monto no se publica); la tarjeta tiene vigencia de 3 años con renovación automática; y se permiten hasta 4 adicionales sin cargo, sin plazo declarado.',
    pros: [
      'Requisitos de acceso flexibles: buena opción para primer plástico o sin historial',
      'Descuentos publicados y altos, escalonados por nivel: hasta 30% en supermercados y 25% en combustible en la Platino',
      'Hasta 4 adicionales sin costo extra en los tres niveles',
      'Tres niveles (Platino, Oro y Plata) con la opción Mastercard para el exterior',
    ],
    cons: [
      'Sin programa de puntos/canje destacado: el valor está en descuentos y financiación, no en acumular',
      'La variante Líder es de cobertura nacional únicamente: para comprar afuera o en línea hay que ir a la Mastercard',
      'Las compras en el exterior pagan 3% + IVA de cargo administrativo',
      'La tarjeta Plata exige un pago de activación en garantía cuyo monto no se publica, y no hay tarifario público',
    ],
    bestFor:
      'Personas que buscan un primer plástico de acceso flexible y descuentos altos en supermercado y combustible, priorizando aprobación por sobre un programa de puntos.',
    note: 'Corrección de la revisión anterior: se retiraron ACAC como coemisor y First Data como red. La única fuente que respaldaba ACAC es un artículo de prensa de 2011 que ni siquiera la nombra (decía que el segundo emisor "sería un banco"), y First Data se fusionó con Fiserv en 2019 y no aparece en el sitio de Italmundo. Descuentos, niveles, cobertura, cargo del 3% en el exterior, pago de activación y vigencia de 3 años salen del sitio oficial de Italmundo (17/8/2026); el costo anual sigue sin publicarse.',
    scores: {
      acumulacion: 18,
      canje: 25,
      descuentos: 68,
      costo: 55,
      flexibilidad: 45,
      cobertura: 35,
    },
    rationale:
      'Dos correcciones en direcciones opuestas. Descuentos sube de 50 a 68: el emisor publica 30% en supermercados, 25% en combustible y cuotas sin interes en Mercado Libre, escalonados por nivel, asi que el contra de "menor red de descuentos" no se sostenia. Cobertura baja de 45 a 35 porque la tarjeta Lider es solo nacional: la internacional es la variante Mastercard, y ademas paga 3% + IVA de cargo en el exterior. Costo baja levemente al aparecer el pago de activacion en garantia de la Plata. Sigue sin haber programa de puntos ni catalogo de canje.',
    verified: false,
  },
  {
    id: 'btg-uruguay-tdc',
    name: 'Tarjetas de Crédito BTG Pactual, ex HSBC (Visa Classic/Internacional, Oro e Infinite; Mastercard Platinum/Excellence)',
    issuer: 'Banco BTG Pactual Uruguay S.A. (ex HSBC Bank (Uruguay) S.A.)',
    issuerType: 'banco',
    networks: ['visa', 'mastercard'],
    pointsProgramName: 'Sin programa de puntos propio en Uruguay',
    earnRateNote:
      'No hay programa de puntos ni recompensas: la cartilla propia de BTG "Tarjeta de Crédito", fechada julio de 2026 y publicada en btgpactual.uy/tarifas-y-cartillas ya con el nombre Banco BTG Pactual, tiene un apartado "Características y beneficios" con solo dos ítems (reducción del IVA en restaurantes y aviso gratis por SMS). Los programas \'HSBC Rewards / Puntos Premia / Más\' correspondían a HSBC México y Argentina, no a Uruguay. Reverificación cerrada el 17/8/2026: ya no es la cartilla heredada de HSBC.',
    redemptionNote:
      'No aplica: no hay canje de puntos. El retorno al cliente pasa por descuentos y beneficios directos, no por acumulación.',
    discountNote:
      'Beneficios centrados en descuentos, no en puntos: reducción de 9 puntos del IVA en gastronomía al pagar con la tarjeta (Ley 17.934) hasta el 30/9/2026, porque desde el 1/10/2026 esa reducción baja a 5 puntos porcentuales (4,1% de descuento para contribuyentes de IVA Mínimo, según DGI); aviso gratis vía SMS por cada compra. Perfil de banca Premier/premium (hoy "Excellence" en BTG) más que de acumulación de puntos.',
    feeNote:
      'Costos oficiales (cartilla de tarjetas y tarifario de Banca Persona de BTG, julio de 2026, + IVA; renovación en 3 cuotas). Residentes: Visa Internacional US$ 85/año, Visa Oro US$ 100, Visa Infinite US$ 120, Mastercard Platinum $U 5.974 y Mastercard Internacional $U 4.702. No residentes: Visa Internacional US$ 100, Visa Oro US$ 122, Visa Infinite US$ 120, Mastercard Excellence $U 5.676 y Mastercard Internacional $U 7.294 (los importes en pesos se ajustan trimestralmente por IPC). Sin costo de emisión el primer año. Las adicionales son sin costo en Visa, pero las de Mastercard se cobran: $U 2.827 + IVA al año para residentes y $U 3.642 + IVA para no residentes. Reimpresión US$ 10 + IVA en Visa, sin costo en Mastercard. Costo mensual de estado de cuenta $ 43 + IVA. Ingreso mínimo: $U 25.000 nominales/mes (nuevos y existentes) o $U 15.000 (nómina).',
    pros: [
      'Reducción de 9 puntos de IVA en gastronomía al pagar con la tarjeta (baja a 5 puntos el 1/10/2026).',
      'Aviso por SMS de cada consumo (control y seguridad).',
      'Primer año sin costo de emisión (Visa/Mastercard) y adicionales sin costo en Visa.',
      'Tarjetas de alto rango (Infinite / Excellence) para perfil premium y uso internacional.',
      'Para clientes de la banca Excellence, las tarjetas suman acceso a salas VIP y seguro de viaje. Ojo: es un beneficio del paquete, no de la tarjeta suelta — la cartilla de tarjetas no lo lista.',
    ],
    cons: [
      'No hay programa de puntos ni cashback: cero acumulación por consumo.',
      'Recargo por compras en el exterior: 3% + IVA en Visa Classic, Visa Oro y Mastercard Platinum, y 1% + IVA en Visa Infinite (es el único beneficio concreto de subir a Infinite).',
      'Las adicionales de Mastercard se pagan: $U 2.827 a $U 3.642 + IVA al año.',
      'Costos anuales relativamente altos a partir del segundo año, y más caros todavía para no residentes.',
      'Ingreso mínimo elevado ($U 25.000/mes) orientado a segmento medio-alto/Premier.',
      'Menos competitiva que BROU o Scotiabank para quien busca puntos o descuentos de góndola.',
    ],
    bestFor:
      'Clientes de perfil Premier/premium que priorizan servicio bancario internacional, tarjetas de alto rango y el descuento de IVA en gastronomía, y a quienes no les interesa acumular puntos.',
    note: 'El rebranding se materializó durante el fin de semana del 11 y 12 de julio de 2026 y BTG Pactual comenzó a operar el lunes 13 de julio de 2026 (dato de prensa; el banco no publicó fecha). Nombre de producto: "Mastercard Premier" es de la era HSBC y ya no existe — la cartilla de BTG habla de Mastercard Platinum y el tarifario de Banca Persona de Mastercard Excellence e Internacional.',
    scores: {
      acumulacion: 15,
      canje: 25,
      descuentos: 45,
      costo: 42,
      flexibilidad: 45,
      cobertura: 55,
    },
    rationale:
      'Ultimo puesto de forma objetiva: estas tarjetas NO tienen programa de puntos ni recompensas —ahora verificado en la cartilla propia de BTG de julio de 2026, ya bajo la marca nueva, no en la heredada de HSBC—, por lo que carecen de acumulacion y canje, las dos dimensiones de mayor peso. El retorno se limita a la reduccion de IVA en gastronomia (9 puntos hasta el 30/9/2026, 5 desde el 1/10) y al aviso por SMS. Costo baja de 48 a 42 al leerse el tarifario completo: aparecen el tramo no residente, mas caro en todas las tarjetas, las adicionales pagas de Mastercard ($U 2.827 a $U 3.642 + IVA) y el recargo de 3% + IVA por compras en el exterior (1% en Infinite).',
    verified: true,
  },
])

/**
 * Which Reddit-tracked issuer each programme belongs to (ids from REDDIT_ENTITIES
 * in utils/redditSentiment.ts). Reddit talks about the *issuer* ("Itaú", "OCA"),
 * not about a specific plastic, so the four Itaú cards share one entity.
 *
 * Deliberately incomplete: ANDA, Pronto! and Líder are NOT tracked because their
 * names are ordinary Spanish words ("anda", "pronto", "líder") and any pattern
 * loose enough to catch the brand also catches everyday speech. A programme with
 * no entry shows no Reddit block — silence beats a wrong attribution.
 */
export const PROGRAM_REDDIT_ENTITY: Readonly<Record<string, string>> = Object.freeze({
  'brou-recompensa': 'brou',
  'mercado-pago-uruguay': 'mercadopago',
  'club-tienda-inglesa-puntos': 'tiendainglesa',
  'prex-uruguay': 'prex',
  'scotia-puntos': 'scotiabank',
  'midinero-uruguay': 'midinero',
  'santander-soy-santander-puntos': 'santander',
  'bbva-puntos-bbva': 'bbva',
  'bbva-comunidad-plus': 'bbva',
  'itau-volar': 'itau',
  'itau-volar-platinum': 'itau',
  'itau-latam-pass-platinum': 'itau',
  'itau-volar-black': 'itau',
  'scotia-puntos-american-express': 'scotiabank',
  'scotia-connectmiles': 'scotiabank',
  'itau-latam-pass-internacional': 'itau',
  'oca-oca-blue': 'oca',
  'scotia-club-card-tienda-inglesa': 'scotiabank',
  'creditel-credipuntos': 'creditel',
  'passcard-puntos-pass': 'passcard',
  'cabal-uruguay': 'cabal',
  'btg-uruguay-tdc': 'btg',
})

/** The distinct Reddit entities behind the credit-card programmes we rank. */
export const PROGRAM_REDDIT_IDS: readonly string[] = Object.freeze([
  ...new Set(Object.values(PROGRAM_REDDIT_ENTITY)),
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
