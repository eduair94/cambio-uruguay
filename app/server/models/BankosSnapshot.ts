// Reads `bankossnapshots` — the outage fallback the backend job `currency-bankos` upserts
// (classes/models/BankosSnapshot.ts is the writer, on the SAME app database). One row, key:"latest".
import mongoose, { Schema, type Model } from 'mongoose'

export interface BankosSnapshotDoc {
  key: string
  generatedAt: Date
  banks: string[]
  counts: { brands: number; locations: number; banksWithDiscounts: number }
  data: {
    brands: Record<
      string,
      { brandId: string; name: string; avgRating?: number; categories?: string[] }
    >
    locations: Record<
      string,
      {
        locationId: string
        brandId: string
        location: { coordinates: [number, number] }
        rating?: number
      }
    >
    bankBrands: Record<
      string,
      Record<
        string,
        {
          creditDescription: string | null
          debitDescription: string | null
          hasCredit: boolean
          hasDebit: boolean
          availableDays: unknown | null
        }
      >
    >
    brandLocations: Record<string, string[]>
  }
}

const BankosSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    generatedAt: { type: Date, required: true },
    banks: { type: [String], default: [] },
    counts: { type: Schema.Types.Mixed, default: {} },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const BankosSnapshotModel: Model<BankosSnapshotDoc> =
  (mongoose.models.BankosSnapshot as Model<BankosSnapshotDoc>) ||
  mongoose.model<BankosSnapshotDoc>('BankosSnapshot', BankosSnapshotSchema, 'bankossnapshots')
