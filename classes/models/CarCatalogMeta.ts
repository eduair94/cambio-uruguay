import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicCarCatalogMeta } from "../autos/publicTypes";

export interface CarCatalogMetaDocument {
  key: "uy-cars";
  generatedAt: string;
  meta: PublicCarCatalogMeta;
}

const CarCatalogMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
CarCatalogMetaSchema.index({ key: 1 }, { unique: true });

export const CarCatalogMetaModel = appModel<CarCatalogMetaDocument>("CarCatalogMeta", CarCatalogMetaSchema, "carcatalogmetas");
