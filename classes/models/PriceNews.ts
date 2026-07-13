// Mirror of app/server/models/PriceNews.ts, bound to the APP's Mongo (classes/appdb.ts).
// READ-ONLY from the backend's side: this is the app's archived-headline feed (USD only, written
// by nitro's drivers:daily -> archiveTodayNews, not Gemini). The backend reads it as the fallback
// headline source when a grounded news search finds nothing for the day.
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface PriceNewsDoc {
  date: string; // 'YYYY-MM-DD' America/Montevideo
  currency: string;
  headlines: { title: string; source: string; link: string; pubDate: string }[];
}

const PriceNewsSchema = new Schema<PriceNewsDoc>(
  {
    date: { type: String, required: true },
    currency: { type: String, required: true },
    headlines: [
      {
        _id: false,
        title: String,
        source: String,
        link: String,
        pubDate: String,
      },
    ],
  },
  { timestamps: true }
);

PriceNewsSchema.index({ date: 1, currency: 1 }, { unique: true });

export const PriceNewsModel = appModel<PriceNewsDoc>("PriceNews", PriceNewsSchema, "pricenews");
