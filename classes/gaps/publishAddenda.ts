// Publicar las ampliaciones de páginas que ya existen.
//
// Mismo camino que una página nueva —clon aparte, lint y tests de la app, push a main que despliega—
// pero más barato y mucho más frecuente: "hay página y no dice esto" pasa bastante más seguido que
// "no hay página". Por eso corre primero en el job diario.
//
// Lo único que se escribe es `app/utils/generated/addenda.ts`. La página ampliada no se toca.

import { notifyAdmin } from "../notify";
import { RedditPageGapModel } from "../models/RedditPageGap";
import { emitAddendum } from "./emit";
import { enrichPage, maxPagesPerRun, pagesNeedingEnrichment } from "./enrich";
import {
  commitAndPush,
  readWorkspaceFile,
  syncWorkspace,
  verifyWorkspace,
  writeFiles,
} from "./workspace";

/** Rutas ampliadas en esta corrida. */
export async function enrichExistingPages(today: string): Promise<string[]> {
  let byPage: Map<string, Awaited<ReturnType<typeof pagesNeedingEnrichment>> extends Map<string, infer V> ? V : never>;
  try {
    byPage = await pagesNeedingEnrichment();
  } catch (e: any) {
    console.warn("[enrich] no pude leer los faltantes de página:", e?.message || e);
    return [];
  }
  if (!byPage.size) return [];

  console.log(`[enrich] ${byPage.size} páginas juntaron faltantes suficientes`);

  const synced = await syncWorkspace();
  if (!synced.ok) {
    console.warn(`[enrich] workspace no disponible: ${synced.detail}`);
    return [];
  }

  const done: string[] = [];
  // Las que más gente pidió primero.
  const queue = [...byPage.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, maxPagesPerRun);

  for (const [pagePath, gaps] of queue) {
    const { addendum, reason } = await enrichPage(pagePath, gaps, today);
    if (!addendum) {
      console.warn(`[enrich] ${pagePath}: ${reason}`);
      continue;
    }

    const current = readWorkspaceFile("app/utils/generated/addenda.ts");
    if (!current) {
      console.warn("[enrich] no encontré app/utils/generated/addenda.ts en el workspace");
      return done;
    }

    let file;
    try {
      file = emitAddendum(current, addendum);
    } catch (e: any) {
      console.warn(`[enrich] no pude emitir la ampliación de ${pagePath}: ${e?.message ?? e}`);
      continue;
    }

    const written = writeFiles([file]);
    if (!written.ok) {
      console.warn(`[enrich] ${written.detail}`);
      continue;
    }

    const verified = await verifyWorkspace();
    if (!verified.ok) {
      await notifyAdmin(
        `🚫 *Ampliación rechazada* — ${pagePath}\nNo pasó lint/tests, no se publicó nada.\n\n` +
          `\`\`\`\n${verified.detail.slice(-700)}\n\`\`\``
      );
      // Dejar el árbol limpio para la próxima ruta de la cola.
      await syncWorkspace();
      continue;
    }

    const message =
      `feat(auto): ampliar ${pagePath} con lo que preguntaron en Reddit\n\n` +
      `${addendum.items.length} preguntas que la página no contestaba y aparecieron en hilos reales:\n` +
      addendum.items.map((i) => `- ${i.question}`).join("\n") +
      `\n\nCada cifra aparece literal en el texto de una fuente descargada y verificada. La página no ` +
      `se editó: la ampliación vive en app/utils/generated/addenda.ts y el layout la inyecta por ruta.\n`;

    const pushed = await commitAndPush([file], message);
    if (!pushed.ok) {
      console.warn(`[enrich] ${pagePath}: ${pushed.detail}`);
      await syncWorkspace();
      continue;
    }

    await RedditPageGapModel.updateMany(
      { pagePath, addendumAt: null },
      { $set: { addendumAt: new Date() } }
    );
    done.push(pagePath);
    await notifyAdmin(
      `📈 *Página ampliada sola*\nhttps://cambio-uruguay.com${pagePath}\n` +
        `${addendum.items.length} preguntas nuevas, pedidas por ${gaps.length} hilos.\nCommit \`${pushed.commit}\`.`
    );
  }

  return done;
}
