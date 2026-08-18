// Un pase de comentarios comunes (pm2 app `currency-reddit-social`).
//
// No enlaza nada ni promociona nada: existe sólo para que la cuenta deje de ser una cuenta de ayer.
// Varios subs uruguayos borran por AutoModerator lo que escribe una cuenta sin karma —medido en los
// dos primeros comentarios del bot— y mientras eso pase, el bot de respuestas escribe para nadie.
//
// Se apaga solo al llegar a REDDIT_SOCIAL_KARMA_TARGET. Ver classes/redditbot/social/run.ts.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { botCredentialsPresent } from "./classes/redditbot/config";
import { socialConfig } from "./classes/redditbot/social/config";
import { runSocialPass } from "./classes/redditbot/social/run";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("[social] APP_MONGO_URI no está seteada — el ledger vive en la Mongo de la app");
    process.exit(1);
  }

  const cfg = socialConfig();
  console.log(
    `[social] subs=${cfg.subs.join(",")} enabled=${cfg.enabled} dryRun=${cfg.dryRun} ` +
      `creds=${botCredentialsPresent()} objetivo=${cfg.karmaTarget} karma`
  );

  try {
    const summary = await runSocialPass(cfg);
    const rejected = Object.entries(summary.rejected)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${reason}=${count}`)
      .join(" ");
    console.log(
      `[social] ${summary.fetched} posts → ${summary.candidates} candidatos; karma=${summary.karma ?? "?"}; ${summary.note}` +
        (rejected ? `\n[social] descartes: ${rejected}` : "")
    );
  } catch (e) {
    // El próximo tick del cron es el reintento correcto; caerse haría que pm2 reinicie en loop.
    console.error("[social] la corrida falló", e);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[social] fallo fatal", e);
  process.exit(1);
});
