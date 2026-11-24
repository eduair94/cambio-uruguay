import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { FacebookComputerDetail } from "../computadoras/types";

// PRIVADA, sólo del backend: la ficha de cada aviso de Facebook del directorio de computadoras
// (descripción, `attribute_data`, fecha de publicación). El directorio publica lo que se LEE de la
// descripción (las piezas), nunca el texto: lo escribe una persona y puede traer su teléfono.
// Sin `timestamps`: `createdAt` es la fecha del aviso en Facebook, no la de esta fila.
const ComputerFbDetailSchema = new Schema(
  {
    id: { type: String, required: true },
    readAt: { type: String, required: true },
    found: { type: Boolean, default: false },
    description: { type: String, default: null },
    attributes: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: String, default: null },
    gone: { type: Boolean, default: false },
  },
  { timestamps: false }
);
ComputerFbDetailSchema.index({ id: 1 }, { unique: true });

export const ComputerFbDetailModel = appModel<FacebookComputerDetail>("ComputerFbDetail", ComputerFbDetailSchema, "computerfbdetails");
