import { Schema } from "mongoose";
import { appModel } from "../appdb";

// La corrida de `/computadoras-usadas-uruguay`. Varios documentos por `key`: `uy-computadoras` es el
// catálogo publicado (lo único que lee el app), `uy-computadoras-refs` las notebooks nuevas de
// referencia que la horaria reusa, `uy-computadoras-refusal` la última negativa a publicar.
const ComputerMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: false }
);
ComputerMetaSchema.index({ key: 1 }, { unique: true });

export interface ComputerMetaDocument {
  key: string;
  generatedAt: string;
  meta: unknown;
}

export const ComputerMetaModel = appModel<ComputerMetaDocument>("ComputerMeta", ComputerMetaSchema, "computermetas");
