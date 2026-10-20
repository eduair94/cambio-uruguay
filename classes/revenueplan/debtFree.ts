// Qué deuda de SEO se puede tocar HOY sin arruinar una medición en curso. Funciones puras, sin I/O.
//
// POR QUÉ EXISTE. El libro de cambios mide cada cambio contra los 28 días siguientes a su
// despliegue, así que una página con una fila abierta no se vuelve a tocar: la segunda fila parte
// la ventana anterior de la primera y entonces ninguno de los dos veredictos habla de su propio
// cambio. `tests/revenueplan/experiments_overlap.test.ts` lo pone en rojo desde el 2026-10-15, y
// `AGENTS.md` lo escribe como escarmiento.
//
// Lo que no cubría nada es la CONSECUENCIA PRÁCTICA de esa regla. Los trinquetes de deuda de SEO
// del app —migas (`seoContract`), páginas sin tema y guías sin tema (`temaHuerfanas`), páginas sin
// enlace de contexto (`enlacesDeContexto`) y snippets de guía pasados (`guideSnippetBudget`)—
// RECITAN la reserva en prosa, ruta por ruta y a mano: «entran cuando su ventana cierre», «la
// última, /comparar-plataformas-dolar-uruguay, el 2026-10-27», «SIGUE reservada hasta después del
// 2026-10-18». Nada la calcula. Así que cada vez que alguien se sienta a bajar un trinquete tiene
// que cruzar a mano cada ruta de la deuda contra cada fila del libro para saber cuál puede tocar, y
// ese cruce es lo único que decide el trabajo del día.
//
// Medido el 2026-10-17: de las 59 rutas declaradas en los tres trinquetes con lista, las 59 estaban
// reservadas, y establecerlo fue el trabajo entero de esa corrida. Es el mismo síntoma del que
// nació el test de solape —una disciplina escrita en prosa que nada verificaba— un nivel más
// arriba: ahí el riesgo era publicar dos filas que se pisan, acá es gastar la corrida averiguando
// que no había nada que publicar.
//
// Desde el 2026-10-20 los CINCO pozos declaran su lista y el informe cruza las 99 rutas, no 53. Los
// dos que faltaban declaraban sólo un número, así que para esos tres contadores la respuesta vivía
// en el comentario del presupuesto, en prosa y con la fecha de liberación a mano. Medido ese día:
// 3 libres de 99, y las 46 agregadas estaban todas reservadas — o sea que la corrida anterior sacó
// esa misma conclusión a mano, que es exactamente el gasto que describe el párrafo de arriba.
//
// LA REGLA, Y DE DÓNDE SALE. El test de solape marca un par cuando `|Δfecha| ≤ 28`, o sea que una
// fila nueva es segura recién al día 29. Por eso la reserva es `EXPERIMENT_WINDOW_DAYS + 1` y no la
// ventana: 28 días es cuánto mide el libro, 29 es a partir de cuándo se puede declarar otra cosa
// sobre la misma página sin poner CI en rojo. La diferencia es de un día y es justo el día en que
// alguien se equivocaría.
//
// Y el matcher NO se reimplementa: `routeMatches` es el mismo que usa el job, por la razón que el
// test de solape ya da para sus testigos — una copia de «termina en `/` o en `*`» puede separarse
// del original sin que nada avise, y entonces este informe declararía libre justo una ruta que el
// job sí está midiendo. Una ruta de deuda es siempre una página concreta, así que se le pregunta
// directo a `routeMatches` si alguna fila la cubre.
import { EXPERIMENT_WINDOW_DAYS, routeMatches } from "./experiments";
import type { ExperimentSpec } from "./types";

/**
 * Días que tienen que pasar desde el despliegue de una fila para poder declarar otra sobre la misma
 * página. Uno más que la ventana: ver el encabezado.
 */
export const RESERVE_DAYS = EXPERIMENT_WINDOW_DAYS + 1;

/** Mismo desplazamiento de día que usa `experiments.ts`; UTC, sin husos ni horario de verano. */
const dayShift = (day: string, delta: number): string => {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(t)) return day;
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
};

const dayDiff = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000;

/** Una ruta de deuda, con el pozo del que salió. */
export interface DebtRoute {
  /** El trinquete que la declara, para que el informe diga de dónde sale cada fila. */
  pool: string;
  /** Ruta concreta del sitio, `/asi`. */
  route: string;
}

/** El estado de reserva de una ruta de deuda. */
export interface DebtReserve extends DebtRoute {
  /** Primer día en que se le puede declarar una fila nueva. `today` o anterior si está libre. */
  freeOn: string;
  /** True cuando hoy ya se puede tocar. */
  free: boolean;
  /** Los `id` de las filas abiertas que la reservan, de la más nueva a la más vieja. */
  blockedBy: string[];
}

/**
 * Hasta cuándo está reservada una ruta.
 *
 * Manda la fila MÁS NUEVA que la cubre: una página con filas del 16/9 y del 15/10 queda reservada
 * por la segunda. Una ruta sin ninguna fila está libre y su `freeOn` es hoy, no una fecha inventada
 * en el pasado: lo que el informe tiene que contestar es «¿se puede hoy?».
 */
export function reserveOf(route: string, specs: ExperimentSpec[], today: string): Omit<DebtReserve, "pool"> {
  const covering = specs
    .filter((spec) => routeMatches(spec.routes, route))
    .filter((spec) => dayDiff(spec.shippedOn, today) < RESERVE_DAYS)
    .sort((a, b) => b.shippedOn.localeCompare(a.shippedOn) || a.id.localeCompare(b.id));
  if (!covering.length) return { route, freeOn: today, free: true, blockedBy: [] };
  const freeOn = covering.map((spec) => dayShift(spec.shippedOn, RESERVE_DAYS)).sort().at(-1)!;
  return { route, freeOn, free: freeOn <= today, blockedBy: covering.map((spec) => spec.id) };
}

/**
 * El informe entero, ordenado por cuándo se libera cada ruta y después por pozo y ruta.
 *
 * El orden es el del trabajo: arriba lo que se puede hacer hoy, y abajo la cola con su fecha. Es
 * determinista a propósito, así dos corridas del mismo día imprimen lo mismo.
 */
export function reserveReport(items: DebtRoute[], specs: ExperimentSpec[], today: string): DebtReserve[] {
  return items
    .map((item) => ({ pool: item.pool, ...reserveOf(item.route, specs, today) }))
    .sort((a, b) => a.freeOn.localeCompare(b.freeOn) || a.pool.localeCompare(b.pool) || a.route.localeCompare(b.route));
}

/**
 * Las cadenas de un `const NOMBRE = [ '...', '...' ]` de un archivo TypeScript.
 *
 * Los tres trinquetes con lista declaran su deuda así, y esta lectura es el único punto de contacto
 * entre la raíz y `app/`: el vitest de la raíz no puede importar un archivo de `app/` (misma razón
 * que `app/tests/unit/storeConstantsParity.test.ts`), así que la lista se lee como texto. Se lee y
 * no se copia a propósito — una segunda copia de la deuda envejecería sin que nada avise, y el
 * trinquete de cada archivo ya mantiene la suya EXACTA contra el árbol de páginas.
 *
 * TIRA EXCEPCIÓN si no encuentra el `const` o si la lista queda vacía, y eso es la mitad del valor:
 * el modo de fallar de un lector así es devolver `[]` y declarar que no hay deuda, que se ve igual
 * que «no hay nada que hacer». Un `const` renombrado tiene que romper el informe, no vaciarlo.
 */
export function parseStringList(source: string, constName: string): string[] {
  const head = source.indexOf(`const ${constName} = [`);
  if (head === -1) throw new Error(`no encontré \`const ${constName} = [\`: ¿lo renombraron?`);
  const open = source.indexOf("[", head);
  const close = source.indexOf("\n]", open);
  if (close === -1) throw new Error(`\`${constName}\` no cierra con un \`]\` al principio de línea`);
  const body = source
    .slice(open + 1, close)
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const values = [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1]!);
  if (!values.length) throw new Error(`\`${constName}\` quedó vacía: el lector no reconoce su forma`);
  return values;
}

/** El número de un `const NOMBRE = 123`, para contrastar una lista contra su propio trinquete. */
export function parseNumber(source: string, constName: string): number {
  const found = new RegExp(`const ${constName} = (\\d+)`).exec(source);
  if (!found) throw new Error(`no encontré \`const ${constName} = <número>\`: ¿lo renombraron?`);
  return Number(found[1]);
}
