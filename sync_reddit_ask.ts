// La pregunta diaria en r/AskUruguayan (pm2 app `currency-reddit-ask`).
//
// Investiga antes de escribir: lee el sub entero que la API deja ver, busca en la web de qué se
// habla esta semana, pide tres candidatas y publica la primera que sea nueva de verdad. No enlaza
// nada. Ver classes/redditbot/ask/run.ts.
//
// Con REDDIT_ASK_DRY_RUN sin poner en 0, hace todo el trabajo y no publica: sirve para leer el post
// antes de que exista.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { botCredentialsPresent } from "./classes/redditbot/config";
import { askConfig } from "./classes/redditbot/ask/config";
import { runAskPass } from "./classes/redditbot/ask/run";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("[ask] APP_MONGO_URI no está seteada — el historial de posts vive en la Mongo de la app");
    process.exit(1);
  }

  const cfg = askConfig();
  console.log(
    `[ask] sub=r/${cfg.sub} enabled=${cfg.enabled} dryRun=${cfg.dryRun} creds=${botCredentialsPresent()} modelo=${cfg.model}`
  );

  try {
    const summary = await runAskPass(cfg);
    console.log(
      `[ask] ${summary.researched} títulos leídos → ${summary.candidates} candidatas; ${summary.note}` +
        (summary.rejected.length ? `\n[ask] descartes:\n  - ${summary.rejected.join("\n  - ")}` : "")
    );
    if (summary.chosen) {
      console.log(
        `\n[ask] ELEGIDA (novedad ${summary.novelty.toFixed(2)}${summary.flair ? `, flair "${summary.flair}"` : ", sin flair"})\n` +
          `─────────────────────────────────────────\n${summary.chosen.title}\n\n${summary.chosen.body}\n` +
          `─────────────────────────────────────────\n` +
          `por qué: ${summary.chosen.why}\nrespuestas esperadas: ${summary.chosen.expectedAnswers}` +
          (summary.permalink ? `\n${summary.permalink}` : "")
      );
    }
  } catch (e) {
    console.error("[ask] la corrida falló", e);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[ask] fallo fatal", e);
  process.exit(1);
});
