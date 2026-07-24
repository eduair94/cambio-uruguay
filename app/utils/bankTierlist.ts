// app/utils/bankTierlist.ts
// Data + helpers for /mejores-bancos-uruguay — an interactive "tier list" of
// Uruguayan retail banks and consumer fintechs.
//
// Framing: r/Burises keeps re-running the "peores bancos de Uruguay" thread. Instead
// of piling on, we flip the question — which one is actually worth it? — and answer it
// with data: real review scores (Play Store, Trustpilot), fees, customer-service
// reputation, USD operativa, products and coverage.
//
// PURE module (no Vue/Nuxt) so the page and its unit tests share one source of truth.
//
// The tier is COMPUTED, never hand-set: each entity is scored 0–100 on six dimensions,
// the overall is a weighted average, and the tier (S..F) falls out of `tierForScore`.
// Crucially the page lets the reader pick WHICH dimensions matter — `scoreFor` re-weights
// over the active subset and the whole board re-tiers live. So "the best bank" is not our
// verdict, it's a function of what the reader cares about.
//
// Scores are our best objective judgement from web research + an adversarial fact-check
// pass (review aggregates, tarifarios, press). Where a fact is dated or unconfirmed we say
// so in `note`/`flag` and score conservatively. Informational, not financial advice.
//
// `app` is ANCHORED to the real store scores (Google Play + App Store, weighted by review
// count), then adjusted for the trend of RECENT reviews, feature gaps (Apple Pay / Google
// Pay) and sample size. Where there is no meaningful local sample (Heritage: 13) we say so
// on the card and score conservatively instead of inventing a number.
//
// Last fact-check: 2026-07-11. That pass corrected five things we had wrong:
//   1. Santander DOES have Apple Pay (since ago-2025) — and Google Pay too.
//   2. BBVA's app is not "de referencia": its 60 newest Play reviews average 3,1/5.
//   3. Scotiabank's app is the WORST in the country (2,45/5), not "funcional".
//   4. Prex shipped daily yields (mar-2026) TWO MONTHS before Mercado Pago (may-2026).
//   5. HSBC Uruguay became BTG Pactual on 2026-07-10 — the `hsbc` entity is now `btg`.

/** A scoring dimension of the rubric. */
export type DimId = 'app' | 'comisiones' | 'atencion' | 'usd' | 'productos' | 'cobertura'

/** Tier buckets, best → worst. */
export type TierId = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

/** Bank vs. consumer fintech — drives the filter chip and the tone of the review. */
export type EntityKind = 'banco' | 'fintech'

export interface RubricDimension {
  id: DimId
  label: string
  /** Short imperative used on the toggle chips. */
  short: string
  icon: string
  /** Weight in the balanced (all-criteria) overall; the set sums to 100. */
  weight: number
  what: string
}

/**
 * The transparent, weighted rubric. Weights reflect what moves the needle for a typical
 * account holder in Uruguay: the everyday digital experience and the fees weigh most,
 * then service reputation, then dollar operativa, products and physical coverage.
 */
export const BANK_RUBRIC: readonly RubricDimension[] = Object.freeze([
  {
    id: 'app',
    label: 'App y experiencia digital',
    short: 'App',
    icon: 'mdi-cellphone-check',
    weight: 22,
    what: 'Qué tan buena, estable y completa es la app / home banking (puntaje real de las tiendas cuando existe).',
  },
  {
    id: 'comisiones',
    label: 'Comisiones y costos',
    short: 'Comisiones',
    icon: 'mdi-cash-remove',
    weight: 20,
    what: 'Mantenimiento, retiros, compras en el exterior y "letra chica" frente a lo que devuelve.',
  },
  {
    id: 'atencion',
    label: 'Atención y reputación',
    short: 'Atención',
    icon: 'mdi-account-heart-outline',
    weight: 18,
    what: 'Soporte, resolución de problemas y reputación de reseñas (Trustpilot, tiendas, prensa).',
  },
  {
    id: 'usd',
    label: 'Dólares y transferencias',
    short: 'Dólares',
    icon: 'mdi-currency-usd',
    weight: 15,
    what: 'Cuentas y operativa en USD, transferencias internacionales y cobro de ingresos del exterior.',
  },
  {
    id: 'productos',
    label: 'Productos y beneficios',
    short: 'Productos',
    icon: 'mdi-gift-outline',
    weight: 13,
    what: 'Tarjetas, plazo fijo, hipotecas, rendimientos y descuentos disponibles.',
  },
  {
    id: 'cobertura',
    label: 'Cobertura y aceptación',
    short: 'Cobertura',
    icon: 'mdi-map-marker-radius-outline',
    weight: 12,
    what: 'Cajeros, sucursales y qué tan aceptado/usable es en el día a día.',
  },
])

export const DIM_IDS: readonly DimId[] = Object.freeze(BANK_RUBRIC.map(d => d.id))

/** Tier presentation + the minimum overall score to reach it. */
export interface TierMeta {
  id: TierId
  label: string
  /** One-line editorial blurb for the tier row header. */
  blurb: string
  /** Inclusive lower bound of the overall score for this tier. */
  min: number
}

/**
 * Tier thresholds. S is intentionally hard to reach: with balanced criteria no Uruguayan
 * bank or fintech clears 85 — the local system has a ceiling, and saying so is the point.
 * Change the active criteria on the page and the picture shifts: a USD-focused reader sends
 * Heritage into S; an "atención" filter drops the worst into F.
 */
export const TIERS: readonly TierMeta[] = Object.freeze([
  { id: 'S', label: 'S', blurb: 'De otro nivel. Casi imposible con criterios parejos.', min: 85 },
  { id: 'A', label: 'A', blurb: 'Lo mejor que ofrece la plaza hoy.', min: 72 },
  { id: 'B', label: 'B', blurb: 'Sólidos, con un pero claro.', min: 64 },
  { id: 'C', label: 'C', blurb: 'Cumplen, pero se les nota el desgaste.', min: 54 },
  { id: 'D', label: 'D', blurb: 'Elegilos con los ojos abiertos.', min: 44 },
  { id: 'F', label: 'F', blurb: 'Acá no querés estar.', min: 0 },
])

/** A concrete, verifiable data point shown as a credibility chip. */
export interface Signal {
  label: string
  /** e.g. "4,48/5" */
  value: string
  /** 'pos' | 'neg' | 'neutral' tints the chip. */
  tone: 'pos' | 'neg' | 'neutral'
}

export interface BankEntity {
  id: string
  name: string
  kind: EntityKind
  /** Ownership / one-line identity, e.g. "Banco estatal" or "Fintech uruguaya". */
  identity: string
  /** Punchy one-liner shown under the name. */
  tagline: string
  /** Score 0–100 per dimension. */
  scores: Record<DimId, number>
  /** Real, sourced data points. */
  signals: readonly Signal[]
  /** Who it fits best. */
  bestFor: string
  pros: readonly string[]
  cons: readonly string[]
  /** Optional standout warning (e.g. market exit) rendered as a badge + note. */
  flag?: string
  /** Longer paragraph, our reasoned verdict. */
  verdict: string
}

/**
 * The board. Scores are our judgement from the research pass; the overall and tier are
 * derived, never typed in. Ordering here is irrelevant — the page sorts by computed score.
 */
export const BANKS: readonly BankEntity[] = Object.freeze([
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    kind: 'fintech',
    identity: 'Fintech (billetera + rendimientos)',
    tagline: 'La billetera que se comió media banca uruguaya.',
    scores: { app: 90, comisiones: 88, atencion: 42, usd: 66, productos: 74, cobertura: 92 },
    signals: [
      { label: 'App', value: '4,83/5 (75 mil reseñas iOS)', tone: 'pos' },
      { label: 'Tarjeta internacional', value: 'sin comisión', tone: 'pos' },
      { label: 'Soporte', value: 'quejas frecuentes', tone: 'neg' },
    ],
    bestFor:
      'Día a día, QR, guardar plata con rendimiento y una tarjeta gratis para comprar afuera.',
    pros: [
      'Rendimiento diario sobre el saldo en pesos, con liquidez inmediata y sin mínimo (fondo BIND Ahorro Pesos, supervisado por el BCU; referencia: la tasa de política monetaria, 5,75% anual al lanzamiento).',
      'Mastercard prepaga sin costo de emisión ni mantenimiento y sin comisión por compra en el exterior.',
      'Aceptación y QR en todos lados; transferencias gratis.',
    ],
    cons: [
      'Atención al cliente opaca: reintegros demorados y cuentas congeladas por "movimientos inusuales".',
      'El rendimiento es solo en PESOS (fondo BIND Ahorro Pesos): si tenés el saldo en dólares, no gana nada.',
      'No es un banco (es emisora de dinero electrónico ante el BCU): sin hipoteca ni caja de ahorro. Y su prepaga no se puede cargar en Apple Pay ni Google Pay.',
    ],
    flag: undefined,
    verdict:
      'Con criterios parejos, la fintech le gana a casi todos los bancos: app excelente, casi todo gratis, rinde el saldo en pesos y la tarjeta compra afuera sin recargo. El talón de Aquiles sigue siendo el soporte cuando algo sale mal. Y una corrección al relato: sumó rendimientos en mayo de 2026, pero la PRIMERA en pagarlos en Uruguay fue Prex, dos meses antes.',
  },
  {
    id: 'itau',
    name: 'Itaú',
    kind: 'banco',
    identity: 'Banco privado brasileño (dueño de OCA)',
    tagline: 'El banco privado mejor armado en lo digital.',
    scores: { app: 92, comisiones: 50, atencion: 68, usd: 78, productos: 88, cobertura: 82 },
    signals: [
      { label: 'App', value: '4,76/5 Play · 4,84/5 iOS', tone: 'pos' },
      { label: 'Productos', value: 'gama completa', tone: 'pos' },
      { label: 'Costos', value: 'perfil "caro"', tone: 'neg' },
    ],
    bestFor: 'Quien quiere el mejor combo app + productos y no le pesa pagar por el servicio.',
    pros: [
      'La app mejor puntuada de la banca uruguaya: 4,76/5 en Play (27 mil reseñas) y 4,84/5 en la App Store. Global Finance lo eligió Mejor Banco Digital de Uruguay cuatro años seguidos.',
      'Amplia cartera de tarjetas y programa de beneficios; es dueño de OCA, la mayor emisora de tarjetas del país.',
      'Fuerte presencia de sucursales y cajeros en Montevideo.',
    ],
    cons: [
      'Fama de comisiones altas para saldos chicos.',
      'Inestabilidad puntual de la app tras actualizaciones (fallos al iniciar sesión).',
    ],
    verdict:
      'Es el banco tradicional que mejor hace lo digital y el que más productos ofrece. Si valorás la app y la variedad, es tope de gama; si sos de saldo bajo, las comisiones te van a doler.',
  },
  {
    id: 'santander',
    name: 'Santander',
    kind: 'banco',
    identity: 'Banco privado (multinacional)',
    tagline: 'El favorito de quien cobra en dólares.',
    scores: { app: 84, comisiones: 58, atencion: 68, usd: 86, productos: 82, cobertura: 76 },
    signals: [
      { label: 'App', value: '4,67/5 Play · 4,65/5 iOS', tone: 'pos' },
      { label: 'Dólares', value: 'fuerte', tone: 'pos' },
      { label: 'Apple Pay + Google Pay', value: 'sí, desde ago. 2025', tone: 'pos' },
    ],
    bestFor: 'Freelancers y empleados de zona franca que cobran en USD y quieren hipoteca.',
    pros: [
      'App completa y bien puntuada (4,67/5 en Play con ~38 mil reseñas; 4,65/5 en la App Store), con Apple Pay y Google Pay habilitados desde agosto de 2025.',
      'Condiciones pensadas para ingresos en USD y foco en crédito hipotecario.',
      'Promociones y beneficios comerciales frecuentes.',
    ],
    cons: [
      'Movimientos que tardan en impactar y fallas repetidas con Face ID / llave digital: es lo que más aparece en las reseñas recientes de la App Store.',
      'Reputación "multinacional" en comisiones (más de imagen que de datos locales verificados).',
    ],
    verdict:
      'El más elegido por perfiles con ingresos en dólares: operativa USD sólida, hipotecas y una app bien puntuada (4,67/5 en Play). Corrección nuestra: SÍ tiene Apple Pay —desde agosto de 2025— y también Google Pay; lo decíamos mal. Lo que le queda flojo son las comisiones y algunos bugs de sesión, no las billeteras.',
  },
  {
    id: 'brou',
    name: 'BROU',
    kind: 'banco',
    identity: 'Banco República (estatal)',
    tagline: 'El aburrido confiable que está en todos lados.',
    scores: { app: 66, comisiones: 86, atencion: 52, usd: 64, productos: 80, cobertura: 99 },
    signals: [
      { label: 'App eBROU', value: '4,43/5 Play · 3,53/5 iOS', tone: 'neutral' },
      { label: 'Red', value: 'la más grande', tone: 'pos' },
      { label: 'Apple Pay', value: 'no (solo Google Pay)', tone: 'neg' },
      { label: 'Trámites', value: 'burocráticos', tone: 'neg' },
    ],
    bestFor: 'Quien prioriza respaldo estatal, cajeros en todo el país y costos bajos.',
    pros: [
      'La red de sucursales y cajeros más grande; a veces el único banco del pueblo.',
      'Costos bajos: préstamos sin comisiones agregadas, plazo fijo con mínimo bajo (ideal para ahorrista chico).',
      'Respaldo estatal: el "por defecto" confiable.',
    ],
    cons: [
      'App con límites rígidos y estabilidad irregular tras updates; mucho peor en iPhone (3,53/5) que en Android (4,43/5).',
      'Tiene Google Pay pero NO Apple Pay: siendo el banco más usado del país, si usás iPhone no pagás con el celular. (Sí lo tienen Itaú, Santander, Scotiabank, OCA, Prex y MiDinero.)',
      'Trámites y colas: la burocracia de una entidad estatal grande. Además bloquea las transferencias a Revolut, y el BCU le dio la razón.',
    ],
    verdict:
      'Subió, y por datos: con el puntaje real de eBROU (4,43/5 en Play, no el 4,34 que teníamos) entra en A. Nadie le gana en red física ni en costo — cambiá el filtro a "uso diario" y salta al tope. Sus techos siguen siendo la atención y la app en iPhone (3,53/5), y que, siendo el banco más usado del país, todavía no tenga Apple Pay.',
  },
  {
    id: 'bbva',
    name: 'BBVA',
    kind: 'banco',
    identity: 'Banco privado (multinacional)',
    tagline: 'Era la referencia digital; hoy la app se le cae.',
    scores: { app: 62, comisiones: 60, atencion: 60, usd: 74, productos: 70, cobertura: 64 },
    signals: [
      { label: 'Alta 100% online', value: 'solo con cédula', tone: 'pos' },
      { label: 'App (histórico)', value: '4,61/5 Play', tone: 'pos' },
      { label: 'App (últimas 60 reseñas)', value: '3,1/5 · 32% de 1 estrella', tone: 'neg' },
      { label: 'Apple Pay / Google Pay', value: 'ninguno de los dos', tone: 'neg' },
    ],
    bestFor:
      'Quien quiere abrir cuenta desde el celular en minutos y operar en pesos y dólares. Si vivís pagando con el celular, no: es el único sin Apple Pay ni Google Pay.',
    pros: [
      'Alta de cuenta 100% online desde la app: alcanza con cédula vigente y conexión a internet.',
      'Opera en pesos y dólares, y el histórico de la app sigue siendo bueno (4,61/5 en Play, 4,76/5 en la App Store).',
    ],
    cons: [
      'La app viene cayendo hace un año: el promedio mensual de reseñas pasó de 4,45 (jun. 2025) a 2,58 (jul. 2026), y las últimas 60 promedian 3,1/5 con 32% de una estrella. La queja que más se repite: se traba en la pantalla azul de "validando credenciales".',
      'Es el ÚNICO del tablero sin Apple Pay NI Google Pay: no figura en la lista oficial de emisores de Apple ni en la de Google Wallet para Uruguay.',
      'No es "pionero en cashback": su programa hoy es Puntos BBVA, puntos canjeables por viajes vía Despegar.',
      'Menor cantidad de sucursales y cajeros que BROU/Itaú/Santander.',
    ],
    verdict:
      'Nos escribieron diciendo que la app "es una bosta y encima se ve espantosa". Tienen media razón, y nos hicieron mirar mejor. "Una bosta" exagera: en histórico puntúa 4,61/5 en Play y 4,76/5 en la App Store. Pero nuestro "app de referencia" con 84/100 era indefendible: viene en caída desde mediados de 2025 (promedio mensual 4,45 → 2,58), las últimas 60 reseñas dan 3,1/5 con 32% de una estrella, y es el único banco del tablero sin Apple Pay ni Google Pay. Lo que NO encontramos es lo de "espantosa": de las 50 reseñas negativas más recientes, casi ninguna habla del diseño — se quejan de que no anda, no de cómo se ve. Bajamos la app de 84 a 62.',
  },
  {
    id: 'heritage',
    name: 'Banco Heritage',
    kind: 'banco',
    identity: 'Banco privado suizo (boutique)',
    tagline: 'Atención de guante blanco y dólares que rinden.',
    scores: { app: 56, comisiones: 64, atencion: 92, usd: 94, productos: 74, cobertura: 34 },
    signals: [
      { label: 'Cuenta USD a la vista', value: '3,5% anual (desde US$ 10.000)', tone: 'pos' },
      { label: 'Atención', value: 'oficial directo', tone: 'pos' },
      { label: 'Sucursales', value: 'muy pocas', tone: 'neg' },
    ],
    bestFor: 'Ahorristas en dólares y saldos medios/altos que quieren trato personalizado.',
    pros: [
      'Único banco de capitales suizos; sin call center: cada cliente tiene un oficial de cuenta directo.',
      '"Cuenta Smart": paga 3,5% anual en dólares a la vista (y 5,5% en pesos), sin costo de apertura ni mantenimiento — pero se abre desde US$ 10.000.',
      'Trato personalizado y alta satisfacción autoinformada; abrió oficina en Punta del Este.',
    ],
    cons: [
      'La Cuenta Smart arranca en US$ 10.000: si no tenés ese colchón, este banco no es para vos. (Antes no lo decíamos.)',
      'Huella física mínima: no es para quien quiere cajeros en cada esquina; tampoco tiene Apple Pay ni Google Pay.',
      'Su app casi no tiene muestra pública (13 reseñas en la App Store uruguaya): la puntuamos conservador, no medida.',
    ],
    verdict:
      'El secreto de los que ahorran en dólares. Con criterios parejos queda en B por su cobertura chica, pero filtrá por "dólares" o "atención" y se va al tope. No es para todos —arranca en US$ 10.000, dato que antes nos faltaba—; para su nicho, es de lo mejor.',
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    kind: 'banco',
    identity: 'Banco privado (canadiense)',
    tagline: 'El que más quejas de servicio junta.',
    scores: { app: 30, comisiones: 42, atencion: 36, usd: 70, productos: 74, cobertura: 60 },
    signals: [
      { label: 'App Scotia Móvil', value: '2,45/5 Play · 2,35/5 iOS', tone: 'neg' },
      { label: 'Atención', value: 'quejas recurrentes', tone: 'neg' },
      { label: 'Cajeros gratis', value: 'recortados 05/2026', tone: 'neg' },
    ],
    bestFor: 'Quien ya tiene el paquete y usa Scotia Puntos / Club Card Tienda Inglesa.',
    pros: [
      'Buenos programas de premios (Scotia Puntos, Club Card Tienda Inglesa) y respaldo de un banco canadiense grande.',
      'Sucursales en todas las capitales departamentales y una red amplia en Montevideo.',
    ],
    cons: [
      'La peor app del tablero, y no por poco: Scotia Móvil puntúa 2,45/5 en Google Play (3.700 reseñas) y 2,35/5 en la App Store. El 82% de las 60 reseñas más recientes son de una estrella: login que se traba de noche, transferencias que fallan.',
      'Atención telefónica floja, demoras para abrir cuenta y facturación con errores.',
      'Erosión de beneficios: desde mayo 2026 recortó los retiros Banred gratis de la Cuenta Sueldo Básica a 6 por mes.',
    ],
    verdict:
      'Acá nos equivocamos feo: decíamos "la app cumple" y es, con datos, la peor app bancaria del país — 2,45/5 en Play, 2,35/5 en la App Store, y 82% de las últimas reseñas son de una estrella. Sumale la atención telefónica y el recorte de los retiros Banred gratis, y queda claro por qué es el que más quejas junta. Los programas de premios son lo único que lo sostiene. Le bajamos la app de 66 a 30 y se va a D.',
  },
  {
    id: 'prex',
    name: 'Prex',
    kind: 'fintech',
    identity: 'Fintech (cuenta + prepaga)',
    tagline: 'Cómoda hasta que algo sale mal.',
    scores: { app: 86, comisiones: 46, atencion: 30, usd: 54, productos: 66, cobertura: 76 },
    signals: [
      { label: 'Apps (Play + App Store)', value: '4,8/5 · 210 mil reseñas', tone: 'pos' },
      { label: 'Trustpilot', value: '1,9/5 · solo 70 reseñas', tone: 'neg' },
      { label: 'Fraude/phishing', value: 'casos en prensa', tone: 'neg' },
    ],
    bestFor:
      'Uso diario sin abrir cuenta en banco, y hacer rendir pesos con liquidez inmediata. Guardá solo lo que puedas permitirte perder.',
    pros: [
      'Fue la PRIMERA en pagar rendimientos diarios en Uruguay: "Inversión Violeta" (fondo aprobado por el BCU vía Gletir/VALO, liquidez inmediata, sin comisiones, desde $100) salió a fines de marzo de 2026, dos meses antes que Mercado Pago.',
      'Las apps mejor puntuadas del tablero: 4,77/5 en Play (129 mil reseñas) y 4,81/5 en la App Store (81 mil). Prepaga sin necesidad de cuenta bancaria.',
      'Recargas y transferencias fáciles para uso cotidiano.',
    ],
    cons: [
      'Reputación de soporte pésima en Trustpilot (1,9/5) — aunque son solo 70 reseñas, contra 210 mil en las tiendas: ante fraude, tiende a responsabilizar al usuario.',
      'Blanco de phishing con casos en prensa local: te llaman haciéndose pasar por Prex, te cambian la contraseña y te vacían la cuenta.',
      'Comisiones altas: retiro en cajero USD 3 o $45 + IVA; en Abitab USD 1,90 o $35 + IVA; compras en el exterior 2,5% + USD 0,50 + IVA.',
    ],
    verdict:
      'Le debíamos una corrección. Sus apps son las mejor puntuadas del tablero (4,8/5 con más de 210 mil reseñas entre Play y la App Store) y fue la PRIMERA en pagar rendimientos diarios en Uruguay —a fines de marzo de 2026, dos meses antes que Mercado Pago—, así que "producto pobre" ya no corre. Lo que la hunde no es el producto: es qué pasa cuando algo sale mal. Su 1,9/5 en Trustpilot (sobre solo 70 reseñas, ojo) y su manejo de los fraudes le siguen costando caro. Marcá el filtro "atención" y se va sola a F. Útil y cómoda; no le confíes plata que no puedas perder.',
  },
  {
    id: 'btg',
    name: 'BTG Pactual',
    kind: 'banco',
    identity: 'Banco privado brasileño (ex-HSBC Uruguay)',
    tagline: 'El ex-HSBC con marca nueva: mismo banco, mismo foco Premium.',
    scores: { app: 78, comisiones: 42, atencion: 56, usd: 82, productos: 62, cobertura: 30 },
    signals: [
      { label: 'Arrancó', value: '10 de julio de 2026', tone: 'neutral' },
      { label: 'App iBanca', value: '4,8/5 (sigue siendo la de HSBC)', tone: 'pos' },
      { label: 'Cuenta para personas', value: 'solo Excellence (premium)', tone: 'neg' },
      { label: 'Sucursales', value: '~6, casa central con cita previa', tone: 'neg' },
    ],
    bestFor:
      'Perfil afluente que quiere banca privada, inversiones globales y un ejecutivo de cuenta asignado. Para el uso masivo del día a día, no.',
    pros: [
      'El traspaso no rompió nada: misma app (iBanca, 4,8/5), mismo teléfono (2915 1010), mismas sucursales, mismo equipo y mismo CEO local. El propio HSBC avisó que "no afectará la continuidad de los productos, servicios ni canales de atención".',
      'Excellence es el ex-Premier de HSBC con otro nombre: ejecutivo de cuenta asignado, VISA Infinite con salas VIP, cuentas multimoneda (UYU/USD/EUR/GBP/UI), fondos globales, bonos, ADRs y ETFs.',
      'Atrás hay un grupo grande: BTG Pactual maneja US$ 497 mil millones y Euromoney lo eligió Mejor Banca Privada de Latinoamérica en 2025.',
    ],
    cons: [
      'Es una marca de días: arrancó el 10 de julio de 2026 y todavía no hay una sola reseña ni experiencia de cliente independiente. Puntuamos conservador y lo vamos a revisar.',
      'Escaparate 100% premium: la ÚNICA cuenta para personas que publica es Excellence — su propio sitio la titula "Banca Premium". Las cuentas masivas de HSBC (Cuenta Personal, Cuenta Ingresos) no aparecen en su web.',
      'Huella mínima: ~6 sucursales y una casa central (WTC) que atiende solo con cita: "coordiná con tu ejecutivo de cuentas". Sin Apple Pay ni Google Pay.',
      'La app sigue publicada como "HSBC Uruguay - iBanca" bajo la cuenta de desarrollador de HSBC: falta la republicación bajo BTG y no hay fecha.',
    ],
    flag: 'Marca nueva desde el 10/07/2026 (ex-HSBC): los datos y la experiencia de cliente todavía se están formando',
    verdict:
      'El 10 de julio de 2026 HSBC Uruguay pasó a ser BTG Pactual: la compra (US$ 175 millones, aprobada por el BCU en junio) se concretó, hsbc.com.uy quedó reducido a un aviso y el home banking se mudó a ibanca.btgpactual.uy. Para el cliente, por ahora, sigue todo igual: misma app, mismo teléfono, mismas sucursales, mismo equipo. Lo que cambia es el rumbo — la única cuenta para personas que publica es "Excellence", que su propio sitio llama "Banca Premium": el ex-Premier de HSBC con otro nombre. Dice querer estar en el top 3 del país en dos o tres años, pero hoy el escaparate es MÁS premium que el de HSBC, no menos. Tiene días de vida: lo puntuamos conservador y lo revisamos en semanas.',
  },
])

// ---------------------------------------------------------------------------
// Scoring + tiering helpers
// ---------------------------------------------------------------------------

const WEIGHT_BY_ID: Record<DimId, number> = BANK_RUBRIC.reduce(
  (acc, d) => {
    acc[d.id] = d.weight
    return acc
  },
  {} as Record<DimId, number>
)

/**
 * Overall score (0–100, rounded) over a subset of active dimensions, re-weighting by each
 * dimension's original rubric weight. With all six active it's the balanced overall; with a
 * subset it answers "how good is this entity for someone who only cares about these things".
 * An empty subset falls back to all dimensions (a filter that hides nothing).
 */
export function scoreFor(entity: BankEntity, active: readonly DimId[] = DIM_IDS): number {
  const dims = active.length ? active : DIM_IDS
  let weighted = 0
  let totalWeight = 0
  for (const id of dims) {
    const w = WEIGHT_BY_ID[id]
    weighted += entity.scores[id] * w
    totalWeight += w
  }
  return totalWeight === 0 ? 0 : Math.round(weighted / totalWeight)
}

/** The tier an overall score lands in (highest tier whose `min` it clears). */
export function tierForScore(score: number): TierId {
  for (const t of TIERS) {
    if (score >= t.min) return t.id
  }
  return 'F'
}

export interface RankedEntity {
  entity: BankEntity
  score: number
  tier: TierId
}

/** Every entity scored + tiered for the given active dimensions, sorted best → worst. */
export function rankEntities(active: readonly DimId[] = DIM_IDS): RankedEntity[] {
  return BANKS.map(entity => {
    const score = scoreFor(entity, active)
    return { entity, score, tier: tierForScore(score) }
  }).sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name))
}

export interface TierRow {
  tier: TierMeta
  items: RankedEntity[]
}

/**
 * The full board grouped into tier rows S→F (every tier present, even if empty, so the
 * scale reads consistently). Within a row, items are sorted best → worst.
 */
export function buildBoard(active: readonly DimId[] = DIM_IDS): TierRow[] {
  const ranked = rankEntities(active)
  return TIERS.map(tier => ({
    tier,
    items: ranked.filter(r => r.tier === tier.id),
  }))
}

// ---------------------------------------------------------------------------
// Reader profiles — presets that flip which dimensions are "on"
// ---------------------------------------------------------------------------

export interface ProfilePreset {
  id: string
  label: string
  icon: string
  /** Which dimensions this profile cares about. Empty-safe. */
  dims: readonly DimId[]
  hint: string
}

export const PROFILE_PRESETS: readonly ProfilePreset[] = Object.freeze([
  {
    id: 'equilibrado',
    label: 'Equilibrado',
    icon: 'mdi-scale-balance',
    dims: DIM_IDS,
    hint: 'Todos los criterios con su peso. La foto general.',
  },
  {
    id: 'joven-digital',
    label: 'Joven digital',
    icon: 'mdi-cellphone',
    dims: ['app', 'comisiones', 'cobertura'],
    hint: 'Buena app, casi todo gratis y que sirva en todos lados.',
  },
  {
    id: 'freelancer-usd',
    label: 'Freelancer USD',
    icon: 'mdi-laptop',
    dims: ['usd', 'app', 'comisiones'],
    hint: 'Cobrar del exterior en dólares, barato y desde el celu.',
  },
  {
    id: 'ahorrista-dolares',
    label: 'Ahorrista en dólares',
    icon: 'mdi-safe',
    dims: ['usd', 'productos', 'atencion'],
    hint: 'Guardar y hacer rendir dólares con buen trato.',
  },
  {
    id: 'uso-diario',
    label: 'Uso diario',
    icon: 'mdi-storefront-outline',
    dims: ['cobertura', 'atencion', 'comisiones'],
    hint: 'Sucursales y cajeros cerca, sin sorpresas de costo.',
  },
])

/** Find a preset whose dimension set exactly matches the active selection (order-insensitive). */
export function matchPreset(active: readonly DimId[]): ProfilePreset | undefined {
  const key = [...active].sort().join(',')
  return PROFILE_PRESETS.find(p => [...p.dims].sort().join(',') === key)
}

export const KIND_LABELS: Record<EntityKind, string> = Object.freeze({
  banco: 'Banco',
  fintech: 'Fintech',
})
