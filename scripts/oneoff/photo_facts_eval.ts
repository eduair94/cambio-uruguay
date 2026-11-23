// El veredicto por atributo sobre las etiquetas que exportó la página de photo_facts_label.
//
//   npm run photo_facts_eval -- <etiquetas.json>
//
// Sólo lee el archivo. Un atributo "pasa" con precisión ≥ 95 % sobre ≥ 100 etiquetas con ≥ 30
// positivos (PUBLISH_BAR); sólo lo que pasa se puede publicar, en otro trabajo y con su fila en
// docs/seo/experiments.json.
import fs from "fs";
import { PUBLISH_BAR, evaluateLabels, type Label } from "../../classes/photofacts/evaluate";

const file = process.argv.slice(2).find(arg => !arg.startsWith("--"));
if (!file) {
  console.error("uso: npm run photo_facts_eval -- <etiquetas.json>");
  process.exit(1);
}
const labels = JSON.parse(fs.readFileSync(file, "utf8")) as Label[];
const pct = (value: number | null): string => (value === null ? "—" : `${(value * 100).toFixed(1)} %`);
console.log(`vara: precisión ≥ ${PUBLISH_BAR.precision * 100} %, n ≥ ${PUBLISH_BAR.n}, positivos ≥ ${PUBLISH_BAR.positives}\n`);
console.log(["atributo".padEnd(20), "n".padStart(5), "pos".padStart(5), "precisión".padStart(10), "Wilson↓".padStart(9), "exactitud".padStart(10), "  veredicto"].join(""));
for (const score of evaluateLabels(labels)) {
  console.log(
    [
      score.attribute.padEnd(20),
      String(score.n).padStart(5),
      String(score.positives).padStart(5),
      pct(score.precision).padStart(10),
      pct(score.wilsonLow).padStart(9),
      pct(score.accuracy).padStart(10),
      score.passes ? "  PASA" : "  no pasa",
    ].join(""),
  );
}
