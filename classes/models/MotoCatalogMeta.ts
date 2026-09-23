import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicMotoCatalogMeta } from "../motos/types";

export interface MotoCatalogMetaDocument {
  /**
   * `"uy-motos"` es el catálogo publicado; la misma colección guarda además la meta de la cosecha
   * (`"uy-motos-harvest"`) y la negativa a publicar (`"uy-motos-publish"`), que va aparte para que
   * guardar una no pueda borrar la otra. Ver `classes/motos/store.ts`.
   */
  key: string;
  generatedAt: string;
  meta: PublicMotoCatalogMeta | Record<string, unknown>;
}

// `key: "uy-motos"` y `generatedAt` en el nivel de arriba son el CONTRATO que lee
// `classes/transporte/prices.ts::readMotos` para fechar la banda del modo "moto" del comparador.
// Todo lo demás de la corrida vive adentro de `meta`.
const MotoCatalogMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
);
MotoCatalogMetaSchema.index({ key: 1 }, { unique: true });

export const MotoCatalogMetaModel = appModel<MotoCatalogMetaDocument>(
  "MotoCatalogMeta",
  MotoCatalogMetaSchema,
  "motocatalogmetas"
);
