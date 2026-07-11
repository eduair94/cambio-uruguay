import mongoose, { Schema, type Model } from 'mongoose'

/**
 * The harvest ledger for the Reddit sentiment feature.
 *
 * `redditId` is unique — that index IS the dedupe: the daily task upserts on it, so a
 * thread we already have is never re-downloaded. Comments (the expensive call: one HTTP
 * request per thread) are only re-fetched when `numComments` grew since we last looked,
 * which is what `commentsFetchedAt` / `commentsAtCount` record.
 */
export interface RedditCommentDoc {
  id: string
  author: string
  body: string
  score: number
  date: string // 'YYYY-MM-DD'
  permalink: string
}

export interface RedditPostDoc {
  redditId: string
  sub: string
  title: string
  selftext: string
  author: string
  score: number
  numComments: number
  permalink: string
  date: string // 'YYYY-MM-DD' of created_utc
  createdUtc: number
  /** Entities named in the title/body — the thread's subject. */
  entities: string[]
  /** Which harvest queries surfaced this thread (debug/provenance). */
  queries: string[]
  /**
   * @deprecated Comments now live in their own `RedditComment` collection, keyed by a unique
   * `commentId`, so they are stored once and never re-downloaded. This array is only read by
   * the one-time migration that moves the old embedded comments across; nothing writes it.
   */
  comments?: RedditCommentDoc[]
  /** How many of this thread's comments we actually hold. */
  storedComments: number
  /** The thread's advertised comment count when we last read it — re-read only when it grows. */
  commentsAtCount: number
  /**
   * Which fetch strategy produced `comments`. Bumping COMMENT_FETCH_VERSION re-pulls every
   * thread: v1 only took the top of each tree (limit=80, depth=4) and silently dropped
   * everything Reddit collapsed behind "load more comments".
   */
  commentsVersion: number
  commentsFetchedAt: Date | null
  lastSeenAt: Date
}

const CommentSchema = new Schema<RedditCommentDoc>(
  {
    id: { type: String, required: true },
    author: { type: String, default: '' },
    body: { type: String, default: '' },
    score: { type: Number, default: 0 },
    date: { type: String, default: '' },
    permalink: { type: String, default: '' },
  },
  { _id: false }
)

const RedditPostSchema = new Schema<RedditPostDoc>(
  {
    redditId: { type: String, required: true },
    sub: { type: String, default: '' },
    title: { type: String, default: '' },
    selftext: { type: String, default: '' },
    author: { type: String, default: '' },
    score: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
    permalink: { type: String, default: '' },
    date: { type: String, default: '' },
    createdUtc: { type: Number, default: 0 },
    entities: { type: [String], default: [] },
    queries: { type: [String], default: [] },
    comments: { type: [CommentSchema], default: undefined }, // deprecated; migration source only
    storedComments: { type: Number, default: 0 },
    commentsAtCount: { type: Number, default: -1 },
    commentsVersion: { type: Number, default: 0 },
    commentsFetchedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

RedditPostSchema.index({ redditId: 1 }, { unique: true })
RedditPostSchema.index({ entities: 1, createdUtc: -1 })

export const RedditPostModel: Model<RedditPostDoc> =
  (mongoose.models.RedditPost as Model<RedditPostDoc>) ||
  mongoose.model<RedditPostDoc>('RedditPost', RedditPostSchema)
