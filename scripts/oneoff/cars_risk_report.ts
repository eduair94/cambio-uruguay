/**
 * Corre el extractor de riesgo contra un volcado del corpus real y reporta qué encuentra, con las
 * citas. Es una herramienta de medición: no escribe en ninguna base.
 *
 *   CARS_CORPUS=/ruta/cars-corpus.json npm run cars_risk_report
 */
import fs from "fs";
import { declaredRisks, type CarRiskCategory } from "../../classes/autos/risk";

interface Row {
  key: string;
  title: string;
  description: string;
  source: string;
  flags?: string[];
}

const path = process.env.CARS_CORPUS || "/tmp/cars-corpus.json";
const rows: Row[] = JSON.parse(fs.readFileSync(path, "utf8"));
const withDescription = rows.filter(row => (row.description || "").trim());
console.log(`avisos ${rows.length} | con descripción ${withDescription.length}`);

const counts = new Map<CarRiskCategory, number>();
const samples = new Map<CarRiskCategory, string[]>();
let flagged = 0;
for (const row of rows) {
  const risks = declaredRisks(row.title || "", row.description || "");
  if (!risks.length) continue;
  flagged++;
  for (const risk of risks) {
    counts.set(risk.category, (counts.get(risk.category) ?? 0) + 1);
    const bag = samples.get(risk.category) ?? [];
    if (bag.length < 4) bag.push(`[${risk.from}] ${risk.quote}`);
    samples.set(risk.category, bag);
  }
}
console.log(`avisos con riesgo declarado: ${flagged} (${((flagged / rows.length) * 100).toFixed(1)}% del catálogo, ` +
  `${((flagged / Math.max(1, withDescription.length)) * 100).toFixed(1)}% de los que tienen descripción)`);
for (const [category, total] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`\n${category}: ${total}`);
  for (const sample of samples.get(category) ?? []) console.log(`   ${sample}`);
}
