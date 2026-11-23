import mongoose, { Schema, type Model } from 'mongoose'

// Una ficha por cuenta publicada de /emprendimientos-de-instagram-uruguay. La escribe el job
// `currency-emprendimientos` (classes/emprendimientos/listing.ts, campo por campo); el app sólo la
// lee y la borra cuando la cuenta pide la baja. Espejo de classes/models/EmprendimientoListing.ts.
export interface EmprendimientoListingDoc {
  handle: string
  name: string
  summary: string
  rubro: string
  tags: string[]
  departamento: string | null
  barrio: string | null
  envios: 'todo-el-pais' | 'local' | 'no-dice'
  ofrece: 'productos' | 'servicios' | 'ambos'
  raro: boolean
  soloInstagram: boolean
  website: string | null
  whatsapp: boolean
  followers: number | null
  profilePic: string | null
  posts: { code: string; reel: boolean; date: string | null; image: string }[]
  lastPostAt: string | null
  postsLast90: number
  sources: { kind: string; label: string; url: string | null }[]
  listedAt: string
  readAt: string
  photosExpireAt: string | null
  search: string
}

const EmprendimientoListingSchema = new Schema<EmprendimientoListingDoc>(
  {
    handle: { type: String, required: true },
    name: { type: String, required: true },
    summary: { type: String, default: '' },
    rubro: { type: String, required: true },
    tags: { type: [String], default: [] },
    departamento: { type: String, default: null },
    barrio: { type: String, default: null },
    envios: { type: String, default: 'no-dice' },
    ofrece: { type: String, default: 'productos' },
    raro: { type: Boolean, default: false },
    soloInstagram: { type: Boolean, default: true },
    website: { type: String, default: null },
    whatsapp: { type: Boolean, default: false },
    followers: { type: Number, default: null },
    profilePic: { type: String, default: null },
    posts: { type: [Schema.Types.Mixed], default: [] },
    lastPostAt: { type: String, default: null },
    postsLast90: { type: Number, default: 0 },
    sources: { type: [Schema.Types.Mixed], default: [] },
    listedAt: { type: String, required: true },
    readAt: { type: String, required: true },
    photosExpireAt: { type: String, default: null },
    search: { type: String, default: '' },
  },
  { timestamps: true }
)

EmprendimientoListingSchema.index({ handle: 1 }, { unique: true })
EmprendimientoListingSchema.index({ rubro: 1 })
EmprendimientoListingSchema.index({ departamento: 1 })
EmprendimientoListingSchema.index({ listedAt: -1 })

export const EmprendimientoListingModel: Model<EmprendimientoListingDoc> =
  (mongoose.models.EmprendimientoListing as Model<EmprendimientoListingDoc>) ||
  mongoose.model<EmprendimientoListingDoc>(
    'EmprendimientoListing',
    EmprendimientoListingSchema,
    'emprendimientolistings'
  )
