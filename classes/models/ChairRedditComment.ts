import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface ChairRedditCommentDoc {
  commentId: string;
  postId: string;
  sub: string;
  author: string;
  body: string;
  score: number;
  date: string;
  createdUtc: number;
  permalink: string;
  parentId: string;
  depth: number;
}

const ChairRedditCommentSchema = new Schema<ChairRedditCommentDoc>(
  {
    commentId: { type: String, required: true },
    postId: { type: String, required: true },
    sub: { type: String, default: "CharruaDevs" },
    author: { type: String, default: "" },
    body: { type: String, default: "" },
    score: { type: Number, default: 0 },
    date: { type: String, default: "" },
    createdUtc: { type: Number, default: 0 },
    permalink: { type: String, default: "" },
    parentId: { type: String, default: "" },
    depth: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChairRedditCommentSchema.index({ commentId: 1 }, { unique: true });
ChairRedditCommentSchema.index({ postId: 1 });
ChairRedditCommentSchema.index({ createdUtc: -1 });

export const ChairRedditCommentModel = appModel<ChairRedditCommentDoc>(
  "ChairRedditComment",
  ChairRedditCommentSchema,
  "chairredditcomments"
);
