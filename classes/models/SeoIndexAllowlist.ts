import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { SeoIndexAllowlist } from "../gsc/indexAllowlist";

// Vive en la base del APP, UN documento por familia de páginas (`family: "alquileres"`). Espejo
// campo por campo de `app/server/models/SeoIndexAllowlist.ts` — tests/gsc/index_allowlist.test.ts
// falla si los dos se separan.
//
// QUÉ ES. La lista de fichas de una familia programática que Search Console vio con demanda real
// (≥ `minImpressions` impresiones en los últimos `windowDays` días). El app la lee para pasar a
// `noindex, follow` las fichas VIEJAS que no están en ella; una ficha joven o un documento ausente
// o vencido nunca cambian nada (la ausencia no es un veredicto). Ver docs/app/RENTALS.md,
// "Higiene del índice".
//
// Sólo rutas (`/alquileres/<slug>`), sin consultas ni métricas: no es el panel privado de Search
// Console, es una lista de URLs propias del sitio, y no dice nada que el sitemap no diga ya.
const SeoIndexAllowlistSchema = new Schema(
  {
    family: { type: String, required: true },
    asOf: { type: String, required: true },
    windowDays: { type: Number, required: true },
    minImpressions: { type: Number, required: true },
    urls: { type: [String], default: [] },
    rowCount: { type: Number, default: 0 },
    complete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SeoIndexAllowlistSchema.index({ family: 1 }, { unique: true });

export const SeoIndexAllowlistModel = appModel<SeoIndexAllowlist>(
  "SeoIndexAllowlist",
  SeoIndexAllowlistSchema,
  "seoindexallowlists"
);
