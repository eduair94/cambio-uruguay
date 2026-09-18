/**
 * Cuántos avisos consiguen versión antes y después de minar el vocabulario del propio corpus.
 * Herramienta de medición: no escribe en ninguna base.
 *
 *   CARS_CORPUS=/ruta/cars-corpus.json CARS_VOCAB=/ruta/cars-vocab.json npm run cars_trim_report
 */
import fs from "fs";
import { buildTrimIndex, matchTrim, mineTrims, type TrimCorpusRow } from "../../classes/autos/catalog/trims";
import { engineOf, trimOf } from "../../classes/autos/normalize";
import type { CarModelVocabulary } from "../../classes/autos/types";

const rows: Array<TrimCorpusRow & { key: string; source: string }> = JSON.parse(
  fs.readFileSync(process.env.CARS_CORPUS || "/tmp/cars-corpus.json", "utf8"),
);
const base: CarModelVocabulary[] = JSON.parse(fs.readFileSync(process.env.CARS_VOCAB || "/tmp/cars-vocab.json", "utf8"));

const baseByModel = new Map(base.map(entry => [`${entry.brandId}|${entry.modelId}`, entry.trims]));
const mined = mineTrims(rows, base);
const minedByModel = new Map(mined.map(entry => [`${entry.brandId}|${entry.modelId}`, entry.trims]));
const indexes = new Map([...minedByModel].map(([key, trims]) => [key, buildTrimIndex(trims, baseByModel.get(key) ?? [])]));

let before = 0;
let after = 0;
let gained = 0;
let changed = 0;
const gainedSamples: string[] = [];
const changedSamples: string[] = [];
for (const row of rows) {
  const key = `${row.brandId}|${row.modelId}`;
  const identity = `${row.title} ${row.specText ?? ""}`.trim();
  const old = trimOf(identity, baseByModel.get(key) ?? []);
  const now = matchTrim(identity, indexes.get(key) ?? buildTrimIndex([]));
  if (old) before++;
  if (now) after++;
  if (!old && now) {
    gained++;
    if (gainedSamples.length < 14) gainedSamples.push(`${now.padEnd(18)} ← ${identity.slice(0, 68)}`);
  }
  if (old && now && old !== now) {
    changed++;
    if (changedSamples.length < 8) changedSamples.push(`${old} → ${now}   ${identity.slice(0, 60)}`);
  }
}

// Lo que de verdad importa: cuántos avisos quedan en una cohorte comparable (≥5 hermanos).
const cohortReady = (pick: (row: (typeof rows)[number]) => string | null): number => {
  const groups = new Map<string, number>();
  for (const row of rows) {
    const trim = pick(row);
    if (!trim) continue;
    const engine = engineOf(`${row.title} ${row.specText ?? ""}`);
    if (!engine) continue;
    const key = `${row.brandId}|${row.modelId}|${(row as { year?: number }).year}|${trim}|${engine}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.values()].filter(size => size >= 5).reduce((total, size) => total + size, 0);
};
const readyBefore = cohortReady(row => trimOf(`${row.title} ${row.specText ?? ""}`, baseByModel.get(`${row.brandId}|${row.modelId}`) ?? []));
const readyAfter = cohortReady(row => matchTrim(`${row.title} ${row.specText ?? ""}`, indexes.get(`${row.brandId}|${row.modelId}`) ?? buildTrimIndex([])));
console.log(`en cohorte de >=5: antes ${readyBefore} → después ${readyAfter} (${readyAfter - readyBefore >= 0 ? "+" : ""}${readyAfter - readyBefore})`);

const empty = (map: Map<string, string[]>) => [...map.values()].filter(trims => !trims.length).length;
console.log(`modelos: ${minedByModel.size} | vocabulario vacío antes ${empty(baseByModel)} → después ${empty(minedByModel)}`);
console.log(`avisos ${rows.length} | con versión antes ${before} (${((before / rows.length) * 100).toFixed(1)}%) → después ${after} (${((after / rows.length) * 100).toFixed(1)}%)`);
console.log(`ganados ${gained} | cambiados ${changed}`);
console.log("\nversiones nuevas:");
for (const sample of gainedSamples) console.log(`   ${sample}`);
if (changedSamples.length) {
  console.log("\ncambios de versión (revisar a ojo):");
  for (const sample of changedSamples) console.log(`   ${sample}`);
}
const biggest = mined
  .map(entry => ({ key: `${entry.brandId}|${entry.modelId}`, trims: entry.trims }))
  .sort((a, b) => b.trims.length - a.trims.length)[0];
console.log(`\nvocabulario más grande: ${biggest?.key} → ${biggest?.trims.slice(0, 20).join(" / ")}`);
