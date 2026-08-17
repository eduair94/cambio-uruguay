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
  | "markdown_heading"
  | "tuteo"
  | "bullet_list"
  | "emoji";

export interface ValidationResult {
  ok: boolean;
  reason?: RejectReason;
  /** For `invented_number`: the offending tokens, so the retry prompt can name them. */
  detail?: string;
}

const MIN_WORDS = 45;
const MAX_WORDS = 170;

/**
 * Filler that marks a comment as machine-written on sight.
 *
 * Not a style preference. On a subreddit, a comment that opens by praising the question and closes
 * by wishing you luck reads as copy-paste promotion, and gets removed as such — the moderators are
 * pattern-matching on exactly these strings, and so is every reader who has seen a marketing bot.
 */
const BANNED_PHRASES = [
  // saludos y cierres de cortesía
  "espero que estes bien",
  "espero que esto te ayude",
  "espero que te sirva",
  "espero haberte ayudado",
  "saludos cordiales",
  "mucha suerte con",
  "estoy aqui para ayudarte",
  "no dudes en consultar",
  "no dudes en preguntar",
  // elogiar la pregunta
  "excelente pregunta",
  "buena pregunta",
  "gran pregunta",
  "excelente consulta",
  // muletillas de manual
  "es importante destacar",
  "es importante mencionar",
  "es importante tener en cuenta",
  "es fundamental tener en cuenta",
  "cabe destacar",
  "cabe mencionar",
  "cabe senalar",
  "vale la pena aclarar",
  "vale aclarar que es importante",
  "en resumen,",
  "en definitiva,",
  "en conclusion,",
  "por otro lado, es",
  "en primer lugar,",
  "dicho esto,",
  // autodelación
  "como modelo de lenguaje",
  "soy una inteligencia artificial",
  "como asistente",
  // derivación vacía
  "te recomiendo consultar con un profesional",
  "consulta con un especialista",
];

/**
 * Tuteo. The single most reliable tell that the text was not written by someone here.
 *
 * Uruguay voseas: *tenés*, *podés*, *fijate*, *mirá*. A model defaulting to neutral Spanish writes
 * *tienes*, *puedes*, *ten en cuenta* — grammatical, understood everywhere, and instantly foreign
 * on r/uruguay. It is also the rare style rule that can be checked mechanically rather than judged,
 * which is why it is a hard gate and not a line in the prompt.
 *
 * Anchored on word boundaries, and only on forms with no rioplatense collision: `puede` and `tiene`
 * (third person) are perfectly normal and are NOT listed.
 */
const TUTEO = [
  "tienes",
  "puedes",
  "debes",
  "quieres",
  "necesitas",
  "sabes que",
  "haces",
  "vas a poder ver tu",
  "ten en cuenta",
  "ten presente",
  "tu puedes",
  "si tu",
  "contigo",
  "tuyo propio",
];

/** Emoji, symbol and pictograph ranges. A money answer with a rocket in it is an ad. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F02F}]/u;

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
  /**
   * The original post's own text.
   *
   * Its numbers are allowed in the reply, and this is not a loophole — it is the difference between
   * a comment and a leaflet. A live test made the point: asked about a US$ 19,15 AliExpress order
   * billed at 26, the model wrote "con 19,15 dólares ya estás pagando el mínimo… y ahí te da cerca
   * de los 26 que te piden". Every figure it reasoned WITH came from our pages; 19,15 and 26 came
   * from the person asking. Refusing those would reject the one reply that proved it had read the
   * thread, and would push the model toward the generic phrasing this whole gate exists to prevent.
   *
   * Echoing someone's own number back invents nothing: they wrote it.
   */
  postText?: string;
}

export function validateReply({ reply, expectedUrl, context, postText = "" }: ValidateInput): ValidationResult {
  const text = (reply || "").trim();
  if (!text) return { ok: false, reason: "empty" };

  const withoutDisclosure = text.replace(DISCLOSURE, "").trim();
  const words = withoutDisclosure.split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORDS) return { ok: false, reason: "too_short", detail: `${words} palabras` };
  if (words > MAX_WORDS) return { ok: false, reason: "too_long", detail: `${words} palabras` };

  if (!text.includes(DISCLOSURE)) return { ok: false, reason: "missing_disclosure" };

  // Markdown headings read as shouting in a comment thread and are a reliable "written by a bot" tell.
  if (/^#{1,6}\s/m.test(text)) return { ok: false, reason: "markdown_heading" };

  // A bulleted answer is a document, not a comment. People write comments in paragraphs.
  const body = text.replace(DISCLOSURE, "");
  if (/^\s*([-*•]\s+|\d+[.)]\s+)/m.test(body)) return { ok: false, reason: "bullet_list" };

  if (EMOJI.test(body)) return { ok: false, reason: "emoji" };

  const links = extractLinks(text);
  if (!links.length) return { ok: false, reason: "no_link" };
  if (links.length > 1) return { ok: false, reason: "multiple_links", detail: links.join(" ") };
  if (links[0] !== expectedUrl) return { ok: false, reason: "wrong_link", detail: links[0] };

  const normalised = strip(text);
  const banned = BANNED_PHRASES.find((phrase) => normalised.includes(strip(phrase)));
  if (banned) return { ok: false, reason: "banned_phrase", detail: banned };

  const tuteo = TUTEO.find((form) => new RegExp(`(^|[^a-z0-9])${strip(form)}([^a-z0-9]|$)`).test(normalised));
  if (tuteo) return { ok: false, reason: "tuteo", detail: tuteo };

  // The URL itself is full of digits-free text, but a path like /decreto-50-026 would contribute
  // numbers the context may not have. Check the prose only.
  const prose = text.split(expectedUrl).join(" ");
  const invented = inventedNumbers(prose, `${context}\n${postText}`);
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
    case "tuteo":
      return `Escribiste "${result.detail}", que es tuteo. En Uruguay se vosea: tenés, podés, fijate, mirá. Reescribilo entero en voseo.`;
    case "bullet_list":
      return "Sacá las viñetas y la numeración. Un comentario de Reddit es texto corrido, no un informe.";
    case "emoji":
      return "Sacá los emojis.";
    case "markdown_heading":
      return "Sin títulos ni encabezados. Texto corrido.";
    default:
      return "Reescribí el comentario respetando todas las reglas.";
  }
}
