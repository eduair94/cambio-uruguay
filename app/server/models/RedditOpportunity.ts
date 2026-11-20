import mongoose, { Schema, type Model } from 'mongoose'

// La escribe el job de backend `currency-reddit-opportunities` (raíz `sync_reddit_opportunities.ts`)
// y la lee `/api/reddit-opportunities`. Espejo campo a campo de `classes/models/RedditOpportunity.ts`
// — la suite de la raíz (tests/appdb/schema_parity.test.ts) falla si los dos se separan.
//
// NO ES PÚBLICO: es la cola de trabajo de quien contesta en Reddit. El app escribe sólo `state`,
// `stateAt` y `answerUrl` (POST /api/reddit-opportunities/state); todo lo demás es del job.
export interface RedditOpportunityRow {
  postId: string
  sub: string
  title: string
  excerpt: string
  permalink: string
  linkUrl: string
  flair: string
  lang: 'es' | 'en'
  createdAt: Date
  score: number
  numComments: number
  locked: boolean
  removed: boolean
  verdict: 'recommend' | 'reject'
  path: string
  pageTitle: string
  family: string
  confidence: number
  reason: string
  angle: string
  alreadyLinked: boolean | null
  linkCheckedAt: Date | null
  linkCheckedComments: number
  rank: number
  judgedAt: Date
  judgeModel: string
  seenAt: Date
  state: 'open' | 'answered' | 'dismissed'
  stateAt: Date | null
  answerUrl: string
  answerVisible: boolean | null
  answerCheckedAt: Date | null
  duplicateOf: string
  alsoIn: Array<{ sub: string; permalink: string }>
}

const RedditOpportunitySchema = new Schema(
  {
    postId: { type: String, required: true },
    sub: { type: String, required: true },
    title: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    permalink: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    flair: { type: String, default: '' },
    lang: { type: String, default: 'es' },
    createdAt: { type: Date, required: true },
    score: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
    locked: { type: Boolean, default: false },
    removed: { type: Boolean, default: false },
    verdict: { type: String, required: true },
    path: { type: String, default: '' },
    pageTitle: { type: String, default: '' },
    family: { type: String, default: 'otros' },
    confidence: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    angle: { type: String, default: '' },
    alreadyLinked: { type: Boolean, default: null },
    linkCheckedAt: { type: Date, default: null },
    linkCheckedComments: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    judgedAt: { type: Date, required: true },
    judgeModel: { type: String, default: '' },
    seenAt: { type: Date, required: true },
    state: { type: String, default: 'open' },
    stateAt: { type: Date, default: null },
    answerUrl: { type: String, default: '' },
    answerVisible: { type: Boolean, default: null },
    answerCheckedAt: { type: Date, default: null },
    duplicateOf: { type: String, default: '' },
    alsoIn: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: false }
)

RedditOpportunitySchema.index({ postId: 1 }, { unique: true })
RedditOpportunitySchema.index({ verdict: 1, state: 1, rank: -1 })
RedditOpportunitySchema.index({ createdAt: 1 })

export const RedditOpportunityModel: Model<RedditOpportunityRow> =
  (mongoose.models.RedditOpportunity as Model<RedditOpportunityRow>) ||
  mongoose.model<RedditOpportunityRow>(
    'RedditOpportunity',
    RedditOpportunitySchema,
    'redditopportunities'
  )
