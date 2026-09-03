// Decide qué pregunta merece una página, y cuál no.
//
// POR QUÉ EXISTE ESTE JOB. Search Console sólo muestra consultas donde el sitio YA aparece, así que
// no puede ver la demanda que no captura: medido el 2026-09-03, de las 302 consultas con forma de
// pregunta que el sitio recibe, 29.008 impresiones dan 11 clics, porque casi todas son conversiones
// de moneda que Google contesta sola. El sitio no crece optimizando lo que ya rankea; tiene que
// entrar en consultas donde hoy no aparece. Eso hay que salir a buscarlo afuera.
//
// EL FILTRO QUE HACE LA DIFERENCIA, y se descubrió escribiendo dos páginas a mano:
//
//   * Donde el SERP son GRANJAS DE CALCULADORAS no se entra. "cuánto me descuentan del sueldo"
//     está tomado por salarioliquidouruguay.com, talent.com, misalario.uy, datosuruguay.com,
//     calculatam.com, calcufacil y salarioya.com — siete dominios dedicados. Además las
//     calculadoras de este sitio no llevan anuncios por decisión de producto, así que la pelea no
//     paga ni ganándola.
//   * Donde el SERP es INSTITUCIONAL E ILEGIBLE sí se entra. "licencia por duelo uruguay" tenía el
//     artículo crudo de IMPO, una página de BPS, el PIT-CNT y un posteo de Facebook; "preaviso
//     renuncia uruguay" tiene primero un hilo de Reddit y tercero un post de Instagram. Cuando
//     Google no encuentra nada bueno, una tabla bien escrita gana.
//   * Donde hay CAJA DE RESPUESTA no se entra, por más volumen que tenga: el clic no existe.
//
// PURE (sin red, sin Mongo) para que los umbrales se puedan probar sin salir a internet.

/** Dominios que son calculadoras dedicadas al mercado uruguayo o regional. */
const CALCULATOR_DOMAINS = [
  "salarioliquidouruguay.com",
  "misalario.uy",
  "calculatam.com",
  "calcufacil.com.uy",
  "salarioya.com",
  "calculame.uy",
  "calculate.uy",
  "calculadorauruguay.com",
  "hacecuentas.com",
  "calculopro.com",
  "calculasueldo.net",
  "ahorrin.app",
  "finiquitojusto.com",
  "talent.com",
  "datosuruguay.com",
];

/** Sitios de organismos y de fuentes normativas: contestan, pero casi nunca de forma legible. */
const INSTITUTIONAL_DOMAINS = [
  "gub.uy",
  "impo.com.uy",
  "bps.gub.uy",
  "dgi.gub.uy",
  "bcu.gub.uy",
  "mtss.gub.uy",
  "parlamento.gub.uy",
  "pitcnt.uy",
];

/** Señales de que Google no encontró una página buena. */
const WEAK_RESULT_DOMAINS = ["facebook.com", "instagram.com", "reddit.com", "youtube.com", "x.com", "twitter.com"];

/**
 * Marcas de que la consulta es del mercado uruguayo.
 *
 * ESTA LISTA ES EL FILTRO MÁS IMPORTANTE DEL JOB, y no estaba en el diseño original: se agregó
 * después de medir la primera cosecha real. Con 12 semillas volvieron 102 sugerencias, 99 "dentro
 * de las temáticas" y casi todas de otro país — "puedo cambiar dólares en coppel" (México),
 * "cuanto dólar bcv" (Venezuela), "cuántos días quetzales en dólares" (Guatemala), "que pasa si
 * europa sale de la otan". El `gl=uy` del autocompletado NO alcanza: contesta lo mismo con y sin
 * él. Sin este filtro la cola sería una lista de páginas que este sitio no puede rankear y que no
 * le sirven a su público.
 *
 * Sólo entran marcas que no son ambiguas. Los departamentos que también son palabras comunes
 * (Salto, Rivera, Flores, Florida, Colonia, Durazno) quedan afuera a propósito.
 */
const UY_MARKERS = [
  "uruguay",
  "uruguayo",
  "uruguaya",
  "uruguayos",
  "uruguayas",
  "montevideo",
  "canelones",
  "maldonado",
  "punta del este",
  "bps",
  "dgi",
  "bcu",
  "mtss",
  "mides",
  "asse",
  "ute",
  "ose",
  "antel",
  "ancap",
  "brou",
  "sucive",
  "fonasa",
  "afap",
  "irpf",
  "imesi",
  "iass",
  "mutualista",
  "clearing",
  "monotributo",
  "aguinaldo",
];

/** Normaliza a " palabras separadas por un espacio ", para poder buscar por palabra entera. */
const padded = (value: string): string =>
  ` ${String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;

/**
 * ¿La consulta es del mercado uruguayo?
 *
 * Se aplica ANTES que nada: es gratis y descarta la mayor parte de la cosecha. Una pregunta buena
 * sin ninguna marca local (por ejemplo "cuanto aguinaldo me corresponde por 3 meses") se descarta
 * a propósito: su SERP es mexicano o español, las reglas que contesta no son las de acá, y ganarla
 * traería visitas que no le sirven ni al lector ni al sitio.
 */
export function isUruguayan(query: string): boolean {
  const q = padded(query);
  return UY_MARKERS.some((m) => q.includes(` ${m} `));
}

export type SerpVerdict = "escribir" | "dudoso" | "no-entrar";

export interface SerpShape {
  /** Dominios del top de resultados, en orden. */
  domains: readonly string[];
  /** Google contesta la pregunta en su propia pantalla. */
  hasAnswerBox: boolean;
}

export interface SerpAssessment {
  verdict: SerpVerdict;
  reason: string;
  /** Cuántos de los primeros resultados son calculadoras dedicadas. */
  calculators: number;
  /** Cuántos son organismos o texto normativo crudo. */
  institutional: number;
  /** Cuántos son redes sociales o foros: la señal más fuerte de que falta una página. */
  weak: number;
}

const domainOf = (value: string): string =>
  String(value || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase();

const matches = (domain: string, list: readonly string[]) =>
  list.some((d) => domain === d || domain.endsWith(`.${d}`));

/**
 * ¿Vale la pena escribir esta página?
 *
 * El orden de las condiciones no es cosmético: la caja de respuesta manda sobre todo lo demás
 * porque un clic que no existe no se gana escribiendo mejor, y las calculadoras mandan sobre lo
 * institucional porque un SERP puede tener las dos cosas y la parte cara es la competencia.
 */
export function assessSerp(shape: SerpShape): SerpAssessment {
  const top = shape.domains.slice(0, 6).map(domainOf).filter(Boolean);
  const calculators = top.filter((d) => matches(d, CALCULATOR_DOMAINS)).length;
  const institutional = top.filter((d) => matches(d, INSTITUTIONAL_DOMAINS)).length;
  const weak = top.filter((d) => matches(d, WEAK_RESULT_DOMAINS)).length;

  if (shape.hasAnswerBox) {
    return {
      verdict: "no-entrar",
      reason: "Google contesta en su propia pantalla: el clic no existe por más que exista la búsqueda",
      calculators,
      institutional,
      weak,
    };
  }
  if (calculators >= 2) {
    return {
      verdict: "no-entrar",
      reason: `${calculators} calculadoras dedicadas en el top: es su nicho y acá las calculadoras no llevan anuncios`,
      calculators,
      institutional,
      weak,
    };
  }
  if (weak >= 1) {
    return {
      verdict: "escribir",
      reason: `hay ${weak} resultado(s) de redes o foros arriba: Google no encontró una página buena`,
      calculators,
      institutional,
      weak,
    };
  }
  if (institutional >= 2) {
    return {
      verdict: "escribir",
      reason: `${institutional} resultados institucionales: contestan, pero en texto normativo crudo`,
      calculators,
      institutional,
      weak,
    };
  }
  return {
    verdict: "dudoso",
    reason: "sin caja de respuesta, pero tampoco un hueco claro: hay que mirarlo a mano",
    calculators,
    institutional,
    weak,
  };
}

/** Lo que el archivo de Search Console ya sabe de una consulta. */
export interface KnownPosition {
  impressions: number;
  clicks: number;
  position: number;
}

export interface Candidate {
  /** La consulta tal como la sugiere el autocompletado. */
  query: string;
  /** Tema del sitio al que pertenece, o null si no entra en ninguno. */
  topic: string | null;
  /** Posición en la lista de sugerencias: 0 es la primera. Es un proxy de frecuencia, no un volumen. */
  rank: number;
  /** 0..1 — cuánto la cubre ya el sitio, según la recuperación léxica sobre el índice propio. */
  coverage: number;
  /** La página que más se le parece, si hay alguna. */
  bestPath: string | null;
  serp?: SerpAssessment;
  /** Presente cuando el sitio YA aparece en Google para esta consulta exacta. */
  known?: KnownPosition;
}

/**
 * Hasta qué posición se considera que el sitio "ya aparece".
 *
 * Quince y no diez: en el puesto 12 Google ya eligió la página, y escribir una segunda para la
 * misma consulta es fabricar la cannibalización que a este sitio le costó 34.259 impresiones y 52
 * clics en el grupo de marca de BROU.
 */
const RANKING_POSITION = 15;

export interface ScoredCandidate extends Candidate {
  score: number;
  /** Por qué está donde está, en una línea. */
  why: string;
}

/**
 * El orden de la cola.
 *
 * Es deliberadamente simple y explicable: el que la lee tiene que poder discutirla. Un modelo con
 * pesos aprendidos sobre 2.500 clics al mes sería precisión falsa.
 */
export function scoreCandidate(c: Candidate): ScoredCandidate {
  // El autocompletado ordena por frecuencia relativa: la primera sugerencia se busca más que la
  // octava. No es un volumen y no se puede tratar como tal.
  const demand = Math.max(0, 1 - c.rank / 10);
  const gap = 1 - Math.min(1, Math.max(0, c.coverage));
  // SIN clasificar no es lo mismo que CLASIFICADO como perdido. Al SERP sólo llega el presupuesto
  // de candidatos que se puede pagar, y el servidor de búsqueda a veces no contesta: si eso valiera
  // cero, la cola escondería justamente lo que nadie miró. Vale lo mismo que un "dudoso" —
  // suficiente para quedar en la lista, no tanto como para encabezarla. El cero queda reservado
  // para el único caso que se midió y se descartó: "no-entrar".
  const serpFactor = !c.serp ? 0.4 : c.serp.verdict === "escribir" ? 1 : c.serp.verdict === "dudoso" ? 0.4 : 0;

  // Si Google YA nos muestra para esta consulta exacta, no es una página que falta: es una que hay
  // que mejorar. Vale menos en una cola que existe para decidir qué ESCRIBIR, y lo dice en el
  // motivo en vez de desaparecer — porque una consulta en el puesto 12 con impresiones también es
  // trabajo, sólo que de otro tipo.
  const alreadyRanks = c.known && c.known.position > 0 && c.known.position <= RANKING_POSITION;
  const knownFactor = alreadyRanks ? 0.3 : 1;

  const score = Number((demand * gap * serpFactor * knownFactor).toFixed(4));
  const why = alreadyRanks
    ? `ya aparecés en posición ${c.known!.position.toFixed(1)} (${c.known!.impressions} impresiones, ` +
      `${c.known!.clicks} clics): es de mejorar, no de escribir`
    : serpFactor === 0
      ? c.serp?.reason || "sin evaluar el SERP"
      : gap < 0.3
        ? `ya hay algo parecido en ${c.bestPath ?? "el sitio"}`
        : c.serp?.reason || "sin clasificar: no llegó al presupuesto de SERP, hay que mirarlo a mano";

  return { ...c, score, why };
}

/** La cola, ordenada y sin lo que no se va a escribir. */
export function buildQueue(candidates: readonly Candidate[], limit = 40): ScoredCandidate[] {
  return candidates
    .filter((c) => c.topic)
    .map(scoreCandidate)
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.query.localeCompare(b.query, "es"))
    .slice(0, limit);
}
