// State for the Bankos "new discount" push alerts.
//
// Two kinds of row live here, both keyed by the unique `key`:
//   • 'latest'          — the dedupe ledger: every (bank, brand) discount already announced.
//   • 'run:YYYY-MM-DD'  — one claim per day. The Nuxt app runs as pm2 cluster x2, so EVERY
//                         scheduled task fires twice; inserting this row with $setOnInsert lets
//                         exactly one instance win and the other exit (see
//                         memory: nitro tasks double-fire).
import mongoose, { Schema, type Model } from 'mongoose'

export interface BankosAlertStateDoc {
  key: string
  pairs: string[]
  at: Date
}

const BankosAlertStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    pairs: { type: [String], default: [] },
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

export const BankosAlertStateModel: Model<BankosAlertStateDoc> =
  (mongoose.models.BankosAlertState as Model<BankosAlertStateDoc>) ||
  mongoose.model<BankosAlertStateDoc>(
    'BankosAlertState',
    BankosAlertStateSchema,
    'bankosalertstate'
  )
