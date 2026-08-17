// Read back how the bot's comments landed, and pause it if they landed badly
// (pm2 app `currency-reddit-bot-watch`, hourly).
//
// This is the feedback half of auto-posting. See classes/redditbot/watch.ts for why it exists and
// why the response to a bad signal is to stop rather than to keep going more carefully.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { runWatch } from "./classes/redditbot/watch";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("[redditbot-watch] APP_MONGO_URI no está seteada — el ledger vive en la Mongo de la app");
    process.exit(1);
  }

  try {
    const summary = await runWatch();
    console.log(
      `[redditbot-watch] ${summary.checked} comentarios revisados, ${summary.updated} actualizados, ` +
        `${summary.negatives} nuevos negativos${summary.tripped ? ", BREAKER ACTIVADO" : ""}; ${summary.note}`
    );
  } catch (e) {
    console.error("[redditbot-watch] la revisión falló", e);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[redditbot-watch] fallo fatal", e);
  process.exit(1);
});
