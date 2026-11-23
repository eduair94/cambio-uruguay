// Etiquetado A CIEGAS de `photofacts` por dos modelos más fuertes que el que se evalúa
// (docs/app/PHOTO_FACTS.md, «Etiquetar y decidir»).
//
//   npm run photo_facts_ai_label -- --input=<export.json> [--per=40] [--max-usd=25]
//        [--labelers=claude-opus-5-5,claude-sonnet-5-5] [--concurrency=3] [--out=<carpeta>]
//
// Cada etiquetador recibe las MISMAS fotos, en el mismo orden, con la misma pregunta que recibió
// Haiku —pero nunca su respuesta— y a más resolución (1.568 px). Sólo cuenta donde los dos coinciden
// (`consensusLabels`), que es el precedente de los gastos comunes leídos del texto. Lo que discuten
// queda afuera y se informa.
//
// No escribe en ninguna base. Lee un export JSON de `photofacts` (la base del app sólo se alcanza
// desde el VPS) o, si hay APP_MONGO_URI y no se pasa --input, la colección. Guarda cada respuesta
// apenas llega (es reanudable: un corte no tira lo pagado) en docs/seo/data/fotos-etiquetado/, que
// está en .gitignore. Al final escribe `labels.json` (lo lee photo_facts_eval) y `report.json`.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { anthropicConfigured, askClaudeWithImages } from "../../classes/anthropic";
import { consensusLabels, evaluateLabels, stratifiedSample, type BlindAnswer } from "../../classes/photofacts/evaluate";
import { PHOTO_FACTS_JSON_SCHEMA, PHOTO_FACTS_SYSTEM, normalizePhotoFacts, photoFactsPrompt } from "../../classes/photofacts/schema";
import { preparePhotos } from "../../classes/vision/photos";

const arg = (name: string): string | undefined => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);

interface ExportedDoc {
  _id: string;
  vertical: "alquiler" | "venta";
  propertyType?: string;
  photos: Array<{ url: string; render?: boolean | null; watermark?: boolean | null; kind?: string | null }>;
  facts: { furniture: string; furniturePhoto?: number | null; seen: Record<string, number | null> };
}

type Stored = BlindAnswer & { model: string; kinds: string[]; costUsd: number };

async function loadDocs(input: string | undefined): Promise<ExportedDoc[]> {
  if (input) return JSON.parse(fs.readFileSync(input, "utf8"));
  const { appConnection, appDbConfigured } = await import("../../classes/appdb");
  if (!appDbConfigured()) throw new Error("--input=<export.json> o APP_MONGO_URI");
  await appConnection().asPromise();
  const docs = await appConnection().collection("photofacts").find({ ok: true }).toArray();
  await appConnection().close();
  return docs as unknown as ExportedDoc[];
}

const readJson = <T>(file: string, fallback: T): T => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
};

async function main(): Promise<void> {
  if (!anthropicConfigured()) throw new Error("sin clave de Claude");
  const day = new Date().toISOString().slice(0, 10);
  const out = arg("out") ?? path.join("docs", "seo", "data", "fotos-etiquetado", `ciego-${day}`);
  fs.mkdirSync(out, { recursive: true });
  const labelers = (arg("labelers") ?? "claude-opus-5-5,claude-sonnet-5-5").split(",").map(s => s.trim()).filter(Boolean);
  if (labelers.length !== 2) throw new Error("hacen falta exactamente dos etiquetadores");
  const maxUsd = Number(arg("max-usd")) || 25;
  const concurrency = Math.max(1, Number(arg("concurrency")) || 3);
  const maxEdge = Number(arg("max-edge")) || 1568;

  const docs = await loadDocs(arg("input"));
  const sample = stratifiedSample(docs, Math.max(1, Number(arg("per")) || 40));
  const files = labelers.map(model => path.join(out, `answers-${model}.json`));
  const answers = files.map(file => new Map<string, Stored>(Object.entries(readJson<Record<string, Stored>>(file, {}))));
  const skipped: Record<string, string> = readJson(path.join(out, "skipped.json"), {});
  let spent = [...answers.flatMap(map => [...map.values()])].reduce((sum, row) => sum + (row.costUsd || 0), 0);
  console.log(`[ai-label] ${sample.length} avisos de ${docs.length}; ya pagado ~US$ ${spent.toFixed(3)} de ${maxUsd}`);

  const persist = (): void => {
    answers.forEach((map, i) => fs.writeFileSync(files[i], JSON.stringify(Object.fromEntries(map))));
    fs.writeFileSync(path.join(out, "skipped.json"), JSON.stringify(skipped));
  };
  const nullStreak = labelers.map(() => 0);
  let stop = "";
  const queue = sample.filter(doc => !skipped[doc._id] && answers.some(map => !map.has(doc._id)));
  let done = 0;

  async function label(doc: ExportedDoc): Promise<void> {
    const urls = doc.photos.map(photo => photo.url);
    // Las mismas fotos en el mismo orden, o nada: un índice corrido haría que "foto 3" sea otra foto.
    const prepared = await preparePhotos(urls, { max: urls.length, maxEdge, maxAttempts: urls.length });
    if (prepared.photos.length !== urls.length || prepared.photos.some((photo, i) => photo.index !== i)) {
      skipped[doc._id] = "photos_changed";
      return;
    }
    const images = prepared.photos.map(photo => ({ data: photo.data, mimeType: photo.mimeType }));
    const prompt = photoFactsPrompt({ vertical: doc.vertical, propertyType: doc.propertyType ?? "otro", photoCount: images.length });
    await Promise.all(
      labelers.map(async (model, i) => {
        if (answers[i].has(doc._id) || stop) return;
        const reply = await askClaudeWithImages(prompt, images, {
          model, system: PHOTO_FACTS_SYSTEM, schema: PHOTO_FACTS_JSON_SCHEMA, cacheSystem: true, effort: "medium", maxTokens: 8_000, timeoutMs: 180_000,
        });
        if (!reply || reply.value === undefined) {
          if (++nullStreak[i] >= 3) stop = `${model} no contesta (3 seguidas)`;
          return;
        }
        nullStreak[i] = 0;
        spent += reply.costUsd;
        const norm = normalizePhotoFacts(reply.value, images.length);
        if (!norm) return;
        answers[i].set(doc._id, {
          model: reply.model,
          costUsd: reply.costUsd,
          facts: norm.facts,
          photos: norm.photos.map(photo => ({ render: photo.render, watermark: photo.watermark })),
          kinds: norm.photos.map(photo => photo.kind),
        });
      }),
    );
  }

  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < queue.length && !stop) {
        if (spent >= maxUsd) { stop = `tope de US$ ${maxUsd}`; break; }
        const doc = queue[cursor++];
        await label(doc);
        persist();
        if (++done % 10 === 0) console.log(`[ai-label] ${done}/${queue.length} · ~US$ ${spent.toFixed(3)}`);
      }
    }),
  );
  persist();

  const result = consensusLabels(sample as any, answers[0], answers[1]);
  const scores = evaluateLabels(result.labels);
  fs.writeFileSync(path.join(out, "labels.json"), JSON.stringify(result.labels, null, 1));
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify({ day, labelers, sample: sample.length, compared: result.compared, skipped: Object.keys(skipped).length, spentUsd: spent, stop, disagreements: result.disagreements, evidence: result.evidence, scores }, null, 1),
  );
  console.log(`[ai-label] ${stop || "terminado"} · comparados ${result.compared} · ~US$ ${spent.toFixed(3)} · ${out}`);
  console.log(`desacuerdos entre etiquetadores: ${JSON.stringify(result.disagreements)}`);
  console.log(`foto de prueba que coincide: ${JSON.stringify(result.evidence)}`);
}

main().catch(error => {
  console.error("[ai-label] fallo", error instanceof Error ? error.message : error);
  process.exit(1);
});
