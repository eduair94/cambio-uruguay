// El mismo hilo publicado en varios subs, una sola card.
//
// MEDIDO en la primera corrida (28/10/2026): "Consulta IRPF por dos trabajos" estaba en r/uruguay,
// r/monte_video y r/LegalUruguay, y el juez lo recomendó tres veces. Tres cards iguales es trabajo
// repetido para quien contesta, y tres respuestas iguales de la misma persona en una hora es el
// patrón que el antispam de Reddit castiga. Queda una copia y las otras se listan en ella.
//
// Dos reglas que salieron de la revisión, y las dos son de ESTABILIDAD:
//  - La clave es título + comienzo del texto, no el título solo: "Recomendación de celular" lo
//    escriben dos personas distintas el mismo mes, y juntarlas escondería un pedido real.
//  - La copia principal no se elige por votos o comentarios, que cambian todos los días: si una
//    persona ya contestó o descartó una copia, ésa manda (y las otras salen de pendientes); si no,
//    la más vieja, que es el original. Elegir por movimiento hacía que la copia contestada ayer
//    pasara a ser "duplicado" hoy y la otra volviera a pendientes.
import { strip } from "../redditbot/filter";
import { decodeEntities } from "./text";

export interface DupRow {
  postId: string;
  title: string;
  excerpt: string;
  sub: string;
  permalink: string;
  createdAt: Date;
  state: "open" | "answered" | "dismissed";
}

export interface DupGroup {
  /** El hilo principal del grupo, o "" si éste es el principal. */
  duplicateOf: string;
  /** Las otras copias, sólo en el principal. */
  alsoIn: Array<{ sub: string; permalink: string }>;
}

/** Con texto, un título de 12 letras alcanza; sin texto hace falta uno largo para no juntar "Consulta". */
const MIN_TITLE_WITH_BODY = 12;
const MIN_TITLE_ALONE = 25;
const BODY_PREFIX = 120;

const norm = (text: string): string =>
  strip(decodeEntities(text))
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** La clave de agrupación, o `null` si el hilo es demasiado genérico para agruparse con nada. */
export function dupKeyOf(row: Pick<DupRow, "title" | "excerpt">): string | null {
  const title = norm(row.title);
  const body = norm(row.excerpt).slice(0, BODY_PREFIX);
  if (body) return title.length >= MIN_TITLE_WITH_BODY ? `${title}|${body}` : null;
  return title.length >= MIN_TITLE_ALONE ? title : null;
}

const STATE_WEIGHT: Record<DupRow["state"], number> = { answered: 0, dismissed: 1, open: 2 };

export function groupDuplicates(rows: readonly DupRow[]): Map<string, DupGroup> {
  const groups = new Map<string, DupRow[]>();
  const out = new Map<string, DupGroup>();
  for (const row of rows) {
    out.set(row.postId, { duplicateOf: "", alsoIn: [] });
    const key = dupKeyOf(row);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(
      (a, b) =>
        STATE_WEIGHT[a.state] - STATE_WEIGHT[b.state] ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.postId.localeCompare(b.postId)
    );
    const [main, ...rest] = sorted as [DupRow, ...DupRow[]];
    out.set(main.postId, { duplicateOf: "", alsoIn: rest.map((r) => ({ sub: r.sub, permalink: r.permalink })) });
    for (const r of rest) out.set(r.postId, { duplicateOf: main.postId, alsoIn: [] });
  }
  return out;
}
