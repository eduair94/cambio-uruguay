// De dónde salen las preguntas: el autocompletado de Google con locale uruguayo.
//
// Es la única fuente de demanda gratuita que ve lo que el sitio NO captura. Search Console sólo
// muestra consultas donde el sitio ya aparece; el autocompletado muestra lo que la gente tipea.
//
// LO QUE ESTE DATO NO ES: un volumen. El endpoint devuelve sugerencias ordenadas por frecuencia
// relativa, sin ninguna cifra. La posición en la lista es un proxy del orden, y tratarla como
// impresiones sería inventar el número más importante de la cola. Por eso `rank` viaja como rank y
// el scoring lo usa como tal.
import axios from "axios";

const SUGGEST_URL = "https://suggestqueries.google.com/complete/search";

/** Prefijos que producen preguntas de situación, que son las que sobreviven a un AI Overview. */
export const QUESTION_PREFIXES = [
  "cuanto",
  "cuando",
  "como",
  "que pasa si",
  "me corresponde",
  "puedo",
  "cuantos dias",
  "quien paga",
] as const;

export interface Suggestion {
  query: string;
  /** 0 = la primera sugerencia. Proxy de frecuencia relativa, NO un volumen. */
  rank: number;
  seed: string;
}

/**
 * Sugerencias para una semilla, con locale uruguayo.
 *
 * Nunca lanza: una semilla que falla es una semilla menos, no una corrida perdida. El endpoint no
 * pide clave pero sí es sensible al ritmo, así que el llamador espacia las llamadas.
 */
export async function suggest(seed: string, timeoutMs = 8000): Promise<Suggestion[]> {
  try {
    const res = await axios.get(SUGGEST_URL, {
      params: { client: "firefox", hl: "es", gl: "uy", q: seed },
      timeout: timeoutMs,
      headers: { "user-agent": "Mozilla/5.0 (compatible; cambio-uruguay/1.0)" },
      responseType: "json",
    });
    const list: unknown = Array.isArray(res.data) ? res.data[1] : null;
    if (!Array.isArray(list)) return [];
    return list
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      // Espacios internos normalizados además del trim: la lista real trajo "aguinaldo" dos veces,
      // que como cadenas eran distintas y como consulta son la misma.
      .map((query, rank) => ({ query: query.trim().replace(/\s+/g, " ").toLowerCase(), rank, seed }));
  } catch {
    return [];
  }
}

/** `ms` de pausa. El endpoint es gratis y sin clave; el respeto por el ritmo es lo que lo mantiene así. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cosecha todas las semillas, de a una y espaciadas, deduplicando por consulta.
 *
 * Se queda con el MEJOR rank de cada consulta: si "me corresponde aguinaldo" aparece primera desde
 * una semilla y sexta desde otra, la que manda es la primera.
 */
export async function harvest(seeds: readonly string[], gapMs = 350): Promise<Suggestion[]> {
  const best = new Map<string, Suggestion>();
  for (const seed of seeds) {
    for (const s of await suggest(seed)) {
      const prev = best.get(s.query);
      if (!prev || s.rank < prev.rank) best.set(s.query, s);
    }
    await sleep(gapMs);
  }
  return [...best.values()].sort((a, b) => a.rank - b.rank || a.query.localeCompare(b.query, "es"));
}

/**
 * Las semillas: cada palabra de cada temática, sola, con "uruguay", y cruzada con cada prefijo.
 *
 * Las TRES formas están porque el autocompletado completa un PREFIJO, no busca por tema, y cada
 * forma trae cosas distintas — medido, no supuesto:
 *
 *   * la palabra sola ("licencia por") es la que más trae y la que trajo lo mejor: siete de ocho
 *     sugerencias uruguayas, incluida "licencia por duelo uruguay", que fue una de las dos páginas
 *     que se escribieron a mano;
 *   * la palabra + "uruguay" devuelve poquísimo (una sola sugerencia para "cuanto aguinaldo
 *     uruguay") porque exige que la consulta EMPIECE así, pero lo que devuelve es siempre local;
 *   * el prefijo de pregunta ("cuanto aguinaldo") trae la forma de duda que sobrevive a un AI
 *     Overview, aunque mayormente de otros países — para eso está el filtro `isUruguayan`.
 *
 * Se arma desde `SITE_TOPICS` y no de una lista aparte para que una temática nueva entre sola en
 * la cosecha, en vez de quedar esperando a que alguien se acuerde de agregarla en dos lugares.
 */
export function buildSeeds(topics: ReadonlyArray<{ key: string; scope: string }>, perTopic = 4): string[] {
  const seeds: string[] = [];
  for (const topic of topics) {
    const words = topic.scope
      .split(/[,;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 3)
      .slice(0, perTopic);
    for (const word of words) {
      seeds.push(word);
      seeds.push(`${word} uruguay`);
      for (const prefix of QUESTION_PREFIXES) seeds.push(`${prefix} ${word}`);
    }
  }
  return [...new Set(seeds)];
}
