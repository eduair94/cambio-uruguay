import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { StoreProfileDoc } from "../stores/profile";

// One document per curated store (classes/stores/registry.ts), in the APP database, which the Nuxt
// pages of /tiendas-online-uruguay read directly. Written weekly by sync_store_profiles.ts with an
// upsert by `key`; a store dropped from the registry is never deleted here.
//
// Each signal is a Mixed subdocument that carries its own `checkedAt`. A signal whose source failed
// this week keeps its previous value and its OLD date (classes/stores/profile.ts), which is why the
// dates live inside each signal and not once at the top of the document.
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
    signals: { type: Number, default: 0 },
    indexable: { type: Boolean, default: false },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
);

StoreProfileSchema.index({ key: 1 }, { unique: true });

export const StoreProfileModel = appModel<StoreProfileDoc>("StoreProfile", StoreProfileSchema, "storeprofiles");
