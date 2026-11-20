import { Schema } from "mongoose";
import { appModel } from "../appdb";
import { PRODUCTOS_VIDA_COLLECTIONS } from "../productosvida/registry";
import type { ProductosVidaMeta } from "../productosvida/types";

// Companion of ProductosVidaItem: one document (`key: PRODUCTOS_VIDA_META_KEY`) describing the last
// run of /productos-que-te-cambian-la-vida-uruguay — when, at what USD rate, how MercadoLibre behaved
// and which categories had no band. Same fields as classes/models/MovilidadMeta.ts.
const ProductosVidaMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
    uncovered: { type: [String], default: [] },
  },
  { timestamps: true }
);

ProductosVidaMetaSchema.index({ key: 1 }, { unique: true });

export const ProductosVidaMetaModel = appModel<ProductosVidaMeta & { key: string }>(
  "ProductosVidaMeta",
  ProductosVidaMetaSchema,
  PRODUCTOS_VIDA_COLLECTIONS.meta
);
