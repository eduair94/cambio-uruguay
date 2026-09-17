import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PhoneModel } from "../phones/catalog";

// One document per phone MODEL (brand+family+storage), in the APP database — the Nuxt directory
// reads it directly. Mirrors classes/models/ChairCatalogProduct.ts / EquiparItem.ts: a model that
// stops selling is NOT deleted, its price history is the only record of what it used to cost here.
//
// `bands` holds one entry per PhoneCondition ("new"/"open-box"/"refurbished"/"used"), never pooled —
// see classes/phones/catalog.ts's own module comment for why. `ambiguousConditions`/
// `ambiguousDropped` record a condition this run abstained on (two co-equal price populations merged
// onto one key) rather than arbitrate between them — see PhoneModel.ambiguousConditions's own doc
// comment in catalog.ts, which a page must check before publishing a model or a sitemap entry.
const PhoneModelSchema = new Schema(
  {
    key: { type: String, required: true },
    slug: { type: String, required: true },
    brand: { type: String, required: true },
    brandLabel: { type: String, required: true },
    family: { type: String, required: true },
    familyLabel: { type: String, required: true },
    storageGb: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String, default: null },
    bands: { type: Schema.Types.Mixed, default: {} },
    offers: { type: [Schema.Types.Mixed], default: [] },
    newSellers: { type: Number, default: 0 },
    esimOnlySeen: { type: Boolean, default: false },
    suspectDropped: { type: Number, default: 0 },
    ambiguousDropped: { type: Number, default: 0 },
    ambiguousConditions: { type: [String], default: [] },
    observedAt: { type: String, default: null },
    history: { type: [Schema.Types.Mixed], default: [] },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
);

PhoneModelSchema.index({ key: 1 }, { unique: true });
PhoneModelSchema.index({ brand: 1, lastSeen: -1 });

export const PhoneModelModel = appModel<PhoneModel>("PhoneModel", PhoneModelSchema, "phonemodels");
