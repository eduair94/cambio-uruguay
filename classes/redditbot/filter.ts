// The cheap gate: is this thread even worth spending an embedding and a judge call on?
//
// Everything here is string work over data we already fetched. It runs before the retriever because
// `/new` across seven subreddits is mostly football, politics and rent-a-flat posts, and paying two
// model calls to discover that would cost more than the whole rest of the pipeline.
//
// The lexicon is deliberately about MONEY, not about the site. A thread that mentions "dólar" is a
// candidate; whether the site actually answers it is the retriever's decision, not this one's. A
// filter that tried to be clever here would pre-empt the retriever with worse information.

import type { RedditPostRaw } from "../reddit";
import type { BotConfig } from "./config";

// The topic lexicon, split by how much a single hit is worth.
//
// A flat list over-admits badly, and the cost is not cosmetic: every admitted thread spends an
// embedding and possibly a Claude call, both metered per day. Measured on a real run over 334
// threads, the flat version admitted four, and all four were junk — "Cómo hacen para no comer cosas
// dulces?" (matched *peso*, from "bajar de peso"), "Red inestable" (matched *anda*, from "no anda"),
// a dating question and a where-should-I-emigrate one. The retrieval gate caught all four, which is
// what it is for, but they should never have cost anything.
//
// So: a STRONG term is one that essentially only appears in a money conversation, and one is
// enough. A WEAK term is an ordinary Spanish word that happens to also be financial, and two are
// needed — "peso" alone is a diet, "peso" plus "cotizacion" is the exchange rate.

/** One hit is enough: these words rarely show up in a conversation about anything else. */
const STRONG_TERMS = [
  // divisas y cambio
  "dolar", "dolares", "cotizacion", "arbitraje", "casa de cambio", "brou", "bcu", "interbancario",
  // bancos y medios de pago
  "itau", "santander", "scotiabank", "hsbc", "bbva", "prex", "mydinero", "midinero", "creditel",
  "astropay", "paypal", "binance", "takenos", "plazo fijo", "debito", "tarjeta", "tarjetas",
  // aduana e importacion
  "aduana", "importar", "importacion", "courier", "franquicia", "dua", "despachante",
  "aliexpress", "shein", "temu", "encomienda", "arancel", "iva",
  "dhl", "fedex", "aeropost", "punto mio", "puntomio", "miami express",
  "mercado libre", "mercadolibre", "mercadopago", "mercado pago", "abitab", "redpagos",
  // impuestos y trabajo
  "dgi", "bps", "irpf", "monotributo", "facturar", "empresa unipersonal", "aguinaldo", "fonasa",
  "afap", "jubilacion", "trabajo en negro", "sueldo liquido", "salario nominal",
  // credito, deuda y vivienda
  "prestamo", "prestamos", "clearing", "usura", "financiacion", "hipoteca", "inmobiliaria",
  // inversion
  "invertir", "inversion", "criptomoneda", "obligaciones negociables",
  // derechos
  "defensa al consumidor", "garantia legal",
  // costo de vida
  "costo de vida", "canasta basica", "combustible",
];

/**
 * Two hits needed: each of these is an ordinary word that is only sometimes about money.
 *
 * `peso`, `anda`, `cuenta`, `real`, `fondo` and `letras` are the ones that actually caused the
 * false positives; the rest are here because they share the same property, not because they have
 * misfired yet.
 */
const WEAK_TERMS = [
  "peso", "pesos", "euro", "euros", "real", "reales", "cambio", "cambiar", "blue",
  "banco", "bancos", "oca", "pronto", "wise", "cuenta", "transferencia", "credito",
  "correo", "amazon", "ebay", "paquete", "ups",
  "factura", "sueldo", "salario", "liquido", "nominal", "licencia", "recibo",
  "deuda", "deudas", "tea", "cuotas", "alquiler", "alquilar", "garantia", "anda", "contaduria",
  "bonos", "letras", "fondo", "acciones", "cripto", "bitcoin", "rendimiento", "interes",
  "ahorro", "ahorrar", "plata", "guita",
  "estafa", "estafaron", "reclamo", "devolucion",
  "canasta", "supermercado", "boleto", "ute", "ose", "antel",
];

/** Both lists, for the callers that only want to know whether a word is in the vocabulary. */
const TOPIC_TERMS = [...STRONG_TERMS, ...WEAK_TERMS];

// Question shape. A statement about the dollar is a conversation; a question is an opening.
//
// Detected in three ways, in decreasing order of certainty, because the obvious approach — a list
// of interrogative words matched anywhere in the text — does not survive contact with real Spanish.
// "¿se puede?" is an ask; "ya no se puede vivir" is a complaint, and a substring match cannot tell
// them apart. Same for "cuando", "donde", "cual" and "porque", every one of which appears in
// ordinary declarative sentences several times a paragraph.

/** Phrases that are an ask no matter where they appear. Each one is specific enough to stand alone. */
const ASK_PHRASES = [
  "alguien sabe", "alguien tiene", "alguien uso", "alguien probo", "alguien me puede",
  "alguna idea", "alguna recomendacion", "alguna sugerencia", "algun consejo",
  "me recomiendan", "que me recomiendan", "me conviene", "conviene mas", "vale la pena",
  "necesito saber", "quisiera saber", "me gustaria saber", "no entiendo como", "no se como",
  "es cierto que", "se sabe si", "hay alguna forma", "hay alguna manera", "hay algun lugar",
];

/**
 * Interrogatives, but only at the START of a sentence — where Spanish actually puts them when it
 * is asking. "Cuánto sale traer una notebook" is a question even without the question mark;
 * "no sé cuánto sale" is not, and the position is what separates them.
 *
 * Accent-free forms only: the text reaching this regex has already been through {@link strip}.
 */
const SENTENCE_INITIAL_INTERROGATIVE =
  /^(que|cuanto|cuanta|cuantos|cuantas|como|donde|cuando|cual|cuales|quien|quienes|por que|conviene|sirve|existe|se puede|puedo|hay algun|hay alguna)\b/;

/** A thread whose title or body is literally labelled as a question. */
const LABELLED_QUESTION = /^(duda|consulta|pregunta|ayuda)\s*[:\-—]/;

/**
 * Lowercase and accent-free, but line breaks and sentence punctuation preserved.
 *
 * {@link strip} collapses every run of whitespace into a single space, which is right for the topic
 * lexicon and wrong here: the sentence-initial test needs to know where sentences begin, and after
 * a collapse the only boundary left is the very start of the post.
 */
const stripKeepLines = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

/** Split into the units a reader would read as separate statements. */
const sentencesOf = (text: string): string[] =>
  stripKeepLines(text)
    .split(/[.!?\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

function looksLikeAQuestion(title: string, body: string): boolean {
  const whole = `${title} ${body}`;
  if (whole.includes("?") || whole.includes("¿")) return true;

  const flat = strip(whole);
  if (ASK_PHRASES.some((phrase) => flat.includes(phrase))) return true;

  for (const sentence of [...sentencesOf(title), ...sentencesOf(body)]) {
    if (LABELLED_QUESTION.test(sentence)) return true;
    if (SENTENCE_INITIAL_INTERROGATIVE.test(sentence)) return true;
  }
  return false;
}

/** Flairs that mean "do not reply here" no matter what the text says. */
const BLOCKED_FLAIRS = ["meme", "humor", "shitpost", "politica", "política", "noticia", "news", "aviso", "anuncio"];

/**
 * Topics the bot must stay out of even when the site has a page nearby.
 *
 * These are not "off topic" — several of them are adjacent to pages the site really does have. They
 * are threads where a confident automated answer is a liability: someone describing their own legal
 * case, their health, or an active fraud they are the victim of needs a person, and a bot arriving
 * with a link reads as (and is) opportunism.
 */
const SENSITIVE_TERMS = [
  "me estafaron ayer", "estoy en juicio", "abogado urgente", "denuncia penal", "violencia",
  "suicid", "depresion", "cancer", "enfermedad terminal", "divorcio", "custodia", "herencia",
  "despido injustificado", "acoso", "amenaza",
];

export const strip = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export type SkipReason =
  | "too_new"
  | "too_old"
  | "locked"
  | "stickied"
  | "nsfw"
  | "deleted_author"
  | "blocked_flair"
  | "too_short"
  | "already_linked"
  | "off_topic"
  | "not_a_question"
  | "sensitive";

export interface FilterVerdict {
  ok: boolean;
  reason?: SkipReason;
  /** The topic terms that matched, for the ledger and for debugging a miss. */
  matched: string[];
}

/** Title + body, normalised once and reused by every check. */
export const postText = (post: RedditPostRaw): string => strip(`${post.title} ${post.selftext}`);

/**
 * Everything a thread must clear before it costs an API call.
 *
 * `now` is injected so the age window is testable without mocking the clock.
 */
export function screenPost(post: RedditPostRaw, cfg: BotConfig, now: number = Date.now()): FilterVerdict {
  const ageMinutes = (now - post.createdUtc * 1000) / 60000;
  // Waiting a few minutes is not politeness theatre: it lets the mods remove what they were going to
  // remove, and lets OP finish editing. Answering at minute two also reads, correctly, as automated.
  if (ageMinutes < cfg.minAgeMinutes) return { ok: false, reason: "too_new", matched: [] };
  if (ageMinutes > cfg.maxAgeHours * 60) return { ok: false, reason: "too_old", matched: [] };

  if (post.locked) return { ok: false, reason: "locked", matched: [] };
  if (post.stickied) return { ok: false, reason: "stickied", matched: [] };
  if (post.over18) return { ok: false, reason: "nsfw", matched: [] };
  if (!post.author || post.author === "[deleted]" || post.author === "AutoModerator") {
    return { ok: false, reason: "deleted_author", matched: [] };
  }

  const flair = strip(post.linkFlair || "");
  if (flair && BLOCKED_FLAIRS.some((f) => flair.includes(strip(f)))) {
    return { ok: false, reason: "blocked_flair", matched: [] };
  }

  const text = postText(post);
  // A three-word title carries too little for the retriever to be trusted and too little for an
  // answer to be useful — UNLESS the post is a picture. "Me llegó esto de DHL, es normal?" over a
  // photo of the charge is a real question with a short title, and those are among the threads the
  // site answers best. The topic and question gates below still apply: the image lowers the length
  // bar, it does not remove the requirement that this be a money question at all.
  const minLength = post.imageUrl ? 20 : 40;
  if (text.length < minLength) return { ok: false, reason: "too_short", matched: [] };

  // Somebody already linked us. A second link from a bot is spam even when the first was organic.
  if (text.includes("cambio-uruguay") || text.includes("cambio uruguay .com")) {
    return { ok: false, reason: "already_linked", matched: [] };
  }

  if (SENSITIVE_TERMS.some((term) => text.includes(term))) {
    return { ok: false, reason: "sensitive", matched: [] };
  }

  // Multi-word terms are substring matches; single words need boundaries so "iva" does not match
  // "privado" and "tea" does not match "tarea".
  const hits = (terms: readonly string[]): string[] =>
    terms.filter((term) =>
      term.includes(" ") ? text.includes(term) : new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`).test(text)
    );

  const strong = hits(STRONG_TERMS);
  const weak = hits(WEAK_TERMS);
  const matched = [...strong, ...weak];
  // One unambiguous term, or two ambiguous ones. See the note on the lexicon.
  if (!strong.length && weak.length < 2) return { ok: false, reason: "off_topic", matched };

  if (!looksLikeAQuestion(post.title, post.selftext)) return { ok: false, reason: "not_a_question", matched };

  return { ok: true, matched };
}

/** The query handed to the retriever: title first (it carries the intent), then the body, capped. */
export function retrievalQuery(post: RedditPostRaw): string {
  const body = post.selftext.replace(/\s+/g, " ").trim();
  return `${post.title.trim()}\n${body}`.slice(0, 1200).trim();
}
