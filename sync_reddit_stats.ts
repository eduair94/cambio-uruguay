// La foto pública de lo que el bot de Reddit contestó (pm2 `currency-reddit-stats`).
//
// Lee el ledger y escribe un documento en la Mongo de la APP, que es de donde lo sirve
// /estadisticas-reddit. No habla con Reddit, no gasta cuota de ningún modelo y no publica nada: es
// una agregación y una escritura.
//
// Corre después del vigilante horario a propósito. El vigilante es el que actualiza los votos y el
// estado de cada comentario, así que contar antes de que él corra es contar con los números de ayer.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { refreshRedditStats } from "./classes/redditstats/refresh";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("[reddit-stats] APP_MONGO_URI no está seteada — el ledger y la foto viven en la Mongo de la app");
    process.exit(1);
  }

  try {
    const result = await refreshRedditStats();
    console.log(
      `[reddit-stats] ${result.answered} contestados sobre ${result.evaluated} evaluados; ` +
        `${result.days} días en el histórico`
    );
  } catch (e) {
    console.error("[reddit-stats] falló", e);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[reddit-stats] fallo fatal", e);
  process.exit(1);
});
