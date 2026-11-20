// La cola de hilos para contestar (pm2 `currency-reddit-opportunities`, diario 10:21 UTC).
//
// POR QUÉ EXISTE. Desde el 7/10/2026 las dos cuentas del sitio en Reddit están suspendidas y el bot
// de comentarios no llega a nadie. Lo que queda es una persona contestando a mano, y eso sólo rinde
// si alguien ya hizo el trabajo de buscar: qué hilo del último mes, en qué sub, qué página del
// sitio contesta lo que pidieron y por qué. Eso es lo que arma este job, y lo que muestra la página
// privada /oportunidades-reddit.
//
// QUÉ NO HACE: no publica nada en Reddit y no redacta respuestas. Ver `classes/redditopps/judge.ts`.
//
// Flags:
//   --dry-run        lee y juzga, imprime, no escribe (anda sin APP_MONGO_URI, sin índice RAG)
//   --judge-max=N    cuántos hilos nuevos se juzgan como máximo (600 por defecto)
import "dotenv/config";

import { appDbConfigured } from "./classes/appdb";
import { notifyAdmin } from "./classes/notify";
import { SiteRetriever } from "./classes/rag/retrieve";
import { loadIndex } from "./classes/rag/store";
import { fetchComments, fetchInfoLive, fetchNewPostsSince, fetchPostsByIdsOrNull, redditConfigured } from "./classes/reddit";
import type { LexicalRetriever } from "./classes/redditopps/candidates";
import { judgeBatch, oppsJudgeModel } from "./classes/redditopps/judge";
import { refreshRedditOpportunities } from "./classes/redditopps/refresh";
import { mongoOppsStore, NULL_STORE } from "./classes/redditopps/store";
import { oppsSubs } from "./classes/redditopps/subs";

const PAGE_URL = "https://cambio-uruguay.com/oportunidades-reddit";

function flagValue(name: string): number | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const parsed = Number(hit.split("=")[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/** El índice del sitio para el brazo léxico, o `null` si no se puede cargar (la corrida sigue). */
async function loadRetriever(): Promise<LexicalRetriever | null> {
  if (!appDbConfigured()) return null;
  try {
    const chunks = await loadIndex();
    if (!chunks.length) return null;
    const retriever = new SiteRetriever(chunks);
    console.log(`[reddit-opps] índice RAG: ${retriever.pageCount} páginas, ${retriever.size} fragmentos`);
    return retriever;
  } catch (e: any) {
    console.warn(`[reddit-opps] no pude cargar el índice RAG: ${e?.message || e}`);
    return null;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!appDbConfigured() && !dryRun) {
    console.error(
      "[reddit-opps] APP_MONGO_URI no está configurado — no corro. La cola vive en la base del app " +
        "(copiá el valor de app/.env MONGO_URI); escribirla en la del backend la dejaría invisible."
    );
    process.exit(1);
  }
  if (!redditConfigured()) {
    console.error("[reddit-opps] faltan REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET — no hay nada que leer.");
    process.exit(1);
  }

  const summary = await refreshRedditOpportunities(
    {
      subs: oppsSubs(),
      fetchSub: (sub, since) => fetchNewPostsSince(sub, since, { maxPages: 10 }),
      fetchByIds: (ids) => fetchPostsByIdsOrNull(ids),
      fetchCommentBodies: async (sub, postId) => (await fetchComments(sub, postId)).map((c) => c.body),
      fetchCommentsVisible: async (fullnames) => {
        const live = await fetchInfoLive(fullnames);
        return live ? new Map([...live].map(([name, info]) => [name, !info.gone])) : null;
      },
      judge: (items) => judgeBatch(items),
      retriever: await loadRetriever(),
      store: appDbConfigured() ? mongoOppsStore : NULL_STORE,
      model: oppsJudgeModel(),
    },
    { dryRun, judgeMax: flagValue("judge-max") }
  );

  for (const s of summary.perSub) {
    console.log(`  r/${s.sub}: ${s.fetched} leídos, ${s.candidates} candidatos, ${s.judged} juzgados, ${s.recommended} recomendados`);
  }
  console.log(
    `[reddit-opps] ${summary.fetched} hilos, ${summary.screened} pasan el filtro, ${summary.candidates} con candidatas, ` +
      `${summary.judged} juzgados, ${summary.recommended} recomendados nuevos, ${summary.linkChecked} comentarios revisados, ` +
      `${summary.answersChecked} respuestas releídas, ${summary.markedRemoved} borrados, ${summary.pruned} podados, ` +
      `${summary.pending} pendientes en la cola`
  );
  for (const note of summary.notes) console.log(`  · ${note}`);
  for (const item of summary.newRecommended.slice(0, 15)) {
    console.log(`  ${item.confidence.toFixed(2)} r/${item.sub} "${item.title.slice(0, 90)}" → ${item.path} — ${item.reason}`);
  }

  // Ningún sub devolvió nada: Reddit caído o las credenciales vencidas. La página pública sigue
  // mostrando la cola de ayer con su fecha, pero la del día se perdió; sin este aviso nadie se
  // entera hasta que alguien note que la fecha no avanza. Lo de hoy no se pierde: mañana la ventana
  // de 30 días lo vuelve a leer.
  if (summary.aborted) {
    if (!dryRun) {
      await notifyAdmin(
        "*Reddit: la cola de hoy no se actualizó* — ningún sub devolvió hilos (¿Reddit caído o las " +
          "credenciales REDDIT_CLIENT_ID/SECRET?). Mañana se reintenta sola."
      );
    }
    process.exit(1);
  }
  if (dryRun) {
    console.log("[reddit-opps] DRY RUN: no se escribió nada");
    process.exit(summary.judgeDown ? 1 : 0);
  }

  // Había qué juzgar y no salió ningún veredicto. La meta ya se guardó con la nota (la página lo
  // muestra), pero sin esto la corrida terminaría en 0 y la cola dejaría de crecer en silencio.
  if (summary.judgeDown) {
    console.error(`[reddit-opps] el juez no devolvió nada en ${summary.judgeFailures} lotes (¿clave, cuota o modelo?)`);
    await notifyAdmin(
      `*Reddit: el juez de la cola no contestó* (${summary.judgeFailures} lotes, modelo ${oppsJudgeModel()}). ` +
        "Mirá la clave y la cuota de Gemini del .env de la raíz."
    );
    process.exit(1);
  }

  // Un aviso por día, y sólo si hay algo nuevo. Un canal que repite lo mismo deja de leerse.
  if (summary.newRecommended.length) {
    const top = [...summary.newRecommended].sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    // `notifyAdmin` manda Markdown: un `_` o un `*` del título de un desconocido rompe el mensaje entero.
    const plain = (s: string) => s.replace(/[_*`[\]]/g, " ");
    const lines = top.map((i) => `• ${plain(`r/${i.sub}`)}: _${plain(i.title.slice(0, 80))}_ → ${i.path}`).join("\n");
    await notifyAdmin(
      `*Reddit: ${summary.newRecommended.length} hilos nuevos para contestar* (${summary.pending} pendientes)\n${lines}\n${PAGE_URL}`
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[reddit-opps] la corrida falló", e);
  process.exit(1);
});
