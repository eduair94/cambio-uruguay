// El libro de cambios: qué se publicó, cuándo, y si sirvió.
//
// POR QUÉ EXISTE. El registro de crecimiento (`docs/seo/adsense-growth-loop.md`) cierra nueve
// iteraciones seguidas con la misma frase — "evaluar con 28 días finales posteriores" — y no hay
// una sola iteración que vuelva a medir la anterior. No es desprolijidad: medir a mano un cambio
// veintiocho días después exige acordarse veintiocho días después. Así que el sitio acumula cambios
// publicados y cero veredictos, y la consecuencia práctica es que nadie sabe cuál de las nueve
// palancas funciona, o sea que la décima se elige igual que la primera.
//
// LO QUE HACE DISTINTO A ESTE LEDGER DE UN ANTES/DESPUÉS. El sitio venía multiplicando impresiones
// por seis entre marzo y agosto de 2026. Sobre una serie que sube sola, comparar 28 días contra los
// 28 anteriores declara ganador a TODO lo que se toque, incluido no tocar nada. Así que el veredicto
// no mira los clics del sujeto: mira su PORCIÓN de los clics del sitio en las mismas fechas. Si la
// página creció lo mismo que el sitio, la porción no se movió y el veredicto es "sin cambio", que
// es la respuesta correcta y la que un antes/después crudo nunca da.
//
// La porción se calcula sobre los MISMOS días archivados de las dos puntas, así que un hueco en el
// archivo no inventa una diferencia: se cae del numerador y del denominador a la vez.
import fs from "fs";
import path from "path";
import type { GscDay } from "../gsc/types";
import type { ExperimentResult, ExperimentSpec, ExperimentVerdict } from "./types";

/** Días a cada lado. 28 por lo mismo que la ventana de Search Console: semanas enteras. */
export const EXPERIMENT_WINDOW_DAYS = 28;
/** Días de la ventana anterior por debajo de los cuales no hay con qué comparar. */
export const MIN_BEFORE_DAYS = 7;
/** Clics del sujeto en la ventana anterior por debajo de los cuales la porción es ruido. */
export const MIN_BEFORE_CLICKS = 10;
/** Cuánto se tiene que mover la porción para que sea un veredicto y no el ruido de la semana. */
export const LIFT_WIN = 1.2;
export const LIFT_LOSS = 0.8;

const dayShift = (day: string, delta: number): string => {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(t)) return day;
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
};

/** Path de una URL de Search Console, sin host, sin query y sin barra final. */
export function pathOf(url: string): string {
  const withoutHost = url.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "");
  if (!withoutHost) return "/";
  return withoutHost.length > 1 ? withoutHost.replace(/\/$/, "") : withoutHost;
}

/**
 * ¿Esta URL entra en el experimento?
 *
 * Una ruta que termina en `/` o en `*` toma la familia entera; el resto exige coincidencia exacta.
 * Es deliberado: la mitad de los cambios de este sitio son de plantilla (todas las `/sucursal/*`) y
 * la otra mitad de una página sola, y confundirlos hace que un cambio de plantilla parezca no haber
 * hecho nada porque se midió una URL de las quinientas.
 */
export function routeMatches(routes: string[], url: string): boolean {
  const p = pathOf(url);
  return routes.some((raw) => {
    const route = raw.trim();
    if (!route) return false;
    if (route.endsWith("*")) return p.startsWith(route.slice(0, -1));
    if (route.endsWith("/") && route.length > 1) return p === route.slice(0, -1) || p.startsWith(route);
    return p === route;
  });
}

interface WindowSum {
  clicks: number;
  impressions: number;
  days: number;
  siteClicks: number;
  siteImpressions: number;
}

const EMPTY: WindowSum = { clicks: 0, impressions: 0, days: 0, siteClicks: 0, siteImpressions: 0 };

/**
 * Suma UN día del archivo dentro de un acumulador.
 *
 * El sujeto y el sitio salen del MISMO documento, que es lo que hace comparable la porción: si el
 * archivo no tiene el 14 de septiembre, ese día no está ni arriba ni abajo de la fracción.
 */
function foldDay(sum: WindowSum, day: GscDay, routes: string[], queries: Set<string>): void {
  sum.days += 1;
  sum.siteClicks += day.totals?.clicks || 0;
  sum.siteImpressions += day.totals?.impressions || 0;

  if (routes.length) {
    for (const page of day.pages || []) {
      if (!routeMatches(routes, page.key)) continue;
      sum.clicks += page.clicks;
      sum.impressions += page.impressions;
    }
  }
  if (queries.size) {
    for (const q of day.queries || []) {
      if (!queries.has(q.key.toLowerCase())) continue;
      sum.clicks += q.clicks;
      sum.impressions += q.impressions;
    }
  }
}

const normalisedQueries = (spec: ExperimentSpec) =>
  new Set((spec.queries || []).map((q) => q.trim().toLowerCase()).filter(Boolean));

/** Suma el sujeto y el sitio sobre los días archivados de un rango. */
export function sumWindow(days: GscDay[], spec: ExperimentSpec, from: string, to: string): WindowSum {
  const out: WindowSum = { ...EMPTY };
  const queries = normalisedQueries(spec);
  for (const day of days) {
    if (day.day < from || day.day > to) continue;
    foldDay(out, day, spec.routes, queries);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Medición por tandas
//
// POR QUÉ NO SE MIDE CON EL ARCHIVO ENTERO EN MEMORIA. Cada documento del archivo lleva hasta 5.000
// consultas y 3.000 páginas. Mientras hay tres experimentos el rango es de un mes y no se nota;
// cuando el libro de cambios tenga un año, el tope de 90 días serían cientos de megabytes en un
// proceso que comparte un VPS con veinte jobs. Y el modo de fallar es feo: el job muere por OOM un
// martes cualquiera y lo único que queda es un plan que dejó de actualizarse.
//
// La medición es una suma, así que no hace falta tener todo junto: se abre un acumulador por
// experimento, se le pasan los días en tandas y se cierra al final. El resultado es idéntico al de
// medir con todo en memoria — `measureExperiment` está reimplementado sobre estas tres funciones
// justamente para que no puedan divergir.
// ---------------------------------------------------------------------------------------------

export interface ExperimentAccumulator {
  spec: ExperimentSpec;
  queries: Set<string>;
  beforeFrom: string;
  beforeTo: string;
  afterFrom: string;
  afterTo: string;
  before: WindowSum;
  after: WindowSum;
}

export function startExperiments(specs: ExperimentSpec[]): ExperimentAccumulator[] {
  return specs.map((spec) => ({
    spec,
    queries: normalisedQueries(spec),
    beforeFrom: dayShift(spec.shippedOn, -EXPERIMENT_WINDOW_DAYS),
    beforeTo: dayShift(spec.shippedOn, -1),
    // El día del despliegue no entra en ninguna de las dos puntas: media jornada con el cambio y
    // media sin él no pertenece a ninguna.
    afterFrom: dayShift(spec.shippedOn, 1),
    afterTo: dayShift(spec.shippedOn, EXPERIMENT_WINDOW_DAYS),
    before: { ...EMPTY },
    after: { ...EMPTY },
  }));
}

/** Pasa una tanda de días por todos los acumuladores. Los días pueden venir en cualquier orden. */
export function feedExperiments(accumulators: ExperimentAccumulator[], days: GscDay[]): void {
  for (const day of days) {
    for (const acc of accumulators) {
      if (day.day >= acc.beforeFrom && day.day <= acc.beforeTo) {
        foldDay(acc.before, day, acc.spec.routes, acc.queries);
      } else if (day.day >= acc.afterFrom && day.day <= acc.afterTo) {
        foldDay(acc.after, day, acc.spec.routes, acc.queries);
      }
    }
  }
}

function verdictOf(before: WindowSum, after: WindowSum, lift: number | null, daysMissing: number): ExperimentVerdict {
  if (before.days < MIN_BEFORE_DAYS) return "sin datos";
  // Una PÁGINA NUEVA no tiene ventana anterior, y su porción de partida no es ruido: es cero de
  // verdad. Medirla con el cociente daría infinito o "sin datos", y las dos respuestas esconden lo
  // único que se quería saber — si la página existe en la búsqueda. Así que el cero se trata como
  // el caso especial que es, y sólo una vez que hay clics suficientes del otro lado.
  if (before.clicks === 0 && before.impressions === 0) {
    if (daysMissing > 0 && after.clicks < MIN_BEFORE_CLICKS) return "esperando";
    return after.clicks >= MIN_BEFORE_CLICKS ? "mejoró" : daysMissing > 0 ? "esperando" : "sin cambio";
  }
  if (before.clicks < MIN_BEFORE_CLICKS) return "sin datos";
  if (daysMissing > 0) return "esperando";
  if (lift === null) return "sin datos";
  if (lift >= LIFT_WIN) return "mejoró";
  if (lift <= LIFT_LOSS) return "empeoró";
  return "sin cambio";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Cierra un acumulador y dictamina. `today` es `YYYY-MM-DD`. */
export function finishExperiment(acc: ExperimentAccumulator, today: string): ExperimentResult {
  const { spec, before, after, afterFrom, afterTo } = acc;

  // Lo que falta se mide contra el ARCHIVO, no contra el calendario: Search Console cierra cada día
  // con unos tres de atraso, así que "ya pasaron 28 días" y "ya hay 28 días medidos" no son lo
  // mismo, y confundirlos dictamina con una ventana a medio llenar.
  const reachable = afterTo <= today ? EXPERIMENT_WINDOW_DAYS : 0;
  const elapsed = Math.max(
    0,
    Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${afterFrom}T00:00:00Z`)) / 86400000) + 1
  );
  const expected = reachable || Math.min(elapsed, EXPERIMENT_WINDOW_DAYS);
  const daysMissing = Math.max(0, EXPERIMENT_WINDOW_DAYS - after.days);

  const shareBefore = before.siteClicks > 0 ? before.clicks / before.siteClicks : null;
  const shareAfter = after.siteClicks > 0 ? after.clicks / after.siteClicks : null;
  const lift = shareBefore && shareBefore > 0 && shareAfter !== null ? shareAfter / shareBefore : null;

  const verdict = verdictOf(before, after, lift, daysMissing);
  const pct = (n: number) => `${n > 0 ? "+" : ""}${Math.round((n - 1) * 100)} %`;

  const isNewPage = before.clicks === 0 && before.impressions === 0 && before.days >= MIN_BEFORE_DAYS;

  let note: string;
  if (isNewPage && verdict !== "sin datos") {
    note =
      `no existía antes del cambio (cero impresiones en los ${before.days} días previos) y lleva ` +
      `${after.clicks} clic(s) y ${after.impressions} impresiones en ${after.days} día(s). ` +
      "Acá no hay porción que comparar: el punto de partida es cero de verdad.";
  } else if (verdict === "esperando") {
    note =
      `faltan ${daysMissing} día(s) de archivo para cerrar la ventana ` +
      `(${after.days} de ${EXPERIMENT_WINDOW_DAYS}${expected < EXPERIMENT_WINDOW_DAYS ? ", el resto todavía no ocurrió" : ""}).`;
  } else if (verdict === "sin datos") {
    note =
      before.days < MIN_BEFORE_DAYS
        ? `el archivo sólo tiene ${before.days} día(s) antes del cambio: no hay contra qué comparar.`
        : `${before.clicks} clic(s) en la ventana anterior: la porción es ruido, no un punto de partida.`;
  } else {
    note =
      `porción de los clics del sitio ${(shareBefore! * 100).toFixed(3)} % → ${(shareAfter! * 100).toFixed(3)} % ` +
      `(${pct(lift!)} descontando cómo se movió el sitio, que pasó de ${before.siteClicks} a ${after.siteClicks} clics).`;
  }

  return {
    ...spec,
    verdict,
    daysAfter: after.days,
    daysMissing,
    before: { clicks: before.clicks, impressions: before.impressions, days: before.days },
    after: { clicks: after.clicks, impressions: after.impressions, days: after.days },
    siteBefore: { clicks: before.siteClicks, impressions: before.siteImpressions },
    siteAfter: { clicks: after.siteClicks, impressions: after.siteImpressions },
    relativeLift: lift === null ? null : round2(lift),
    note,
  };
}

/**
 * Mide un experimento con todo el archivo en memoria.
 *
 * Reimplementado sobre los acumuladores a propósito: la ruta por tandas que usa el job y la que
 * usan los tests tienen que ser la MISMA aritmética, no dos copias que se separen con el tiempo.
 */
export function measureExperiment(spec: ExperimentSpec, days: GscDay[], today: string): ExperimentResult {
  const [acc] = startExperiments([spec]);
  feedExperiments([acc], days);
  return finishExperiment(acc, today);
}

export function sortExperiments(results: ExperimentResult[]): ExperimentResult[] {
  const order: Record<ExperimentVerdict, number> = { empeoró: 0, mejoró: 1, "sin cambio": 2, esperando: 3, "sin datos": 4 };
  return results
    .slice()
    .sort((a, b) => order[a.verdict] - order[b.verdict] || b.shippedOn.localeCompare(a.shippedOn));
}

export function measureExperiments(specs: ExperimentSpec[], days: GscDay[], today: string): ExperimentResult[] {
  const accumulators = startExperiments(specs);
  feedExperiments(accumulators, days);
  return sortExperiments(accumulators.map((acc) => finishExperiment(acc, today)));
}

// ---------------------------------------------------------------------------------------------
// El archivo declarado
// ---------------------------------------------------------------------------------------------

/**
 * Dónde vive la lista. En el repo y no en Mongo a propósito: la escribe quien publica el cambio, en
 * el mismo commit, y así el diff muestra la hipótesis al lado del código que la ejecuta. Una
 * colección se habría llenado sola de filas que nadie escribió y nadie reclama.
 */
export const EXPERIMENTS_FILE = path.join("docs", "seo", "experiments.json");

function candidatePaths(): string[] {
  return [
    path.resolve(process.cwd(), EXPERIMENTS_FILE),
    // Desde `classes/revenueplan/` en dev (ts-node) y desde `dist/classes/revenueplan/` compilado.
    path.resolve(__dirname, "..", "..", EXPERIMENTS_FILE),
    path.resolve(__dirname, "..", "..", "..", EXPERIMENTS_FILE),
  ];
}

/** Valida una fila. Una entrada rota no puede tumbar el job ni, peor, medir la ruta equivocada. */
export function parseSpecs(raw: unknown): { specs: ExperimentSpec[]; problems: string[] } {
  const specs: ExperimentSpec[] = [];
  const problems: string[] = [];
  const list = Array.isArray(raw) ? raw : (raw as any)?.experiments;
  if (!Array.isArray(list)) return { specs, problems: ["el archivo no contiene una lista de experimentos"] };

  for (const row of list) {
    const id = typeof row?.id === "string" ? row.id.trim() : "";
    const shippedOn = typeof row?.shippedOn === "string" ? row.shippedOn.trim() : "";
    const routes = Array.isArray(row?.routes) ? row.routes.filter((r: unknown) => typeof r === "string") : [];
    const queries = Array.isArray(row?.queries) ? row.queries.filter((q: unknown) => typeof q === "string") : [];
    if (!id) {
      problems.push("una entrada sin `id`");
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shippedOn)) {
      problems.push(`${id}: \`shippedOn\` tiene que ser YYYY-MM-DD`);
      continue;
    }
    if (!routes.length && !queries.length) {
      problems.push(`${id}: sin \`routes\` ni \`queries\`, no hay sujeto que medir`);
      continue;
    }
    specs.push({
      id,
      shippedOn,
      routes,
      queries: queries.length ? queries : undefined,
      hypothesis: typeof row?.hypothesis === "string" ? row.hypothesis : "",
    });
  }
  return { specs, problems };
}

export function loadSpecs(): { specs: ExperimentSpec[]; problems: string[]; file: string | null } {
  for (const file of candidatePaths()) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = parseSpecs(JSON.parse(fs.readFileSync(file, "utf8")));
      return { ...parsed, file };
    } catch (e: any) {
      return { specs: [], problems: [`${file}: ${e?.message || String(e)}`], file };
    }
  }
  return { specs: [], problems: [`no encontré ${EXPERIMENTS_FILE}`], file: null };
}
