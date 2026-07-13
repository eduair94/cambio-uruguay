// Pure logic behind the four interactive tools on /problemas-con-la-aduana-uruguay. No Vue, no
// fetch — every number these functions use comes from the `facts` array the API (or its fallback,
// app/server/utils/aduanaFallback.ts) hands them. The page and this module hold no rules and no
// amounts of their own: change a threshold in the norm and it changes here without touching code.
import type {
  AduanaFact,
  AduanaProblem,
  BucketId,
  PublicAduanaPayload,
} from '../server/utils/aduanaFallback'

// Re-exported, not redeclared — see the fallback file's header comment on why app/ carries a copy
// of these types instead of importing them across the app/ <-> root tsconfig boundary.
export type { AduanaFact, AduanaProblem, BucketId, PublicAduanaPayload }

// --- verifyCharges ---------------------------------------------------------------------------

export type ChargeId =
  | 'iva'
  | 'prestacion_unica'
  | 'gestion_courier'
  | 'deposito'
  | 'flete'
  | 'otro'

export interface Charge {
  id: ChargeId
  amountUsd: number
}

export interface ChargeVerdict {
  id: ChargeId
  amountUsd: number
  backing: 'norma' | 'contrato' | 'sin-respaldo'
  explain: string
  sourceId?: string
}

// Which fact backs each tax-like charge. Both facts happen to be established by the same article
// that creates the regime the charge belongs to (Decreto 50/026 art. 3 for IVA within the
// franchise; Ley 20.446 art. 627 for the prestación única) — so the fact that already carries the
// franchise's tope, or the prestación única's mínimo, is the fact we cite as the charge's backing.
const NORMA_BACKED_CHARGE_FACT: Partial<Record<ChargeId, string>> = {
  iva: 'franquicia.tope_anual_usd',
  prestacion_unica: 'prestacion_unica.minimo_usd',
}

const CONTRATO_BACKED_CHARGES: ReadonlySet<ChargeId> = new Set([
  'gestion_courier',
  'deposito',
  'flete',
])

function findFact(facts: AduanaFact[], id: string): AduanaFact | undefined {
  return facts.find(f => f.id === id)
}

/**
 * Classifies each charge by what backs it — it never recomputes an amount. The IVA taxable base
 * is one of the things the underlying legal research could NOT verify (Decreto 50/026 art. 3
 * defers to a TO 2023 article IMPO serves as an empty shell), so this function does not attempt to
 * check whether an amount is *correct* — only whether it is a tax the norm imposes, a price the
 * courier's contract sets, or neither.
 */
export function verifyCharges(input: { charges: Charge[]; facts: AduanaFact[] }): ChargeVerdict[] {
  return input.charges.map(charge => {
    const backingFactId = NORMA_BACKED_CHARGE_FACT[charge.id]
    if (backingFactId) {
      const fact = findFact(input.facts, backingFactId)
      let label: string
      if (charge.id === 'iva') {
        label =
          'El IVA sobre un envío en franquicia es un tributo (lo fija la norma, no el courier).'
      } else {
        const tasaFact = findFact(input.facts, 'prestacion_unica.tasa_pct')
        const tasaPart = tasaFact ? ` (${tasaFact.value}% del valor, con un mínimo por envío)` : ''
        label = `La prestación única${tasaPart} es un tributo fijado por ley — es el régimen alternativo a la franquicia, no un cargo del courier.`
      }
      return {
        id: charge.id,
        amountUsd: charge.amountUsd,
        backing: 'norma',
        sourceId: fact?.sourceId,
        explain: label,
      }
    }

    if (CONTRATO_BACKED_CHARGES.has(charge.id)) {
      return {
        id: charge.id,
        amountUsd: charge.amountUsd,
        backing: 'contrato',
        explain:
          'Esto es precio de lista del courier — su lista de precios, no un tributo. La aduana no lo cobra ni lo fija. Es negociable y comparable entre couriers: no es "me cobró la aduana", es "me cobró el courier".',
      }
    }

    return {
      id: charge.id,
      amountUsd: charge.amountUsd,
      backing: 'sin-respaldo',
      explain:
        'No encontramos qué norma ni qué contrato respalda este cargo. Pedí el desglose por escrito antes de pagarlo.',
    }
  })
}

// --- franchiseStatus ---------------------------------------------------------------------------

export interface FranchiseStatus {
  usedUsd: number
  remainingUsd: number
  shipmentsUsed: number
  shipmentsLeft: number
  exhausted: boolean
  nextPurchaseWarning: string | null
  /** true when `facts` is missing the tope or the shipment cap — we cannot compute anything, and
   * must say so rather than defaulting the missing number to 0 and reporting a false "exhausted". */
  unknown: boolean
}

/**
 * Reads the annual tope and the shipment cap from `facts` — never a literal. `exhausted` is true
 * the moment EITHER limit is spent: three shipments is three shipments, even if they were cheap
 * and money remains in the USD 800 tope.
 *
 * `nextPurchaseWarning` conveys the regime's costliest misunderstanding: the franchise is not
 * divisible. If USD 100 is left and the next purchase is USD 500, it is not "IVA on 100 + 60% on
 * 400" — the whole 500 goes to the prestación única. No article in Decreto 50/026 or Ley 20.446
 * says this in so many words; it follows from the regime's design (a franchise "de hasta" a tope,
 * with no partial-application mechanism). So this warning is deliberately NOT attributed to a
 * norm or an article. It only fires when a purchase is actually close to tripping the misunderstanding
 * — within one average franchise slot (`tope / maxEnvios`) of the tope, or out of shipments — not on
 * every purchase ever recorded, which would train people to skim past it.
 */
export function franchiseStatus(input: {
  purchases: Array<{ valueUsd: number }>
  facts: AduanaFact[]
}): FranchiseStatus {
  const topeFact = findFact(input.facts, 'franquicia.tope_anual_usd')
  const maxEnviosFact = findFact(input.facts, 'franquicia.max_envios')
  const minimoFact = findFact(input.facts, 'prestacion_unica.minimo_usd')

  const usedUsd = input.purchases.reduce((sum, p) => sum + p.valueUsd, 0)
  const shipmentsUsed = input.purchases.length

  // Without the tope or the shipment cap there is nothing to compute — `?? 0` would silently turn
  // a missing fact into "0 left", which reads to a user who bought nothing as "no franchise left".
  if (!topeFact || !maxEnviosFact) {
    return {
      usedUsd,
      remainingUsd: 0,
      shipmentsUsed,
      shipmentsLeft: 0,
      exhausted: false,
      nextPurchaseWarning: null,
      unknown: true,
    }
  }

  const tope = Number(topeFact.value)
  const maxEnvios = Number(maxEnviosFact.value)
  const minimoPrestacion = minimoFact ? Number(minimoFact.value) : undefined

  const remainingUsd = Math.max(0, tope - usedUsd)
  const shipmentsLeft = Math.max(0, maxEnvios - shipmentsUsed)
  const exhausted = remainingUsd <= 0 || shipmentsLeft <= 0

  // Near-limit gate: one average franchise slot (`tope / maxEnvios`), never a literal. Firing the
  // warning on any recorded purchase (even a cheap first one) trains people to skim past the box
  // that matters once they're actually close to the tope.
  const slot = maxEnvios > 0 ? tope / maxEnvios : 0
  const nearLimit = remainingUsd < slot || shipmentsLeft <= 0
  const nextPurchaseWarning =
    (usedUsd > 0 || shipmentsUsed > 0) && nearLimit
      ? buildNextPurchaseWarning({ remainingUsd, minimoPrestacion })
      : null

  return {
    usedUsd,
    remainingUsd,
    shipmentsUsed,
    shipmentsLeft,
    exhausted,
    nextPurchaseWarning,
    unknown: false,
  }
}

function buildNextPurchaseWarning(params: {
  remainingUsd: number
  minimoPrestacion?: number
}): string {
  const minimoPart =
    params.minimoPrestacion != null ? ` (mínimo USD ${params.minimoPrestacion} por envío)` : ''
  return (
    `La franquicia no se parte: si la próxima compra supera lo que te queda (USD ${params.remainingUsd}), ` +
    `no pagás solo por el excedente — el envío entero pasa a la prestación única${minimoPart}, no una parte de él. ` +
    'Esto no lo dice ningún artículo puntual: se desprende del diseño del régimen (una franquicia "de hasta" un tope, sin un mecanismo de aplicación parcial en ninguna norma).'
  )
}

// --- buildClaim --------------------------------------------------------------------------------

// A minimal, structural shape — deliberately lighter than AduanaProblem so callers (including the
// page, passing a full AduanaProblem from the payload) can reuse it without redeclaring anything.
export interface ProblemLike {
  id: BucketId
  title: string
  claimTemplate?: string
}

const PLACEHOLDER_PATTERN = /\{\{/

/**
 * Fills a claim template's placeholders and asserts none survive. Throws rather than silently
 * shipping a claim letter with a literal "{{tracking}}" in it.
 */
export function buildClaim(input: {
  problem: ProblemLike
  tracking: string
  date: string
  description: string
}): string {
  const template = input.problem.claimTemplate ?? ''
  const filled = template
    .split('{{tracking}}')
    .join(input.tracking)
    .split('{{fecha}}')
    .join(input.date)
    .split('{{descripcion}}')
    .join(input.description)

  if (PLACEHOLDER_PATTERN.test(filled)) {
    throw new Error(`buildClaim: unresolved template placeholder for problem "${input.problem.id}"`)
  }

  return filled
}

// --- diagnose ------------------------------------------------------------------------------------

/** Returns the problem entry matching the chosen bucket, or null if it isn't in the given list. */
export function diagnose(symptom: BucketId, problems: ProblemLike[]): ProblemLike | null {
  return problems.find(p => p.id === symptom) ?? null
}
