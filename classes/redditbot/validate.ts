// The last gate before a comment becomes public.
//
// A prompt is a request; this file is the enforcement. Every rule the composer was given is checked
// here against the produced text, because a model that follows nine instructions and quietly
// invents a tenth number is the normal case, not the pathological one — and on this site a wrong
// number is the specific failure that matters. The whole project's editorial rule is that a figure
// on a page has a source; a bot that posts "pagás 40% de recargo" because it felt right would be
// the first place that stopped being true, in public, under the site's own name.
//
// So: every numeric token in the reply must appear in the retrieved context. Not "most", not
// "approximately" — every one. A composer that cannot write the answer without inventing a number
// has not answered the question, and the correct outcome is to say nothing.

import { DISCLOSURE } from "./compose";

export type RejectReason =
  | "empty"
  | "too_short"
  | "too_long"
  | "no_link"
  | "wrong_link"
  | "multiple_links"
  | "invented_number"
  | "missing_disclosure"
  | "banned_phrase"
  | "markdown_heading";

export interface ValidationResult {
  ok: boolean;
  reason?: RejectReason;
  /** For `invented_number`: the offending tokens, so the retry prompt can name them. */
  detail?: string;
}

const MIN_WORDS = 45;
const MAX_WORDS = 170;

/** Openers and filler that mark a comment as machine-written on sight. */
const BANNED_PHRASES = [
  "espero que estes bien",
  "excelente pregunta",
  "gran pregunta",
  "como modelo de lenguaje",
  "soy una inteligencia artificial",
  "en resumen,",
  "¡espero que esto te ayude!",
  "espero que esto te ayude",
  "no dudes en consultar",
  "estoy aqui para ayudarte",
  "saludos cordiales",
];

const strip = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Every number in a text, normalised so that the same quantity written two ways compares equal.
 *
 * Uruguayan writing uses `.` for thousands and `,` for decimals; a model rendering the same figure
 * as `1.000`, `1000` or `1,000` must not be treated as having invented anything. Percent signs,
 * currency symbols and units are dropped — the token is the quantity.
 */
export function numericTokens(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\d[\d.,]*/g)) {
    let raw = match[0].replace(/[.,]+$/, ""); // trailing punctuation is sentence, not number
    if (!raw) continue;

    // Thousands grouping: 1.000 / 1.234.567 / 1,234,567 → strip the separators.
    if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, "");
    else raw = raw.replace(/,/g, "."); // a lone comma is a decimal point here

    // Drop a trailing ".0" so 20 and 20.0 are the same token.
    const num = Number(raw);
    out.push(Number.isFinite(num) ? String(num) : raw);
  }
  return out;
}

/**
 * Numbers present in the reply but not in the context.
 *
 * Exported for the retry prompt, which names them: telling the model *which* number it invented
 * makes the second attempt succeed far more often than repeating the rule louder.
 */
export function inventedNumbers(reply: string, context: string): string[] {
  const allowed = new Set(numericTokens(context));
  const seen = new Set<string>();
  const bad: string[] = [];
  for (const token of numericTokens(reply)) {
    if (allowed.has(token) || seen.has(token)) continue;
    seen.add(token);
    bad.push(token);
  }
  return bad;
}

/** Bare URLs and markdown links alike. */
export function extractLinks(text: string): string[] {
  const links = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s)>\]]+/gi)) {
    links.add(match[0].replace(/[.,;:]+$/, ""));
  }
  // A markdown link whose target is a bare path (`[acá](/importar)`) is still a link and still
  // renders as one on Reddit; the bare-URL scan above would miss it.
  for (const match of text.matchAll(/\]\((\/[^\s)]*)\)/g)) links.add(match[1]!);
  return [...links];
}

export interface ValidateInput {
  reply: string;
  /** The one URL the reply is allowed to contain. */
  expectedUrl: string;
  /** The retrieved text the reply had to be built from. */
  context: string;
}

export function validateReply({ reply, expectedUrl, context }: ValidateInput): ValidationResult {
  const text = (reply || "").trim();
  if (!text) return { ok: false, reason: "empty" };

  const withoutDisclosure = text.replace(DISCLOSURE, "").trim();
  const words = withoutDisclosure.split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORDS) return { ok: false, reason: "too_short", detail: `${words} palabras` };
  if (words > MAX_WORDS) return { ok: false, reason: "too_long", detail: `${words} palabras` };

  if (!text.includes(DISCLOSURE)) return { ok: false, reason: "missing_disclosure" };

  // Markdown headings read as shouting in a comment thread and are a reliable "written by a bot" tell.
  if (/^#{1,6}\s/m.test(text)) return { ok: false, reason: "markdown_heading" };

  const links = extractLinks(text);
  if (!links.length) return { ok: false, reason: "no_link" };
  if (links.length > 1) return { ok: false, reason: "multiple_links", detail: links.join(" ") };
  if (links[0] !== expectedUrl) return { ok: false, reason: "wrong_link", detail: links[0] };

  const normalised = strip(text);
  const banned = BANNED_PHRASES.find((phrase) => normalised.includes(strip(phrase)));
  if (banned) return { ok: false, reason: "banned_phrase", detail: banned };

  // The URL itself is full of digits-free text, but a path like /decreto-50-026 would contribute
  // numbers the context may not have. Check the prose only.
  const prose = text.split(expectedUrl).join(" ");
  const invented = inventedNumbers(prose, context);
  if (invented.length) return { ok: false, reason: "invented_number", detail: invented.join(", ") };

  return { ok: true };
}

/** A short instruction appended to the retry prompt, naming what went wrong the first time. */
export function retryHint(result: ValidationResult): string {
  switch (result.reason) {
    case "invented_number":
      return `El intento anterior usó números que NO están en el contexto (${result.detail}). Reescribilo sin esos números: o los sacás, o reformulás la frase sin cifra.`;
    case "multiple_links":
    case "wrong_link":
      return "El intento anterior tenía un enlace de más o el enlace equivocado. Un solo enlace, exactamente el indicado, al final.";
    case "too_long":
      return `El intento anterior fue demasiado largo (${result.detail}). Recortalo.`;
    case "too_short":
      return `El intento anterior fue demasiado corto (${result.detail}). Contestá la pregunta con más sustancia, sin agregar datos nuevos.`;
    case "missing_disclosure":
      return `Faltó la línea final obligatoria. Terminá exactamente con:\n${DISCLOSURE}`;
    case "banned_phrase":
      return `Sacá la muletilla "${result.detail}" y empezá directamente por la respuesta.`;
    case "markdown_heading":
      return "Sin títulos ni encabezados. Texto corrido.";
    default:
      return "Reescribí el comentario respetando todas las reglas.";
  }
}
