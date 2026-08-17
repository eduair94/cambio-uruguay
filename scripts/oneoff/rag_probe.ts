// Ask the RAG index a question from the command line and see what it would link.
//
//   npm run rag_probe -- "me trabaron un paquete en el correo, que hago"
//   npm run rag_probe -- --reddit uruguay        # score the sub's current /new against the index
//   npm run rag_probe -- --stats
//
// This is the calibration tool for REDDIT_BOT_MIN_SCORE / REDDIT_BOT_MIN_COSINE. Those two numbers
// decide whether the bot speaks, and there is no way to pick them from first principles — you pick
// them by running real questions through the real index and looking at where the line falls
// between "this page answers it" and "this page is merely about the same subject". Costs one
// embedding per question and posts nothing.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "../../classes/appdb";
import { botConfig } from "../../classes/redditbot/config";
import { retrievalQuery, screenPost } from "../../classes/redditbot/filter";
import { embedTexts } from "../../classes/rag/embed";
import { SiteRetriever } from "../../classes/rag/retrieve";
import { loadIndex } from "../../classes/rag/store";
import { fetchNewPosts, redditConfigured } from "../../classes/reddit";

const pad = (value: string | number, width: number): string => String(value).padEnd(width);

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error("APP_MONGO_URI no está seteada — el índice vive en la Mongo de la app.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const chunks = await loadIndex();
  const retriever = new SiteRetriever(chunks);
  const cfg = botConfig();

  console.log(`índice: ${retriever.size} chunks en ${retriever.pageCount} páginas`);
  console.log(`umbrales: coseno ≥ ${cfg.minCosine}   margen sobre el 2º ≥ ${cfg.minMargin}×\n`);

  if (args[0] === "--stats" || !args.length) {
    const byTier = new Map<string, number>();
    for (const chunk of chunks) byTier.set(chunk.tier, (byTier.get(chunk.tier) ?? 0) + 1);
    for (const [tier, count] of byTier) console.log(`  ${pad(tier, 6)} ${count} chunks`);
    if (!args.length) console.log('\nUso: npm run rag_probe -- "tu pregunta"   |   -- --reddit <sub>');
    process.exit(0);
  }

  // --reddit <sub>: score whatever that subreddit is asking right now. The fastest way to see how
  // the gates behave against real traffic instead of against questions you invented.
  if (args[0] === "--reddit") {
    const sub = args[1] || "uruguay";
    if (!redditConfigured()) {
      console.error("Sin REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET no puedo leer /new.");
      process.exit(1);
    }
    const posts = await fetchNewPosts(sub, 50);
    const screened = posts.filter((post) => screenPost(post, cfg).ok);
    console.log(`r/${sub}: ${posts.length} posts, ${screened.length} pasaron el filtro temático\n`);
    if (!screened.length) process.exit(0);

    const queries = screened.map(retrievalQuery);
    const vectors = await embedTexts(queries, "RETRIEVAL_QUERY");
    screened.forEach((post, i) => {
      const top = retriever.rankWithVector(queries[i]!, vectors[i] ?? null, 2);
      const best = top[0];
      const margin = best && top[1] ? best.score / top[1].score : Infinity;
      const passes = best && best.cosine >= cfg.minCosine && margin >= cfg.minMargin;
      console.log(
        `${passes ? "✅" : "  "} cos=${(best?.cosine ?? 0).toFixed(3)} m=${margin === Infinity ? "∞" : margin.toFixed(2)} ` +
          `${pad(best?.path ?? "(nada)", 42)} ← ${post.title.slice(0, 70)}`
      );
    });
    process.exit(0);
  }

  const question = args.join(" ");
  const pages = await retriever.search(question, 5);
  console.log(`pregunta: ${question}\n`);
  pages.forEach((page, i) => {
    // The margin gate only applies to the winner; for the rest it is shown for context.
    const margin = i === 0 ? (pages[1] ? page.score / pages[1].score : Infinity) : NaN;
    const passes = i === 0 && page.cosine >= cfg.minCosine && margin >= cfg.minMargin;
    console.log(
      `${passes ? "✅" : "❌"} cos=${page.cosine.toFixed(3)} ` +
        `${i === 0 ? `m=${margin === Infinity ? "∞" : margin.toFixed(2)} ` : "       "}` +
        `score=${page.score.toFixed(4)} [${page.tier}] ${page.path}`
    );
    console.log(`   ${page.title}`);
    console.log(`   « ${page.chunks[0]?.chunk.text.slice(0, 220).replace(/\s+/g, " ")}… »\n`);
  });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
