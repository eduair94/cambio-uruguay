// Mirror of app/server/models/EmprendimientoOptOut.ts: an account that asked not to appear on
// /emprendimientos-de-instagram-uruguay (POST /api/emprendimientos/baja). The API hides it at once;
// the job deletes its listing and never reads it again.
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface EmprendimientoOptOutDocument {
  handle: string;
  at: Date;
}

const EmprendimientoOptOutSchema = new Schema(
  {
    handle: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { timestamps: true }
);

EmprendimientoOptOutSchema.index({ handle: 1 }, { unique: true });

export const EmprendimientoOptOutModel = appModel<EmprendimientoOptOutDocument>(
  "EmprendimientoOptOut",
  EmprendimientoOptOutSchema,
  "emprendimientooptouts"
);
