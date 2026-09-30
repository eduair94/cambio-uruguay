import mongoose, { Schema, type Model } from 'mongoose'

// La configuración del monitor de competencia (una por cuenta). La escribe /api/me/monitor y la lee
// el job del backend `currency-competitor-monitor`. Espejo en classes/models/CompetitorMonitor.ts;
// tests/appdb/schema_parity.test.ts falla si se separan. No se borra: pausar es `active: false`,
// así volver a crearlo no reinicia la prueba (`trialStartedAt` se fija una vez).
export interface CompetitorMonitorDoc {
  uid: string
  email: string | null
  ownOrigin: string | null
  competitors: string[]
  currencies: string[]
  alerts: { moves: boolean; position: boolean; quiet: boolean; daily: boolean }
  channels: { telegram: boolean; email: 'none' | 'daily' | 'all' }
  active: boolean
  trialStartedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

const CompetitorMonitorSchema = new Schema<CompetitorMonitorDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null },
    ownOrigin: { type: String, default: null },
    competitors: { type: [String], default: [] },
    currencies: { type: [String], default: ['USD'] },
    alerts: {
      moves: { type: Boolean, default: true },
      position: { type: Boolean, default: true },
      quiet: { type: Boolean, default: true },
      daily: { type: Boolean, default: true },
    },
    channels: {
      telegram: { type: Boolean, default: true },
      email: { type: String, enum: ['none', 'daily', 'all'], default: 'daily' },
    },
    active: { type: Boolean, default: true },
    trialStartedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

export const CompetitorMonitorModel: Model<CompetitorMonitorDoc> =
  (mongoose.models.CompetitorMonitor as Model<CompetitorMonitorDoc>) ||
  mongoose.model<CompetitorMonitorDoc>('CompetitorMonitor', CompetitorMonitorSchema, 'competitormonitors')
