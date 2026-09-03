// ¿El sitio ya tiene una página sobre esto?
//
// LA PRIMERA VERSIÓN DE ESTO ESTABA ROTA Y LA CORRIDA REAL LO MOSTRÓ. Usaba el puntaje que
// devuelve `SiteRetriever.rankWithVector` normalizado contra 6, suponiendo una escala que ese
// puntaje no tiene: es una fusión de rangos (RRF), acotada a ~1/(60+1) por lista, así que el mejor
// resultado SIEMPRE vale entre 0,02 y 0,03 — tenga la página que tenga. Medido el 2026-09-03:
//
//   "casas de cambio uruguay"                 → /casas-de-cambio                          0,02
//   "cómo saber si me corresponde canasta bps" → /guias/trabajar-para-el-exterior-desde-uy 0,02
//
// El primero está cubierto por la página central del sitio y el segundo no está cubierto por nada,
// y el puntaje da lo mismo. Con eso la cobertura valía cero para todo y la cola se ordenaba sólo
// por la posición en el autocompletado.
//
// El recuperador igual sirve — ENCUENTRA la página correcta, que es lo difícil. Lo que no sabe
// decir es cuánto se parece. Eso lo mide acá la superposición de palabras contra el título y la
// ruta de esa página: es explicable (se puede discutir mirando las dos cadenas) y es justo lo que
// significa "ya tenemos una página de esto".
//
// PURE (sin red, sin Mongo) para poder probarlo con las cadenas reales.

/** Palabras que aparecen en casi cualquier consulta o título y no dicen nada del tema. */
const STOPWORDS = new Set([
  "como",
  "cual",
  "cuales",
  "cuando",
  "cuanto",
  "cuanta",
  "cuantos",
  "cuantas",
  "donde",
  "para",
  "pero",
  "porque",
  "puedo",
  "quien",
  "sobre",
  "tengo",
  "todo",
  "toda",
  "todos",
  "todas",
  "hoy",
  "saber",
  "corresponde",
  "esta",
  "este",
  "esto",
  "mismo",
  "hace",
  "hacer",
  "tiene",
  "tener",
  // "uruguay" está en la consulta por el filtro de país Y en casi todos los títulos del sitio:
  // contarla haría que cualquier consulta pareciera medio cubierta.
  "uruguay",
  "uruguaya",
  "uruguayo",
  "uruguayos",
  "uruguayas",
]);

/** Minúsculas, sin tildes, sólo letras y números. */
export function words(value: string): string[] {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

/**
 * Dos palabras son la misma para esto si una empieza con la otra.
 *
 * Alcanza para singular/plural y para las variantes que el autocompletado devuelve mezcladas
 * ("horas extras" contra la página "horas-extra"), sin traer un lematizador para tres casos.
 */
function same(a: string, b: string): boolean {
  return a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
}

export interface CoverageTarget {
  path: string;
  title: string;
}

/**
 * 0..1 — qué parte de la consulta ya está en el título y la ruta de la mejor página del sitio.
 *
 * 1 significa "esta consulta ya tiene página"; 0, "no hay nada parecido". Los valores del medio son
 * los que hay que mirar a mano, y por eso el candidato los lleva a la cola en vez de decidir solo.
 */
export function coverageOf(query: string, page: CoverageTarget | null): number {
  const asked = words(query);
  if (!asked.length || !page) return 0;
  const have = words(`${page.title} ${page.path.replace(/[-_/]+/g, " ")}`);
  if (!have.length) return 0;
  const hit = asked.filter((a) => have.some((h) => same(a, h))).length;
  return Number((hit / asked.length).toFixed(4));
}
