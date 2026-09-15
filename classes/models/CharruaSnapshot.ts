// Espejo de app/server/models/CharruaSnapshot.ts. Dos docs: key "snapshot" (lo que dibuja
// /mercado-it-uruguay) y key "state" (filas mensuales que el job no puede recalcular sin volver a
// bajar todo el historial).
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface CharruaSnapshotDoc {
  key: string;
  generatedAt: Date;
  data: unknown;
}

const CharruaSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    generatedAt: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { versionKey: false, minimize: false }
);

export const CharruaSnapshotModel = appModel<CharruaSnapshotDoc>(
  "CharruaSnapshot",
  CharruaSnapshotSchema,
  "charruadevssnapshots"
);
