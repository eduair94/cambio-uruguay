// Lee `transportsnapshots` — el único documento `slug:"current"` que escribe el job de backend
// `currency-transporte` (classes/models/TransportSnapshot.ts es el que escribe, en la MISMA base del
// app).
//
// El app nunca escribe acá: bajar los horarios del STM y rutear decenas de miles de pares es trabajo
// de un proceso único y programado, no del servidor que atiende visitas (y además la app Nuxt es
// cluster ×2, así que cualquier tarea recurrente correría dos veces).
import mongoose, { Schema, type Model } from 'mongoose'

export type TransportModeSlug = 'omnibus' | 'pie' | 'monopatin' | 'bici' | 'moto' | 'auto'

export interface TransportZoneDoc {
  slug: string
  name: string
  department: string
  lat: number
  lon: number
  kind: 'ine' | 'localidad'
}

export interface TransportTransitPairDoc {
  from: number
  to: number
  walkMinutes: number
  waitMinutes: number
  inVehicleMinutes: number
  transfers: number
  lines: string[]
  meters: number
}

export interface TransportSnapshotDoc {
  slug: string
  builtAt: string
  prices: Record<string, unknown>
  zones: TransportZoneDoc[]
  /** `[from, to, modeIndex, meters, seconds]` por par ruteado. */
  routes: number[][]
  transit: TransportTransitPairDoc[]
  coverage: Record<string, unknown>
}

const TransportSnapshotSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    builtAt: { type: Date, required: true },
    prices: { type: Schema.Types.Mixed, default: {} },
    zones: { type: [Schema.Types.Mixed], default: [] },
    routes: { type: [[Number]], default: [] },
    transit: { type: [Schema.Types.Mixed], default: [] },
    coverage: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const TransportSnapshotModel: Model<TransportSnapshotDoc> =
  (mongoose.models.TransportSnapshot as Model<TransportSnapshotDoc>) ||
  mongoose.model<TransportSnapshotDoc>(
    'TransportSnapshot',
    TransportSnapshotSchema,
    'transportsnapshots'
  )
