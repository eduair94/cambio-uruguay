import mongoose, { Schema, type Model } from 'mongoose'
import type { SearchDemandQueue } from '../../utils/searchDemand'

// La escribe el job de backend `currency-search-demand` (raíz `sync_search_demand.ts`), la lee
// `/api/search-demand`. Espejo campo a campo de `classes/models/SearchDemandQueue.ts` — la suite de
// la raíz (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// NO ES PÚBLICO: la cola dice dónde el sitio NO llega, que es el mapa que un competidor querría.
const SearchDemandQueueSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    harvested: { type: Number, default: 0 },
    local: { type: Number, default: 0 },
    inScope: { type: Number, default: 0 },
    probed: { type: Number, default: 0 },
    items: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

SearchDemandQueueSchema.index({ key: 1 }, { unique: true })

export const SearchDemandQueueModel: Model<SearchDemandQueue> =
  (mongoose.models.SearchDemandQueue as Model<SearchDemandQueue>) ||
  mongoose.model<SearchDemandQueue>(
    'SearchDemandQueue',
    SearchDemandQueueSchema,
    'searchdemandqueues'
  )
