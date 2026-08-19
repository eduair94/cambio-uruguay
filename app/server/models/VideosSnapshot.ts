// Reads `videossnapshots` — the single `key:"uy"` document the backend job `currency-videos`
// upserts (classes/models/VideosSnapshot.ts is the writer, on the SAME app database).
//
// The app never writes here: the YouTube feeds are read by the backend, which is the only process
// that is single-instance and the only one allowed to spend time on network I/O on a schedule.
import mongoose, { Schema, type Model } from 'mongoose'

export type MoneyVerdict = 'money' | 'maybe' | 'no'

export interface VideoItem {
  videoId: string
  title: string
  description: string
  url: string
  embedUrl: string
  thumbnail: string
  publishedAt: string
  channelId: string
  channelKey: string
  channelName: string
  channelHandle: string
  channelCountry: string
  views: number | null
  topics: string[]
  money: MoneyVerdict
  matchedOn: string[]
  score: number
}

export interface VideoChannelStatus {
  id: string
  name: string
  handle: string
  country: string
  kind: 'medio' | 'creador' | 'institucion' | 'broker' | 'podcast'
  blurb: string
  ok: boolean
  count: number
  error?: string
}

export interface VideosSnapshotDoc {
  key: string
  capturedAt: string
  videos: VideoItem[]
  channels: VideoChannelStatus[]
  topicCounts: Record<string, number>
  counts: {
    videos: number
    channelsOk: number
    channelsDown: number
    uruguayan: number
  }
}

const VideosSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    videos: { type: [Schema.Types.Mixed], default: [] },
    channels: { type: [Schema.Types.Mixed], default: [] },
    topicCounts: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const VideosSnapshotModel: Model<VideosSnapshotDoc> =
  (mongoose.models.VideosSnapshot as Model<VideosSnapshotDoc>) ||
  mongoose.model<VideosSnapshotDoc>('VideosSnapshot', VideosSnapshotSchema, 'videossnapshots')
