// Did the comments land, or did they annoy people?
//
// This is the half of "post automatically" that makes it defensible. Auto-posting on its own is a
// system with no feedback: a threshold set slightly too low produces six comments a day, every day,
// and the only detector is a human noticing. Reading back the score of what was posted closes the
// loop — and once the loop is closed, the correct response to a bad signal is to STOP, not to try
// harder. `pauseUntil` is that stop.

import { notifyAdmin } from "../notify";
import { botConfig, botCredentialsPresent, type BotConfig } from "./config";
import { pauseUntil, postedWithin, readSnapshot, recordWatch } from "./ledger";
import { shouldTrip } from "./limits";
import { fetchCommentStates } from "./post";

/** How long a comment's score is still worth re-reading. After three days it has settled. */
const WATCH_WINDOW_HOURS = 72;
/** At or below this, a comment is being told it does not belong. */
const NEGATIVE_SCORE = -2;

export interface WatchSummary {
  checked: number;
  updated: number;
  negatives: number;
  tripped: boolean;
  note: string;
}

export async function runWatch(cfg: BotConfig = botConfig()): Promise<WatchSummary> {
  const summary: WatchSummary = { checked: 0, updated: 0, negatives: 0, tripped: false, note: "" };

  if (!botCredentialsPresent(cfg)) {
    return { ...summary, note: "sin credenciales del bot — nada que vigilar" };
  }

  const rows = await postedWithin(WATCH_WINDOW_HOURS);
  summary.checked = rows.length;
  if (!rows.length) return { ...summary, note: "no hay comentarios recientes" };

  const fullnames = rows.map((row) => row.commentFullname).filter(Boolean);
  const states = await fetchCommentStates(fullnames, cfg);
  if (!states.size) return { ...summary, note: "Reddit no devolvió estado (¿token?)" };

  const bad: string[] = [];
  for (const row of rows) {
    const state = states.get(row.commentFullname);
    if (!state) continue; // unknown ≠ removed; see fetchCommentStates
    await recordWatch(row.postId, { commentScore: state.score, removed: state.removed });
    summary.updated++;

    const wasBad = state.removed || state.score <= NEGATIVE_SCORE;
    const alreadyKnown = row.removed || (row.commentScore ?? 0) <= NEGATIVE_SCORE;
    if (wasBad && !alreadyKnown) {
      summary.negatives++;
      bad.push(
        `${state.removed ? "🗑 borrado" : `👎 score ${state.score}`} en r/${row.sub} → ${row.pageUrl || row.postId}`
      );
    }
  }

  if (bad.length) await notifyAdmin(`⚠️ *Reddit bot* — respuestas que no funcionaron:\n${bad.join("\n")}`);

  // Re-read the snapshot AFTER writing this round's outcomes, so the breaker sees them.
  const snapshot = await readSnapshot();
  if (shouldTrip(cfg, snapshot)) {
    const until = new Date(Date.now() + cfg.breakerPauseHours * 60 * 60 * 1000);
    await pauseUntil(until, `${snapshot.recentNegatives} respuestas negativas en 24h`);
    summary.tripped = true;
    await notifyAdmin(
      `🛑 *Reddit bot en pausa* hasta ${until.toISOString()}\n` +
        `${snapshot.recentNegatives} respuestas borradas o con score bajo en 24 h. Revisá el umbral ` +
        `(REDDIT_BOT_MIN_SCORE / REDDIT_BOT_MIN_JUDGE) antes de reactivarlo.`
    );
  }

  return { ...summary, note: summary.tripped ? "breaker activado" : "ok" };
}
