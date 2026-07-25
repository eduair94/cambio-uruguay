import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { ChairClassification } from "../chairs/types";

export interface ChairCommentAnalysisDoc {
  sourceId: string;
  sourceFingerprint: string;
  classifierVersion: number;
  classifierModel: string;
  classifications: ChairClassification[];
  analyzedAt: Date;
}

const ChairCommentAnalysisSchema = new Schema<ChairCommentAnalysisDoc>(
  {
    sourceId: { type: String, required: true },
    sourceFingerprint: { type: String, required: true },
    classifierVersion: { type: Number, required: true },
    classifierModel: { type: String, required: true },
    classifications: {
      type: [
        new Schema(
          {
            commentId: { type: String, required: true },
            name: { type: String, required: true },
            brand: { type: String, default: "" },
            model: { type: String, default: "" },
            sentiment: { type: Number, default: 0 },
            themes: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    analyzedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

ChairCommentAnalysisSchema.index(
  { sourceId: 1, classifierVersion: 1 },
  { unique: true }
);

export const ChairCommentAnalysisModel = appModel<ChairCommentAnalysisDoc>(
  "ChairCommentAnalysis",
  ChairCommentAnalysisSchema,
  "chaircommentanalyses"
);
