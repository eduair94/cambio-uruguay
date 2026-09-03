// Arma la cola: cosecha preguntas, descarta lo que no es nuestro, mide si ya lo cubrimos, mira el
// SERP de las mejores y ordena.
//
// El orden de las etapas es el que ahorra plata y tiempo: primero el filtro de alcance (gratis),
// después la cobertura contra el índice propio (gratis, arma léxica del recuperador), y recién al
// final el SERP, que es la parte cara y sólo se pide para los candidatos que sobrevivieron.
import { SITE_TOPICS } from "../gaps/topics";
import { loadIndex } from "../rag/store";
import { SiteRetriever } from "../rag/retrieve";
import { buildQueue, isUruguayan, type Candidate, type ScoredCandidate } from "./classify";
import { coverageOf } from "./coverage";
import { buildSeeds, harvest, type Suggestion } from "./harvest";
import { probeSerp } from "./serp";

/** Cuántos candidatos llegan a la etapa del SERP. Es la única parte que cuesta. */
const SERP_BUDGET = 25;
/** Pausa entre consultas al SERP: el servidor es propio pero Google del otro lado no. */
const SERP_GAP_MS = 1500;

export interface DemandQueue {
  key: string;
  asOf: string;
  /** Cuántas sugerencias se cosecharon antes de filtrar. */
  harvested: number;
  /** Cuántas de esas son del mercado uruguayo. Es el filtro que más descarta: ver `isUruguayan`. */
  local: number;
  /** Cuántas quedaron además dentro de las temáticas del sitio. */
  inScope: number;
  /** Cuántas se clasificaron mirando el SERP. */
  probed: number;
  items: ScoredCandidate[];
}

/**
 * A qué temática pertenece una consulta, o null si no es nuestra.
 *
 * Match por palabra del `scope` de cada temática, que es la misma lista que gobierna al bot de
 * Reddit. Deliberadamente literal: un clasificador con modelo acá costaría plata por candidato y
 * decidiría lo mismo, porque las palabras de estas temáticas son muy específicas ("aguinaldo",
 * "clearing", "patente").
 */
export function topicFor(query: string): string | null {
  const q = ` ${query.toLowerCase()} `;
  for (const topic of SITE_TOPICS) {
    const words = topic.scope
      .split(/[,;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 3);
    if (words.some((w) => q.includes(` ${w} `) || q.includes(`${w} `) || q.includes(` ${w}`))) {
      return topic.key;
    }
  }
  return null;
}

export interface RefreshOptions {
  now?: number;
  serpBudget?: number;
  /** Para los tests: saltea la red. */
  skipSerp?: boolean;
}

export async function refreshDemandQueue(options: RefreshOptions = {}): Promise<DemandQueue> {
  const asOf = new Date(options.now ?? Date.now()).toISOString().slice(0, 10);

  const seeds = buildSeeds(SITE_TOPICS);
  // El eco de la semilla se descarta. El autocompletado devuelve la propia semilla como primera
  // sugerencia ("casas de cambio uruguay", "transferencia uruguay", "letras uruguay"), y como
  // llega con rango 0 encabezaba la cola sin aportar una sola palabra que no hubiéramos escrito
  // nosotros. Lo que sirve de esta fuente es lo que la gente AGREGA a la semilla.
  const seedSet = new Set(seeds.map((s) => s.trim().toLowerCase()));
  const suggestions: Suggestion[] = (await harvest(seeds)).filter((s) => !seedSet.has(s.query));

  // Dos etapas de alcance, gratis y antes que nada. Primero el país: el `gl=uy` del autocompletado
  // no filtra nada (contesta lo mismo con y sin él) y sin este paso la cola se llena de demanda
  // mexicana y española que este sitio no puede rankear. Después la temática.
  const local = suggestions.filter((s) => isUruguayan(s.query));
  const inScope = local
    .map((s) => ({ s, topic: topicFor(s.query) }))
    .filter((x) => x.topic !== null);

  // Cobertura contra el índice propio. Arma léxica solamente (vector null): alcanza para saber si
  // ya hay una página del tema y no gasta una sola llamada de embeddings.
  //
  // El recuperador ENCUENTRA la página, que es lo difícil; cuánto se parece lo mide `coverageOf`
  // sobre el título y la ruta. El puntaje que devuelve no sirve para eso y creerle costó una
  // corrida entera: ver la cabecera de coverage.ts.
  const chunks = await loadIndex();
  const retriever = chunks.length ? new SiteRetriever(chunks) : null;

  const candidates: Candidate[] = inScope.map(({ s, topic }) => {
    const hits = retriever ? retriever.rankWithVector(s.query, null, 1) : [];
    const best = hits[0] ?? null;
    const coverage = coverageOf(s.query, best);
    return { query: s.query, topic, rank: s.rank, coverage, bestPath: best?.path ?? null };
  });

  // Los mejores por hueco y frecuencia van al SERP, que es la etapa cara. Los que no entran en el
  // presupuesto igual llegan a la cola, sin clasificar y con menos puntaje: ver `scoreCandidate`.
  const promise = (c: Candidate) => (1 - c.coverage) * Math.max(0, 10 - c.rank);
  const shortlist = candidates
    .slice()
    .sort((a, b) => promise(b) - promise(a) || a.query.localeCompare(b.query, "es"))
    .slice(0, options.serpBudget ?? SERP_BUDGET);

  let probed = 0;
  if (!options.skipSerp) {
    for (const c of shortlist) {
      const probe = await probeSerp(c.query);
      if (probe) {
        c.serp = probe.assessment;
        probed++;
      }
      await new Promise((r) => setTimeout(r, SERP_GAP_MS));
    }
  }

  return {
    key: "demand_queue",
    asOf,
    harvested: suggestions.length,
    local: local.length,
    inScope: inScope.length,
    probed,
    items: buildQueue(candidates),
  };
}
