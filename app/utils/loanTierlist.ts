// app/utils/loanTierlist.ts
// Data + helpers for /mejores-prestamos-uruguay — a tier list of WHERE to ask for a personal loan
// in Uruguay: banks, financieras, cooperativas, fintech and pawn/secured lenders.
//
// How this differs from /prestamos-uruguay (which already exists): that page is a comparison TABLE
// of advertised TEAs. This one answers a different question — "given who I am and what I need,
// which door do I knock on?" — and the answer changes completely depending on whether the reader
// is in the Clearing, needs the money today, or just wants the cheapest rate.
//
// PURE module (no Vue/Nuxt) so the page, the API merge and the unit tests share one source of
// truth.
//
// ── The one design decision that matters ────────────────────────────────────────────────────────
// The per-dimension scores are NOT typed in. Every dimension except `reputacion` is COMPUTED from
// the lender's hard facts (rate, clearing policy, income floor, disbursement time, fees, limits),
// and the tier falls out of the weighted average. That is what makes a weekly refresh worth
// running: when the Claude job finds that a lender's TEA moved from 45% to 62%, or that it stopped
// lending to people with Clearing marks, the board RE-TIERS ITSELF. A tier list of hand-typed
// scores would need a human to re-grade it, so in practice it would go stale — which is how most
// "actualizado 2026" ranking pages end up lying.
//
// `reputacion` is the deliberate exception: it is an editorial read of reviews, Reddit and press,
// and no automated pass gets to move it without evidence a human looked at.
//
// Rates are ADVERTISED references. The number that binds you is the CFT in the contract, and in
// Uruguay the quoted TEA usually leaves IVA on the interest out — see `ivaOnInterest`.
// Informational, not financial advice, and we are not affiliated with any lender.

/** Scoring dimensions of the rubric. */
export type LoanDimId = 'tasa' | 'acceso' | 'costo' | 'velocidad' | 'flexibilidad' | 'reputacion'

/** Tier buckets, best → worst. */
export type LoanTierId = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

/** What kind of institution this is. Drives the filter chips and how hard we judge it. */
export type LenderSegment = 'banco' | 'financiera' | 'cooperativa' | 'fintech' | 'prendario' | 'p2p'

/**
 * Whether this lender will lend to somebody who currently HAS negative marks in the Clearing de
 * Informes / a bad rating in the BCU's Central de Riesgos.
 *
 * - `si`      — lends with marks, and says so itself or it is verifiable.
 * - `parcial` — lends with marks only under conditions (collateral, co-signer, small amount,
 *               payroll deduction) or only for some kinds of mark.
 * - `no`      — a clean record is a stated requirement.
 * - `desconocido` — we could not establish it. Scored as `no`, but labelled honestly.
 */
export type ClearingStance = 'si' | 'parcial' | 'no' | 'desconocido'

/** Who the lender will actually consider. */
export type Audience = 'dependiente' | 'jubilado' | 'independiente' | 'extranjero' | 'socio'

/** Supervision status at the BCU. Not a quality mark by itself — it is a recourse question. */
export type BcuStatus = 'supervisada' | 'registrada' | 'no-regulada' | 'desconocido'

export interface RubricDimension {
  id: LoanDimId
  label: string
  /** Short imperative used on the toggle chips. */
  short: string
  icon: string
  /** Weight in the balanced (all-criteria) overall; the set sums to 100. */
  weight: number
  what: string
  /** True when the score is computed from facts rather than editorially assigned. */
  derived: boolean
}

/**
 * The transparent, weighted rubric.
 *
 * `tasa` leads because it is the only dimension that is a number of pesos, and `acceso` is right
 * behind it because a 28% rate you cannot get is worth less than a 60% one you can. Everything
 * after that is how much the loan hurts around the edges.
 */
export const LOAN_RUBRIC: readonly RubricDimension[] = Object.freeze([
  {
    id: 'tasa',
    label: 'Tasa de interés',
    short: 'Tasa',
    icon: 'mdi-percent-outline',
    weight: 26,
    what: 'La TEA publicada, con dos correcciones: le sumamos el IVA sobre los intereses cuando va aparte, y cuando publican un rango pesamos más el techo que el "desde", porque la tasa del aviso casi nunca es la que te toca.',
    derived: true,
  },
  {
    id: 'acceso',
    label: 'A quién le prestan',
    short: 'Acceso',
    icon: 'mdi-door-open',
    weight: 22,
    what: 'Si prestan estando en el Clearing, qué ingreso mínimo piden y si aceptan jubilados, independientes o extranjeros. Una tasa que no podés obtener no es una tasa.',
    derived: true,
  },
  {
    id: 'costo',
    label: 'Costo total y letra chica',
    short: 'Letra chica',
    icon: 'mdi-file-document-alert-outline',
    weight: 14,
    what: 'Si publican el CFT, si cobran gastos de otorgamiento, si el seguro es obligatorio y si podés cancelar antes sin multa.',
    derived: true,
  },
  {
    id: 'velocidad',
    label: 'Rapidez',
    short: 'Rapidez',
    icon: 'mdi-flash-outline',
    weight: 14,
    what: 'Cuánto tarda de verdad entre que pedís y tenés la plata, y si el trámite se hace entero online o hay que ir a una sucursal.',
    derived: true,
  },
  {
    id: 'flexibilidad',
    label: 'Montos y plazos',
    short: 'Montos',
    icon: 'mdi-arrow-expand-horizontal',
    weight: 12,
    what: 'Hasta cuánto prestan, a cuántos meses, en qué moneda y si te obligan a la retención del sueldo.',
    derived: true,
  },
  {
    id: 'reputacion',
    label: 'Reputación y trato',
    short: 'Reputación',
    icon: 'mdi-account-heart-outline',
    weight: 12,
    what: 'Reseñas reales, quejas en Reddit y prensa, cómo cobran cuando te atrasás y qué tan claro te explican lo que firmás. Es la única dimensión que ponemos a mano.',
    derived: false,
  },
])

export const LOAN_DIM_IDS: readonly LoanDimId[] = Object.freeze(LOAN_RUBRIC.map(d => d.id))

const WEIGHT_BY_ID: Record<LoanDimId, number> = LOAN_RUBRIC.reduce(
  (acc, d) => {
    acc[d.id] = d.weight
    return acc
  },
  {} as Record<LoanDimId, number>
)

/** Tier presentation + the minimum overall score to reach it. */
export interface LoanTierMeta {
  id: LoanTierId
  label: string
  blurb: string
  min: number
}

/**
 * Tier thresholds.
 *
 * S is reachable here, unlike on the bank tier list — a cheap bank loan you can get in a day is a
 * genuinely good product. What is NOT reachable is a lender that scores well on everything AND
 * lends to people in the Clearing: in Uruguay those two things trade off against each other, and
 * the board showing that trade-off is the whole point.
 */
export const LOAN_TIERS: readonly LoanTierMeta[] = Object.freeze([
  { id: 'S', label: 'S', blurb: 'Barato, accesible y sin trampas. Muy pocos llegan.', min: 82 },
  { id: 'A', label: 'A', blurb: 'De lo mejor de la plaza para este perfil.', min: 70 },
  { id: 'B', label: 'B', blurb: 'Sirve, con un pero que conviene mirar.', min: 61 },
  { id: 'C', label: 'C', blurb: 'Cumple si no te queda otra. Comparalo antes.', min: 51 },
  { id: 'D', label: 'D', blurb: 'Caro o exigente. Solo para un caso puntual.', min: 41 },
  { id: 'F', label: 'F', blurb: 'Última opción. Leé dos veces antes de firmar.', min: 0 },
])

/** A concrete, verifiable data point shown as a credibility chip. */
export interface LoanSignal {
  label: string
  value: string
  tone: 'pos' | 'neg' | 'neutral'
}

export interface LoanSource {
  label: string
  url: string
}

/**
 * The facts a weekly refresh is allowed to move.
 *
 * Split out from the editorial fields on purpose: `mergeLenderFacts` replaces values in HERE and
 * nowhere else, so an automated pass can never rewrite a verdict, invent a pro or delete a con.
 */
export interface LenderFacts {
  /** Representative advertised annual effective rate (TEA) in %, or null when quote-only. */
  teaPct: number | null
  /** Top of the published band, when the lender publishes a range. */
  teaMaxPct: number | null
  /** Is IVA charged ON TOP of the quoted interest? In Uruguay the answer is usually yes. */
  ivaOnInterest: boolean
  /** Does the lender publish a Costo Financiero Total, not just a TEA? */
  publishesCft: boolean
  clearing: ClearingStance
  clearingNote: string
  /** Minimum monthly net income required, in UYU. */
  minIncomeUyu: number | null
  maxAmountUyu: number | null
  maxTermMonths: number | null
  currencies: readonly ('UYU' | 'USD' | 'UI')[]
  /** Can the whole thing — request, signature, money — be done without going anywhere? */
  onlineEndToEnd: boolean
  /** Typical hours from request to money in hand. Null when it is genuinely case-by-case. */
  disbursementHours: number | null
  audiences: readonly Audience[]
  /** Does it require (not merely offer) deduction from salary/pension? */
  payrollDeductionRequired: boolean
  /** Can you repay early without a penalty? Null when unpublished. */
  earlyRepaymentFree: boolean | null
  /** Does it charge an origination/administration fee on top of interest? */
  originationFee: boolean | null
  /** Is a life/unemployment/balance insurance compulsory and billed inside the instalment? */
  insuranceMandatory: boolean | null
  bcu: BcuStatus
  /** Must you become a member (and pay for it) before borrowing? */
  membershipRequired: boolean
}

export interface LenderEntity extends LenderFacts {
  id: string
  name: string
  segment: LenderSegment
  /** Ownership / one-line identity, e.g. "Banco estatal" or "Cooperativa de capitalización". */
  identity: string
  /** Punchy one-liner shown under the name. */
  tagline: string
  /** Editorial 0–100. The ONE score a refresh may not touch. */
  reputacion: number
  signals: readonly LoanSignal[]
  bestFor: string
  pros: readonly string[]
  cons: readonly string[]
  /** Standout warning rendered as a badge + note. */
  flag?: string
  verdict: string
  website: string
  /** The page the facts above were read off. */
  sourceUrl: string
  sources: readonly LoanSource[]
  /** Reddit-sentiment entity id, when we track chatter for this lender. */
  redditId?: string
}

// ---------------------------------------------------------------------------
// Derived scores — the heart of the page
// ---------------------------------------------------------------------------

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Cheapest and dearest rates we map onto the 0–100 scale.
 *
 * Anchored to reality rather than to round numbers: BROU's cheapest retained-salary lines sit
 * around 20% and the BCU's usury ceiling for small consumer loans runs well past 150%, so a lender
 * at the top of that band has genuinely run out of room to be worse.
 */
export const TEA_BEST = 18
export const TEA_WORST = 160

/**
 * How much of a published band to take from its TOP rather than its "desde".
 *
 * This is the single most load-bearing constant on the page. Uruguayan lenders advertise the floor
 * of a very wide band — FUCEREP publishes 14,25% to 99%, OCA 29% to 87%, Crediton 75% to 130% —
 * and scoring the floor would hand the best rating to whoever writes the widest range, which is
 * the exact behaviour this page exists to expose. 0,6 says the rate you are actually offered sits
 * nearer the top of the band than the number in the ad. A lender that publishes ONE rate is
 * unaffected, so honesty is never punished.
 */
const BAND_TOP_WEIGHT = 0.6

/** The rate a reader should expect, given what the lender publishes. */
export function representativeTea(
  teaPct: number | null,
  teaMaxPct: number | null = null
): number | null {
  // Some lenders publish only the CEILING they reserve the right to charge — Creditel's monthly
  // MEF table and Pago Después's "topes según BCU" are both this. The honest reading is that the
  // ceiling is the only rate they have committed to in public, so it is the one they get scored on.
  if (teaPct == null || !Number.isFinite(teaPct)) {
    return teaMaxPct != null && Number.isFinite(teaMaxPct) ? teaMaxPct : null
  }
  if (teaMaxPct == null || !Number.isFinite(teaMaxPct) || teaMaxPct <= teaPct) return teaPct
  return teaPct * (1 - BAND_TOP_WEIGHT) + teaMaxPct * BAND_TOP_WEIGHT
}

/**
 * TEA → 0–100, interpolated on the LOG of the rate.
 *
 * Log rather than linear because the reader's pain is proportional: going from 25% to 45% nearly
 * doubles what the loan costs, while 120% → 140% barely changes a decision that was already bad.
 * A linear scale squashes the whole cheap end — where every mainstream bank lives — into four
 * points, which would make the board useless exactly where most readers are choosing.
 *
 * `null` (the lender publishes no rate at all) scores 42, not 0: refusing to publish is a real
 * negative, but it is not evidence of a terrible rate. The punishment for opacity lives in
 * `costoScore`, where it belongs and where it is not confusable with "this loan is expensive".
 */
export function teaScore(
  teaPct: number | null,
  ivaOnInterest = false,
  teaMaxPct: number | null = null
): number {
  const rate = representativeTea(teaPct, teaMaxPct)
  if (rate == null || rate < 0) return 42
  // A genuine 0% is not a missing value. PayFlex charges the employer, not the worker, so the
  // borrower's rate really is zero — collapsing that into the "no publica" bucket would score the
  // cheapest thing on the board like the most opaque one.
  if (rate === 0) return 100
  // IVA on the interest is not a rounding detail — at the basic 22% rate it turns a 40% TEA into
  // an effective ~48,8%. Lenders that quote IVA-inclusive should not be punished for honesty.
  const effective = ivaOnInterest ? rate * 1.22 : rate
  const lo = Math.log(TEA_BEST)
  const hi = Math.log(TEA_WORST)
  const raw = (hi - Math.log(effective)) / (hi - lo)
  return Math.round(clamp(raw * 100))
}

/** Clearing stance → the base of the access score. */
const CLEARING_BASE: Record<ClearingStance, number> = {
  si: 96,
  parcial: 72,
  no: 34,
  // Scored as a refusal: assuming an unproven "yes" would send somebody with marks to a door that
  // closes in their face, which is the exact failure this page exists to prevent.
  desconocido: 34,
}

/**
 * Who can actually get this loan, 0–100.
 *
 * Built from the Clearing stance, then adjusted by the income floor and how many kinds of person
 * the lender will look at. A lender that only serves its own payroll customers is narrow even if
 * it never checks the Clearing.
 */
export function accesoScore(f: LenderFacts): number {
  let score = CLEARING_BASE[f.clearing]

  // Income floor. The reference is a full-time minimum wage: a lender asking for well above it has
  // quietly excluded a large share of the people reading this page.
  if (f.minIncomeUyu != null) {
    if (f.minIncomeUyu >= 40000) score -= 16
    else if (f.minIncomeUyu >= 25000) score -= 9
    else if (f.minIncomeUyu >= 15000) score -= 4
  }

  // Breadth: dependiente is the baseline everyone serves; each additional audience is a door.
  const extra = f.audiences.filter(a => a !== 'dependiente').length
  score += Math.min(12, extra * 4)

  if (f.membershipRequired) score -= 8
  if (f.payrollDeductionRequired) score -= 10
  if (!f.onlineEndToEnd) score -= 4

  return Math.round(clamp(score))
}

/**
 * Cost transparency and the fees that live outside the headline rate, 0–100.
 *
 * Starts at a deliberately mediocre 46: publishing a TEA and nothing else is the Uruguayan norm,
 * and the norm should not read as a good score.
 */
export function costoScore(f: LenderFacts): number {
  let score = 46
  if (f.publishesCft) score += 22
  else if (f.teaPct != null) score += 8
  // Publishing NOTHING is punished harder than publishing a bad number, and deliberately so.
  // Without this, the board rewarded opacity twice over: a lender with a terrible published rate
  // scored ~11 on `tasa` while one that published nothing scored 42, so hiding the price came out
  // ahead of having a high one. The price of a loan you cannot see before you apply is not
  // unknown to the lender — only to you.
  // Publishing only a ceiling sits between the two: worse than a real rate, better than silence.
  if (f.teaPct == null) score -= f.teaMaxPct != null ? 10 : 26
  if (!f.ivaOnInterest) score += 6
  if (f.originationFee === false) score += 10
  else if (f.originationFee === true) score -= 12
  if (f.insuranceMandatory === false) score += 8
  else if (f.insuranceMandatory === true) score -= 10
  if (f.earlyRepaymentFree === true) score += 12
  else if (f.earlyRepaymentFree === false) score -= 12
  if (f.bcu === 'no-regulada') score -= 12
  else if (f.bcu === 'desconocido') score -= 6
  else if (f.bcu === 'supervisada') score += 6
  return Math.round(clamp(score))
}

/** Request → money in hand, 0–100. */
export function velocidadScore(f: LenderFacts): number {
  let score: number
  const h = f.disbursementHours
  if (h == null) score = 48
  else if (h <= 1) score = 98
  else if (h <= 4) score = 92
  else if (h <= 24) score = 84
  else if (h <= 48) score = 72
  else if (h <= 72) score = 62
  else if (h <= 168) score = 48
  else score = 32
  if (f.onlineEndToEnd) score += 8
  else score -= 8
  if (f.membershipRequired) score -= 6
  return Math.round(clamp(score))
}

/** How far the product stretches — amount, term, currency, and whether it grabs your salary. */
export function flexibilidadScore(f: LenderFacts): number {
  let score = 40

  // Amount, on a log scale: the jump from 50k to 200k changes what you can do with the money far
  // more than the jump from 1M to 2M.
  if (f.maxAmountUyu != null && f.maxAmountUyu > 0) {
    const norm =
      (Math.log(f.maxAmountUyu) - Math.log(20000)) / (Math.log(2000000) - Math.log(20000))
    score += clamp(norm, 0, 1) * 30
  } else {
    // No published ceiling usually means "depends on your file", which is neither good nor bad.
    score += 15
  }

  if (f.maxTermMonths != null) {
    if (f.maxTermMonths >= 60) score += 18
    else if (f.maxTermMonths >= 48) score += 15
    else if (f.maxTermMonths >= 36) score += 11
    else if (f.maxTermMonths >= 24) score += 7
    else if (f.maxTermMonths >= 12) score += 3
  } else {
    score += 8
  }

  score += Math.min(8, Math.max(0, f.currencies.length - 1) * 4)
  if (f.payrollDeductionRequired) score -= 10

  return Math.round(clamp(score))
}

/** Every dimension for one lender: five derived, `reputacion` as authored. */
export function scoresFor(entity: LenderEntity): Record<LoanDimId, number> {
  return {
    tasa: teaScore(entity.teaPct, entity.ivaOnInterest, entity.teaMaxPct),
    acceso: accesoScore(entity),
    costo: costoScore(entity),
    velocidad: velocidadScore(entity),
    flexibilidad: flexibilidadScore(entity),
    reputacion: Math.round(clamp(entity.reputacion)),
  }
}

/**
 * Overall score (0–100) over a subset of active dimensions, re-weighted by each dimension's
 * rubric weight. With all six active it is the balanced overall; with a subset it answers "how
 * good is this lender for somebody who only cares about these things". An empty subset falls back
 * to all dimensions, so a filter can never hide everything.
 */
export function scoreFor(
  entity: LenderEntity,
  active: readonly LoanDimId[] = LOAN_DIM_IDS
): number {
  const dims = active.length ? active : LOAN_DIM_IDS
  const scores = scoresFor(entity)
  let weighted = 0
  let totalWeight = 0
  for (const id of dims) {
    weighted += scores[id] * WEIGHT_BY_ID[id]
    totalWeight += WEIGHT_BY_ID[id]
  }
  return totalWeight === 0 ? 0 : Math.round(weighted / totalWeight)
}

export function tierForScore(score: number): LoanTierId {
  for (const t of LOAN_TIERS) {
    if (score >= t.min) return t.id
  }
  return 'F'
}

export interface RankedLender {
  entity: LenderEntity
  score: number
  scores: Record<LoanDimId, number>
  tier: LoanTierId
}

export function rankLenders(
  active: readonly LoanDimId[] = LOAN_DIM_IDS,
  pool: readonly LenderEntity[] = LENDER_TIERLIST
): RankedLender[] {
  return pool
    .map(entity => {
      const score = scoreFor(entity, active)
      return { entity, score, scores: scoresFor(entity), tier: tierForScore(score) }
    })
    .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name))
}

export interface LoanTierRow {
  tier: LoanTierMeta
  items: RankedLender[]
}

/** The full board grouped S→F, every tier present so the scale reads consistently. */
export function buildBoard(
  active: readonly LoanDimId[] = LOAN_DIM_IDS,
  pool: readonly LenderEntity[] = LENDER_TIERLIST
): LoanTierRow[] {
  const ranked = rankLenders(active, pool)
  return LOAN_TIERS.map(tier => ({ tier, items: ranked.filter(r => r.tier === tier.id) }))
}

// ---------------------------------------------------------------------------
// Reader profiles
// ---------------------------------------------------------------------------

export interface LoanProfilePreset {
  id: string
  label: string
  icon: string
  dims: readonly LoanDimId[]
  hint: string
  /** Optional hard filter applied along with the weights (e.g. only lenders that take Clearing). */
  onlyClearing?: boolean
}

/**
 * Presets are not decoration: each one is a real person's question, and the board answers a
 * different one for each. "Estoy en el clearing" additionally FILTERS — re-weighting alone would
 * still leave a reader staring at banks that will never approve them.
 */
export const LOAN_PROFILE_PRESETS: readonly LoanProfilePreset[] = Object.freeze([
  {
    id: 'equilibrado',
    label: 'Equilibrado',
    icon: 'mdi-scale-balance',
    dims: LOAN_DIM_IDS,
    hint: 'Todos los criterios con su peso. La foto general.',
  },
  {
    id: 'clearing',
    label: 'Estoy en el clearing',
    icon: 'mdi-account-alert-outline',
    dims: ['acceso', 'costo', 'reputacion'],
    hint: 'Solo los que prestan con antecedentes, ordenados por cuánto te cuidan y cuánto te cobran.',
    onlyClearing: true,
  },
  {
    id: 'urgente',
    label: 'Necesito la plata ya',
    icon: 'mdi-flash-outline',
    dims: ['velocidad', 'acceso', 'tasa'],
    hint: 'Desembolso en horas y trámite online, sin regalar del todo la tasa.',
  },
  {
    id: 'mas-barato',
    label: 'La tasa más baja',
    icon: 'mdi-percent-outline',
    dims: ['tasa', 'costo'],
    hint: 'El costo del dinero y nada más: tasa publicada y letra chica.',
  },
  {
    id: 'jubilado',
    label: 'Jubilado o pensionista',
    icon: 'mdi-account-cane',
    dims: ['acceso', 'tasa', 'reputacion'],
    hint: 'Quién presta contra una pasividad, a qué precio y con qué trato.',
  },
  {
    id: 'monto-grande',
    label: 'Monto grande, largo plazo',
    icon: 'mdi-arrow-expand-horizontal',
    dims: ['flexibilidad', 'tasa', 'costo'],
    hint: 'Cuando el problema no es llegar a fin de mes sino financiar algo caro.',
  },
])

export function matchPreset(
  active: readonly LoanDimId[],
  onlyClearing = false
): LoanProfilePreset | undefined {
  const key = [...active].sort().join(',')
  return LOAN_PROFILE_PRESETS.find(
    p => [...p.dims].sort().join(',') === key && !!p.onlyClearing === onlyClearing
  )
}

export const SEGMENT_LABELS: Record<LenderSegment, string> = Object.freeze({
  banco: 'Banco',
  financiera: 'Financiera',
  cooperativa: 'Cooperativa',
  fintech: 'Fintech',
  prendario: 'Prendario / empeño',
  p2p: 'Entre personas',
})

export const CLEARING_LABELS: Record<ClearingStance, string> = Object.freeze({
  si: 'Presta con clearing',
  parcial: 'Con condiciones',
  no: 'Exige estar limpio',
  desconocido: 'No lo publica',
})

export const BCU_LABELS: Record<BcuStatus, string> = Object.freeze({
  supervisada: 'Supervisada por el BCU',
  registrada: 'Registrada ante el BCU',
  'no-regulada': 'Fuera del perímetro del BCU',
  desconocido: 'Situación no verificada',
})

// ---------------------------------------------------------------------------
// Weekly refresh merge
// ---------------------------------------------------------------------------

/** One lender's facts as refreshed by the weekly job, plus its provenance. */
export interface LenderFactPatch extends Partial<LenderFacts> {
  id: string
  /** ISO date the facts were last confirmed. */
  verifiedAt?: string
  /** The URL the refresh read them off — must be reachable for the patch to be accepted. */
  sourceUrl?: string
  /** What the pass changed, in words, for the "qué cambió esta semana" strip. */
  changeNote?: string
}

export interface LoanTierSnapshot {
  key: string
  asOf: string
  model: string
  patches: LenderFactPatch[]
  /** Human-readable list of what moved since the previous run. */
  changes: { id: string; name: string; text: string }[]
}

/**
 * Overlay a snapshot's facts on the seed catalogue.
 *
 * Deliberately narrow: only keys that exist in `LenderFacts` are copied, an unknown lender id is
 * ignored rather than appended, and a patch that is missing a field leaves the seed value in
 * place. So the worst a broken refresh can do is nothing — the page keeps serving last week's
 * facts rather than blanking or inventing a lender.
 */
const FACT_KEYS: readonly (keyof LenderFacts)[] = Object.freeze([
  'teaPct',
  'teaMaxPct',
  'ivaOnInterest',
  'publishesCft',
  'clearing',
  'clearingNote',
  'minIncomeUyu',
  'maxAmountUyu',
  'maxTermMonths',
  'currencies',
  'onlineEndToEnd',
  'disbursementHours',
  'audiences',
  'payrollDeductionRequired',
  'earlyRepaymentFree',
  'originationFee',
  'insuranceMandatory',
  'bcu',
  'membershipRequired',
])

export function mergeLenderFacts(
  seed: readonly LenderEntity[],
  patches: readonly LenderFactPatch[] | null | undefined
): LenderEntity[] {
  if (!patches?.length) return [...seed]
  const byId = new Map(patches.map(p => [p.id, p]))
  return seed.map(entity => {
    const patch = byId.get(entity.id)
    if (!patch) return entity
    const next: LenderEntity = { ...entity }
    for (const key of FACT_KEYS) {
      const value = patch[key]
      if (value !== undefined && value !== null) {
        ;(next as any)[key] = value
      } else if (value === null && (key === 'teaPct' || key === 'teaMaxPct')) {
        // An explicit null on a rate means "the lender stopped publishing it", which is
        // information. Every other null is "the pass had nothing to say".

        ;(next as any)[key] = null
      }
    }
    if (patch.sourceUrl) next.sourceUrl = patch.sourceUrl
    return next
  })
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------
//
// Facts read off each lender's OWN pages, tariff cartillas and PDFs in August 2026, plus the BCU's
// registers for the supervision status. Where a lender does not publish something the value is
// `null` and the ficha says so out loud — a gap is never filled from a comparison site, because
// half of those are stale and the other half are advertising with a byline.
//
// Four findings from that pass are worth stating up front, because they contradict most of what
// the Uruguayan "préstamos" web says:
//
//   1. ANDA answers it in its own FAQ: you can join and ask for a loan while in the Clearing. At
//      27–36% + IVA it is also, by a distance, the cheapest lender that will. Most "quién presta
//      en el clearing" articles leave ANDA out and fill the space with financieras at four times
//      that rate.
//   2. BROU, Itaú, BBVA, BTG and OCA say the opposite in writing — a clean Clearing record is a
//      published requirement. Several comparison sites list some of them as clearing-friendly.
//      BROU's pignoraticio (the gold pawn line) asks for it too, which surprises almost everyone.
//   3. Several lenders that everybody assumes are secretive DO publish their rate — just not on
//      the product page. BROU, Itaú, Scotiabank, BTG and Banque Heritage all put it in a PDF
//      cartilla, which is why a page that only reads the marketing page concludes "no publica".
//   4. The lenders that advertise hardest to people in the Clearing are the ones that publish
//      least about what they charge. That is not a coincidence, and `costoScore` is built to say so.
export const LENDER_TIERLIST: readonly LenderEntity[] = Object.freeze([
  // ── Bancos ────────────────────────────────────────────────────────────────
  {
    id: 'brou',
    name: 'BROU (Banco República)',
    segment: 'banco',
    identity: 'Banco estatal',
    tagline: 'El más barato del país, si tenés el legajo limpio y tiempo para el trámite.',
    teaPct: 26,
    teaMaxPct: 31,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No. Sus requisitos publicados piden no figurar con información negativa en el BROU ni en el resto del sistema financiero — y eso alcanza también al préstamo pignoraticio (el empeño de oro), que mucha gente supone que no mira nada.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 60,
    currencies: ['UYU', 'USD', 'UI'],
    onlineEndToEnd: false,
    disbursementHours: 72,
    audiences: ['dependiente', 'jubilado', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 72,
    signals: [
      { label: 'TEA por tramo de plazo (marzo 2026)', value: '26–31%', tone: 'pos' },
      { label: 'cuota máx. del sueldo', value: '35%', tone: 'neutral' },
      { label: 'la tasa vive en un PDF, no en la página', value: 'Tasas vigentes', tone: 'neg' },
    ],
    bestFor:
      'Quien cobra el sueldo o la jubilación por BROU, tiene el Clearing limpio y puede esperar unos días.',
    pros: [
      'Las tasas más bajas de la plaza: 26% a 6 cuotas y 31% al plazo más largo, contra 40% o más en cualquier banco privado.',
      'Presta también en dólares y en UI, cosa que casi ningún otro hace para consumo.',
      'Publica el tarifario completo por tramo de plazo y modalidad, con fecha de vigencia.',
    ],
    cons: [
      'El tarifario es un PDF: la página del producto no muestra el número que te va a tocar.',
      'Rechazo con cualquier marca negativa en el sistema financiero, sin matices.',
      'La modalidad estándar se resuelve en sucursal, y las colas siguen siendo su reclamo histórico.',
    ],
    verdict:
      'Cuando calificás, la discusión se termina: contra una financiera la diferencia no es de unos puntos, es de un orden de magnitud. Los dos peros son de forma, no de fondo — hay que abrir un PDF para saber cuánto cuesta, y hay que ir a la sucursal — y el filtro de entrada deja afuera justamente a quien busca un préstamo con urgencia.',
    website: 'https://www.brou.com.uy',
    sourceUrl:
      'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares',
    sources: [
      {
        label: 'BROU — préstamos de consumo sin retención',
        url: 'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-sin-retencion-en-pesos-ui-y-dolares',
      },
      {
        label: 'BROU — préstamo pignoraticio (pide Clearing limpio)',
        url: 'https://www.brou.com.uy/personas/prestamos/prestamo-pignoraticio',
      },
    ],
    redditId: 'brou',
  },
  {
    id: 'itau',
    name: 'Itaú Uruguay',
    segment: 'banco',
    identity: 'Banco privado',
    tagline: 'El préstamo bancario más rápido, si ya sos cliente con haberes.',
    teaPct: 32,
    teaMaxPct: 36,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No, y lo dice con todas las letras: "sin antecedentes negativos en Clearing de Informes", "estar al día con el BCU" y sin deudas vencidas con el banco.',
    minIncomeUyu: 23000,
    maxAmountUyu: null,
    maxTermMonths: 48,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 4,
    audiences: ['dependiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 70,
    signals: [
      { label: 'TEA en pesos (manual de tarifas, ago. 2026)', value: '32–36%', tone: 'pos' },
      { label: 'online sin papeles', value: 'hasta $300.000', tone: 'pos' },
      { label: 'ingreso mínimo', value: '$23.000', tone: 'neutral' },
    ],
    bestFor: 'Cliente de Itaú con el sueldo acreditado que necesita la plata el mismo día.',
    pros: [
      'Hasta $300.000 se resuelven dentro de la app, sin presentar documentación ni pisar una sucursal.',
      'Publica el manual de tarifas con la TEA por plazo y le pone fecha de versión.',
      'Su app es de las mejor puntuadas del sistema financiero uruguayo.',
    ],
    cons: [
      'Las tasas publicadas son las del cliente con haberes: sin acreditar sueldo la oferta cambia y no está publicada.',
      'Solo asalariados en relación de dependencia con doce meses de antigüedad.',
      'Cuando la cosa se tuerce, la cobranza pasa a un estudio jurídico externo, y ahí los relatos de presión y de amenaza de embargo son frecuentes.',
    ],
    verdict:
      'Para su propio cliente es probablemente el mejor préstamo bancario del país: rápido, sin trámite, con la tasa a la vista y a un precio que solo el BROU mejora. Para todos los demás es una puerta cerrada, y esa asimetría es lo que le impide subir más.',
    website: 'https://www.itau.com.uy',
    sourceUrl: 'https://www.itau.com.uy/inst/preAprobados.html',
    sources: [
      {
        label: 'Itaú — préstamos preaprobados',
        url: 'https://www.itau.com.uy/inst/preAprobados.html',
      },
      {
        label: 'Itaú — manual de tarifas, tasas y precios (PDF)',
        url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
      },
    ],
    redditId: 'itau',
  },
  {
    id: 'santander',
    name: 'Santander Uruguay',
    segment: 'banco',
    identity: 'Banco privado',
    tagline: 'Sin gastos de otorgamiento y con seguro incluido; la tasa, recién en el simulador.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No. Pide estar "libre de antecedentes según políticas vigentes del banco". A diferencia de BBVA o BTG no nombra al Clearing, pero el filtro es el mismo y la política concreta no se publica.',
    minIncomeUyu: 7500,
    maxAmountUyu: null,
    maxTermMonths: 60,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 48,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: false,
    insuranceMandatory: true,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 62,
    signals: [
      { label: 'gastos de otorgamiento', value: 'no cobra', tone: 'pos' },
      { label: 'ingreso mínimo con haberes', value: '$7.500', tone: 'pos' },
      { label: 'TEA publicada (ni en la web ni en el tarifario)', value: 'ninguna', tone: 'neg' },
    ],
    bestFor:
      'Quien tiene ingresos bajos pero formales y quiere un préstamo bancario sin costos de apertura.',
    pros: [
      'No cobra gastos de otorgamiento ni de administración, algo poco común incluso entre bancos.',
      'El seguro de vida y desempleo va incluido en la cuota, no como un extra que aparece al final.',
      'El piso de ingresos es de los más bajos de la banca: $7.500 líquidos acreditando haberes.',
    ],
    cons: [
      'Es el único banco grande que no publica la tasa en ningún lado: ni en la web, ni en el manual de tarifas.',
      'La cuota no puede pasar del 25% del ingreso, un tope más duro que el 35% del BROU.',
      'Exige tener o abrir cuenta, lo que convierte el préstamo en una relación completa con el banco.',
    ],
    verdict:
      'Hace bien lo que casi nadie hace —no cobrarte por prestarte y cubrirte el riesgo dentro de la cuota— y mal lo único que necesitás para decidir: decirte cuánto cuesta. Verificamos dos veces, en la página del producto y en el manual de tarifas: la tasa no está. Mientras siga así es imposible ponerlo por encima de los que sí la publican.',
    website: 'https://www.santander.com.uy',
    sourceUrl: 'https://www.santander.com.uy/todos-los-prestamos/prestamo-personal',
    sources: [
      {
        label: 'Santander — préstamo personal',
        url: 'https://www.santander.com.uy/todos-los-prestamos/prestamo-personal',
      },
    ],
    redditId: 'santander',
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank Uruguay',
    segment: 'banco',
    identity: 'Banco privado',
    tagline:
      'Publica la tasa en una cartilla que casi nadie encuentra, y tiene la peor app del país.',
    teaPct: 36.8,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Ni la página del producto ni la cartilla F.2121 mencionan el Clearing: todo queda en "sujeto a tu perfil crediticio". Sin política publicada, damos por hecho que evalúa como el resto de la banca.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 48,
    currencies: ['UYU', 'USD', 'UI'],
    onlineEndToEnd: true,
    disbursementHours: 72,
    audiences: ['dependiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 48,
    signals: [
      { label: 'TEA en pesos (cartilla F.2121, jul. 2026)', value: '36,8%', tone: 'pos' },
      { label: 'monedas', value: 'pesos, USD y UI', tone: 'pos' },
      { label: 'app: la peor puntuada del país', value: '2,45/5', tone: 'neg' },
    ],
    bestFor: 'Cliente con haberes en Scotiabank que valora la tasa por encima de la experiencia.',
    pros: [
      'Sí publica la TEA, con fecha de vigencia, en la cartilla de condiciones del producto.',
      'Presta en pesos, dólares y unidades indexadas, hasta 48 cuotas.',
      'Es dueño de Pronto!, así que si el banco dice que no, el grupo tiene una segunda puerta (bastante más cara).',
    ],
    cons: [
      'Su app es, con datos de las tiendas, la peor valorada del sistema financiero uruguayo.',
      'La tasa está en una cartilla enlazada desde una sección de condiciones, no en la página del préstamo.',
      'No publica su política de antecedentes, así que no hay forma de saber de antemano si te van a mirar el Clearing.',
    ],
    verdict:
      'El precio está bien y todo lo demás se siente de otra década. Si el préstamo fuera una transacción única daría igual, pero son entre dos y cuatro años de convivencia con la app y con la atención — y ahí es donde pierde.',
    website: 'https://www.scotiabank.com.uy',
    sourceUrl:
      'https://www.scotiabank.com.uy/Personas/Prestamos/Prestamo-Personal/prestamo-personal',
    sources: [
      {
        label: 'Scotiabank — préstamo personal',
        url: 'https://www.scotiabank.com.uy/Personas/Prestamos/Prestamo-Personal/prestamo-personal',
      },
      {
        label: 'Scotiabank — cartillas y condiciones de productos',
        url: 'https://www.scotiabank.com.uy/Acerca-de/condiciones-de-productos',
      },
      {
        label: 'Scotia Móvil — reseñas Google Play',
        url: 'https://play.google.com/store/apps/details?id=com.ingsw.scotiabankapp',
      },
    ],
    redditId: 'scotiabank',
  },
  {
    id: 'bbva',
    name: 'BBVA Uruguay',
    segment: 'banco',
    identity: 'Banco privado',
    tagline: 'El único que pone la tasa en la propia página. Plazo máximo: 24 cuotas.',
    teaPct: 28,
    teaMaxPct: 36,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No, y es el más explícito de todos: "no tener antecedentes negativos en Clearing de Informes, ni Banco Central del Uruguay" y no figurar en el listado de Morosos Alimenticios.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 24,
    currencies: ['UYU', 'USD', 'UI'],
    onlineEndToEnd: true,
    disbursementHours: 48,
    audiences: ['dependiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 60,
    signals: [
      { label: 'TEA promocional a 24 meses', value: '28%', tone: 'pos' },
      { label: 'TEA general en pesos', value: '36%', tone: 'neutral' },
      { label: 'plazo máximo', value: '24 cuotas', tone: 'neg' },
    ],
    bestFor: 'Monto a devolver rápido, con el sueldo en BBVA y el Clearing impecable.',
    pros: [
      'Es el único banco que publica la TEA en la propia página del producto, sin PDF ni simulador de por medio.',
      'La oferta a 24 meses al 28% es la tasa bancaria privada más baja que encontramos publicada.',
      'Presta en pesos, dólares (9%) y UI (12%).',
    ],
    cons: [
      'El plazo máximo de 24 meses duplica la cuota frente a los 48 o 60 de la competencia.',
      'Los requisitos de antecedentes son los más estrictos que publica la banca, incluido el listado de morosos alimentarios.',
      'La app viene cayendo en reseñas y, aunque en agosto de 2026 sumó Google Pay (solo Visa), sigue sin Apple Pay.',
    ],
    verdict:
      'Transparencia ejemplar y una tasa promocional que le gana a todos los privados. El pero es estructural: 24 cuotas de plazo máximo significa que el mismo monto, al mismo precio, sale una cuota del doble. Sirve para sacárselo de encima rápido, no para respirar.',
    website: 'https://www.bbva.com.uy',
    sourceUrl:
      'https://www.bbva.com.uy/personas/productos/prestamos/prestamo-personal/personal.html',
    sources: [
      {
        label: 'BBVA — préstamo personal (tasas y antecedentes crediticios)',
        url: 'https://www.bbva.com.uy/personas/productos/prestamos/prestamo-personal/personal.html',
      },
    ],
    redditId: 'bbva',
  },
  {
    id: 'btg',
    name: 'BTG Pactual Uruguay (ex HSBC)',
    segment: 'banco',
    identity: 'Banco privado (marca nueva desde julio de 2026)',
    tagline: 'Presta sin ser cliente — al 49%, que es precio de financiera.',
    teaPct: 49,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No. Su cartilla de "Préstamo Personal sin cuenta" pide no mantener operaciones incumplidas en el Clearing y antecedentes crediticios favorables en los últimos doce meses.',
    minIncomeUyu: null,
    maxAmountUyu: 315000,
    maxTermMonths: 60,
    currencies: ['UYU', 'USD'],
    onlineEndToEnd: false,
    disbursementHours: 72,
    audiences: ['dependiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 58,
    flag: 'HSBC Uruguay pasó a operar como BTG Pactual el 10 de julio de 2026. Las cartillas ya son de BTG, pero parte de la documentación pública sigue siendo de HSBC: confirmá todo antes de firmar.',
    signals: [
      { label: 'TEA sin ser cliente (cartilla jul. 2026)', value: '49%', tone: 'neg' },
      { label: 'presta sin abrir cuenta', value: 'sí', tone: 'pos' },
      { label: 'plazo máximo', value: '60 cuotas', tone: 'pos' },
    ],
    bestFor:
      'Quien no es cliente de ningún banco, tiene el Clearing limpio y prefiere un banco antes que una financiera.',
    pros: [
      'Es de los pocos bancos con una cartilla explícita de préstamo a NO clientes, sin obligarte a abrir cuenta.',
      'Publica dos cartillas con fecha —con cuenta y sin cuenta— así que se puede comparar antes de ir.',
      'Plazos de hasta 60 cuotas, los más largos de la banca privada.',
    ],
    cons: [
      'El 49% sin cuenta es tasa de financiera, no de banco: abrir la cuenta baja bastante el precio.',
      'El tope de $315.000 es bajo para un banco.',
      'El cambio de marca es reciente y la información pública todavía convive con la de HSBC.',
    ],
    verdict:
      'La cartilla "sin cuenta" es una rareza útil: casi nadie más te presta sin hacerte cliente primero. Pero el precio de esa comodidad es un 49% que compite con las financieras, no con los bancos — y si vas a abrir la cuenta igual, la tasa con cuenta es otra conversación.',
    website: 'https://www.btgpactual.uy',
    sourceUrl: 'https://www.btgpactual.uy/tarifas-y-cartillas',
    sources: [
      {
        label: 'BTG Pactual Uruguay — tarifas y cartillas',
        url: 'https://www.btgpactual.uy/tarifas-y-cartillas',
      },
      { label: 'HSBC Uruguay — aviso de la adquisición', url: 'https://www.hsbc.com.uy/aviso/' },
    ],
    redditId: 'btg',
  },
  {
    id: 'heritage',
    name: 'Banque Heritage (Uruguay)',
    segment: 'banco',
    identity: 'Banco privado de nicho',
    tagline: 'Tasa bancaria baja, pero la puerta es un convenio de nómina.',
    teaPct: 30,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Sus dos cartillas precontractuales no mencionan el Clearing: solo dicen que el préstamo queda sujeto a aprobación previa del banco.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 36,
    currencies: ['UYU', 'USD'],
    onlineEndToEnd: false,
    disbursementHours: 96,
    audiences: ['dependiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: true,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 56,
    signals: [
      { label: 'TEA crédito de nómina a 12 meses', value: '30%', tone: 'pos' },
      {
        label: 'la tasa solo está en la cartilla precontractual',
        value: 'sin página web',
        tone: 'neg',
      },
      { label: 'banca minorista', value: 'muy chica', tone: 'neutral' },
    ],
    bestFor: 'Empleado de una empresa con convenio de nómina en Heritage.',
    pros: [
      'Una de las TEA bancarias más bajas que se pueden verificar hoy para el crédito de nómina.',
      'Publica cartilla precontractual con la tabla de plazo contra tasa, como manda la norma.',
      'Banco chico, atención personalizada.',
    ],
    cons: [
      'La tasa no vive en ninguna página navegable: hay que dar con la cartilla.',
      'Cobra comisión de otorgamiento, a diferencia de Santander.',
      'La red de sucursales y la banca minorista son mínimas: es un banco pensado para otro público.',
    ],
    verdict:
      'Es la sorpresa barata de la banca uruguaya y casi nadie lo tiene en el radar, en parte porque su producto principal llega por convenio con el empleador y no por la web. Si tu empresa tiene convenio, pedí la cartilla y comparala; si no, es difícil siquiera empezar el trámite.',
    website: 'https://www.heritage.com.uy',
    sourceUrl: 'https://www.heritage.com.uy/',
    sources: [{ label: 'Banque Heritage Uruguay', url: 'https://www.heritage.com.uy/' }],
    redditId: 'heritage',
  },
  {
    id: 'bna',
    name: 'Banco de la Nación Argentina — Uruguay',
    segment: 'banco',
    identity: 'Sucursal de banco público extranjero',
    tagline: 'El banco que nadie mira, con la tasa en dólares más baja que encontramos.',
    teaPct: 35,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Su información precontractual no menciona el Clearing ni la Central de Riesgos: dice que el banco analiza la documentación y resuelve.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 36,
    currencies: ['UYU', 'USD'],
    onlineEndToEnd: false,
    disbursementHours: 120,
    audiences: ['dependiente', 'jubilado'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 54,
    signals: [
      { label: 'TEA en pesos (por convenio, 30%)', value: '35%', tone: 'pos' },
      { label: 'TEA en dólares (por convenio, 12%)', value: '15%', tone: 'pos' },
      { label: 'plazo máximo', value: '36 cuotas', tone: 'neutral' },
    ],
    bestFor: 'Quien cobra en dólares o pertenece a una institución con convenio con el banco.',
    pros: [
      'Publica la tasa en la información precontractual, como exige la norma del BCU, y distingue el precio con y sin convenio.',
      'La línea en dólares al 12–15% es de las pocas de consumo en moneda extranjera que se pueden verificar.',
      'Es un banco supervisado por el BCU como cualquier otro, con el registro público a mano.',
    ],
    cons: [
      'Red mínima y trámite enteramente presencial.',
      'Sin convenio, el 35% en pesos ya no destaca frente a Itaú o BBVA.',
      'Casi no aparece en las comparativas, así que hay poca experiencia de usuarios para contrastar.',
    ],
    verdict:
      'Un banco entero que las comparativas uruguayas ignoran, y que sin embargo publica sus tasas con más claridad que Santander. Su nicho real es el convenio institucional y el crédito en dólares; fuera de eso no tiene con qué pelear la velocidad ni la comodidad.',
    website: 'https://www.bna.com.uy',
    sourceUrl: 'https://www.bna.com.uy/',
    sources: [{ label: 'Banco de la Nación Argentina — Uruguay', url: 'https://www.bna.com.uy/' }],
  },
  {
    id: 'bandes',
    name: 'Banco Bandes Uruguay',
    segment: 'banco',
    identity: 'Banco privado (heredó la operación bancaria de COFAC)',
    tagline: 'Presta, pero no publica nada: ni tasa, ni requisitos, ni política de antecedentes.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Su sitio no tiene página de producto de préstamos: hay un botón "calculá tu préstamo" que lleva a un flujo con login.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: null,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: null,
    audiences: ['dependiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 46,
    signals: [
      { label: 'TEA publicada', value: 'ninguna', tone: 'neg' },
      { label: 'requisitos publicados', value: 'ninguno', tone: 'neg' },
      { label: 'supervisión', value: 'BCU, inst. 1110', tone: 'pos' },
    ],
    bestFor: 'Cliente que ya opera con el banco y va a pedir la simulación directamente.',
    pros: [
      'Es un banco supervisado por el BCU, con todo lo que eso implica en materia de reclamos.',
      'El circuito de solicitud arranca online.',
      'Heredó la operación bancaria de COFAC, con presencia en el interior.',
    ],
    cons: [
      'No publica tasa, ni plazo, ni monto, ni requisitos: la página de préstamos ni siquiera existe como tal.',
      'Sin información precontractual accesible no hay forma de compararlo antes de dar tus datos.',
      'Es el banco con menos información pública de todo el tablero.',
    ],
    verdict:
      'Está acá porque presta y porque el BCU lo supervisa, no porque podamos decir algo sobre su préstamo. Cuando un banco te pide entrar a un flujo autenticado antes de decirte el precio, la comparación la estás haciendo a ciegas — y eso, en un préstamo, siempre juega a favor del que presta.',
    website: 'https://www.bandes.com.uy',
    sourceUrl: 'https://www.bandes.com.uy/',
    sources: [{ label: 'Banco Bandes Uruguay', url: 'https://www.bandes.com.uy/' }],
  },
  // ── Financieras / empresas administradoras de crédito ─────────────────────
  {
    id: 'oca',
    name: 'OCA',
    segment: 'financiera',
    identity: 'Empresa administradora de crédito (accionista: Itaú Unibanco)',
    tagline: 'Publica el rango completo y te cierra la puerta si tenés una marca.',
    teaPct: 29,
    teaMaxPct: 87,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No. Sus preguntas frecuentes listan los requisitos del préstamo: ingresos mínimos de $15.000 líquidos, seis meses de antigüedad laboral y "no figurar en el Clearing". Es un no explícito, pese a que varios comparadores la listan como flexible.',
    minIncomeUyu: 15000,
    maxAmountUyu: 600000,
    maxTermMonths: 36,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 24,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: true,
    insuranceMandatory: true,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 54,
    signals: [
      { label: 'rango de TEA publicado', value: '29–87% + IVA', tone: 'neutral' },
      { label: 'ejemplo publicado', value: '39% a 24 meses', tone: 'pos' },
      { label: 'seguro dentro de la cuota', value: '0,25% mensual', tone: 'neg' },
    ],
    bestFor: 'Cliente con buen perfil que quiere plata rápida sin abrir una cuenta bancaria.',
    pros: [
      'Publica el rango completo de tasas y un ejemplo con monto, plazo y cuota, que es más de lo que hace la mayoría.',
      'Trámite 100% digital y acreditación rápida.',
      'Marca conocida, con red de locales en todo el país.',
    ],
    cons: [
      'El rango va de 29% a 87%: la tasa del anuncio le toca a los mejores perfiles, no al promedio.',
      'Suma comisión de concesión, comisión de administración y un seguro obligatorio del 0,25% mensual.',
      'Con una marca en el Clearing te dice que no, igual que un banco, pero cobrando como financiera.',
      'Según relatos en Reddit, si ya tenés una deuda activa con OCA el acceso a un préstamo nuevo se complica mucho, incluso pagando en fecha — aunque la misma gente describe su cobranza como menos agresiva que la de otras financieras.',
    ],
    verdict:
      'Es la financiera más transparente del grupo grande y, a la vez, la que peor combina exigencia y precio: te pide el legajo limpio de un banco y te cobra la tasa de una financiera. Si calificás para OCA, casi seguro calificás para algo más barato — probá el banco primero.',
    website: 'https://oca.uy',
    sourceUrl: 'https://oca.uy/prestamos/',
    sources: [
      { label: 'OCA — préstamos (rango de TEA y ejemplo)', url: 'https://oca.uy/prestamos/' },
      {
        label: 'OCA — preguntas frecuentes (requisitos del préstamo y Clearing)',
        url: 'https://oca.uy/preguntas-frecuentes.html',
      },
      {
        label: 'r/Burises — "Salir del clearing": acceso complicado con deuda activa (2026)',
        url: 'https://www.reddit.com/r/Burises/comments/1rxzgqu/',
      },
    ],
    redditId: 'oca',
  },
  {
    id: 'pronto',
    name: 'Pronto!',
    segment: 'financiera',
    identity: 'Empresa administradora de crédito (grupo Scotiabank)',
    tagline: 'Atiende a quien está en el clearing con su OTRA marca, la que cobra hasta 123%.',
    teaPct: 49,
    teaMaxPct: 123.43,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí, y lo publicita en su propio dominio con una página titulada "préstamos estando en el clearing y sin recibo de sueldo". La letra chica importa: ese producto es Pronto+, una sociedad distinta (KEDAL S.A.) con su propia inscripción en el BCU, cuyas tasas publicadas van de 65,4% a 123,4%.',
    minIncomeUyu: null,
    maxAmountUyu: 600000,
    maxTermMonths: 48,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 24,
    audiences: ['dependiente', 'jubilado', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 42,
    signals: [
      { label: 'TEA del ejemplo publicado (Pronto)', value: '49% + IVA', tone: 'neutral' },
      {
        label: 'TEA publicada de Pronto+ (el producto para clearing)',
        value: '65–123%',
        tone: 'neg',
      },
      { label: 'atiende clearing y sin recibo', value: 'lo publicita', tone: 'pos' },
    ],
    bestFor:
      'Quien tiene una marca en el Clearing o no puede documentar ingresos, y quiere una empresa grande detrás.',
    pros: [
      'Publica un ejemplo completo —$500.000 en 42 cuotas, cuota y total financiado— que permite calcular el costo real.',
      'Es la financiera más grande del país, del grupo Scotiabank, con más de 200.000 clientes y 37 sucursales.',
      'Atiende expresamente a quien está en el Clearing y a quien no tiene recibo de sueldo.',
    ],
    cons: [
      'El 49% + IVA del ejemplo equivale a casi 60% efectivo: con el "desde 29%" solo se entra acreditando sueldo.',
      'El producto que atiende a gente en el Clearing es Pronto+, con tasas publicadas de 65,4% a 123,4%: la puerta abierta es la cara.',
      'Que sean dos sociedades distintas con la misma marca hace difícil saber con cuál estás firmando.',
      'Es el nombre que peor sale en los hilos uruguayos sobre financieras. La defensa que aparece a su favor dice bastante del rubro: que al menos no te suma seguros que no pediste.',
    ],
    verdict:
      'Hace bien lo difícil —decir en voz alta a quién le presta— y esconde lo importante detrás de una segunda marca: el préstamo "estando en el clearing" no es el del ejemplo al 49%, es el de Pronto+, que publica hasta 123,4%. Preguntá con qué sociedad estás firmando y cuál es el CFT, y compará contra ANDA antes de decidir.',
    website: 'https://www.pronto.com.uy',
    sourceUrl: 'https://www.pronto.com.uy/dinero/',
    sources: [
      {
        label: 'Pronto! — préstamos estando en el clearing y sin recibo de sueldo',
        url: 'https://www.pronto.com.uy/dinero/',
      },
      { label: 'Pronto! — ejemplo de préstamo con TEA', url: 'https://www.pronto.com.uy/tasa-29/' },
      {
        label: 'Pronto+ — texto legal con las TEA por tramo',
        url: 'https://www.pronto.com.uy/prestamo/',
      },
      {
        label: 'r/uruguay — el hilo sobre seguros colgados del préstamo que el sub sigue citando',
        url: 'https://www.reddit.com/r/uruguay/comments/15mhney/',
      },
    ],
  },
  {
    id: 'creditel',
    name: 'Creditel',
    segment: 'financiera',
    identity: 'Empresa administradora de crédito',
    tagline: 'Promete "la tasa más baja del mercado" y lo único que publica es el techo: 129,92%.',
    teaPct: null,
    teaMaxPct: 129.92,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica, pero su formulario oficial de solicitud incluye la pregunta "¿estás en clearing?" con opciones sí y no. Que la pregunte y no descarte de entrada sugiere que evalúa el caso; no alcanza para afirmarlo.',
    minIncomeUyu: null,
    maxAmountUyu: 600000,
    maxTermMonths: 48,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 24,
    audiences: ['dependiente', 'jubilado', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 38,
    signals: [
      {
        label: 'lo único publicado es la TEA máxima (cuadro MEF, ago. 2026)',
        value: '129,92%',
        tone: 'neg',
      },
      { label: 'lo que promete la página', value: '"la tasa más baja"', tone: 'neg' },
      { label: 'monto máximo', value: '$600.000', tone: 'pos' },
    ],
    bestFor: 'Quien ya va a simular de todos modos y quiere una marca grande y conocida.',
    pros: [
      'Monto máximo alto para el segmento y red de locales en todo el país.',
      'Trámite online con respuesta rápida.',
      'Figura en el registro de administradoras de crédito del BCU.',
    ],
    cons: [
      'La única cifra que publica es el cuadro mensual de tasas MÁXIMAS que presenta ante el Ministerio de Economía: hasta 129,92%.',
      'La página promete "la tasa más baja del mercado" y no hay una sola cifra al lado que lo respalde.',
      'Para saber qué tasa te toca a vos hay que entregar los datos y esperar la oferta.',
      'Es de las marcas con más quejas documentadas: seguros colgados del préstamo, una tarjeta activada sin haberla solicitado y un programa de puntos que los usuarios comparan mal contra el precio de mercado.',
    ],
    verdict:
      'Una marca grande con la información pública de una empresa chica: promete la tasa más baja del mercado y lo único verificable que publica es el techo de 129,92% del cuadro que presenta ante el MEF. Que el techo sea alto no prueba que tu tasa lo sea, pero cuando el único número disponible es ese, la comparación la hace el prestamista. Exigí el CFT por escrito.',
    website: 'https://www.creditel.com.uy',
    sourceUrl: 'https://www.creditel.com.uy/efectivo',
    sources: [
      { label: 'Creditel — efectivo', url: 'https://www.creditel.com.uy/efectivo' },
      {
        label: 'Creditel — términos y condiciones',
        url: 'https://www.creditel.com.uy/terminos-y-condiciones',
      },
      {
        label: 'BCU — registro de empresas administradoras de crédito',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Default.aspx',
      },
      {
        label: 'r/uruguay — "Creditel": una tarjeta activada sin haberla solicitado (2026)',
        url: 'https://www.reddit.com/r/uruguay/comments/1q88w3h/',
      },
    ],
    redditId: 'creditel',
  },
  {
    id: 'cash',
    name: 'Cash',
    segment: 'financiera',
    identity: 'Empresa administradora de crédito',
    tagline: 'Dice que el clearing no es excluyente, y publica sus tasas con fecha. Son altísimas.',
    teaPct: 62.5,
    teaMaxPct: 129.9,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí, textual en su página de requisitos y repetido en sus preguntas frecuentes: "estar en el clearing con antecedentes de incumplimiento no es excluyente para solicitar un crédito". Lo verificamos nosotros en las dos páginas.',
    minIncomeUyu: 10000,
    maxAmountUyu: 500000,
    maxTermMonths: 48,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 24,
    audiences: ['dependiente', 'jubilado'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: true,
    originationFee: true,
    insuranceMandatory: true,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 42,
    signals: [
      { label: 'TEA por tramo (ago. 2026), + IVA', value: '62,5–129,9%', tone: 'neg' },
      { label: 'el clearing no es excluyente', value: 'textual', tone: 'pos' },
      { label: 'bonifica el pago anticipado', value: 'sí', tone: 'pos' },
    ],
    bestFor:
      'Monto grande (más de 10.000 UI) con antecedentes en el Clearing, cuando ANDA ya dijo que no.',
    pros: [
      'Publica sus cuatro tramos de tasa con la fecha de vigencia, algo que casi ninguna financiera hace.',
      'Contesta la pregunta del Clearing por escrito y sin rodeos, en dos páginas distintas de su sitio.',
      'Bonifica el pago anticipado, presta a jubilados y pide apenas $10.000 de ingreso líquido.',
    ],
    cons: [
      'El tramo chico llega a 129,9% + IVA, prácticamente pegado al tope de usura.',
      'Pedir menos de 10.000 UI duplica la tasa frente a pedir más: el préstamo chico es el caro.',
      'Suma comisión de concesión y un seguro del 0,6% mensual sobre saldo.',
      'Dos usuarios distintos en el mismo hilo de Reddit afirman que el BCU le prohibió a Cash retener directamente de sueldos y pasividades, y uno menciona un juicio en curso por descuentos no habilitados. No lo pudimos verificar en una fuente judicial u oficial — lo dejamos como denuncia de usuarios, no como hecho probado.',
    ],
    verdict:
      'Es la más honesta de las caras: te dice que te va a evaluar aunque tengas antecedentes y te muestra exactamente cuánto va a costarte. El problema no es la información, es el número — a 129,9% + IVA, un préstamo chico te devuelve más del doble en un año. Mirá ANDA y las cooperativas antes.',
    website: 'https://prestamocash.com.uy',
    sourceUrl: 'https://prestamocash.com.uy/prestamo',
    sources: [
      { label: 'Cash — tasas vigentes por tramo', url: 'https://prestamocash.com.uy/prestamo' },
      {
        label: 'Cash — requisitos y documentación ("el clearing no es excluyente")',
        url: 'https://prestamocash.com.uy/pagina/requisitos-y-documentacion',
      },
      {
        label: 'Cash — preguntas frecuentes (bonificación por pago anticipado, seguro SURA)',
        url: 'https://prestamocash.com.uy/preguntas-frecuentes',
      },
      {
        label: 'r/uruguay — "Clearing consulta": denuncia de retención no habilitada (2025)',
        url: 'https://www.reddit.com/r/uruguay/comments/1nakcr0/',
      },
    ],
    redditId: 'cash',
  },
  {
    id: 'crediton',
    name: 'Crediton',
    segment: 'financiera',
    identity: 'Empresa administradora de crédito supervisada por el BCU',
    tagline:
      'Publica la escala entera de tasas por perfil, y pide expresamente no estar en el clearing.',
    teaPct: 75.4,
    teaMaxPct: 130.1,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No. Sus requisitos publicados son "tener entre 21 y 80 años, cédula uruguaya vigente y no estar en el clearing", y sus preguntas frecuentes repiten que no hay que tener incumplimientos registrados.',
    minIncomeUyu: null,
    maxAmountUyu: 150000,
    maxTermMonths: 36,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 24,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: true,
    originationFee: null,
    insuranceMandatory: true,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 48,
    signals: [
      { label: 'TEA por perfil (A a F), en sus T&C', value: '75,4–130,1%', tone: 'neg' },
      { label: 'cancelación anticipada', value: 'sin penalidad', tone: 'pos' },
      { label: 'inscripta en el BCU', value: 'entidad otorgante de crédito', tone: 'pos' },
      { label: 'exige no estar en el clearing', value: 'requisito publicado', tone: 'neg' },
    ],
    bestFor: 'Monto chico y urgente, con la escala de tasas leída antes de aceptar.',
    pros: [
      'Publica la escala completa de tasas por perfil crediticio y plazo dentro de sus términos: se puede leer antes de pedir.',
      'No cobra penalidad por cancelar anticipadamente, algo que conviene aprovechar.',
      'Trámite 100% digital.',
    ],
    cons: [
      'El escalón peor llega a 130,1%, casi exactamente el tope legal: el perfil que más necesita el préstamo paga el máximo permitido.',
      'Pide no estar en el clearing, así que no es una salida para quien busca eso.',
      'Seguro obligatorio del 0,25% mensual y tope de $150.000, bajo frente a las otras financieras.',
    ],
    verdict:
      'Le reconocemos algo que casi nadie hace: poner por escrito toda la escala, de la mejor a la peor tasa, en vez de mostrar solo el "desde". Leerla es incómodo, y esa incomodidad es información — si tu perfil cae en la parte alta de la tabla, lo que estás por firmar cuesta más del doble del capital en tres años.',
    website: 'https://www.crediton.com.uy',
    sourceUrl: 'https://www.crediton.com.uy/terminos-y-condiciones',
    sources: [
      {
        label: 'Crediton — términos y condiciones (escala de TEA y supervisión BCU)',
        url: 'https://www.crediton.com.uy/terminos-y-condiciones',
      },
    ],
  },
  {
    id: 'credito-naranja',
    name: 'Crédito Naranja',
    segment: 'financiera',
    identity: 'Empresa administradora de crédito',
    tagline:
      'Los comparadores la listan como "presta en el clearing". Su formulario dice lo contrario.',
    teaPct: 63,
    teaMaxPct: 130,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No, y está verificado en su propio formulario: para solicitar hay que marcar una casilla que dice "NO estoy en el Clearing". Varios sitios de afiliados afirman lo contrario.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 60,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 48,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 42,
    signals: [
      { label: 'TEA por tramo, + IVA', value: '63–130%', tone: 'neg' },
      {
        label: 'exige declarar que NO estás en el clearing',
        value: 'casilla obligatoria',
        tone: 'neg',
      },
      { label: 'plazo máximo', value: '60 cuotas', tone: 'pos' },
    ],
    bestFor: 'Plazo largo con legajo limpio, después de haber probado banco y cooperativa.',
    pros: [
      'Publica sus cuatro tramos de tasa con el "+ IVA" a la vista, sin esconderlo.',
      'Hasta 60 cuotas, el plazo más largo entre las financieras.',
      'Declara supervisión del Banco Central en su sitio.',
    ],
    cons: [
      'Exige declarar por escrito que no estás en el Clearing, así que no es una opción para quien busca eso.',
      'El tramo chico llega a 130% + IVA.',
      'No pudimos identificar su razón social en el registro de administradoras de crédito del BCU.',
    ],
    verdict:
      'El caso más claro de por qué esta página existe: media docena de sitios "comparadores" la listan entre las que prestan estando en el Clearing, y su propio formulario obliga a declarar lo contrario. Si llegaste hasta acá buscando eso, esta no es. Y si tenés el legajo limpio, cobra como si no lo tuvieras.',
    website: 'https://creditonaranja.uy',
    sourceUrl: 'https://creditonaranja.uy/',
    sources: [{ label: 'Crédito Naranja — tasas y solicitud', url: 'https://creditonaranja.uy/' }],
  },
  {
    id: 'credito-de-la-casa',
    name: 'Crédito de la Casa',
    segment: 'financiera',
    identity: 'Financiamiento de consumo en el punto de venta (accionista: Banco Santander)',
    tagline: 'Financia la compra en el comercio, y su precio vive en un PDF del Ministerio.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'no',
    clearingNote:
      'No. Sus preguntas frecuentes piden, tanto para efectivo como para compra financiada, "no tener incumplimientos en Infocred o Clearing" y no figurar en MOCASIST, el registro de morosos alimentarios.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 36,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 24,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 32,
    signals: [
      { label: 'TEA en su propio sitio', value: 'ninguna', tone: 'neg' },
      { label: 'publica tasas ante el MEF', value: 'PDF semestral', tone: 'neutral' },
      { label: 'canal', value: 'el comercio, no vos', tone: 'neutral' },
    ],
    bestFor: 'Financiar una compra puntual en un comercio adherido, comparando contra la tarjeta.',
    pros: [
      'Sus tasas quedan registradas en las publicaciones semestrales del Ministerio de Economía, que es una fuente pública verificable.',
      'Resuelve en el mostrador, sin trámite previo.',
      'Figura en el registro de administradoras de crédito del BCU.',
    ],
    cons: [
      'Su propio sitio no expone tasas ni condiciones: el formulario está tercerizado en un marketplace cuyo texto legal es genérico.',
      'Al financiar dentro de la compra, el costo se mezcla con el precio del producto y casi nunca se compara.',
      'Arrastra el caso de suplantación de identidad más citado del período: un préstamo otorgado a distancia con una selfie y una cédula, que la víctima descubrió como deuda a su nombre.',
    ],
    verdict:
      'El crédito de punto de venta tiene una trampa vieja: como aparece cuando ya decidiste comprar, casi nadie lo compara con nada. Antes de aceptarlo, pedí el total a pagar en pesos y comparalo con la misma compra en cuotas con tarjeta — la diferencia suele ser mayor de lo que parece.',
    website: 'https://solicitar.creditodelacasa.com.uy',
    sourceUrl:
      'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2026',
    sources: [
      {
        label: 'MEF — tasas de empresas de crédito de la casa, 2026',
        url: 'https://www.gub.uy/ministerio-economia-finanzas/politicas-y-gestion/tasas-empresas-credito-casa-ano-2026',
      },
      {
        label: 'r/uruguay — suplantación de identidad con "Compra Ágil" (2025)',
        url: 'https://www.reddit.com/r/uruguay/comments/1oukhaj/',
      },
    ],
  },
  // ── Cooperativas y asociaciones de afiliados ──────────────────────────────
  {
    id: 'anda',
    name: 'ANDA',
    segment: 'cooperativa',
    identity: 'Asociación civil sin fines de lucro (no es cooperativa ni banco)',
    tagline: 'Lo más parecido a un préstamo barato que puede conseguir alguien en el clearing.',
    teaPct: 27.4,
    teaMaxPct: 36.5,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí, y es de los poquísimos que lo dice en su propia web: "podés afiliarte a ANDA y solicitar tu préstamo estando en el Clearing de Informes". Lo matiza —depende del tipo de antecedente— pero es una respuesta escrita, no un rumor de comparador.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 48,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 48,
    audiences: ['dependiente', 'jubilado', 'socio'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: true,
    reputacion: 66,
    signals: [
      { label: 'TEA por tramo (vigencias 2025–2026)', value: '27,4–36,5% + IVA', tone: 'pos' },
      { label: 'presta con antecedentes, y lo publica', value: 'sí', tone: 'pos' },
      { label: 'cuota social del socio integral', value: '$831/mes', tone: 'neg' },
      { label: 'según el antecedente puede pedir garantía', value: 'lo aclara', tone: 'neutral' },
    ],
    bestFor:
      'Alguien con antecedentes en el Clearing y un ingreso comprobable, que quiere evitar una tasa de tres dígitos.',
    pros: [
      'Contesta por escrito la pregunta que ningún otro contesta: sí, presta estando en el Clearing.',
      'Cobra entre un cuarto y un quinto de lo que cobra una financiera por el mismo perfil.',
      'Casi cien años de historia, 200.000 socios y una red de servicios (salud, turismo) más allá del crédito.',
    ],
    cons: [
      'Hay que asociarse y pagar la cuota social: $831 por mes en la categoría integral, que es un costo fijo aunque no pidas nada.',
      'Varias de sus tablas de tasas siguen publicadas con vigencia de 2025 aunque estemos en 2026.',
      'La queja que se repite no es la tasa sino la mecánica de la retención: gente que describe que le descuentan menos que la cuota por el tope sobre el sueldo, y que el saldo sigue generando intereses.',
      'No publica un tope de monto en pesos: todo se expresa como "hasta tres sueldos" o "hasta el 50% del líquido".',
    ],
    verdict:
      'Es el hallazgo grande de esta comparativa. Casi todas las notas sobre "préstamos en el clearing" mandan a financieras de 100% o más, y sin embargo la única entidad que lo admite por escrito cobra alrededor de un tercio de eso. La cuota social duele si pedís poco y desaparece si pedís bien: hacé la cuenta con el monto que necesitás antes de descartarla.',
    website: 'https://anda.com.uy',
    sourceUrl: 'https://anda.com.uy/prestamos/',
    sources: [
      { label: 'ANDA — préstamos y tasas vigentes', url: 'https://anda.com.uy/prestamos/' },
      {
        label: 'ANDA — preguntas frecuentes de préstamos (la respuesta sobre el Clearing)',
        url: 'https://anda.com.uy/prestamos/preguntas-frecuentes/',
      },
      { label: 'ANDA — cuota social por categoría de socio', url: 'https://anda.com.uy/socios/' },
      {
        label: 'r/uruguay — "ANDA y su crédito": la mecánica de la retención (2026)',
        url: 'https://www.reddit.com/r/uruguay/comments/1qy00vu/',
      },
    ],
  },
  {
    id: 'verde-fucac',
    name: 'Verde (ex-FUCAC)',
    segment: 'cooperativa',
    identity: 'Cooperativa de ahorro y crédito',
    tagline: 'La más transparente con sus tasas y la más muda con sus requisitos.',
    teaPct: 25,
    teaMaxPct: 32,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Su página de transparencia habla de tasas, no de antecedentes. Que "Verde presta en el clearing" circula en blogs de afiliados, no en su web — así que no lo damos por cierto.',
    minIncomeUyu: null,
    maxAmountUyu: 600000,
    maxTermMonths: 48,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 48,
    audiences: ['dependiente', 'jubilado', 'socio'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: true,
    reputacion: 54,
    signals: [
      { label: 'TEA compensatoria (ago. 2026)', value: '25–32%', tone: 'pos' },
      { label: 'TEA moratoria', value: '37,5–44,5%', tone: 'neutral' },
      { label: 'línea solo con cédula', value: '$5.000–$30.000', tone: 'pos' },
    ],
    bestFor: 'Socio con ingreso comprobable que busca tasa de cooperativa sin pasar por un banco.',
    pros: [
      'Publica tasa compensatoria Y moratoria con rango y fecha, algo que ni los bancos hacen.',
      'Tasas de nivel bancario: 25% de piso, contra el 40–50% de cualquier financiera.',
      'Tiene una línea chica solo con cédula, entre $5.000 y $30.000, para quien no puede documentar ingresos.',
    ],
    cons: [
      'No publica requisitos ni política de antecedentes: para saber si calificás hay que preguntar.',
      'El caso de sobrecosto más citado del período es suyo: $100.000 a 48 cuotas terminando cerca de $210.000. El hilo no le dio la razón al prestatario —el contrato lo decía— pero el número es el que la gente recuerda.',
      'Hay que asociarse, y la página de préstamos devuelve 404: todo termina en un simulador o un teléfono.',
    ],
    verdict:
      'La mayor cooperativa del país publica su tasa mejor que casi nadie y sus condiciones peor que casi nadie, y la combinación es rara: sabés exactamente cuánto cuesta y no tenés idea de si te lo van a dar. Si tenés antecedentes, preguntá antes de ilusionarte con el 25%.',
    website: 'https://verde.com.uy',
    sourceUrl: 'https://verde.com.uy/conocenos_mas_transparentes.php',
    sources: [
      {
        label: 'Verde — "Conocenos más: transparentes" (tasas vigentes)',
        url: 'https://verde.com.uy/conocenos_mas_transparentes.php',
      },
      {
        label: 'BCU — ficha de FUCAC Verde en el registro de administradoras de crédito',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx?nroinst=7860',
      },
      {
        label: 'r/uruguay — "Préstamo usurero" (2025, 121 comentarios)',
        url: 'https://www.reddit.com/r/uruguay/comments/1oisy8b/',
      },
    ],
  },
  {
    id: 'fucerep',
    name: 'FUCEREP',
    segment: 'cooperativa',
    identity: 'Cooperativa de intermediación financiera (la única del país)',
    tagline: 'La única cooperativa con licencia bancaria — y un rango de tasa enorme.',
    teaPct: 14.25,
    teaMaxPct: 99,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'parcial',
    clearingNote:
      'Con condiciones. Su requisito publicado es estar en categoría 1C del sistema financiero, que admite un atraso leve pero no una morosidad seria. Tolerancia real, no puerta abierta.',
    minIncomeUyu: 18000,
    maxAmountUyu: 3000000,
    maxTermMonths: 84,
    currencies: ['UYU', 'UI', 'USD'],
    onlineEndToEnd: false,
    disbursementHours: 72,
    audiences: ['dependiente', 'jubilado', 'socio'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: false,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: true,
    reputacion: 64,
    signals: [
      { label: 'TEA personas', value: '14,25–99%', tone: 'neutral' },
      { label: 'no cobra cargo por analizar la solicitud', value: 'declarado', tone: 'pos' },
      { label: 'cuota social', value: '$450/mes', tone: 'neg' },
    ],
    bestFor:
      'Monto grande a plazo largo, o alguien con un atraso menor que un banco ya no perdona.',
    pros: [
      'Es la única cooperativa de intermediación financiera que queda en Uruguay: la supervisa el BCU igual que a un banco.',
      'Hasta $3.000.000 y 84 cuotas, los topes más altos y los plazos más largos del tablero.',
      'Declara no cobrar comisiones ni cargos por analizar la solicitud, y tiene líneas en UI desde 5,2%.',
    ],
    cons: [
      'El rango de tasa va de 14% a 99%: el número que te toque depende del perfil, y el techo es de financiera.',
      'Cuota social mensual y afiliación obligatoria.',
      'Exige categoría 1C, así que un incumplimiento serio queda afuera igual.',
    ],
    verdict:
      'Es la entidad más subestimada del sistema: licencia de intermediación financiera, plazos de hipoteca y una tolerancia real —acotada, pero real— a los atrasos chicos. La contracara es el rango de precio más ancho de toda la comparativa: acá el CFT del contrato no es un detalle, es toda la conversación.',
    website: 'https://www.fucerep.com.uy',
    sourceUrl: 'https://www.fucerep.com.uy/solicita-prestamo-personal/',
    sources: [
      {
        label: 'FUCEREP — solicitá tu préstamo personal (requisitos y cuota social)',
        url: 'https://www.fucerep.com.uy/solicita-prestamo-personal/',
      },
      {
        label: 'BCU — cooperativas de intermediación financiera (listado oficial)',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/coo_Int_Fin_Lst.aspx',
      },
    ],
  },
  {
    id: 'acac',
    name: 'Cooperativa ACAC',
    segment: 'cooperativa',
    identity: 'Cooperativa de ahorro y crédito (no confundir con el banco que vendió en 1998)',
    tagline: 'Sus dos tasas "desde" son, número por número, los topes legales de usura.',
    teaPct: 27.43,
    teaMaxPct: 63.58,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo pudimos verificar: su sitio responde 403 a cualquier consulta automatizada. Lo que circula sobre su flexibilidad viene de sitios de afiliados, no de la cooperativa.',
    minIncomeUyu: null,
    maxAmountUyu: 400000,
    maxTermMonths: 48,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 48,
    audiences: ['dependiente', 'socio'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'desconocido',
    membershipRequired: true,
    reputacion: 56,
    signals: [
      { label: 'TEA con retención en nómina', value: 'desde 27,43%', tone: 'pos' },
      { label: 'TEA sin retención', value: 'desde 63,58%', tone: 'neg' },
      { label: 'ambas coinciden con el tope de usura', value: 'ago. 2026', tone: 'neg' },
    ],
    bestFor: 'Socio con convenio de retención en nómina.',
    pros: [
      'Con retención de haberes la tasa baja mucho respecto de la línea sin retención.',
      'Más de 250.000 socios y "préstamos relámpago" desde $20.000.',
      'El seguro de vida va incluido.',
    ],
    cons: [
      'Los dos números que publica como "desde" —27,43% y 63,58%— coincidían exactamente con los topes de usura que regían al leerlos, en agosto de 2026, así que lo que muestra parece ser el techo legal y no su propia tasa. El BCU republica esos topes todos los meses; lo que no cambia es de dónde salen sus dos números.',
      'Su sitio bloquea las consultas automatizadas, así que el resto de sus condiciones no se puede confirmar en la fuente.',
      'Figura en el BCU como entidad otorgante de crédito, no como administradora de crédito: es otro régimen y otra intensidad de supervisión.',
    ],
    verdict:
      'Publicar como "desde" los dos topes legales de usura es, si no un error, la forma más elegante de no decir nada: el número que ves no es lo que ofrece, es lo máximo que la ley permite cobrar. La conclusión práctica sigue siendo la de siempre en las cooperativas: la tasa que sirve es la de nómina, y sin convenio la conversación es otra.',
    website: 'https://acac.com.uy',
    sourceUrl: 'https://acac.com.uy/',
    sources: [{ label: 'Cooperativa ACAC', url: 'https://acac.com.uy/' }],
  },
  {
    id: 'cofac',
    name: 'COFAC',
    segment: 'cooperativa',
    identity:
      'Cooperativa de ahorro y crédito (el banco pasó a Bandes en 2006; la cooperativa siguió)',
    tagline: 'Montos chicos, plazos cortos y descuento directo del sueldo.',
    teaPct: 46,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Su sitio describe los productos pero no publica ni requisitos de antecedentes ni cifras de costo.',
    minIncomeUyu: null,
    maxAmountUyu: 60000,
    maxTermMonths: 15,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 72,
    audiences: ['dependiente', 'socio'],
    payrollDeductionRequired: true,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'desconocido',
    membershipRequired: true,
    reputacion: 52,
    signals: [
      { label: 'TEA de referencia', value: '~46%', tone: 'neutral' },
      { label: 'monto', value: '$5.000–$60.000', tone: 'neg' },
      { label: 'cobro', value: 'descuento del salario', tone: 'neg' },
    ],
    bestFor: 'Socio del interior que necesita un monto chico y trabaja donde hay convenio.',
    pros: [
      'Fuerte presencia en el interior y misión social explícita.',
      'Permite cancelar anticipadamente después de pagar el 30% de las cuotas.',
      'Trato de cooperativa chica, con la persona detrás del mostrador.',
    ],
    cons: [
      'El tope de $60.000 y las 15 cuotas la dejan fuera de casi cualquier necesidad mediana.',
      'El cobro es por descuento directo del salario, que es cómodo hasta el mes que no lo es.',
      'No publica cifras de costo financiero, algo llamativo en una entidad que presta.',
    ],
    verdict:
      'Sobrevivió a la intervención que se llevó su banco y sigue prestando en el interior, que no es poco. Pero como producto es marginal: el monto máximo alcanza para una emergencia chica y el descuento por planilla te ata al empleador que tenés hoy.',
    website: 'https://www.cofac.net',
    sourceUrl: 'https://www.cofac.net/',
    sources: [{ label: 'COFAC', url: 'https://www.cofac.net/' }],
  },
  // ── Fintech / digitales ───────────────────────────────────────────────────
  {
    id: 'prex',
    name: 'Prex (Prextamo)',
    segment: 'fintech',
    identity: 'Emisora de dinero electrónico',
    tagline: 'Plata en la tarjeta en minutos, con la tasa escondida en el vale que firmás.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Ni la landing, ni el centro de ayuda, ni los términos mencionan el Clearing: el único criterio que explicita es de uso de la propia cuenta Prex.',
    minIncomeUyu: null,
    maxAmountUyu: 50000,
    maxTermMonths: 6,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 1,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: true,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 58,
    signals: [
      { label: 'acreditación en la tarjeta', value: 'inmediata', tone: 'pos' },
      { label: 'monto', value: '$1.000–$50.000', tone: 'neutral' },
      { label: 'la tasa solo aparece en el vale individual', value: 'no publicada', tone: 'neg' },
    ],
    bestFor: 'Usuario de Prex que necesita tapar un hueco chico hoy mismo.',
    pros: [
      'El dinero cae en la tarjeta al instante, sin trámite ni papeles.',
      'Sus apps son las mejor puntuadas del sector financiero uruguayo.',
      'Los montos chicos y los seis meses de plazo máximo hacen difícil endeudarse de más.',
    ],
    cons: [
      'No publica la TEA en ningún lado: la tasa vive únicamente en el vale que firmás dentro de la app.',
      'El préstamo no es de Prex sino de Floder S.A. (Paigo), la misma empresa detrás de Volvé y Pago Después; lo único público es la comisión de concesión de hasta 120 UI.',
      'La atención al cliente es su punto flojo histórico y el que más aparece en las quejas.',
    ],
    verdict:
      'Como producto de urgencia funciona: es probablemente la forma más rápida de tener plata en Uruguay. Como decisión financiera es a ciegas, porque el precio recién se conoce en el momento de firmar — y ese es exactamente el momento en que nadie compara.',
    website: 'https://www.prexcard.com/uy',
    sourceUrl: 'https://www.prexcard.com/terminos_de_uso/prextamoPaigo.html',
    sources: [
      {
        label: 'Prex — términos de uso de Prextamo',
        url: 'https://www.prexcard.com/terminos_de_uso/prextamoPaigo.html',
      },
    ],
    redditId: 'prex',
  },
  {
    id: 'midinero',
    name: 'Midinero',
    segment: 'fintech',
    identity: 'Emisora de dinero electrónico (red RedPagos)',
    tagline: 'Hasta $250.000 sin banco, si cobrás el sueldo o el BPS por Midinero.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'desconocido',
    clearingNote:
      'No lo publica. Ni la página de préstamos, ni las preguntas frecuentes, ni el detalle de tarifas mencionan el Clearing. La puerta real y publicada es otra: hay que cobrar por Midinero.',
    minIncomeUyu: null,
    maxAmountUyu: 250000,
    maxTermMonths: 36,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 24,
    audiences: ['dependiente', 'jubilado'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: true,
    bcu: 'desconocido',
    membershipRequired: false,
    reputacion: 52,
    signals: [
      { label: 'monto máximo', value: '$250.000', tone: 'pos' },
      { label: 'requisito real', value: 'cobrar por Midinero', tone: 'neutral' },
      { label: 'TEA publicada', value: 'ninguna', tone: 'neg' },
    ],
    bestFor: 'Jubilado o trabajador que ya cobra por Midinero y no tiene cuenta bancaria.',
    pros: [
      'Monto y plazo de nivel bancario sin necesidad de un banco.',
      'Es una vía real de crédito formal para quien cobra el BPS y no tiene otra puerta.',
      'Retiro y pago por la red de RedPagos, en todo el país.',
    ],
    cons: [
      'No publica la tasa en ninguna de sus cinco páginas de tarifas, que revisamos una por una.',
      'Es emisora de dinero electrónico, pero no la encontramos en los registros de crédito del BCU bajo los que se otorgan estos préstamos.',
      'Solo para quien acredita sus haberes ahí: no es una opción abierta.',
    ],
    verdict:
      'Cumple una función que se subestima: darle crédito formal a gente que el sistema bancario no atiende, con montos que no son simbólicos. Lo que no hace es decirte cuánto cuesta antes de que pidas, y en un producto dirigido a quien tiene menos alternativas eso pesa más, no menos.',
    website: 'https://www.midinero.com.uy',
    sourceUrl: 'https://www.midinero.com.uy/prestamos/',
    sources: [
      { label: 'Midinero — préstamos', url: 'https://www.midinero.com.uy/prestamos/' },
      { label: 'Midinero — detalle de tarifas', url: 'https://www.midinero.com.uy/tarifas/' },
    ],
    redditId: 'midinero',
  },
  {
    id: 'pago-despues',
    name: 'Pago Después (ex-UinUin)',
    segment: 'fintech',
    identity: 'Fintech de compras en cuotas y efectivo',
    tagline: 'Dice que presta en el clearing y publica el tope legal en vez de su tasa.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí, según su propia home: "accedé a préstamos en efectivo sin vueltas. Incluso estando en el Clearing", con el asterisco de "sujeto a aprobación".',
    minIncomeUyu: null,
    maxAmountUyu: 160000,
    maxTermMonths: 32,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 24,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 46,
    flag: 'Lo que publica como "tasas" NO son sus tasas: son los topes máximos que fija el BCU. Que una empresa muestre el techo legal donde debería ir su precio no te dice nada sobre lo que te va a cobrar. Opera bajo Floder S.A. (Paigo), igual que Volvé, Crédito Uruguayo, UinUin, Credisol, PYM y el Prextamo de Prex.',
    signals: [
      { label: 'dice prestar en el clearing', value: 'en su home', tone: 'pos' },
      { label: 'lo que publica como tasa', value: 'el tope del BCU', tone: 'neg' },
      { label: 'monto máximo', value: '$160.000', tone: 'neutral' },
    ],
    bestFor: 'Compra en cuotas sin tarjeta, o un monto chico cuando el resto ya te dijo que no.',
    pros: [
      'Contesta la pregunta del clearing en la portada, sin hacerte llamar.',
      'Todo el circuito es online y admite compras en cuotas además de efectivo en la mano.',
      'Hasta 32 cuotas, un plazo largo para el segmento.',
    ],
    cons: [
      'Publica los topes de usura del BCU como si fueran su tarifa: es la maniobra de transparencia aparente más común del rubro.',
      'Sin TEA propia publicada, no hay forma de compararla con nadie antes de solicitar.',
      'Es una de las siete marcas de Floder S.A.: buscar una segunda opinión entre ellas no es buscar una segunda opinión.',
    ],
    verdict:
      'Le reconocemos lo que casi nadie hace —decir de entrada que evalúa gente en el Clearing— y le marcamos lo que hace peor que casi nadie: mostrar el techo legal donde debería ir su precio. Si vas a pedir acá, la única cifra que importa es el CFT del contrato, y hay que pedirlo por escrito.',
    website: 'https://www.pagodespues.com.uy',
    sourceUrl: 'https://www.pagodespues.com.uy/legales',
    sources: [
      {
        label: 'Pago Después — legales y topes publicados',
        url: 'https://www.pagodespues.com.uy/legales',
      },
      { label: 'Pago Después — home', url: 'https://www.pagodespues.com.uy/' },
    ],
  },
  {
    id: 'payflex',
    name: 'PayFlex',
    segment: 'fintech',
    identity: 'Adelanto de sueldo (earned wage access) — no es un préstamo',
    tagline: 'Retirás lo que ya trabajaste. Sin interés, sin clearing, sin deuda.',
    teaPct: 0,
    teaMaxPct: null,
    ivaOnInterest: false,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí, porque no hay evaluación crediticia: estás retirando salario ya devengado, no plata prestada. La única puerta es que tu empleador esté adherido.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: null,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 1,
    audiences: ['dependiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: true,
    originationFee: false,
    insuranceMandatory: false,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 70,
    signals: [
      { label: 'costo para el trabajador', value: 'sin interés', tone: 'pos' },
      { label: 'quién paga', value: 'el empleador', tone: 'pos' },
      { label: 'requisito', value: 'que tu empresa esté adherida', tone: 'neg' },
    ],
    bestFor: 'Empleado de una empresa adherida que necesita adelantar unos días de sueldo.',
    pros: [
      'No cobra interés ni comisión al trabajador: el plan lo paga la empresa.',
      'No hay evaluación crediticia, así que el Clearing es irrelevante.',
      'No genera deuda: como mucho, cobrás menos a fin de mes.',
    ],
    cons: [
      'Depende enteramente de que tu empleador lo haya contratado; no lo podés activar por tu cuenta.',
      'Solo llega hasta lo que ya trabajaste: no sirve para financiar nada grande.',
      'Usado todos los meses tapa un problema de ingresos en vez de resolverlo.',
    ],
    verdict:
      'Estrictamente no es un préstamo, y por eso gana: sin interés, sin antecedentes y sin deuda nueva. Está en el tablero porque para el hueco de fin de mes —que es lo que la mitad de la gente viene a resolver acá— es la respuesta más barata que existe, cuando existe.',
    website: 'https://payflexapp.com',
    sourceUrl: 'https://payflexapp.com/',
    sources: [{ label: 'PayFlex', url: 'https://payflexapp.com/' }],
  },
  {
    id: 'volve',
    name: 'Volvé',
    segment: 'fintech',
    identity: 'Financiera digital',
    tagline: 'Se publicita para gente en el clearing y no publica una sola cifra.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí, según su propio sitio: "te damos la oportunidad de volver al mundo crediticio sin importar si estás en el clearing". Es su propuesta central y todo su marketing gira alrededor de eso.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: null,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 24,
    audiences: ['dependiente', 'independiente'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'registrada',
    membershipRequired: false,
    reputacion: 36,
    flag: 'Se dirige explícitamente a personas en el Clearing y no publica TEA, CFT, monto ni plazo en ninguna página legible. Opera bajo Floder S.A. (Paigo), inscripta en el registro de administradoras de crédito del BCU — la misma empresa detrás de Pago Después, Crédito Uruguayo, UinUin, Credisol, PYM y el Prextamo de Prex.',
    signals: [
      { label: 'público al que apunta', value: 'gente en el clearing', tone: 'neutral' },
      { label: 'TEA o CFT publicados', value: 'ninguno', tone: 'neg' },
      { label: 'razón social', value: 'Floder S.A. (Paigo)', tone: 'neutral' },
    ],
    bestFor: 'Nadie sin antes conseguir por escrito el CFT y la razón social.',
    pros: [
      'Dice de frente que evalúa a gente con antecedentes, que es lo que su público necesita saber.',
      'Trámite enteramente digital.',
      'Declara estar regulada y supervisada por el BCU.',
    ],
    cons: [
      'Ni la home ni el PDF de términos permiten leer una tasa: no hay con qué compararla.',
      'Es una de las siete marcas de Floder S.A.: comparar Volvé con Pago Después es comparar dos vidrieras del mismo local.',
      'La combinación "apunto a gente sin alternativas" + "no publico el precio" es la que más caro sale en este rubro.',
    ],
    verdict:
      'Ocupa el lugar más delicado del tablero: le habla justamente a quien tiene menos margen para negociar y es de las que menos información da. No decimos que sea una estafa —está inscripta y nada indica lo contrario— sino que hoy es imposible saber cuánto cobra, y eso, en este segmento, es motivo suficiente para pedir todo por escrito antes de firmar.',
    website: 'https://volve.com.uy',
    sourceUrl: 'https://volve.com.uy/',
    sources: [{ label: 'Volvé', url: 'https://volve.com.uy/' }],
  },
  // ── Entre personas ────────────────────────────────────────────────────────
  {
    id: 'prestapagos',
    name: 'Prestapagos',
    segment: 'p2p',
    identity: 'Plataforma de préstamos entre personas (EAPPP autorizada por el BCU)',
    tagline: 'La primera plataforma P2P autorizada del país. Nadie queda excluido de entrada.',
    teaPct: 50,
    teaMaxPct: 130,
    ivaOnInterest: true,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí. Sus preguntas frecuentes lo dicen dos veces: ningún perfil queda excluido, porque quien decide prestarte no es la plataforma sino cada oferente.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: null,
    currencies: ['UYU'],
    onlineEndToEnd: true,
    disbursementHours: 72,
    audiences: ['dependiente', 'independiente', 'jubilado'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: null,
    insuranceMandatory: null,
    bcu: 'supervisada',
    membershipRequired: false,
    reputacion: 54,
    signals: [
      { label: 'TEA publicada en su informe financiero', value: '50–130%', tone: 'neutral' },
      { label: 'primera EAPPP autorizada por el BCU', value: 'sí', tone: 'pos' },
      { label: 'quién decide', value: 'cada prestamista', tone: 'neutral' },
    ],
    bestFor:
      'Quien quedó afuera del sistema tradicional y prefiere una plataforma regulada antes que un prestamista particular.',
    pros: [
      'Es la primera —y por ahora la única— plataforma de préstamos entre personas autorizada por el BCU en Uruguay.',
      'Publica el rango de tasas en un informe con fecha, y aclara que cada oferente elige dentro de lo permitido.',
      'No excluye perfiles de entrada, cosa que ningún banco puede decir.',
    ],
    cons: [
      'El rango llega al 130%, que roza el tope de usura: "no excluir a nadie" y "salir barato" no son lo mismo.',
      'La aprobación depende de que aparezca un prestamista dispuesto, así que no hay plazo garantizado.',
      'Es un modelo nuevo en el país: hay poca experiencia acumulada de usuarios.',
    ],
    verdict:
      'Que exista una plataforma P2P autorizada cambia el mapa para quien está en el Clearing: es una alternativa formal, con contrato y con un regulador detrás, donde antes solo quedaba el prestamista informal. Ahora bien, el precio puede ser tan alto como el de una financiera cara — regulado no quiere decir barato.',
    website: 'https://prestapagos.com.uy',
    sourceUrl: 'https://prestapagos.com.uy/',
    sources: [
      {
        label: 'Prestapagos — preguntas frecuentes e información financiera',
        url: 'https://prestapagos.com.uy/',
      },
      {
        label:
          'BCU — registro de empresas administradoras de plataformas de préstamos entre personas',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Default.aspx',
      },
    ],
  },
  // ── Prendario ─────────────────────────────────────────────────────────────
  {
    id: 'empeno',
    name: 'Casas de empeño',
    segment: 'prendario',
    identity: 'Préstamo contra prenda — fuera del perímetro del BCU',
    tagline: 'La única puerta que no te mira el legajo. Tampoco te dice el precio.',
    teaPct: null,
    teaMaxPct: null,
    ivaOnInterest: false,
    publishesCft: false,
    clearing: 'si',
    clearingNote:
      'Sí, por diseño: la garantía es el objeto que dejás, así que no hay análisis de historial. Ninguna casa de empeño que revisamos publica requisitos ni consulta al Clearing.',
    minIncomeUyu: null,
    maxAmountUyu: null,
    maxTermMonths: 1,
    currencies: ['UYU'],
    onlineEndToEnd: false,
    disbursementHours: 1,
    audiences: ['dependiente', 'independiente', 'jubilado', 'extranjero'],
    payrollDeductionRequired: false,
    earlyRepaymentFree: null,
    originationFee: true,
    insuranceMandatory: false,
    bcu: 'no-regulada',
    membershipRequired: false,
    reputacion: 30,
    flag: 'No hay en Uruguay una ley específica de casas de empeño ni supervisión del BCU sobre ellas. El costo casi nunca se expresa como TEA sino como "cargo por guarda" o diferencia de recompra, que es precisamente lo que lo vuelve incomparable.',
    signals: [
      { label: 'no mira el clearing', value: 'nunca', tone: 'pos' },
      { label: 'plata en la mano', value: 'en el momento', tone: 'pos' },
      { label: 'costo expresado como TEA', value: 'ninguna lo publica', tone: 'neg' },
    ],
    bestFor:
      'Emergencia real de alguien sin ingreso comprobable y sin ninguna otra puerta abierta.',
    pros: [
      'Es la vía más rápida que existe y la única que no evalúa absolutamente nada de tu historial.',
      'No genera una deuda que te persiga: el peor escenario es perder la prenda.',
      'No te deja un antecedente nuevo en el Clearing.',
    ],
    cons: [
      'El costo se presenta como cargo por guarda o como precio de recompra, no como tasa: es casi imposible compararlo con un préstamo.',
      'Los plazos son de semanas, así que la renovación sucesiva multiplica el costo real.',
      'Están fuera del perímetro del BCU: si hay un problema, no hay superintendencia a la que reclamar.',
    ],
    verdict:
      'Está en el tablero porque para mucha gente es la única puerta que queda abierta, y ocultarla no la hace desaparecer. Pero el modelo está construido para que no puedas comparar: mientras el precio se llame "guarda" y no "interés", no hay número que puedas poner al lado de otro. Si vas a empeñar, preguntá cuánto cuesta recuperarlo y en cuántos días, y anotalo.',
    website: 'https://empeno.uy',
    sourceUrl: 'https://empeno.uy/',
    sources: [{ label: 'empeño.uy — casa de empeño online', url: 'https://empeno.uy/' }],
  },
])
