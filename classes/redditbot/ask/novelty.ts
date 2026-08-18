// ¿Esta pregunta ya se hizo?
//
// Es la parte del trabajo que no puede hacer el modelo solo. Un modelo al que le pedís "una
// pregunta original para r/AskUruguayan" escribe con enorme confianza la misma pregunta que el sub
// contestó tres veces este año, porque es la pregunta obvia — la obviedad es precisamente por qué
// ya se hizo. La única forma de saberlo es mirar lo que hay publicado.
//
// Todo acá es puro y sin red: entra un título candidato y la lista de títulos que ya existen, sale
// qué tan parecido es al más parecido. La medida es deliberadamente barata (nada de embeddings:
// la cuota diaria de embeddings la necesita el índice del sitio) y deliberadamente doble, porque
// las dos formas de repetir son distintas: mismas palabras en otro orden, y otras palabras para la
// misma idea. Jaccard sobre palabras de contenido agarra la primera; los trigramas de caracteres
// agarran la segunda cuando comparten la raíz ("mudarme"/"mudanza").

const STOPWORDS = new Set([
  "que", "de", "la", "el", "en", "y", "a", "los", "las", "un", "una", "por", "con", "para", "es",
  "se", "no", "su", "al", "lo", "como", "mas", "pero", "sus", "le", "ya", "o", "este", "si", "me",
  "sin", "sobre", "tambien", "hasta", "hay", "donde", "quien", "desde", "todo", "nos", "durante",
  "uno", "ni", "contra", "ese", "eso", "ante", "ellos", "e", "esto", "mi", "antes", "algunos",
  "unos", "yo", "otro", "otras", "otra", "tanto", "esa", "estos", "mucho", "quienes", "nada",
  "muchos", "cual", "poco", "ella", "estar", "estas", "algunas", "algo", "nosotros", "mi", "te",
  "ti", "tu", "ellas", "nosotras", "vosotros", "vosotras", "os", "mio", "tuyo", "suyo", "del",
  // Ruido específico de este trabajo: casi todos los títulos del sub las traen.
  "uruguay", "uruguayos", "uruguayas", "uruguaya", "uruguayo", "gente", "alguien", "hacen", "haces",
  "opiniones", "pregunta", "consulta", "duda", "ayuda", "recomendaciones",
]);

export const normalise = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function contentWords(text: string): string[] {
  return normalise(text)
    .split(" ")
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const word of setA) if (setB.has(word)) shared++;
  return shared / (setA.size + setB.size - shared);
}

function trigrams(text: string): Set<string> {
  const flat = normalise(text).replace(/\s/g, "");
  const out = new Set<string>();
  for (let i = 0; i + 3 <= flat.length; i++) out.add(flat.slice(i, i + 3));
  return out;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  return (2 * shared) / (a.size + b.size);
}

/** Cuán parecidos son dos títulos, 0 a 1. El máximo de las dos medidas: repetir de una sola forma ya es repetir. */
export function similarity(a: string, b: string): number {
  return Math.max(jaccard(contentWords(a), contentWords(b)), dice(trigrams(a), trigrams(b)));
}

export interface NoveltyResult {
  /** El parecido con el título más parecido que existe. */
  score: number;
  /** Los títulos más parecidos, para que el modelo vea contra qué está compitiendo. */
  nearest: Array<{ title: string; score: number }>;
  fresh: boolean;
}

/**
 * 0,45 no es un número redondo elegido a ojo: por debajo quedan los títulos que comparten tema
 * ("mudarse", "trabajo") y por encima los que comparten pregunta. Compartir tema es inevitable en
 * un sub de un país chico; compartir pregunta es repetirse.
 */
export const NOVELTY_LIMIT = 0.45;

export function checkNovelty(candidate: string, existing: readonly string[], limit = NOVELTY_LIMIT): NoveltyResult {
  const scored = existing
    .map((title) => ({ title, score: similarity(candidate, title) }))
    .sort((a, b) => b.score - a.score);
  const score = scored[0]?.score ?? 0;
  return { score, nearest: scored.slice(0, 5), fresh: score < limit };
}
