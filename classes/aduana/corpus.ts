// The harvest ledger. `redditId` / `commentId` are unique — that index IS the dedupe: a thread we
// already hold is never downloaded again, and the ids we already have are fed back to Reddit's
// paginator (via `knownCommentIds`) so it does not even send them.
//
// Own collections (`aduana_reddit_posts` / `aduana_reddit_comments`) — a concurrent session owns
// the courier corpus on another branch and must not collide with this one.
import { Schema } from "mongoose";
import { MongooseServer } from "../database";
import type { RedditCommentRaw, RedditPostRaw } from "../reddit";

const postSchema = new Schema(
  {
    redditId: { type: String, required: true, unique: true },
    title: String,
    selftext: String,
    author: String,
    score: Number,
    numComments: Number,
    permalink: String,
    createdUtc: Number,
    queries: [String],
  },
  { timestamps: true }
);

const commentSchema = new Schema(
  {
    commentId: { type: String, required: true, unique: true },
    postId: { type: String, required: true },
    author: String,
    body: String,
    score: Number,
    createdUtc: Number,
    permalink: String,
  },
  { timestamps: true }
);

const posts = () => MongooseServer.getInstance("aduana_reddit_posts", postSchema);
const comments = () => MongooseServer.getInstance("aduana_reddit_comments", commentSchema);

export interface StoredPost {
  redditId: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  createdUtc: number;
  permalink: string;
}

export interface StoredComment {
  commentId: string;
  postId: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  permalink: string;
}

/**
 * Upsert every post by `redditId`. `$addToSet` on `queries` means a thread surfaced by two
 * different search terms accumulates both without ever duplicating the document.
 *
 * Uses `MongooseServer#updateOne(filter, update)` — it bakes in `upsert: true` and strips the
 * filter's own keys out of a plain-object update before wrapping the rest in `$set` (see
 * classes/database.ts). Passing an update that is already all operators ($set/$addToSet), as
 * here, is untouched by that stripping — there is no plain top-level `redditId` key to remove.
 */
export async function upsertPosts(rows: Array<RedditPostRaw & { queries: string[] }>): Promise<number> {
  for (const p of rows) {
    await posts().updateOne(
      { redditId: p.id },
      {
        $set: {
          redditId: p.id,
          title: p.title,
          selftext: p.selftext,
          author: p.author,
          score: p.score,
          numComments: p.numComments,
          permalink: p.permalink,
          createdUtc: p.createdUtc,
        },
        $addToSet: { queries: { $each: p.queries } },
      }
    );
  }
  return rows.length;
}

/** Upsert comments by `commentId`, keyed to the post they belong to. */
export async function upsertComments(postId: string, rows: RedditCommentRaw[]): Promise<number> {
  for (const c of rows) {
    await comments().updateOne(
      { commentId: c.id },
      {
        $set: {
          commentId: c.id,
          postId,
          author: c.author,
          body: c.body,
          score: c.score,
          createdUtc: c.createdUtc,
          permalink: c.permalink,
        },
      }
    );
  }
  return rows.length;
}

/** Comment ids already stored for one post — fed back into `fetchComments` so it skips them. */
export async function knownCommentIds(postId: string): Promise<Set<string>> {
  const rows = await comments().allEntries({ postId });
  return new Set(rows.map((r: { commentId: string }) => r.commentId));
}

export async function allPosts(): Promise<StoredPost[]> {
  return posts().allEntries({});
}

export async function allComments(): Promise<StoredComment[]> {
  return comments().allEntries({});
}
