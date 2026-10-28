// Texto de un hilo, listo para filtrar y para mostrar.
//
// `/new` sin `raw_json=1` devuelve el título y el cuerpo con las entidades de HTML escapadas
// ("Autos &amp; motos"). El cliente compartido (`classes/reddit.ts`) no las decodifica, y cambiarlo
// cambiaría lo que leen el bot y los cosechadores; así que se decodifica acá, una vez, antes de
// filtrar y antes de guardar.
import { strip } from "../redditbot/filter";

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Las entidades que Reddit escapa, y las numéricas. Lo que no reconoce queda como estaba. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

/**
 * Un extracto para la card: sin markdown de enlaces ni espacios repetidos, cortado en palabra.
 *
 * `max` en caracteres. Un cuerpo vacío (los hilos que son sólo título o sólo imagen) da "".
 */
export function excerptOf(text: string, max = 600): string {
  const flat = decodeEntities(text)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_>#`~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

/** Palabras que casi sólo aparecen en inglés. Contar varias evita que un "the" suelto decida. */
const EN_WORDS = [
  "the", "and", "is", "are", "what", "how", "where", "can", "should", "with", "for", "my", "i'm",
  "you", "does", "anyone", "there", "would", "this", "from", "have",
];
const ES_WORDS = [
  "el", "la", "los", "las", "que", "como", "donde", "para", "con", "por", "una", "un", "alguien",
  "es", "hay", "mi", "se", "del", "lo", "pero",
];

/** "en" o "es". Ante la duda, español: es el idioma de todos los subs menos uno. */
export function langOf(text: string): "es" | "en" {
  const words = strip(decodeEntities(text)).split(/[^a-z']+/).filter(Boolean);
  if (words.length < 4) return "es";
  const en = new Set(EN_WORDS);
  const es = new Set(ES_WORDS);
  let enHits = 0;
  let esHits = 0;
  for (const w of words) {
    if (en.has(w)) enHits++;
    else if (es.has(w)) esHits++;
  }
  return enHits >= 3 && enHits > esHits * 1.5 ? "en" : "es";
}
