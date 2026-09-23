import mongoose, { Schema, type Model } from 'mongoose'
import type { MotoPublicCatalogMetaDoc } from '../../utils/motosPublic'

// El compañero de MotoCatalog: la corrida. Espejo de `classes/models/MotoCatalogMeta.ts`.
//
// La misma colección guarda TRES documentos distinguidos por su `key`: `"uy-motos"` es el catálogo
// publicado (el único que lee esta app), `"uy-motos-harvest"` la cosecha y `"uy-motos-publish"` la
// negativa a publicar. Van separados para que guardar una no pueda borrar la otra. Una lectura que
// no filtre por `key` mezclaría las tres formas.
//
// `key` y `generatedAt` viven en el nivel de arriba y todo lo demás adentro de `meta`, que es
// `Mixed` del lado del backend: la página lo tipa como `MotoPublicCatalogMeta`
// (`app/utils/motosPublic.ts`) y lo recorta en `motoCoverageOf` antes de servirlo.
const MotoCatalogMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

MotoCatalogMetaSchema.index({ key: 1 }, { unique: true })

export const MotoCatalogMetaModel: Model<MotoPublicCatalogMetaDoc> =
  (mongoose.models.MotoCatalogMeta as Model<MotoPublicCatalogMetaDoc>) ||
  mongoose.model<MotoPublicCatalogMetaDoc>(
    'MotoCatalogMeta',
    MotoCatalogMetaSchema,
    'motocatalogmetas'
  )
