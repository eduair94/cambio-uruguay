// ¿La cuenta del bot está en condiciones de hablar?
//
//   npm run reddit_account
//
// Existe porque "el bot no publica" tiene seis causas posibles y cinco son de la CUENTA, no del
// código: credenciales que no autentican, karma que hace que AutoModerator borre todo, un sub que
// baneó a la cuenta, una bio que no declara que es un bot, o el interruptor en cero. Diagnosticar
// eso leyendo logs cuesta una tarde; esto lo contesta en una corrida y sin publicar nada.
//
// Lo único que NO puede contestar es si un comentario ya publicado sigue vivo — eso lo hace
// `sync_reddit_bot_watch`, que lo lee con un token anónimo porque el autor ve sus propios
// comentarios borrados como si estuvieran perfectos, para siempre.
import dotenv from "dotenv";
dotenv.config();

import { botConfig, botCredentialsPresent, canPost } from "../../classes/redditbot/config";
import { bioDeclaresBot, SUGGESTED_BIO } from "../../classes/redditbot/identity";
import { fetchAccountBio, fetchAccountKarma, postsAllowed } from "../../classes/redditbot/post";
import { subWritable } from "../../classes/redditbot/subrules";

const ok = (text: string) => `  ✅ ${text}`;
const bad = (text: string) => `  ❌ ${text}`;
const warn = (text: string) => `  ⚠️  ${text}`;

async function main(): Promise<void> {
  const cfg = botConfig();
  let problems = 0;

  console.log(`\nCUENTA: u/${cfg.username || "(sin REDDIT_BOT_USERNAME)"}\n`);

  console.log("Credenciales");
  if (!botCredentialsPresent(cfg)) {
    console.log(bad("faltan. Se necesita REDDIT_BOT_CLIENT_ID + SECRET y (USERNAME + PASSWORD | REFRESH_TOKEN)"));
    problems++;
  } else {
    console.log(ok(`presentes (${cfg.refreshToken ? "refresh token" : "usuario y contraseña"})`));
  }

  console.log("\nInterruptores");
  console.log(cfg.enabled ? ok("REDDIT_BOT_ENABLED=1") : warn("REDDIT_BOT_ENABLED distinto de 1 — el job sale enseguida"));
  console.log(cfg.dryRun ? warn("REDDIT_BOT_DRY_RUN distinto de 0 — ensayo, no publica") : ok("REDDIT_BOT_DRY_RUN=0"));
  console.log(
    postsAllowed()
      ? warn("REDDIT_BOT_ALLOW_POSTS=1 — la cuenta PUEDE abrir hilos. Se esperaba que solo comentara")
      : ok("solo comentarios (no puede abrir hilos)")
  );
  console.log(`  → ${canPost(cfg) ? "VA A PUBLICAR" : "no publica"}`);

  console.log("\nKarma");
  const karma = await fetchAccountKarma(cfg);
  if (!karma) {
    console.log(bad("no se pudo leer /api/v1/me — las credenciales no autentican"));
    problems++;
  } else {
    const total = karma.comment + karma.link;
    console.log(`  comentarios: ${karma.comment} · posts: ${karma.link} · total: ${total}`);
    // No es un umbral oficial de nadie: es el punto medido en el que los AutoModerator uruguayos
    // dejaron de borrar. Una cuenta de cero karma escribe para nadie y no se entera.
    if (total < 50) {
      console.log(bad("muy poco karma. r/uruguay y r/Burises borran por AutoModerator lo que escribe una cuenta nueva"));
      problems++;
    } else {
      console.log(ok("suficiente para que los AutoModerator uruguayos no lo borren de entrada"));
    }
  }

  console.log("\nBio (donde vive la aclaración de que es un bot)");
  const bio = await fetchAccountBio(cfg);
  const verdict = bioDeclaresBot(bio);
  if (verdict.ok) {
    console.log(ok("declara que es una cuenta automatizada y de qué sitio"));
  } else {
    console.log(bad(verdict.reason ?? "no cumple"));
    console.log(`  Bio actual: ${bio ? JSON.stringify(bio.slice(0, 160)) : "(no se pudo leer)"}`);
    console.log(`  Sugerida:   ${SUGGESTED_BIO}`);
    console.log("  Se edita en https://www.reddit.com/settings/profile (campo «About»).");
    if (cfg.requireBioDisclosure) problems++;
  }

  console.log("\nSubs");
  for (const sub of cfg.subs) {
    const gate = await subWritable(sub);
    console.log(gate.allowed ? ok(`r/${sub}`) : `  ⛔ r/${sub} — ${gate.reason}`);
  }

  console.log(
    problems
      ? `\n${problems} problema(s) que impiden que el bot conteste.\n`
      : "\nTodo en orden.\n"
  );
  process.exit(problems ? 1 : 0);
}

main().catch((e) => {
  console.error("[reddit_account] falló", e);
  process.exit(1);
});
