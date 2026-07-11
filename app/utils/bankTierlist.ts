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
 * Heritage and Takenos into S; an "atención" filter drops the worst into F.
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
      { label: 'App', value: 'de las mejores', tone: 'pos' },
      { label: 'Tarjeta internacional', value: 'sin comisión', tone: 'pos' },
      { label: 'Soporte', value: 'quejas frecuentes', tone: 'neg' },
    ],
    bestFor:
      'Día a día, QR, guardar plata con rendimiento y una tarjeta gratis para comprar afuera.',
    pros: [
      'Rendimiento diario sobre el saldo con liquidez inmediata (fondo BIND, regulado por BCU).',
      'Mastercard prepaga sin costo de emisión ni mantenimiento y sin comisión por compra en el exterior.',
      'Aceptación y QR en todos lados; transferencias gratis.',
    ],
    cons: [
      'Atención al cliente opaca: reintegros demorados y cuentas congeladas por "movimientos inusuales".',
      'No es un banco: sin créditos hipotecarios ni caja de ahorro tradicional.',
    ],
    flag: undefined,
    verdict:
      'Con criterios parejos, la fintech le gana a casi todos los bancos: app excelente, casi todo gratis, rinde el saldo y la tarjeta compra afuera sin recargo. El talón de Aquiles es el soporte cuando algo sale mal. Desde ~mayo 2026 sumó rendimientos, tarjeta internacional y POS.',
  },
  {
    id: 'itau',
    name: 'Itaú',
    kind: 'banco',
    identity: 'Banco privado (el más grande)',
    tagline: 'El banco privado mejor armado en lo digital.',
    scores: { app: 92, comisiones: 50, atencion: 68, usd: 78, productos: 88, cobertura: 82 },
    signals: [
      { label: 'App', value: '4,48/5 Play', tone: 'pos' },
      { label: 'Productos', value: 'gama completa', tone: 'pos' },
      { label: 'Costos', value: 'perfil "caro"', tone: 'neg' },
    ],
    bestFor: 'Quien quiere el mejor combo app + productos y no le pesa pagar por el servicio.',
    pros: [
      'La app mejor puntuada entre los grandes (≈4,48/5 con ~25 mil reseñas).',
      'Amplia cartera de tarjetas y programa de beneficios; suele liderar tasas de plazo fijo a plazos largos.',
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
    scores: { app: 82, comisiones: 58, atencion: 68, usd: 86, productos: 82, cobertura: 76 },
    signals: [
      { label: 'App', value: 'bien valorada', tone: 'pos' },
      { label: 'Dólares', value: 'fuerte', tone: 'pos' },
      { label: 'Apple Pay', value: 'todavía no', tone: 'neg' },
    ],
    bestFor: 'Freelancers y empleados de zona franca que cobran en USD y quieren hipoteca.',
    pros: [
      'App completa y bien valorada; buena para operar en dólares.',
      'Condiciones pensadas para ingresos en USD y foco en crédito hipotecario.',
      'Promociones y beneficios comerciales frecuentes.',
    ],
    cons: [
      'App algo lenta y sin Apple Pay (solo Google Pay), pedido recurrente en reseñas.',
      'Reputación "multinacional" en comisiones (más de imagen que de datos locales verificados).',
    ],
    verdict:
      'El más elegido por perfiles con ingresos en dólares: operativa USD sólida, hipotecas y una app que gusta. Le falta Apple Pay y algo de velocidad para pelear el primer puesto.',
  },
  {
    id: 'brou',
    name: 'BROU',
    kind: 'banco',
    identity: 'Banco República (estatal)',
    tagline: 'El aburrido confiable que está en todos lados.',
    scores: { app: 58, comisiones: 86, atencion: 52, usd: 64, productos: 80, cobertura: 99 },
    signals: [
      { label: 'App eBROU', value: '4,34/5 Play', tone: 'neutral' },
      { label: 'Red', value: 'la más grande', tone: 'pos' },
      { label: 'Trámites', value: 'burocráticos', tone: 'neg' },
    ],
    bestFor: 'Quien prioriza respaldo estatal, cajeros en todo el país y costos bajos.',
    pros: [
      'La red de sucursales y cajeros más grande; a veces el único banco del pueblo.',
      'Costos bajos: préstamos sin comisiones agregadas, plazo fijo con mínimo bajo (ideal para ahorrista chico).',
      'Respaldo estatal: el "por defecto" confiable.',
    ],
    cons: [
      'App con límites rígidos, fricción de login y estabilidad irregular tras updates.',
      'Trámites y colas: la burocracia de una entidad estatal grande.',
    ],
    verdict:
      'Con criterios parejos queda en el pelotón, pero cambiá el filtro a "uso diario / cobertura" y salta al tope: nadie le gana en red física ni en costo. La app y la atención son su techo.',
  },
  {
    id: 'bbva',
    name: 'BBVA',
    kind: 'banco',
    identity: 'Banco privado (multinacional)',
    tagline: 'Buen digital, huella chica.',
    scores: { app: 84, comisiones: 60, atencion: 60, usd: 74, productos: 76, cobertura: 64 },
    signals: [
      { label: 'Alta 100% online', value: 'solo con cédula', tone: 'pos' },
      { label: 'App', value: 'de referencia', tone: 'pos' },
      { label: 'Red', value: 'más chica', tone: 'neg' },
    ],
    bestFor: 'Quien abre cuenta desde el celu y quiere cashback y cuentas en dólares.',
    pros: [
      'Alta de cuenta 100% dentro de la app con cédula uruguaya.',
      'App/home banking históricamente de referencia; pionero en cashback y cuentas en dólares.',
    ],
    cons: [
      'Menor cantidad de sucursales y cajeros que BROU/Itaú/Santander.',
      'Datos locales de atención/comisiones más finos; puntuamos conservador.',
    ],
    verdict:
      'Su gran carta es el onboarding digital y una app pulida. Pierde puntos por cobertura física y porque hay menos evidencia local dura de servicio, así que lo puntuamos con prudencia.',
  },
  {
    id: 'takenos',
    name: 'Takenos',
    kind: 'fintech',
    identity: 'Fintech (cuenta USD para freelancers)',
    tagline: 'Cobrar del exterior sin que te coman las comisiones.',
    scores: { app: 70, comisiones: 82, atencion: 58, usd: 92, productos: 56, cobertura: 58 },
    signals: [
      { label: 'Trustpilot', value: '3,7/5', tone: 'neutral' },
      { label: 'Cuenta USD EEUU', value: 'sí', tone: 'pos' },
      { label: 'Soporte', value: '24/7 WhatsApp', tone: 'pos' },
    ],
    bestFor: 'Freelancers que facturan a clientes del exterior y quieren dólares reales, ya.',
    pros: [
      'Cuenta en dólares en EEUU: recibís USD por ACH/WIRE casi instantáneo y sin comisiones.',
      'Ahorro en dólares digitales, retiro a USDT o rieles locales; tarjeta usable en cualquier país.',
      'Soporte 24/7 por WhatsApp.',
    ],
    cons: [
      'Cola de reseñas negativas sobre recuperar fondos y cuentas cerradas con saldo adentro.',
      'Producto angosto (recibir/ahorrar USD): no reemplaza a un banco.',
    ],
    verdict:
      'Herramienta de nicho muy querida por freelancers para cobrar afuera. Marcá el filtro "dólares" y se dispara a lo más alto; su 3,7 refleja una minoría con problemas para sacar la plata.',
  },
  {
    id: 'heritage',
    name: 'Banco Heritage',
    kind: 'banco',
    identity: 'Banco privado suizo (boutique)',
    tagline: 'Atención de guante blanco y dólares que rinden.',
    scores: { app: 56, comisiones: 64, atencion: 92, usd: 94, productos: 74, cobertura: 34 },
    signals: [
      { label: 'Cuenta USD a la vista', value: '~3,5% anual', tone: 'pos' },
      { label: 'Atención', value: 'oficial directo', tone: 'pos' },
      { label: 'Sucursales', value: 'muy pocas', tone: 'neg' },
    ],
    bestFor: 'Ahorristas en dólares y saldos medios/altos que quieren trato personalizado.',
    pros: [
      'Único banco de capitales suizos; sin call center: cada cliente tiene un oficial de cuenta directo.',
      '"Smart Account" en USD que paga ~3,5% anual sobre el saldo a la vista (raro en plaza) y plataforma multimoneda.',
      'Alta satisfacción autoinformada; suele liderar plazo fijo en dólares a plazos largos.',
    ],
    cons: [
      'Huella física mínima: no es para quien quiere cajeros en cada esquina.',
      'Perfil afluente/boutique: no es un banco masivo de uso diario.',
    ],
    verdict:
      'El secreto de los que ahorran en dólares. Con criterios parejos queda en B por su cobertura chica, pero filtrá por "dólares" o "atención" y se va al tope. No es para todos; para su nicho, es de lo mejor.',
  },
  {
    id: 'astropay',
    name: 'Astropay',
    kind: 'fintech',
    identity: 'Fintech uruguaya (billetera + tarjeta)',
    tagline: 'Billetera global con buenas reseñas y una cola de trabas.',
    scores: { app: 80, comisiones: 60, atencion: 56, usd: 78, productos: 54, cobertura: 70 },
    signals: [
      { label: 'Trustpilot', value: '4,4–4,7/5', tone: 'pos' },
      { label: 'Depósitos', value: 'rápidos', tone: 'pos' },
      { label: 'KYC / retiros', value: 'trabas puntuales', tone: 'neg' },
    ],
    bestFor: 'Compras online, plataformas internacionales y mover dólares entre servicios.',
    pros: [
      'Puntajes altos en Trustpilot; rápida, fácil e integrada con muchas plataformas.',
      'Origen uruguayo; útil para tarjeta en USD y pagos transfronterizos.',
    ],
    cons: [
      'Minoría real de casos: verificación KYC lenta y cuentas bloqueadas sin explicación.',
      'Producto acotado a billetera/prepaga; piden comisiones más bajas.',
    ],
    verdict:
      'Buen promedio de reseñas y práctica para pagos internacionales, con una cola de problemas de KYC y retiros que conviene tener presente. Sólida en su rubro, no un reemplazo bancario.',
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    kind: 'banco',
    identity: 'Banco privado (canadiense)',
    tagline: 'El que más quejas de servicio junta.',
    scores: { app: 66, comisiones: 42, atencion: 36, usd: 70, productos: 74, cobertura: 60 },
    signals: [
      { label: 'Atención', value: 'quejas recurrentes', tone: 'neg' },
      { label: 'Cajeros gratis', value: 'recortados 05/2026', tone: 'neg' },
      { label: 'Scotia Puntos', value: 'ok', tone: 'neutral' },
    ],
    bestFor: 'Quien ya tiene el paquete y usa Scotia Puntos / Club Card Tienda Inglesa.',
    pros: [
      'App funcional (transferencias, saldos, movimientos) y respaldo de un banco canadiense grande.',
      'Buenos programas de premios (Scotia Puntos, Club Card Tienda Inglesa).',
    ],
    cons: [
      'Atención telefónica floja, demoras para abrir cuenta y facturación con errores.',
      'Erosión de beneficios: desde mayo 2026 recortó los retiros Banred gratis de la Cuenta Sueldo Básica.',
    ],
    verdict:
      'Es el banco que más consistentemente aparece por mal servicio y por recortar beneficios "sin comisiones". La app cumple, pero la experiencia alrededor lo empuja hacia abajo.',
  },
  {
    id: 'prex',
    name: 'Prex',
    kind: 'fintech',
    identity: 'Fintech (cuenta + prepaga)',
    tagline: 'Cómoda hasta que algo sale mal.',
    scores: { app: 72, comisiones: 46, atencion: 16, usd: 54, productos: 40, cobertura: 76 },
    signals: [
      { label: 'Trustpilot', value: '1,9/5', tone: 'neg' },
      { label: 'Fraude/phishing', value: 'casos en prensa', tone: 'neg' },
      { label: 'Sin cuenta bancaria', value: 'práctica', tone: 'pos' },
    ],
    bestFor: 'Uso liviano local/USD sin abrir cuenta en banco; guardá poco saldo.',
    pros: [
      'App simple y prepaga sin necesidad de cuenta bancaria; muy popular entre jóvenes.',
      'Recargas y transferencias fáciles para uso cotidiano.',
    ],
    cons: [
      'Reputación de soporte pésima (Trustpilot ≈1,9/5): ante fraude, tiende a responsabilizar al usuario.',
      'Blanco de phishing con casos en prensa; comisiones de retiro y de compra en el exterior altas.',
    ],
    verdict:
      'La usan miles por comodidad, pero su manejo de fraudes y su soporte arrastran la peor reputación independiente del listado. Útil para saldos chicos; no le confíes plata que no puedas perder.',
  },
  {
    id: 'hsbc',
    name: 'HSBC',
    kind: 'banco',
    identity: 'Banco privado — en salida del país',
    tagline: 'Se va de Uruguay: pasa a manos de BTG Pactual.',
    scores: { app: 52, comisiones: 42, atencion: 44, usd: 70, productos: 54, cobertura: 26 },
    signals: [
      { label: 'Venta a BTG Pactual', value: 'US$175M', tone: 'neg' },
      { label: 'Cierre', value: '~2º sem. 2026', tone: 'neg' },
      { label: 'Sucursales', value: 'solo ~5', tone: 'neg' },
    ],
    bestFor:
      'Prácticamente nadie nuevo: está en transición. Clientes actuales, atentos al traspaso.',
    pros: [
      'Banca internacional con foco afluente/premier mientras dura la transición.',
      'Operativa en dólares propia de un banco global.',
    ],
    cons: [
      'Vende toda su operación uruguaya a BTG Pactual (acordado jul. 2025, cierre ~2º sem. 2026): marca en retirada.',
      'Huella mínima (≈5 sucursales) y foco en saldos altos; no es para el usuario masivo.',
    ],
    flag: 'En transición a BTG Pactual — no lo tomes como opción estable',
    verdict:
      'Lo incluimos porque muchos lo buscan, pero para abrir cuenta hoy no tiene sentido: está saliendo del mercado. Su futuro es la marca brasileña BTG Pactual. Si sos cliente, seguí de cerca el traspaso.',
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
