import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PartRow } from "../computadoras/types";

// PÚBLICA: una fila por identidad de pieza (`cpu:i5-12400f`, `ram:ddr4:16`…) con su precio nuevo
// y usado de hoy en Uruguay y un historial diario de las medianas. La lee `/precios-componentes-pc-uruguay`
// y la ficha de cada aviso.
const ComputerPartSchema = new Schema({ slug: { type: String, required: true } }, { strict: false });
ComputerPartSchema.index({ slug: 1 }, { unique: true });
ComputerPartSchema.index({ role: 1 });

export const ComputerPartModel = appModel<PartRow>("ComputerPart", ComputerPartSchema, "computerparts");
