// Answer one Reddit thread on purpose, through the bot's real pipeline.
//
//   npm run reddit_answer -- 1vjzk3x            # ensayo: escribe y muestra, no publica
//   REDDIT_BOT_DRY_RUN=0 npm run reddit_answer -- 1vjzk3x   # publica de verdad
//
// Exists for two reasons. Validating the whole chain — retrieval, judge, composer, validator,
// posting, ledger — should not require waiting for `/new` to happen to produce an answerable
// question; and occasionally a thread is worth answering on purpose.
//
// It is NOT a bypass. Every gate that decides whether to answer still runs, and the ledger is
// written exactly as in a scheduled run, so invoking it twice on the same thread is a no-op rather
// than a second comment. The only relaxed rule is the age window, because a thread picked by hand
// was picked knowing how old it is.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "../../classes/appdb";
import { botConfig, botCredentialsPresent, canPost } from "../../classes/redditbot/config";
import { answerThreadById } from "../../classes/redditbot/run";

/** Accepts a bare id, a `t3_` fullname, or a full permalink. */
function parsePostId(raw: string): string {
  const trimmed = raw.trim().replace(/^t3_/, "");
  const fromUrl = trimmed.match(/\/comments\/([a-z0-9]+)/i);
  return (fromUrl?.[1] ?? trimmed).replace(/\/+$/, "");
}

async function main(): Promise<void> {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (!arg) {
    console.error("Uso: npm run reddit_answer -- <id o URL del post>");
    process.exit(2);
  }
  if (!appDbConfigured()) {
    console.error("APP_MONGO_URI no está seteada — el ledger vive en la Mongo de la app");
    process.exit(1);
  }

  const cfg = botConfig();
  const postId = parsePostId(arg);
  console.log(
    `[reddit_answer] hilo ${postId} | creds=${botCredentialsPresent(cfg)} | ` +
      `${canPost(cfg) ? "VA A PUBLICAR" : "ensayo, no publica"}`
  );

  const summary = await answerThreadById(postId, cfg);
  const rejected = Object.entries(summary.rejected)
    .map(([reason, n]) => `${reason}=${n}`)
    .join(" ");
  console.log(
    `[reddit_answer] publicados=${summary.posted} dryRun=${summary.dryRun}; ${summary.note}` +
      (rejected ? `\n[reddit_answer] descartes: ${rejected}` : "")
  );
  process.exit(summary.posted || summary.dryRun ? 0 : 1);
}

main().catch((e) => {
  console.error("[reddit_answer] falló", e);
  process.exit(1);
});
