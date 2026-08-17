// Cluster the questions the site could not answer, and draft the ones with real demand
// (pm2 app `currency-content-gaps`, daily).
//
// The drafts land in docs/reddit-gaps/ and are NOT pages. See classes/gaps/draft.ts for why this
// pipeline deliberately stops one step short of publishing.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { geminiConfigured } from "./classes/gemini";
import { refreshContentGaps } from "./classes/gaps/refresh";

/** Montevideo date, so a draft's filename matches the day the maintainer will look for it. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("[gaps] APP_MONGO_URI no está seteada — los huecos viven en la Mongo de la app");
    process.exit(1);
  }
  if (!geminiConfigured()) {
    console.warn("[gaps] sin GEMINI_API_KEY — se agrupa pero no se investiga nada");
  }

  try {
    const summary = await refreshContentGaps(today());
    console.log(
      `[gaps] ${summary.gaps} preguntas sin respuesta → ${summary.clusters} clusters; ` +
        `${summary.drafted.length} borradores nuevos`
    );
    for (const path of summary.drafted) console.log(`[gaps]   ${path}`);
    for (const pending of summary.pending.slice(0, 8)) {
      console.log(`[gaps]   pendiente: "${pending.label}" (${pending.demand} hilos)`);
    }
  } catch (e) {
    console.error("[gaps] la corrida falló", e);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[gaps] fallo fatal", e);
  process.exit(1);
});
