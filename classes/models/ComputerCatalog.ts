import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { ComputerCatalogRow } from "../computadoras/types";

// PÚBLICA: una fila por aviso vigente de `/computadoras-usadas-uruguay`, armada campo por campo en
// classes/computadoras/catalog.ts. Espejo del lado del app: app/server/models/ComputerCatalog.ts y
// los tipos de app/utils/computadorasPublic.ts.
const ComputerCatalogSchema = new Schema({ slug: { type: String, required: true } }, { strict: false });
ComputerCatalogSchema.index({ slug: 1 }, { unique: true });
ComputerCatalogSchema.index({ kindGroup: 1, kind: 1, priceUsd: 1 });
ComputerCatalogSchema.index({ publishedAt: -1 });

export const ComputerCatalogModel = appModel<ComputerCatalogRow>("ComputerCatalog", ComputerCatalogSchema, "computercatalog");
