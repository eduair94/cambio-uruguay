import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { LoanTierSnapshot } from "../loantiers/types";

// Writer side of `loantiersnapshots` on the NUXT APP database (the reader is
// app/server/models/LoanTierSnapshot.ts). One row, key: "uy-personal-loans" — the weekly
// currency-loan-tiers job upserts it and /api/loan-tiers serves it to
// /mejores-prestamos-uruguay, which falls back to its own seed catalogue when the row is absent.
const LoanTierSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    model: { type: String, default: "" },
    patches: { type: [Schema.Types.Mixed], default: [] },
    changes: { type: [Schema.Types.Mixed], default: [] },
    verified: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LoanTierSnapshotSchema.index({ key: 1 }, { unique: true });

export const LoanTierSnapshotModel = appModel<LoanTierSnapshot>(
  "LoanTierSnapshot",
  LoanTierSnapshotSchema,
  "loantiersnapshots"
);
