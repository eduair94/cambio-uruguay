// Ampliar una página que ya existe con lo que Reddit preguntó y ella no contestaba.
//
// El caso frecuente no es "no hay página": es "hay página, es buena, y no dice esto". Cada vez que
// el bot contesta un hilo, `augment.ts` anota qué le faltó a la página elegida. Cuando varias
// personas tropiezan con el mismo faltante en la misma página, eso deja de ser una anécdota.
//
// La ampliación NO edita el .vue. Sale como datos en `app/utils/generated/addenda.ts` y el layout
// la inyecta en la ruta que corresponda — misma razón que en `emit.ts`: un job automático parcheando
// markup escrito a mano es la forma más rápida de romper el build a las 05:35 sin nadie despierto.
//
// Mismas puertas que una página generada, porque el texto termina igual de público: fuentes
// descargadas que devuelven 200, y cada cifra presente literal en el texto de alguna de ellas.

import { askClaudeJson, claudeSaturated } from "../claude";
import { preferredProvider } from "../ai_text";
import { inventedNumbers } from "../numbers";
import { RedditPageGapModel, type RedditPageGapDoc } from "../models/RedditPageGap";
import { fetchSources } from "./sourceText";

/** Personas distintas que tienen que tropezar con lo mismo antes de escribir nada. */
export const MIN_DEMAND = 2;
/** Páginas ampliadas por corrida. Igual que las páginas nuevas: radio de daño, no throughput. */
const MAX_PAGES_PER_RUN = 2;
const TIMEOUT_MS = 420000;
const EVIDENCE_CHARS = 9000;
const MAX_ITEMS = 4;

export interface AddendumItem {
  question: string;
  answer: string;
  sources: Array<{ title: string; url: string }>;
}

export interface PageAddendum {
  route: string;
  items: AddendumItem[];
  updatedAt: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          sourceUrls: { type: "array", items: { type: "string" } },
        },
        required: ["question", "answer", "sourceUrls"],
      },
    },
  },
  required: ["items"],
} as const;

export function buildEnrichPrompt(pagePath: string, missing: readonly string[], evidence: string): string {
  return `La página https://cambio-uruguay.com${pagePath} es buena pero no contesta estas dudas, que
aparecieron en hilos reales de Reddit:

${missing.map((m, i) => `${i + 1}. ${m}`).join("\n")}

TEXTO DESCARGADO DE LAS FUENTES — es lo ÚNICO de donde pueden salir las cifras
${evidence}

Escribí de 1 a ${MAX_ITEMS} pares pregunta/respuesta que cubran esos faltantes y se puedan agregar al
final de esa página.

- "question": la duda como la haría una persona, no como la titularía un manual.
- "answer": 2 a 4 oraciones. Español rioplatense, de vos. Concreto, sin rodeos.
- "sourceUrls": las URLs de arriba que sostienen ESA respuesta.

REGLA DURA, se verifica por código: ningún número puede faltar en el texto descargado. Si una duda
no se puede contestar con lo que hay, no la incluyas — es preferible una ampliación de dos preguntas
sólidas que una de cuatro con una estimada.

No repitas lo que la página ya dice. Esto se agrega, no la reemplaza.`;
}

export interface EnrichResult {
  addendum: PageAddendum | null;
  reason: string;
}

/** Investigar y redactar la ampliación de una página. Nunca tira. */
export async function enrichPage(
  pagePath: string,
  gaps: readonly RedditPageGapDoc[],
  today: string
): Promise<EnrichResult> {
  if (preferredProvider() !== "claude" || claudeSaturated()) {
    return { addendum: null, reason: "la ampliación necesita Claude" };
  }

  // Las URLs que la investigación de cada respuesta ya había abierto: sabemos que sirven para esto.
  const urls = [...new Set(gaps.flatMap((g) => g.findingsSources ?? []))].slice(0, 8);
  if (!urls.length) return { addendum: null, reason: "ningún faltante llegó con fuentes" };

  const fetched = await fetchSources(urls);
  const usable = fetched.filter((s) => s.ok && s.text.length > 200);
  if (usable.length < 1) return { addendum: null, reason: "las fuentes no se pudieron descargar" };

  const evidence = usable.map((s) => `[${s.url}]\n${s.text.slice(0, EVIDENCE_CHARS)}`).join("\n\n---\n\n");
  const allowed = usable.map((s) => s.text).join("\n");
  const byUrl = new Map(usable.map((s) => [s.url, s]));

  interface Raw {
    items?: Array<{ question?: string; answer?: string; sourceUrls?: string[] }>;
  }
  const raw = await askClaudeJson<Raw>(
    buildEnrichPrompt(pagePath, gaps.map((g) => g.missing).filter(Boolean), evidence),
    SCHEMA as unknown as Record<string, unknown>,
    { allowedTools: [], timeoutMs: TIMEOUT_MS }
  );
  if (!raw?.items?.length) return { addendum: null, reason: "no devolvió preguntas" };

  const items: AddendumItem[] = [];
  for (const item of raw.items.slice(0, MAX_ITEMS)) {
    const question = String(item?.question ?? "").trim();
    const answer = String(item?.answer ?? "").trim();
    if (!question || !answer) continue;

    // La misma regla que todo lo demás: una cifra sin fuente descargada no se publica. Acá se cae
    // el ítem solo, no la ampliación entera — el resto puede estar perfectamente sostenido.
    const invented = inventedNumbers(`${question}\n${answer}`, allowed);
    if (invented.length) {
      console.warn(`[enrich] descarto "${question.slice(0, 60)}": cifras sin fuente (${invented.join(", ")})`);
      continue;
    }

    const sources = (item.sourceUrls ?? [])
      .filter((u) => byUrl.has(u))
      .map((u) => ({ url: u, title: hostOf(u) }));
    if (!sources.length) {
      console.warn(`[enrich] descarto "${question.slice(0, 60)}": no citó ninguna fuente descargada`);
      continue;
    }

    items.push({ question, answer, sources });
  }

  if (!items.length) return { addendum: null, reason: "ningún ítem sobrevivió la verificación" };
  return { addendum: { route: pagePath, items, updatedAt: today }, reason: "" };
}

/** Páginas con suficientes faltantes distintos, sin ampliar todavía. */
export async function pagesNeedingEnrichment(): Promise<Map<string, RedditPageGapDoc[]>> {
  const rows = await RedditPageGapModel.find({ addendumAt: null, hadEvidence: true })
    .sort({ createdAt: -1 })
    .limit(400)
    .lean<RedditPageGapDoc[]>();

  const byPage = new Map<string, RedditPageGapDoc[]>();
  for (const row of rows) {
    if (!row.pagePath || !row.missing) continue;
    const list = byPage.get(row.pagePath) ?? [];
    list.push(row);
    byPage.set(row.pagePath, list);
  }

  for (const [page, list] of byPage) {
    // Cuenta faltantes DISTINTOS, no hilos: dos personas que preguntan lo mismo son la señal, pero
    // el mismo hilo contado dos veces no es nada.
    const distinct = new Set(list.map((g) => g.missing.toLowerCase().slice(0, 80)));
    if (distinct.size < MIN_DEMAND) byPage.delete(page);
  }
  return byPage;
}

export const maxPagesPerRun = MAX_PAGES_PER_RUN;

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
};
