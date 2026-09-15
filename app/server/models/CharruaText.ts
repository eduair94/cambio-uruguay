import mongoose, { Schema, type Model } from 'mongoose'

// Corpus clasificado de r/CharruaDevs que lee el buscador de /mercado-it-uruguay. Lo escribe el
// job del backend `currency-charruadevs` (classes/models/CharruaText.ts es el espejo, y ahí viven
// los índices: `autoIndex: false` para que el app no intente construir el índice de texto).
export interface CharruaTextDoc {
  rid: string
  kind: 'post' | 'comment'
  thread: string
  title: string
  body: string
  createdAt: Date
  month: string
  score: number
  comments: number
  flair: string | null
  rel: boolean
  stance: number | null
  themes: string[]
  ai: string | null
  event: string
  persona: string | null
  gone: boolean
  url: string
  model: string
}

const CharruaTextSchema = new Schema<CharruaTextDoc>(
  {
    rid: { type: String, required: true },
    kind: { type: String, required: true },
    thread: { type: String, required: true },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    createdAt: { type: Date, required: true },
    month: { type: String, required: true },
    score: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    flair: { type: String, default: null },
    rel: { type: Boolean, default: false },
    stance: { type: Number, default: null },
    themes: { type: [String], default: [] },
    ai: { type: String, default: null },
    event: { type: String, default: 'ninguno' },
    persona: { type: String, default: null },
    gone: { type: Boolean, default: false },
    url: { type: String, default: '' },
    model: { type: String, default: '' },
  },
  { versionKey: false, autoIndex: false }
)

export const CharruaTextModel: Model<CharruaTextDoc> =
  (mongoose.models.CharruaText as Model<CharruaTextDoc>) ||
  mongoose.model<CharruaTextDoc>('CharruaText', CharruaTextSchema, 'charruadevstexts')
