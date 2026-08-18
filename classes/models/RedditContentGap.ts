import { Schema } from "mongoose";
import { appModel } from "../appdb";

/**
 * A question the subreddits keep asking that the site does not answer.
 *
 * Written by the bot every time a thread clears the topical filter but no page clears the
 * retrieval gate. On its own one row is noise — people ask odd one-offs. Clustered (see
 * `classes/gaps/cluster.ts`), four rows about the same thing are a page that should exist, and
 * the demand count is the only honest prioritisation signal this project has: it comes from people
 * asking unprompted, not from a keyword tool's guess at volume.
 *
 * `embedding` is the same packed-float32 Buffer format as RagChunk.vector, so the clustering job
 * can reuse `bufferToVector`.
 */
export interface RedditContentGapDoc {
  postId: string;
  sub: string;
  title: string;
  text: string;
  permalink: string;
  createdUtc: number;
  /** Best page the retriever could offer, and its score — i.e. how badly we missed. */
  bestPath: string;
  bestScore: number;
  embedding: Buffer;
  dims: number;
  /** Filled by the clustering job. */
  clusterId: string;
  clusterLabel: string;
  /** Set once a draft has been generated for this gap's cluster, so it is never generated twice. */
  draftPath: string;
  draftedAt: Date | null;
  /**
   * The page the pipeline published for this cluster, and when.
   *
   * Also the memory that lets the loop close: the threads that asked for it are marked
   * `waiting_page` in the reply ledger, and once this route is live and indexed the bot goes back
   * and answers them. Without it the question that motivated the page would never get the link.
   */
  pagePath: string;
  publishedAt: Date | null;
  publishedCommit: string;
  /** Why this cluster will never get a page: outside the site's subjects. Stops endless retries. */
  outOfScope: boolean;
  outOfScopeReason: string;
}

const RedditContentGapSchema = new Schema<RedditContentGapDoc>(
  {
    postId: { type: String, required: true },
    sub: { type: String, default: "" },
    title: { type: String, default: "" },
    text: { type: String, default: "" },
    permalink: { type: String, default: "" },
    createdUtc: { type: Number, default: 0 },
    bestPath: { type: String, default: "" },
    bestScore: { type: Number, default: 0 },
    embedding: { type: Buffer, required: true },
    dims: { type: Number, default: 0 },
    clusterId: { type: String, default: "" },
    clusterLabel: { type: String, default: "" },
    draftPath: { type: String, default: "" },
    draftedAt: { type: Date, default: null },
    pagePath: { type: String, default: "" },
    publishedAt: { type: Date, default: null },
    publishedCommit: { type: String, default: "" },
    outOfScope: { type: Boolean, default: false },
    outOfScopeReason: { type: String, default: "" },
  },
  { timestamps: true }
);

RedditContentGapSchema.index({ postId: 1 }, { unique: true });
RedditContentGapSchema.index({ clusterId: 1 });
RedditContentGapSchema.index({ draftedAt: 1, createdAt: -1 });

export const RedditContentGapModel = appModel<RedditContentGapDoc>(
  "RedditContentGap",
  RedditContentGapSchema,
  "redditcontentgaps"
);
