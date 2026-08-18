// El filtro mecánico del comentario común.
//
// Mismo reparto de trabajo que en el bot de respuestas: el prompt PIDE, esto EXIGE. La diferencia
// es qué se exige. Allá el enlace es obligatorio y el largo mínimo alto, porque una respuesta corta
// con un link es publicidad. Acá es al revés — cualquier enlace convierte el comentario en lo que
// dijimos que no era, y el largo tiene TECHO, porque el párrafo bien armado es lo que delata.

import { BANNED_PHRASES, EMOJI, TUTEO, extractLinks, inventedNumbers, strip } from "../validate";

export type SocialRejectReason =
  | "empty"
  | "too_long"
  | "too_short"
  | "has_link"
  | "mentions_site"
  | "banned_phrase"
  | "tuteo"
  | "emoji"
  | "markdown"
  | "too_many_sentences"
  | "invented_number"
  | "self_disclosure";

export interface SocialValidation {
  ok: boolean;
  reason?: SocialRejectReason;
  detail?: string;
}

const MAX_CHARS = 240;
const MIN_CHARS = 15;
const MAX_SENTENCES = 2;

/** Decir "soy un bot" en un chiste no es transparencia, es un comentario raro. La bio de la cuenta es el lugar. */
const SELF_DISCLOSURE = ["soy un bot", "soy un robot", "como ia", "soy una ia", "inteligencia artificial", "modelo de lenguaje"];

export function validateSocial(comment: string, postText: string): SocialValidation {
  const text = comment.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length < MIN_CHARS) return { ok: false, reason: "too_short", detail: `${text.length} caracteres` };
  if (text.length > MAX_CHARS) return { ok: false, reason: "too_long", detail: `${text.length} caracteres` };

  // Cero enlaces. No "un enlace al sitio": cero. El karma que se gana con un link no es karma, es
  // una promoción con otro nombre, y es lo que hace que el sub mire la cuenta con lupa.
  const links = extractLinks(text);
  if (links.length) return { ok: false, reason: "has_link", detail: links.join(", ") };

  const flat = strip(text);
  if (flat.includes("cambio-uruguay") || flat.includes("cambio uruguay")) return { ok: false, reason: "mentions_site" };

  const banned = BANNED_PHRASES.find((phrase) => flat.includes(phrase));
  if (banned) return { ok: false, reason: "banned_phrase", detail: banned };

  const tuteo = TUTEO.find((form) => new RegExp(`(^|[^a-z])${form}([^a-z]|$)`).test(flat));
  if (tuteo) return { ok: false, reason: "tuteo", detail: tuteo };

  if (EMOJI.test(text)) return { ok: false, reason: "emoji" };
  if (/^\s*[#>*-]\s|\*\*|^\s*\d+\.\s/m.test(text)) return { ok: false, reason: "markdown" };

  const disclosure = SELF_DISCLOSURE.find((phrase) => flat.includes(phrase));
  if (disclosure) return { ok: false, reason: "self_disclosure", detail: disclosure };

  const sentences = text.split(/[.!?…]+\s/).filter((s) => s.trim().length > 1);
  if (sentences.length > MAX_SENTENCES) {
    return { ok: false, reason: "too_many_sentences", detail: `${sentences.length} oraciones` };
  }

  // Una cifra que no está en el post es una cifra inventada, y en un comentario casual nadie la va a
  // verificar — que es justamente por qué no puede estar. Un chiste no necesita datos.
  const invented = inventedNumbers(text, postText);
  if (invented.length) return { ok: false, reason: "invented_number", detail: invented.join(", ") };

  return { ok: true };
}

/** Qué decirle al modelo para el segundo intento. */
export function socialRetryHint(result: SocialValidation): string {
  switch (result.reason) {
    case "too_long":
      return "Quedó largo. Una oración, dos como mucho, menos de 220 caracteres.";
    case "too_short":
      return "Quedó demasiado corto para decir algo. Una oración completa que responda a algo concreto del hilo.";
    case "has_link":
      return "Sacá el enlace. Este comentario no lleva ningún link, ninguno.";
    case "mentions_site":
      return "No menciones ningún sitio web ni ninguna marca.";
    case "banned_phrase":
      return `Sacá la muletilla "${result.detail}": es de las frases que delatan un comentario automático.`;
    case "tuteo":
      return `Escribiste "${result.detail}" en tuteo. Va de vos: tenés, podés, fijate, mirá.`;
    case "emoji":
      return "Sin emojis.";
    case "markdown":
      return "Sin viñetas, sin negritas y sin numeración: texto corrido.";
    case "too_many_sentences":
      return "Demasiadas oraciones. Dejá la idea principal y borrá el resto.";
    case "invented_number":
      return `Sacá las cifras (${result.detail}): no están en lo que escribió la persona y no las podés verificar.`;
    case "self_disclosure":
      return "No digas que sos un bot ni una IA.";
    default:
      return "Escribí un comentario común, corto y sobre algo concreto del hilo.";
  }
}
