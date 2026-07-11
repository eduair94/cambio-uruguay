import mongoose, { Schema, type Model } from 'mongoose'

/**
 * One Reddit comment, stored once and never downloaded twice.
 *
 * Comments used to live in an array inside `RedditPost`, which meant re-reading a thread
 * REPLACED the array — so every time a thread got one new reply we re-downloaded (and rewrote)
 * all of its comments. Here `commentId` is unique, so a re-read is an upsert of only what is
 * new, and the ids we already hold are fed back to Reddit's paginator so it never even sends
 * them again. It also lifts the 16MB-per-document ceiling a megathread would eventually hit.
 */
export interface RedditCommentDoc {
  commentId: string
  /** The thread this comment belongs to (`RedditPost.redditId`). */
  postId: string
  sub: string
  author: string
  body: string
  score: number
  date: string // 'YYYY-MM-DD'
  createdUtc: number
  permalink: string
}

const RedditCommentSchema = new Schema<RedditCommentDoc>(
  {
    commentId: { type: String, required: true },
    postId: { type: String, required: true },
    sub: { type: String, default: '' },
    author: { type: String, default: '' },
    body: { type: String, default: '' },
    score: { type: Number, default: 0 },
    date: { type: String, default: '' },
    createdUtc: { type: Number, default: 0 },
    permalink: { type: String, default: '' },
  },
  { timestamps: true }
)

RedditCommentSchema.index({ commentId: 1 }, { unique: true })
RedditCommentSchema.index({ postId: 1 })

export const RedditCommentModel: Model<RedditCommentDoc> =
  (mongoose.models.RedditComment as Model<RedditCommentDoc>) ||
  mongoose.model<RedditCommentDoc>('RedditComment', RedditCommentSchema)
