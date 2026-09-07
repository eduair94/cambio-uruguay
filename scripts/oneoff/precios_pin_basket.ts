// Pinnea la canasta UNA VEZ y escribe `classes/precios/basket_v1.ts`.
//
// La selección NO es "la marca más barata": eso movería la composición todos
// los días y un índice cuya canasta se mueve sola no mide precios, mide la
// canasta. Para cada necesidad canónica se elige el artículo con MÁS
// OBSERVACIONES, que es lo que maximiza cuántos locales se pueden comparar
// entre sí, y el resultado queda escrito como dato con sus conteos y su fecha.
//
// Correr: npm run precios_pin_basket
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { NEEDS } from "../../classes/precios/basket";
import { fetchCatalog } from "../../classes/precios/catalog";
import { rejectionReason } from "../../classes/precios/parse";
import { sweepArticle } from "../../classes/precios/sweep";

interface Pick {
  need: string;
  articleId: number;
  name: string;
  qty: number;
  observations: number;
}

async function main(): Promise<void> {
  const { articles } = await fetchCatalog();
  if (!articles.length) {
    console.error("[pin] el catálogo vino vacío; no se pinnea nada");
    process.exit(1);
  }

  const picks: Pick[] = [];

  for (const need of NEEDS) {
    const candidates = articles.filter((article) => need.pattern.test(article.name));
    if (!candidates.length) {
      console.log(`[pin] sin candidatos para "${need.need}" — la necesidad queda fuera de la canasta`);
      continue;
    }

    let best: { articleId: number; name: string; observations: number } | null = null;
    for (const candidate of candidates) {
      const rows = await sweepArticle(candidate.id);
      // Se cuentan observaciones REALES, con la misma regla que el pipeline:
      // una fila imputada o sin fecha no habilita comparar nada.
      const observations = (rows || []).filter((row) => rejectionReason(row) === null).length;
      console.log(`[pin] ${need.need.padEnd(18)} ${candidate.name.slice(0, 46).padEnd(46)} ${observations}`);
      if (!best || observations > best.observations) {
        best = { articleId: candidate.id, name: candidate.name, observations };
      }
    }
    if (best && best.observations > 0) picks.push({ need: need.need, qty: need.qty, ...best });
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = `// GENERADO por scripts/oneoff/precios_pin_basket.ts el ${today}. NO editar a mano:
// cambiar la composición exige una versión nueva, y una versión nueva corta la
// serie del índice a propósito (ver classes/precios/basket.ts).
//
// Criterio: por cada necesidad canónica, el artículo con MÁS observaciones
// reales ese día — el que permite comparar más locales entre sí. No el más
// barato: elegir por precio movería la composición todos los días.
import type { BasketItem } from "./basket";

export const BASKET_V1_PINNED_AT = ${JSON.stringify(today)};

export const BASKET_V1: ReadonlyArray<BasketItem> = Object.freeze([
${picks
  .map(
    (pick) =>
      `  // ${pick.name.trim()} — ${pick.observations} observaciones al pinnear\n` +
      `  Object.freeze({ articleId: ${pick.articleId}, qty: ${pick.qty}, need: ${JSON.stringify(pick.need)} }),`
  )
  .join("\n")}
]);
`;

  const out = path.resolve(process.cwd(), "classes/precios/basket_v1.ts");
  fs.writeFileSync(out, body, "utf8");
  console.log(`[pin] escrito ${out} con ${picks.length} artículos de ${NEEDS.length} necesidades`);
}

main().catch((error) => {
  console.error("[pin] falló:", error);
  process.exit(1);
});
