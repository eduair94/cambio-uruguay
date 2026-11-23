// Mirror of app/server/models/EmprendimientoListing.ts, bound to the APP's Mongo (classes/appdb.ts).
// One document per published account of /emprendimientos-de-instagram-uruguay, built field by field
// by classes/emprendimientos/listing.ts — the only thing /api/emprendimientos reads.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { EmprendimientoListing } from "../emprendimientos/types";

const EmprendimientoListingSchema = new Schema(
  {
    handle: { type: String, required: true },
    name: { type: String, required: true },
    summary: { type: String, default: "" },
    rubro: { type: String, required: true },
    tags: { type: [String], default: [] },
    departamento: { type: String, default: null },
    barrio: { type: String, default: null },
    envios: { type: String, default: "no-dice" },
    ofrece: { type: String, default: "productos" },
    raro: { type: Boolean, default: false },
    soloInstagram: { type: Boolean, default: true },
    website: { type: String, default: null },
    whatsapp: { type: Boolean, default: false },
    followers: { type: Number, default: null },
    profilePic: { type: String, default: null },
    posts: { type: [Schema.Types.Mixed], default: [] },
    lastPostAt: { type: String, default: null },
    postsLast90: { type: Number, default: 0 },
    sources: { type: [Schema.Types.Mixed], default: [] },
    listedAt: { type: String, required: true },
    readAt: { type: String, required: true },
    photosExpireAt: { type: String, default: null },
    search: { type: String, default: "" },
  },
  { timestamps: true }
);

EmprendimientoListingSchema.index({ handle: 1 }, { unique: true });
EmprendimientoListingSchema.index({ rubro: 1 });
EmprendimientoListingSchema.index({ departamento: 1 });
EmprendimientoListingSchema.index({ listedAt: -1 });

export const EmprendimientoListingModel = appModel<EmprendimientoListing>(
  "EmprendimientoListing",
  EmprendimientoListingSchema,
  "emprendimientolistings"
);
