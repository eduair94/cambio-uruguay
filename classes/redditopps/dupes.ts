// El mismo hilo publicado en varios subs, una sola card.
//
// MEDIDO en la primera corrida (28/10/2026): "Consulta IRPF por dos trabajos" estaba en r/uruguay,
// r/monte_video y r/LegalUruguay, y el juez lo recomendó tres veces. Tres cards iguales es trabajo
// repetido para quien contesta, y tres respuestas iguales de la misma persona en una hora es el
// patrón que el antispam de Reddit castiga. Se queda la copia con más movimiento y las otras se
// listan en ella como "también en".
import { strip } from "../redditbot/filter";
import { decodeEntities } from "./text";

export interface DupRow {
  postId: string;
  title: string;
  sub: string;
  permalink: string;
  score: number;
  numComments: number;
  createdAt: Date;
}

export interface DupGroup {
  /** El hilo principal del grupo, o "" si éste es el principal. */
  duplicateOf: string;
  /** Las otras copias, sólo en el principal. */
  alsoIn: Array<{ sub: string; permalink: string }>;
}

/** Títulos tan cortos ("Consulta", "Ayuda") coinciden sin ser el mismo hilo. */
const MIN_KEY_LENGTH = 12;

export function groupDuplicates(rows: readonly DupRow[]): Map<string, DupGroup> {
  const groups = new Map<string, DupRow[]>();
  const out = new Map<string, DupGroup>();
  for (const row of rows) {
    out.set(row.postId, { duplicateOf: "", alsoIn: [] });
    const key = strip(decodeEntities(row.title)).replace(/[^a-z0-9 ]/g, "").trim();
    if (key.length < MIN_KEY_LENGTH) continue;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(
      (a, b) => b.score + b.numComments - (a.score + a.numComments) || a.createdAt.getTime() - b.createdAt.getTime()
    );
    const [main, ...rest] = sorted as [DupRow, ...DupRow[]];
    out.set(main.postId, { duplicateOf: "", alsoIn: rest.map((r) => ({ sub: r.sub, permalink: r.permalink })) });
    for (const r of rest) out.set(r.postId, { duplicateOf: main.postId, alsoIn: [] });
  }
  return out;
}
