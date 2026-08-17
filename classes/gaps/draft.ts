// Turn a cluster of unanswered questions into a researched draft.
//
// This is the "if there is no page, generate it" half of the request, and it stops one step short
// of publishing on purpose. Every other self-updating subsystem in this repo — aduana, loans,
// figures, costs — is allowed to change a NUMBER on a page that a person wrote and reviewed, behind
// bands and a two-source guardrail. None of them is allowed to create a page. The difference
// matters: a wrong number inside a reviewed page is caught by its bands, while a whole page
// nobody read has no such floor, and the pages this bot would create are about customs charges,
// taxes and loan rates — the exact subjects where being confidently wrong costs the reader money.
//
// So the output is a `.md` under `docs/reddit-gaps/`: the real questions, what grounded research
// found, the resolved sources, and an explicit list of what a human has to verify. Turning that
// into a page is a human act. The draft removes the blank page, not the judgement.

import fs from "fs";
import path from "path";
import { askGrounded, groundedHeadlines } from "../gemini";
import type { GapCluster } from "./cluster";

export const DRAFT_DIR = path.join(__dirname, "..", "..", "docs", "reddit-gaps");

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "tema";

function researchPrompt(cluster: GapCluster): string {
  const questions = cluster.members
    .slice(0, 8)
    .map((member, i) => `${i + 1}. [r/${member.sub}] ${member.title}\n   ${(member.text || "").slice(0, 300)}`)
    .join("\n");

  return `Estas son preguntas reales que la gente hizo en subreddits uruguayos y que nuestro sitio no contesta.

${questions}

Investigá con búsqueda web y contestá para Uruguay, con normativa y fuentes oficiales cuando existan
(IMPO, DGI, BPS, BCU, Aduanas, MTSS). Estructura de la respuesta:

## La pregunta de fondo
Una o dos frases: qué están preguntando en realidad.

## Respuesta
Lo que se puede afirmar hoy, con la cifra o el plazo concreto cuando lo haya, y de dónde sale cada uno.

## Lo que depende del caso
Las variantes que cambian la respuesta.

## Lo que NO pude confirmar
Sé explícito. Todo lo que no encontraste en una fuente que hayas abierto va acá, no arriba.

Reglas: no inventes cifras ni artículos de normas. Si una norma fue modificada, decí cuál es el
texto vigente. Escribí en español rioplatense. No uses tablas.`;
}

export interface DraftResult {
  filePath: string;
  relativePath: string;
  slug: string;
}

/**
 * Write the draft. `null` when the research call produced nothing — an empty file would be worse
 * than none, because it would mark the cluster as drafted and it would never be looked at again.
 */
export async function writeDraft(cluster: GapCluster, today: string): Promise<DraftResult | null> {
  const reply = await askGrounded(researchPrompt(cluster));
  if (!reply?.text) return null;

  const sources = groundedHeadlines(reply, 12);
  const slug = slugify(cluster.label);
  const fileName = `${today}-${slug}.md`;
  const filePath = path.join(DRAFT_DIR, fileName);

  const threads = cluster.members
    .map((member) => `- [r/${member.sub}] [${member.title.replace(/[[\]]/g, "")}](${member.permalink})`)
    .join("\n");

  const sourceList = sources.length
    ? sources.map((source) => `- [${source.source}] [${source.title}](${source.link})`).join("\n")
    : "- (el modelo no devolvió ninguna fuente que haya abierto — tratá TODO lo de arriba como sin verificar)";

  const body = `# ${cluster.label}

> **Borrador automático. No es una página.** Lo generó \`sync_content_gaps\` a partir de preguntas
> reales de Reddit que el sitio no contesta. Nada de acá se publica hasta que una persona lo
> verifique contra la fuente. Ver \`classes/gaps/draft.ts\` para por qué.

- **Fecha:** ${today}
- **Demanda:** ${cluster.members.length} hilos en ${cluster.subs.map((s) => `r/${s}`).join(", ") || "—"}
- **Cluster:** \`${cluster.id}\`

## Hilos que lo pidieron

${threads}

## Investigación (Gemini con búsqueda)

${reply.text.trim()}

## Fuentes que el modelo abrió de verdad

${sourceList}

## Verificar antes de publicar

- [ ] Cada cifra sale de una de las fuentes de arriba, abierta a mano
- [ ] La norma citada está vigente (ojo con \`/bases/leyes\` vs \`/bases/leyes-originales\` en IMPO)
- [ ] Nada de lo que está en "Lo que NO pude confirmar" se coló a la respuesta
- [ ] La página tiene entrada en \`app/utils/siteNav.ts\` (si no, el test de cobertura falla)
- [ ] Los valores fechados quedaron en un \`utils/*.ts\`, no incrustados en el \`.vue\`
`;

  fs.mkdirSync(DRAFT_DIR, { recursive: true });
  fs.writeFileSync(filePath, body, "utf8");

  return { filePath, relativePath: path.posix.join("docs", "reddit-gaps", fileName), slug };
}
