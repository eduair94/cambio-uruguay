// The one row of `loantiersnapshots` on the APP database. Read-modify-write, never blind upsert:
// classes/loantiers/merge.ts needs last week's patches both to carry forward what this run could
// not re-verify and to work out what actually changed.
import { LoanTierSnapshotModel } from "../models/LoanTierSnapshot";
import { LOAN_TIER_SNAPSHOT_KEY, type LoanTierSnapshot } from "./types";

export async function loadLoanTierSnapshot(): Promise<LoanTierSnapshot | null> {
  return LoanTierSnapshotModel.findOne({ key: LOAN_TIER_SNAPSHOT_KEY }).lean<LoanTierSnapshot>();
}

export async function saveLoanTierSnapshot(snapshot: LoanTierSnapshot): Promise<void> {
  await LoanTierSnapshotModel.updateOne(
    { key: snapshot.key },
    { $set: { ...snapshot } },
    { upsert: true }
  );
}
