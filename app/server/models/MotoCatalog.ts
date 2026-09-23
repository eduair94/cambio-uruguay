import mongoose, { Schema, type Model } from 'mongoose'
import type { MotoPublicListing } from '../../utils/motosPublic'

// El catálogo PÚBLICO de `/motos-usadas-uruguay`: una fila por AVISO (no por modelo), igual que
// `carcatalog`. Lo escribe el job `sync_motos.ts`; este archivo es el espejo del lado del app.
//
// Campo por campo con `classes/models/MotoCatalog.ts`. Los cinco que ese archivo declara CONTRATO
// (`year`, `price`, `currency`, `currencyInferred`, `priceUsd`) no son un detalle de
// implementación: `classes/transporte/prices.ts::readMotos` los lee con esos nombres exactos para
// armar la banda del modo "moto" del comparador de transporte, y esta página los lee para
// imprimirlos. Renombrar cualquiera deja las dos cosas mudas sin que falle nada ni avise nadie.
//
// `strict: false`, igual que el backend: el job escribe la fila entera que arma `publicMotoListing`
// (marca, modelo, cilindrada, tipo, departamento, foto, permalink…) y una columna nueva del
// catálogo no puede quedarse afuera de la lectura porque alguien se olvidó de tocar este schema. La
// forma completa está tipada en `app/utils/motosPublic.ts`, que es lo que la página consume.
//
// `autoCreate`/`autoIndex` en false: la colección y sus índices los crea el job, que es el que
// escribe. Un proceso que sólo lee no debería poder crear una colección vacía con el nombre bien
// escrito y dejar la página en "no hay motos" para siempre.
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
)

MotoCatalogSchema.index({ key: 1 }, { unique: true })

export const MotoCatalogModel: Model<MotoPublicListing> =
  (mongoose.models.MotoCatalog as Model<MotoPublicListing>) ||
  mongoose.model<MotoPublicListing>('MotoCatalog', MotoCatalogSchema, 'motocatalog')
