import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicMotoModel, PublicMotoReportSnapshot } from "../motos/types";

// Dos cosas en la misma colección, distinguidas por su `key`:
//   * una ficha por modelo publicable (`key` = el slug del modelo, que siempre lleva un guion porque
//     sale de `marca-modelo`), con su banda, el desglose por año y por cilindrada y la depreciación;
//   * el informe del mercado, bajo la `key` reservada `_informe` — el guion bajo no lo produce
//     `slugify()` nunca, así que ningún modelo puede pisarlo.
//
// Van juntas y no en dos colecciones porque se escriben y se podan en la misma pasada: publicar
// fichas de modelos que el informe de al lado ya no cuenta sería publicar dos fotos de dos momentos.
export interface MotoMarketSnapshotDocument {
  key: string;
  generatedAt: string;
  snapshot: PublicMotoModel | PublicMotoReportSnapshot;
}

const MotoMarketSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
MotoMarketSnapshotSchema.index({ key: 1 }, { unique: true });

export const MotoMarketSnapshotModel = appModel<MotoMarketSnapshotDocument>(
  "MotoMarketSnapshot",
  MotoMarketSnapshotSchema,
  "motomarketsnapshots"
);
