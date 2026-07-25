// Owner opinions from the international chair subreddits.
//
// r/CharruaDevs is the right source for what Uruguayans actually buy, but it has never discussed a
// Steelcase Leap and never will in volume. For those models the evidence exists — it is just in
// English, in r/OfficeChairs and friends. This module reads it with the same Reddit client the
// tier list uses, scores it with an explicit bilingual lexicon (no LLM: the score has to be
// reproducible and free), and keeps a permalink for every opinion it counts.
import { redditConfigured, searchPosts } from "../../reddit";
import type { ChairExternalReview } from "../types";

const GLOBAL_SUBS = ["OfficeChairs", "ergonomics", "BuyItForLife", "homeoffice"];
const SUB_PATH = GLOBAL_SUBS.join("+");

/** Models worth a query. Each one costs a single Reddit search. */
const MAX_MODELS = Number(process.env.CHAIR_GLOBAL_MODELS || 24);

const POSITIVE =
  /\b(love\s+it|best\s+chair|worth\s+(?:it|every)|highly\s+recommend|recommend|comfortable|comfy|great\s+chair|excellent|solid|holds?\s+up|no\s+back\s+pain|fixed\s+my\s+back|life\s?changing|amazing|happy\s+with|would\s+buy\s+again|buy\s+it\s+for\s+life|bifl)\b/gi;
const NEGATIVE =
  /\b(regret|uncomfortable|hurts?\s+my\s+back|back\s+pain|waste\s+of\s+money|overrated|broke|broken|cheap\s+plastic|squeak|creak|falling\s+apart|returned\s+it|avoid|not\s+worth|disappointed|poor\s+quality)\b/gi;

export interface GlobalChairOpinion {
  mentions: number;
  positive: number;
  negative: number;
  subs: string[];
  quotes: ChairExternalReview[];
}

const countMatches = (text: string, pattern: RegExp): number => {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].length;
};

/** The model has to be named — "chair" alone in an r/OfficeChairs thread proves nothing. */
function mentionsModel(text: string, brand: string, model: string): boolean {
  const haystack = text.toLowerCase();
  const modelTokens = model
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
  if (!modelTokens.length) return false;
  const hasModel = modelTokens.every((token) => haystack.includes(token));
  const brandToken = brand.toLowerCase().split(/\s+/)[0] || "";
  // A distinctive model name stands alone; a short or numeric one needs its brand beside it.
  const distinctive = modelTokens.join("").length >= 5 && !/^\d+$/.test(modelTokens.join(""));
  return hasModel && (distinctive || (brandToken.length >= 3 && haystack.includes(brandToken)));
}

export async function harvestGlobalChairOpinions(
  models: ReadonlyArray<{ slug: string; brand: string; model: string; name: string }>
): Promise<Map<string, GlobalChairOpinion>> {
  const out = new Map<string, GlobalChairOpinion>();
  if (!redditConfigured()) return out;

  for (const chair of models.slice(0, MAX_MODELS)) {
    if (!chair.brand || !chair.model) continue;
    const posts = await searchPosts(SUB_PATH, `${chair.brand} ${chair.model}`, {
      t: "all",
      sort: "relevance",
      maxPages: 1,
    });
    if (!posts.length) continue;

    const opinion: GlobalChairOpinion = { mentions: 0, positive: 0, negative: 0, subs: [], quotes: [] };
    const subs = new Set<string>();

    for (const post of posts) {
      const text = `${post.title}\n${post.selftext || ""}`;
      if (!mentionsModel(text, chair.brand, chair.model)) continue;
      opinion.mentions++;
      const positive = countMatches(text, POSITIVE);
      const negative = countMatches(text, NEGATIVE);
      if (positive > negative) opinion.positive++;
      else if (negative > positive) opinion.negative++;

      const sub = (post.permalink.split("/r/")[1] || "").split("/")[0] || "";
      if (sub) subs.add(sub);
      if (opinion.quotes.length < 4 && (positive || negative)) {
        opinion.quotes.push({
          source: sub ? `Reddit r/${sub}` : "Reddit",
          sourceUrl: post.permalink.startsWith("http")
            ? post.permalink
            : `https://www.reddit.com${post.permalink}`,
          rating: null,
          text: text.replace(/\s+/g, " ").trim().slice(0, 320),
          date: new Date(post.createdUtc * 1000).toISOString().slice(0, 10),
        });
      }
    }

    if (!opinion.mentions) continue;
    opinion.subs = [...subs].slice(0, 4);
    out.set(chair.slug, opinion);
  }
  return out;
}
