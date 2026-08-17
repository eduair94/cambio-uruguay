// One pass of the Reddit answering bot (pm2 app `currency-reddit-bot`).
//
// Fires every twelve minutes during Uruguay's waking hours and answers at most one thread per run,
// behind the daily/per-sub/per-page caps in classes/redditbot/limits.ts. With
// REDDIT_BOT_ENABLED unset it still does the whole pipeline and posts nothing, which is the
// intended state until the thresholds have been watched for a few days.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { botConfig, botCredentialsPresent, canPost } from "./classes/redditbot/config";
import { runOnce } from "./classes/redditbot/run";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("[redditbot] APP_MONGO_URI no está seteada — el índice y el ledger viven en la Mongo de la app");
    process.exit(1);
  }

  const cfg = botConfig();
  console.log(
    `[redditbot] subs=${cfg.subs.join(",")} enabled=${cfg.enabled} dryRun=${cfg.dryRun} ` +
      `creds=${botCredentialsPresent(cfg)} → ${canPost(cfg) ? "PUBLICA" : "no publica"}`
  );

  try {
    const summary = await runOnce(cfg);
    const rejected = Object.entries(summary.rejected)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${reason}=${count}`)
      .join(" ");
    console.log(
      `[redditbot] ${summary.fetched} posts → ${summary.screened} filtrados → ${summary.scored} rankeados; ` +
        `publicados=${summary.posted} dryRun=${summary.dryRun} huecos=${summary.gaps}; ${summary.note}` +
        (rejected ? `\n[redditbot] descartes: ${rejected}` : "")
    );
  } catch (e) {
    // A bad run must not take the process down in a way pm2 restarts in a loop; the next cron tick
    // is twelve minutes away and that is the right retry interval.
    console.error("[redditbot] la corrida falló", e);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[redditbot] fallo fatal", e);
  process.exit(1);
});
