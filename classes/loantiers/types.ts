// Shapes shared by the weekly loan-tier refresh. Deliberately a NARROW mirror of the app's
// `LenderFacts` (app/utils/loanTierlist.ts): the backend may move facts and nothing else, so the
// editorial fields (verdict, pros, cons, reputación) do not exist here and cannot be patched by
// accident. tests/loantiers/catalog.test.ts reads the app file as text and asserts the ids match.

export type ClearingStance = "si" | "parcial" | "no" | "desconocido";
export type Audience = "dependiente" | "jubilado" | "independiente" | "extranjero" | "socio";
export type BcuStatus = "supervisada" | "registrada" | "no-regulada" | "desconocido";
export type Currency = "UYU" | "USD" | "UI";

/** Every field a refresh is allowed to write. Anything absent is "the pass had nothing to say". */
export interface LenderFactPatch {
  id: string;
  teaPct?: number | null;
  teaMaxPct?: number | null;
  ivaOnInterest?: boolean;
  publishesCft?: boolean;
  clearing?: ClearingStance;
  clearingNote?: string;
  minIncomeUyu?: number | null;
  maxAmountUyu?: number | null;
  maxTermMonths?: number | null;
  currencies?: Currency[];
  onlineEndToEnd?: boolean;
  disbursementHours?: number | null;
  audiences?: Audience[];
  payrollDeductionRequired?: boolean;
  earlyRepaymentFree?: boolean | null;
  originationFee?: boolean | null;
  insuranceMandatory?: boolean | null;
  bcu?: BcuStatus;
  membershipRequired?: boolean;
  verifiedAt?: string;
  sourceUrl?: string;
  changeNote?: string;
}

export interface LoanTierChange {
  id: string;
  name: string;
  text: string;
}

export interface LoanTierSnapshot {
  key: string;
  asOf: string;
  model: string;
  patches: LenderFactPatch[];
  changes: LoanTierChange[];
  /** How many lenders the run actually managed to re-verify. Used by the thin-pull guard. */
  verified: number;
  /** How many lenders the catalogue has. */
  total: number;
}

export const LOAN_TIER_SNAPSHOT_KEY = "uy-personal-loans";
