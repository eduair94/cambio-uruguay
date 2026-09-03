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
import { loadKnownQueries } from "./known";
import { probeSerp } from "./serp";

/** Cuántos candidatos llegan a la etapa del SERP. Es la única parte que cuesta. */
const SERP_BUDGET = 25;
/** Cuántas páginas del sitio se miran para decidir si la consulta ya está cubierta. */
const COVERAGE_HITS = 5;
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
 * Palabras del `scope` que en Uruguay significan otra cosa la mitad de las veces.
 *
 * Cada una necesita una segunda palabra que confirme el tema. Salieron de la cola real del
 * 2026-09-03, que dejó pasar "letras uruguay trueno y rubén rada" (una canción, no un título del
 * tesoro), "uruguay fondos de pantalla" (no un fondo de inversión) y "uruguay cuentas pendientes".
 * No es una lista de palabras prohibidas: es una lista de palabras que solas no alcanzan.
 *
 * LO QUE ESTO NO ARREGLA, y la misma cola lo mostró: "antel cuando se fundo" y "puedo ver antel tv
 * en smart tv" entran igual, porque la palabra SÍ es del tema — lo que no es del tema es la
 * intención. Ese filtro no es de palabras y no se intenta acá: para eso está el SERP, que dice si
 * hay algo que ganar, y la persona que lee la cola.
 */
const AMBIGUOUS_SCOPE_WORDS: Readonly<Record<string, readonly string[]>> = {
  letras: ["tesoro", "bcu", "invertir", "inversion", "inversión", "tasa", "rendimiento", "comprar"],
  fondos: ["inversion", "inversión", "invertir", "afap", "rendimiento", "tasa", "administradora"],
  cuentas: ["banco", "bancaria", "sueldo", "abrir", "caja", "ahorro", "corriente", "comisión", "comision"],
};

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
  const has = (w: string) => q.includes(` ${w} `) || q.includes(`${w} `) || q.includes(` ${w}`);
  for (const topic of SITE_TOPICS) {
    const words = topic.scope
      .split(/[,;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 3);
    for (const word of words) {
      if (!has(word)) continue;
      const needs = AMBIGUOUS_SCOPE_WORDS[word];
      if (needs && !needs.some((extra) => has(extra))) continue;
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

  // Cada etapa se cronometra porque las dos primeras corridas reales tardaron mucho más de lo que
  // decía la cuenta (510 semillas × 350 ms ≈ 3 min) y desde afuera no había forma de saber cuál era
  // la lenta. Un job semanal puede tardar; lo que no puede es tardar sin decir en qué.
  const started = Date.now();
  const stage = (name: string, from: number) =>
    console.log(`[demand] ${name}: ${((Date.now() - from) / 1000).toFixed(1)} s`);

  const seeds = buildSeeds(SITE_TOPICS);
  // El eco de la semilla se descarta. El autocompletado devuelve la propia semilla como primera
  // sugerencia ("casas de cambio uruguay", "transferencia uruguay", "letras uruguay"), y como
  // llega con rango 0 encabezaba la cola sin aportar una sola palabra que no hubiéramos escrito
  // nosotros. Lo que sirve de esta fuente es lo que la gente AGREGA a la semilla.
  const seedSet = new Set(seeds.map((s) => s.trim().toLowerCase()));
  const picked = await harvest(seeds);
  const suggestions: Suggestion[] = picked.suggestions.filter((s) => !seedSet.has(s.query));
  stage(`cosecha de ${picked.attempted}/${seeds.length} semillas (${picked.failed} fallaron)`, started);
  if (picked.throttled) {
    // No se lanza: media cosecha sigue siendo mejor que ninguna, y el guardado ya se niega a pisar
    // una cola buena con una vacía. Lo que hace falta es que quede DICHO, porque una cola corta por
    // estrangulamiento se ve igual que una cola corta por falta de demanda.
    console.warn(
      "[demand] el autocompletado cortó la cosecha por racha de fallas: la lista está incompleta"
    );
  }

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
  const indexStarted = Date.now();
  const chunks = await loadIndex();
  const retriever = chunks.length ? new SiteRetriever(chunks) : null;
  stage(`índice propio (${chunks.length} fragmentos)`, indexStarted);

  // Lo que Google ya nos muestra. Va después del índice y antes del SERP porque es gratis y
  // cambia a qué candidatos vale la pena gastarles una consulta cara.
  const known = await loadKnownQueries();
  stage(`archivo de Search Console (${known.size} consultas)`, indexStarted);

  const candidates: Candidate[] = inScope.map(({ s, topic }) => {
    // Cinco candidatas y se elige la que MÁS cubre, no la primera. Con `limit: 1` la cola del
    // 2026-09-03 daba cobertura 0 para las 40 filas, y mirando los `bestPath` se ve por qué:
    // "clearing como saber si estoy" devolvía /mejores-prestamos-uruguay cuando el sitio tiene
    // /salir-del-clearing, y /tarjetas-de-socio-uruguay salía primera nueve veces para consultas
    // que no tienen nada que ver. Con el vector en null la única señal es léxica, y una consulta
    // cuyas palabras casi no están en el índice ordena por ruido. Pedir cinco y quedarse con la de
    // mejor superposición corrige la mayoría sin costar una sola llamada de embeddings.
    const hits = retriever ? retriever.rankWithVector(s.query, null, COVERAGE_HITS) : [];
    let best: { path: string; title: string } | null = null;
    let coverage = 0;
    for (const hit of hits) {
      const score = coverageOf(s.query, hit);
      if (score > coverage) {
        coverage = score;
        best = hit;
      }
    }
    return {
      query: s.query,
      topic,
      rank: s.rank,
      coverage,
      bestPath: best?.path ?? null,
      known: known.get(s.query),
    };
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
    const serpStarted = Date.now();
    for (const c of shortlist) {
      const probe = await probeSerp(c.query);
      if (probe) {
        c.serp = probe.assessment;
        probed++;
      }
      await new Promise((r) => setTimeout(r, SERP_GAP_MS));
    }
    // Cuántas contestaron importa tanto como cuánto tardó: un servidor de SERP que devuelve null
    // deja a todos los candidatos "sin clasificar", y la cola sigue sirviendo pero hay que
    // mirarla entera a mano en vez de leer las primeras cinco.
    stage(`${probed} de ${shortlist.length} SERP clasificados`, serpStarted);
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
