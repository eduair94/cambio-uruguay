// Mirror of app/server/models/EmprendimientoSuggestion.ts: an account a visitor suggested on
// /emprendimientos-de-instagram-uruguay (POST /api/emprendimientos/sugerir). The app writes it; the
// job reads the unprocessed ones first on its next run and stamps `processedAt`.
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface EmprendimientoSuggestionDocument {
  handle: string;
  note: string | null;
  at: Date;
  processedAt: Date | null;
}

const EmprendimientoSuggestionSchema = new Schema(
  {
    handle: { type: String, required: true },
    note: { type: String, default: null },
    at: { type: Date, required: true },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EmprendimientoSuggestionSchema.index({ processedAt: 1, at: 1 });

export const EmprendimientoSuggestionModel = appModel<EmprendimientoSuggestionDocument>(
  "EmprendimientoSuggestion",
  EmprendimientoSuggestionSchema,
  "emprendimientosuggestions"
);
