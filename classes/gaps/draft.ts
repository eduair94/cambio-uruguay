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
// So the output is a `.md` under `docs/reddit-gaps/`: the real questions, what the research found,
// the sources and HOW they were established, and an explicit list of what a human has to verify.
// Turning that into a page is a human act. The draft removes the blank page, not the judgement.
//
// The research itself lives in research.ts, which knows the difference between "the model opened
// this page" and "this URL exists" — a distinction the draft prints rather than smooths over.

import fs from "fs";
import path from "path";
import { researchGap, type Research } from "./research";
import type { GapCluster } from "./cluster";

export const DRAFT_DIR = path.join(__dirname, "..", "..", "docs", "reddit-gaps");

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "tema";

export interface DraftResult {
  filePath: string;
  relativePath: string;
  slug: string;
  provider: Research["provider"];
}

/** How the sources section explains what its links are worth. */
function sourcesSection(research: Research): string {
  const good = research.sources.filter((source) => source.verified);
  const bad = research.sources.filter((source) => !source.verified);

  const heading =
    research.citationBasis === "modelo-abrió-la-página"
      ? "## Fuentes que el modelo abrió de verdad\n\nGemini devuelve las páginas que efectivamente recuperó; estas son ésas."
      : "## Fuentes (URL verificada por nosotros)\n\nClaude nombra las páginas que dice haber leído; acá cada URL fue pedida y respondió 200. Eso prueba que la página existe, **no** que diga lo que el modelo afirma. Abrilas.";

  const list = good.length
    ? good.map((source) => `- [${source.title}](${source.url})${source.says ? ` — ${source.says}` : ""}`).join("\n")
    : "- (ninguna fuente quedó verificada — tratá TODO lo de arriba como sin confirmar)";

  const rejected = bad.length
    ? `\n\n### URLs que el modelo citó y NO existen\n\nNo respondieron 200. Que las haya nombrado es motivo para desconfiar del resto:\n\n${bad
        .map((source) => `- ~~${source.url}~~`)
        .join("\n")}`
    : "";

  return `${heading}\n\n${list}${rejected}`;
}

/**
 * Write the draft. `null` when the research produced nothing — an empty file would be worse than
 * none, because it would mark the cluster as drafted and it would never be looked at again.
 */
export async function writeDraft(cluster: GapCluster, today: string): Promise<DraftResult | null> {
  const research = await researchGap(cluster);
  if (!research?.text) return null;

  const slug = slugify(cluster.label);
  const fileName = `${today}-${slug}.md`;
  const filePath = path.join(DRAFT_DIR, fileName);

  const threads = cluster.members
    .map((member) => `- [r/${member.sub}] [${member.title.replace(/[[\]]/g, "")}](${member.permalink})`)
    .join("\n");

  const body = `# ${cluster.label}

> **Borrador automático. No es una página.** Lo generó \`sync_content_gaps\` a partir de preguntas
> reales de Reddit que el sitio no contesta. Nada de acá se publica hasta que una persona lo
> verifique contra la fuente. Ver \`classes/gaps/draft.ts\` para por qué.

- **Fecha:** ${today}
- **Demanda:** ${cluster.members.length} hilos en ${cluster.subs.map((s) => `r/${s}`).join(", ") || "—"}
- **Investigó:** ${research.provider === "claude" ? "Claude (WebSearch + WebFetch)" : "Gemini grounded"}
- **Cluster:** \`${cluster.id}\`

## Hilos que lo pidieron

${threads}

## Investigación

${research.text}

${sourcesSection(research)}

## Verificar antes de publicar

- [ ] Cada cifra sale de una de las fuentes de arriba, abierta a mano
- [ ] La norma citada está vigente (ojo con \`/bases/leyes\` vs \`/bases/leyes-originales\` en IMPO)
- [ ] Nada de lo que está en "Lo que NO pude confirmar" se coló a la respuesta
- [ ] La página tiene entrada en \`app/utils/siteNav.ts\` (si no, el test de cobertura falla)
- [ ] Los valores fechados quedaron en un \`utils/*.ts\`, no incrustados en el \`.vue\`
`;

  fs.mkdirSync(DRAFT_DIR, { recursive: true });
  fs.writeFileSync(filePath, body, "utf8");

  return { filePath, relativePath: path.posix.join("docs", "reddit-gaps", fileName), slug, provider: research.provider };
}
