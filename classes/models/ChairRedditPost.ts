import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface ChairRedditPostDoc {
  redditId: string;
  sub: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  numComments: number;
  permalink: string;
  date: string;
  createdUtc: number;
  queries: string[];
  commentsAtCount: number;
  commentsFetchedAt: Date | null;
  commentTreeVersion: number;
  lastSeenAt: Date;
}

const ChairRedditPostSchema = new Schema<ChairRedditPostDoc>(
  {
    redditId: { type: String, required: true },
    sub: { type: String, default: "CharruaDevs" },
    title: { type: String, default: "" },
    selftext: { type: String, default: "" },
    author: { type: String, default: "" },
    score: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
    permalink: { type: String, default: "" },
    date: { type: String, default: "" },
    createdUtc: { type: Number, default: 0 },
    queries: { type: [String], default: [] },
    commentsAtCount: { type: Number, default: -1 },
    commentsFetchedAt: { type: Date, default: null },
    commentTreeVersion: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

ChairRedditPostSchema.index({ redditId: 1 }, { unique: true });
ChairRedditPostSchema.index({ createdUtc: -1 });

export const ChairRedditPostModel = appModel<ChairRedditPostDoc>(
  "ChairRedditPost",
  ChairRedditPostSchema,
  "chairredditposts"
);
