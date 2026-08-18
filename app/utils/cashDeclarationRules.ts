// app/utils/cashDeclarationRules.ts
//
// Uruguay's cross-border CASH declaration regime: how much money you can carry
// in or out without telling anybody, who you tell when you pass the line, and
// what the fine is when you don't.
//
// This is a DIFFERENT regime from `travelerBaggageRules.ts` (goods in your
// suitcase) and from `importRules.ts` (courier purchases): money is not
// merchandise, carrying it is not taxed and there is no upper limit at all —
// the only obligation is to declare it above a threshold.
//
// EVERY NUMBER HERE IS SOURCED. Verified against primary sources on 2026-08-18:
//   - Ley 19.574 art. 29 ("Obligación de comunicar y declarar"), in the wording
//     given by Ley 20.469 de 19/03/2026 art. 1 — current text on IMPO:
//     https://www.impo.com.uy/bases/leyes/19574-2017/29
//   - Original 2017 wording of the same article, for the comparison below:
//     https://www.impo.com.uy/bases/leyes-originales/19574-2017/29
//   - Decreto 255/006 art. 1 — which form the declaration goes on:
//     https://www.impo.com.uy/bases/decretos/255-2006
//   - DNA, "Normativa vigente para transporte de valores" (the list Aduanas
//     itself publishes for this regime):
//     https://www.aduanas.gub.uy/innovaportal/v/12181/9/innova.front/normativa_vigente_para_transporte_de_valores_.html
//
// WHAT WE DELIBERATELY DO NOT PUBLISH: Decreto 255/006 art. 2 still states a
// fine band of 1.000 to 20.000.000 UI, by reference to art. 2 of Ley 17.835 —
// a law this regime no longer runs on. The law's own current text now fixes the
// percentages below, so quoting the UI band as "the fine" would be quoting a
// superseded rule. It is mentioned on the page as stale source material, never
// as an amount somebody should expect to pay.

/** Date every fact in this module was last verified against primary sources. */
export const LAST_RESEARCHED = '2026-08-18'

/**
 * The declaration threshold, in US dollars. Ley 19.574 art. 29.
 *
 * The law says "por un monto SUPERIOR a US$ 10.000", so exactly 10.000 does not
 * trigger the obligation — the strict inequality is load-bearing and is the
 * single most common thing people get wrong about this rule.
 */
export const DECLARATION_THRESHOLD_USD = 10_000

/** Fine for a first omission: 30% of the amount ABOVE the threshold. */
export const FINE_RATE_FIRST_PCT = 30

/** Fine on repetition: 60% of the TOTAL carried, not of the excess. */
export const FINE_RATE_REPEAT_PCT = 60

/**
 * Months the seized money can sit before `decomiso de pleno derecho` is asked
 * for, when no evidence of a lawful origin is offered (Ley 19.574 art. 29, by
 * reference to art. 52).
 */
export const FORFEITURE_MONTHS = 6

/** Who the traveller reports to, which is not the same office for everybody. */
export type DeclarationChannel = 'bcu' | 'aduana'

export interface CashDeclarationInput {
  /** Total carried, expressed in USD (other currencies count at their equivalent). */
  amountUsd: number
  /** True for anyone under BCU supervision — banks, casas de cambio, transport firms. */
  bcuSupervised?: boolean
  /** True when the DNA register already lists this person for a previous omission. */
  repeatOffence?: boolean
}

export interface CashDeclarationResult {
  amountUsd: number
  mustDeclare: boolean
  /** Where the declaration goes when `mustDeclare` is true. */
  channel: DeclarationChannel
  /** Amount above the threshold; 0 when at or below it. */
  excessUsd: number
  /** Fine that would apply if this amount crossed the border undeclared. */
  fineUsd: number
  /** Which of the two rates produced `fineUsd`. */
  fineRatePct: number
  /** True when the fine is computed on the total carried rather than the excess. */
  fineOnTotal: boolean
}

/**
 * Resolve the obligation and the exposure for one crossing.
 *
 * Pure and side-effect free so the page can call it on every keystroke and the
 * unit test can pin the boundary cases the law hinges on.
 */
export function resolveCashDeclaration(input: CashDeclarationInput): CashDeclarationResult {
  const amountUsd = Number.isFinite(input.amountUsd) ? Math.max(0, input.amountUsd) : 0
  const mustDeclare = amountUsd > DECLARATION_THRESHOLD_USD
  const excessUsd = mustDeclare ? amountUsd - DECLARATION_THRESHOLD_USD : 0
  const repeat = Boolean(input.repeatOffence)

  const fineRatePct = repeat ? FINE_RATE_REPEAT_PCT : FINE_RATE_FIRST_PCT
  // No obligation, no fine — the rates only ever apply to an undeclared crossing
  // that was above the threshold in the first place.
  const base = mustDeclare ? (repeat ? amountUsd : excessUsd) : 0
  const fineUsd = (base * fineRatePct) / 100

  return {
    amountUsd,
    mustDeclare,
    channel: input.bcuSupervised ? 'bcu' : 'aduana',
    excessUsd,
    fineUsd,
    fineRatePct,
    fineOnTotal: repeat,
  }
}

export interface CashRuleSource {
  label: string
  url: string
}

/** The primary sources behind every figure on the page, in citation order. */
export const CASH_RULE_SOURCES: readonly CashRuleSource[] = Object.freeze([
  {
    label:
      'Ley 19.574 art. 29 — "Obligación de comunicar y declarar", texto vigente (redacción dada por Ley 20.469 de 19/03/2026)',
    url: 'https://www.impo.com.uy/bases/leyes/19574-2017/29',
  },
  {
    label: 'Ley 19.574 art. 29 — texto original de 2017, para comparar qué cambió en 2026',
    url: 'https://www.impo.com.uy/bases/leyes-originales/19574-2017/29',
  },
  {
    label:
      'Decreto 255/006 art. 1 — el formulario en el que se declara (equipaje acompañado y carga)',
    url: 'https://www.impo.com.uy/bases/decretos/255-2006',
  },
  {
    label: 'Dirección Nacional de Aduanas — normativa vigente para transporte de valores',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/12181/9/innova.front/normativa_vigente_para_transporte_de_valores_.html',
  },
  {
    label:
      'Dirección Nacional de Aduanas — transporte de dinero en efectivo, metales preciosos u otros instrumentos monetarios a través de la frontera',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/5049/3/innova.front/transporte-de-dinero-en-efectivo-metales-preciosos-u-otros-instrumentos-monetarios-a-traves-de-la-frontera.html',
  },
])

export interface RuleChange {
  aspect: string
  before: string
  after: string
}

/**
 * What Ley 20.469 (19/03/2026) actually changed in art. 29. Both columns are
 * transcribed from the two IMPO texts linked above, not summarised from memory.
 */
export const CHANGES_2026: readonly RuleChange[] = Object.freeze([
  {
    aspect: 'Multa por no declarar',
    before:
      'Una multa "cuyo máximo podrá ascender hasta el monto de la cuantía no declarada", a criterio del Poder Ejecutivo.',
    after: '30 % del excedente de US$ 10.000. Es un porcentaje fijo, no un máximo discrecional.',
  },
  {
    aspect: 'Reincidencia',
    before: 'No estaba prevista como agravante en el artículo.',
    after:
      '60 % del total transportado, y la Dirección Nacional de Aduanas lleva un registro de quienes omiten declarar.',
  },
  {
    aspect: 'Dónde se controla',
    before: 'Sólo "a través de la frontera".',
    after: 'Frontera, zona primaria aduanera y zona de vigilancia aduanera especial.',
  },
  {
    aspect: 'Qué pasa con la plata retenida',
    before:
      'La autoridad pedía medidas cautelares judiciales dentro de las 48 horas hábiles para asegurar el cobro.',
    after:
      'La Aduana retiene directamente la suma equivalente a la multa y la deposita en la cuenta del Tesoro Nacional como garantía; su resolución es título ejecutivo.',
  },
])
