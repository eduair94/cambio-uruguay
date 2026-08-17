// "Does the site have a page that answers THIS?" — the decision, as a pure function.
//
// Two independent measurements, because they fail differently.
//
//   cosine — is the best matching passage actually close to the question? On a 0..1 scale that
//            means something on its own.
//   margin — did ONE page win, or did four pages tie? A tie is the signature of a question about a
//            subject we cover without answering: /alquilar-en-uruguay, /alquilar-estando-en-clearing
//            and /rentCommunities all score alike for "no tengo garantía", because each is adjacent
//            and none is the answer. That is a content gap, not a link.
//
// The fused RRF score is deliberately NOT used as an absolute threshold, and an earlier version of
// this bot tried. With k=60 the theoretical maximum for a page topping both retrieval arms is
// 2/61 ≈ 0.033, so the plausible-looking `0.034` in the first config would have silenced the bot
// permanently while reading like a tuned number. Ratios of RRF scores are meaningful; their
// magnitudes are not.

import type { RetrievedPage } from "../rag/types";
import type { BotConfig } from "./config";

export type GateReason = "no_pages" | "weak_match" | "no_clear_winner";

export interface GateVerdict {
  ok: boolean;
  reason?: GateReason;
  page?: RetrievedPage;
  /** Winner score ÷ runner-up score. `Infinity` when there is no runner-up. */
  margin: number;
  detail?: string;
}

export function retrievalGate(cfg: BotConfig, pages: readonly RetrievedPage[]): GateVerdict {
  const best = pages[0];
  if (!best) return { ok: false, reason: "no_pages", margin: 0 };

  const runnerUp = pages[1];
  // No runner-up at all is the most decisive win there is, not a missing measurement.
  const margin = runnerUp && runnerUp.score > 0 ? best.score / runnerUp.score : Infinity;

  if (best.cosine < cfg.minCosine) {
    return {
      ok: false,
      reason: "weak_match",
      page: best,
      margin,
      detail: `cos ${best.cosine.toFixed(3)} < ${cfg.minCosine}`,
    };
  }

  if (margin < cfg.minMargin) {
    return {
      ok: false,
      reason: "no_clear_winner",
      page: best,
      margin,
      detail: `${margin.toFixed(2)}× < ${cfg.minMargin}× (${runnerUp?.path ?? "—"} empata)`,
    };
  }

  return { ok: true, page: best, margin };
}
