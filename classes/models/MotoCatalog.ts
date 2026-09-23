import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { PublicMotoListing } from "../motos/types";

// El catálogo PÚBLICO: una fila por AVISO (no por modelo), igual que `carcatalog`.
//
// `price`, `currency`, `currencyInferred` y `year` son un CONTRATO y no un detalle de
// implementación: `classes/transporte/prices.ts::readMotos` los lee con esos nombres exactos para
// armar la banda del modo "moto" del comparador de transporte. Renombrar cualquiera de los cuatro
// deja ese modo en "sin datos relevados" sin que falle nada ni avise nadie.
//
// `strict: false` a propósito: el job escribe la fila entera que arma `publicMotoListing`, y una
// columna nueva del catálogo no puede quedar afuera porque alguien se olvidó de tocar este schema.
const MotoCatalogSchema = new Schema(
  {
    key: { type: String, required: true },
    marketSlug: { type: String, required: true },
    productKey: { type: String, required: true },
    year: { type: Number, required: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
    currencyInferred: { type: Boolean, default: false },
    priceUsd: { type: Number, required: true },
    lastSeen: { type: String, required: true },
  },
  { strict: false, autoCreate: false, autoIndex: false }
);
MotoCatalogSchema.index({ key: 1 }, { unique: true });

export const MotoCatalogModel = appModel<PublicMotoListing>("MotoCatalog", MotoCatalogSchema, "motocatalog");
