import mongoose, { Schema, type Model } from 'mongoose'

// One document per curated store of /tiendas-online-uruguay, written weekly by the backend job
// `sync_store_profiles.ts` (upsert by `key`, never deleted). The collection name is pinned so it is
// exactly the one the backend writes, not mongoose's pluralisation of the model name.
//
// Each signal is a Mixed subdocument carrying its own `checkedAt`: a signal whose source failed keeps
// its previous value and its OLD date, so the page can say when each fact was last true.
// `StoreProfileDoc` is declared here, not imported from the backend (the app cannot import from the
// repo root); the typed shapes of each signal arrive with the app utilities (Task 8).
//
// `redditMentions`, `redditCursor` and `redditTermsKey` are the backend's working state for reading
// Reddit incrementally (mention metadata without text or author, where reading stands, and the terms
// used). `toneCache` (Task 7) is the backend's working state for the automatic Reddit tone: one
// classification per mention id, keyed by id, that `RedditSignal.tone` (an aggregated count, never
// per-mention) is folded from. All four are declared so both schemas stay identical, and none of them
// is for the page: every API route must leave them out of its `.select`.
export interface StoreProfileDoc {
  key: string
  name: string
  domain: string | null
  kind: string
  rubros: string[]
  aliases: string[]
  site: Record<string, unknown> | null
  age: Record<string, unknown> | null
  trustpilot: Record<string, unknown> | null
  google: Record<string, unknown> | null
  reddit: Record<string, unknown> | null
  catalog: Record<string, unknown> | null
  redditMentions: Array<Record<string, unknown>>
  redditCursor: Record<string, unknown> | null
  redditTermsKey: string | null
  toneCache: Record<string, string>
  signals: number
  indexable: boolean
  firstSeen: string
  lastSeen: string
  createdAt?: Date
  updatedAt?: Date
}

const StoreProfileSchema = new Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    domain: { type: String, default: null },
    kind: { type: String, required: true },
    rubros: { type: [String], default: [] },
    aliases: { type: [String], default: [] },
    site: { type: Schema.Types.Mixed, default: null },
    age: { type: Schema.Types.Mixed, default: null },
    trustpilot: { type: Schema.Types.Mixed, default: null },
    google: { type: Schema.Types.Mixed, default: null },
    reddit: { type: Schema.Types.Mixed, default: null },
    catalog: { type: Schema.Types.Mixed, default: null },
    redditMentions: { type: [Schema.Types.Mixed], default: [] },
    redditCursor: { type: Schema.Types.Mixed, default: null },
    redditTermsKey: { type: String, default: null },
    toneCache: { type: Schema.Types.Mixed, default: {} },
    signals: { type: Number, default: 0 },
    indexable: { type: Boolean, default: false },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
)

StoreProfileSchema.index({ key: 1 }, { unique: true })

export const StoreProfileModel: Model<StoreProfileDoc> =
  (mongoose.models.StoreProfile as Model<StoreProfileDoc>) ||
  mongoose.model<StoreProfileDoc>('StoreProfile', StoreProfileSchema, 'storeprofiles')
