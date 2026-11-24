import mongoose, { Schema, type Model } from 'mongoose'
import type { ComputerPublicListing } from '../../utils/computadorasPublic'

// El catálogo PÚBLICO de `/computadoras-usadas-uruguay`: una fila por AVISO vigente (una
// computadora o una pieza suelta). Lo escribe el job `sync_computadoras.ts`; este archivo es el
// espejo del lado del app, campo por campo con `classes/models/ComputerCatalog.ts`
// (`tests/appdb/schema_parity.test.ts` los coteja).
//
// Declara sólo `slug`, igual que el del backend (la paridad la mide el test de arriba): el schema es
// `strict: false` y el job escribe la fila entera que arma `classes/computadoras/`
// (especificaciones, valuación, comparables), así que una columna nueva no puede quedarse afuera de
// la lectura porque alguien se olvidó de tocar este archivo. Los valores de los filtros ya llegan
// tipados de `computerNormalizeQuery`, así que no hace falta que mongoose los convierta. La forma
// completa está tipada en `app/utils/computadorasPublic.ts`.
//
// `autoCreate`/`autoIndex` en false: la colección y sus índices los crea el job, que es el que
// escribe. Un proceso que sólo lee no debería poder crear una colección vacía con el nombre bien
// escrito y dejar la página en «no hay computadoras» para siempre.
const ComputerCatalogSchema = new Schema(
  {
    slug: { type: String, required: true },
  },
  { strict: false, autoCreate: false, autoIndex: false }
)

ComputerCatalogSchema.index({ slug: 1 }, { unique: true })

export const ComputerCatalogModel: Model<ComputerPublicListing> =
  (mongoose.models.ComputerCatalog as Model<ComputerPublicListing>) ||
  mongoose.model<ComputerPublicListing>('ComputerCatalog', ComputerCatalogSchema, 'computercatalog')
