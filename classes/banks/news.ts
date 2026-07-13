// Live, grounded "recent news + AI analysis" per Uruguayan bank / fintech, for the tier list on
// /mejores-bancos-uruguay. One grounded search per entity (bounded concurrency), then ONE plain
// synthesis pass over the headlines we actually found — the synthesis must not search, it must only
// summarise what the grounded pass returned, or it will "find" things nobody cited.
//
// Moved out of the Nuxt app (server/utils/banksNews.ts), where it ran ON DEMAND: the first visitor
// after a 24h cache expiry paid ~36 Gemini calls in-request. Here it is a weekly-ish cron job into
// Mongo, and the page reads a store.
import { askGrounded, askPlain, geminiConfigured, groundedHeadlines, type GroundedHeadline } from "../gemini";
import { BANK_ENTITIES, KIND_LABELS } from "./entities";

export type Lang = "es" | "en" | "pt";
const LANG_NAME: Record<Lang, string> = { es: "español", en: "English", pt: "português" };

export interface BankNewsItem {
  id: string;
  name: string;
  /** Grounded 2-3 sentence read, or null when nothing relevant was found. */
  insight: string | null;
  headlines: GroundedHeadline[];
}

export interface BanksBriefing {
  /** Only entities with something real to show. */
  items: BankNewsItem[];
  /** Markdown sector analysis synthesised from the found headlines, or null. */
  analysis: string | null;
  asOf: string;
  /** True when the AI backend is unavailable (no key) — lets the caller explain itself. */
  unavailable: boolean;
}

const isNoNews = (t: string): boolean => /^\s*sin\s+noticias/i.test(t);

/** Run `fn` over `items` with at most `n` in flight. Order of results matches input. */
async function mapPool<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = Array.from({ length: items.length }) as R[];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchEntityNews(
  name: string,
  kindLabel: string,
  langName: string
): Promise<{ insight: string | null; headlines: GroundedHeadline[] }> {
  const prompt =
    `Sos un analista financiero. Buscá noticias reales y recientes (últimos 12 meses, priorizá lo más nuevo) ` +
    `sobre "${name}", ${kindLabel.toLowerCase()} de Uruguay. Interesan especialmente: cambios de comisiones o tarifas, ` +
    `mejoras o problemas serios de la app, fusiones/compras/ventas, multas o sanciones del Banco Central (BCU), ` +
    `lanzamientos de productos y reputación o reclamos de clientes. ` +
    `Si NO encontrás nada realmente relevante y reciente, respondé exactamente "SIN NOTICIAS". ` +
    `Si encontrás algo, escribí en ${langName} un resumen muy breve (1-2 frases, máximo ~40 palabras) ` +
    `de la novedad más importante y qué significa para un cliente en Uruguay. Directo y concreto, sin relleno. ` +
    `Basate solo en lo que encontraste; no inventes datos ni cifras.`;

  const reply = await askGrounded(prompt);
  if (!reply || !reply.text || isNoNews(reply.text)) return { insight: null, headlines: [] };
  return { insight: reply.text, headlines: groundedHeadlines(reply, 3) };
}

async function synthesise(items: BankNewsItem[], langName: string): Promise<string | null> {
  const blocks = items
    .filter((it) => it.insight)
    .map((it) => {
      const heads = it.headlines.map((h) => `  - ${h.title} (${h.source})`).join("\n");
      return `${it.name}: ${it.insight}${heads ? `\n${heads}` : ""}`;
    })
    .join("\n\n");
  if (!blocks) return null;

  const prompt =
    `Novedades recientes sobre bancos y fintech de Uruguay:\n\n${blocks}\n\n` +
    `Con SOLO esa información, escribí en ${langName}, en Markdown conciso, un análisis del sector ` +
    `(un párrafo de 3-4 frases y luego 2-3 viñetas): la tensión entre bancos tradicionales y fintech, ` +
    `quién gana y quién pierde terreno, y qué implica en la práctica para el usuario en Uruguay. ` +
    `No inventes cifras: usá solo estos titulares. Cerrá con una línea en cursiva aclarando que es ` +
    `un análisis informativo, no asesoramiento financiero.`;

  const text = await askPlain(prompt, 30000);
  return text && text.length > 40 ? text : null;
}

/** Bound an insight to a readable length: cut on a sentence boundary near `maxChars`. */
function trimInsight(text: string, maxChars = 700): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  if (lastStop > maxChars * 0.5) return slice.slice(0, lastStop + 1).trim();
  return slice.replace(/\s+\S*$/, "").trim() + "…";
}

/**
 * Build the full briefing for a language. Runs one grounded search per entity (bounded
 * concurrency) then one plain synthesis pass over what was found. Never throws — an unconfigured
 * key or every entity coming back empty just yields a smaller (or empty) briefing.
 */
export async function buildBanksBriefing(lang: Lang): Promise<BanksBriefing> {
  const langName = LANG_NAME[lang] ?? LANG_NAME.es;
  const asOf = new Date().toISOString();

  if (!geminiConfigured()) return { items: [], analysis: null, asOf, unavailable: true };

  const raw = await mapPool(BANK_ENTITIES, 4, (entity) =>
    fetchEntityNews(entity.name, KIND_LABELS[entity.kind] ?? entity.kind, langName)
  );

  const items: BankNewsItem[] = BANK_ENTITIES.map((entity, i) => ({
    id: entity.id,
    name: entity.name,
    insight: raw[i]!.insight,
    headlines: raw[i]!.headlines,
  })).filter((it) => it.insight || it.headlines.length);

  // Synthesise the sector analysis from the FULL insights (better context)...
  const analysis = await synthesise(items, langName);
  // ...then trim each per-entity insight so the cards stay scannable even expanded.
  for (const it of items) if (it.insight) it.insight = trimInsight(it.insight);

  return { items, analysis, asOf, unavailable: false };
}
