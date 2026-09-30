import mongoose, { Schema, type Model } from 'mongoose'

// El estado del monitor de competencia: lo escribe SÓLO el job del backend. El app lo lee para
// mostrar cuándo fue el último aviso. Espejo en classes/models/CompetitorMonitorState.ts.
export interface CompetitorMonitorStateDoc {
  uid: string
  cursor: Date | null
  positions: Record<string, { seen: number | null; alerted: number | null }>
  quietDay: Record<string, string>
  dailyDay: string | null
  lastQuotes: Record<string, { buy: number; sell: number }>
  accessEndedAt: Date | null
  lastAccess: 'trial' | 'business' | null
  lastRunAt: Date | null
  lastSentAt: Date | null
}

const CompetitorMonitorStateSchema = new Schema<CompetitorMonitorStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    cursor: { type: Date, default: null },
    positions: { type: Schema.Types.Mixed, default: {} },
    quietDay: { type: Schema.Types.Mixed, default: {} },
    dailyDay: { type: String, default: null },
    lastQuotes: { type: Schema.Types.Mixed, default: {} },
    accessEndedAt: { type: Date, default: null },
    lastAccess: { type: String, default: null },
    lastRunAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
)

export const CompetitorMonitorStateModel: Model<CompetitorMonitorStateDoc> =
  (mongoose.models.CompetitorMonitorState as Model<CompetitorMonitorStateDoc>) ||
  mongoose.model<CompetitorMonitorStateDoc>(
    'CompetitorMonitorState',
    CompetitorMonitorStateSchema,
    'competitormonitorstates'
  )
