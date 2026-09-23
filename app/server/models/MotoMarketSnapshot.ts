import mongoose, { Schema, type Model } from 'mongoose'
import type { MotoPublicModelDoc } from '../../utils/motosPublic'

// La FICHA de cada modelo de `/motos-usadas-uruguay/<marca>-<modelo>`. Espejo de
// `classes/models/MotoMarketSnapshot.ts`.
//
// Este mirror no estaba en el encargo del paquete (declaraba sólo `MotoCatalog` y `MotoCatalogMeta`)
// porque el contrato que traía ponía la banda por año DENTRO de la fila del catálogo. El job la
// publica acá: `motocatalog` lleva avisos y `motomarketsnapshots` lleva las bandas por modelo, por
// año y por cilindrada más la depreciación. Sin este archivo la ficha no tiene de dónde leer.
//
// Dos cosas en la misma colección, distinguidas por su `key`: una ficha por modelo publicable (la
// `key` es el slug del modelo, que siempre lleva un guion porque sale de `marca-modelo`) y el
// informe del mercado bajo la `key` reservada `_informe` — el guion bajo no lo produce nunca el
// slug de un modelo, así que ninguna ficha puede pisarlo. Toda lectura de una ficha tiene que
// excluir esa clave o serviría el informe como si fuera un modelo: lo hace `motoKeyValid`
// (`app/utils/motos.ts`), antes de tocar la base.
const MotoMarketSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

MotoMarketSnapshotSchema.index({ key: 1 }, { unique: true })

export const MotoMarketSnapshotModel: Model<MotoPublicModelDoc> =
  (mongoose.models.MotoMarketSnapshot as Model<MotoPublicModelDoc>) ||
  mongoose.model<MotoPublicModelDoc>(
    'MotoMarketSnapshot',
    MotoMarketSnapshotSchema,
    'motomarketsnapshots'
  )
