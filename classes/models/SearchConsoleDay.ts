import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { GscDay } from "../gsc/types";

// Lives in the APP database. One compact document per Search Console day: totals plus the top
// queries/pages/countries/devices of that day as arrays.
//
// Why arrays and not a row per (day, query): 15.000 queries × 365 days is 5,5 M documents and an
// index bigger than the data to answer questions this shape answers in one lookup. The trade-off is
// that "the series of one query over 90 days" costs 90 document reads — which is fine, because the
// only caller is a nightly job, never a web request.
const SearchConsoleDaySchema = new Schema(
  {
    day: { type: String, required: true },
    totals: { type: Schema.Types.Mixed, required: true },
    queries: { type: [Schema.Types.Mixed], default: [] },
    pages: { type: [Schema.Types.Mixed], default: [] },
    countries: { type: [Schema.Types.Mixed], default: [] },
    devices: { type: [Schema.Types.Mixed], default: [] },
    queryRowsSeen: { type: Number, default: 0 },
    pageRowsSeen: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SearchConsoleDaySchema.index({ day: 1 }, { unique: true });

export const SearchConsoleDayModel = appModel<GscDay>("SearchConsoleDay", SearchConsoleDaySchema, "searchconsoledays");
