// Barrer el atraso de la semana de una sentada.
//
//   npm run reddit_sweep                    # ensayo: escribe y muestra, no publica
//   npm run reddit_sweep -- --rondas 8      # más vueltas
//   REDDIT_BOT_DRY_RUN=0 npm run reddit_sweep   # publica de verdad
//
// El cron por hora está bien para lo que se pregunta HOY y es malísimo para ponerse al día: el
// primer día en que la ventana pasó a ser de una semana hay decenas de hilos sin contestar, y a
// tres por hora eso son varios días en los que los hilos siguen envejeciendo. Esto es la misma
// corrida, repetida, hasta que no queda nada o hasta que un tope diga basta.
//
// NO relaja ningún límite. Llama a `runOnce`, así que el cupo diario, el del sub, el enfriamiento
// por página y por autor, el juez, el validador y el ledger son exactamente los mismos. Lo único
// que hace es no esperar una hora entre corridas: cuando el tope diario o el interruptor cortan, se
// termina. Si querés más volumen, la perilla es `REDDIT_BOT_MAX_PER_DAY`, y subirla es una decisión
// distinta de correr esto.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "../../classes/appdb";
import { botConfig, canPost } from "../../classes/redditbot/config";
import { runOnce } from "../../classes/redditbot/run";

const flagValue = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  const raw = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("APP_MONGO_URI no está seteada — el índice y el ledger viven en la Mongo de la app");
    process.exit(1);
  }

  const cfg = botConfig();
  const rounds = flagValue("rondas", 10);
  console.log(
    `[sweep] ventana=${cfg.maxAgeHours}h subs=${cfg.subs.join(",")} ` +
      `tope=${cfg.maxPerDay}/día ${cfg.maxRepliesPerRun}/corrida → ${canPost(cfg) ? "PUBLICA" : "ensayo"}`
  );

  let answered = 0;
  for (let round = 1; round <= rounds; round++) {
    const summary = await runOnce(cfg);
    const got = summary.posted + summary.dryRun;
    answered += got;
    console.log(
      `[sweep] ronda ${round}/${rounds}: ${summary.fetched} leídos, ${summary.screened} filtrados, ` +
        `${got} contestados (acumulado ${answered}); ${summary.note}`
    );

    // Cero contestados no es "esperá y probá de nuevo": el ledger ya anotó lo que descartó, así que
    // la ronda siguiente vería exactamente lo mismo. La única razón de seguir es haber contestado.
    if (!got) {
      console.log("[sweep] no quedó nada contestable en la ventana. Fin.");
      break;
    }
  }

  console.log(`[sweep] total ${answered} ${canPost(cfg) ? "publicados" : "en ensayo"}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[sweep] falló", e);
  process.exit(1);
});
