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
 * Tope para una página que sólo coincide por el TÍTULO, no por su dirección.
 *
 * La primera versión contaba título y ruta juntos, y la corrida real mostró por qué no alcanza:
 *
 *   "que pasa si no pago antel" → 0,67 en /guias/no-pagar-prestamo-e-irse-del-pais-uruguay,
 *      cuyo título es "¿Qué pasa si no pago un préstamo en Uruguay (y me voy del país)?".
 *   "cédula uruguaya"           → 1,00 en /cambiar-de-mutualista-uruguay,
 *      cuyo título es "Cambiar de mutualista en Uruguay: cuándo te toca según tu cédula".
 *
 * Las dos coincidencias son reales: las palabras están. Lo que pasa es que las que coinciden son
 * el ARMAZÓN de la pregunta ("qué pasa si", "pago") o una mención de paso, y la palabra que
 * distingue el tema —"antel", "cédula"— no está en ninguna de las dos rutas. Una página se llama
 * como aquello de lo que trata: si la dirección no nombra nada de lo que se preguntó, la
 * coincidencia es del enunciado y no del tema, y no puede valer una cobertura alta.
 */
const TITLE_ONLY_CAP = 0.5;

/**
 * 0..1 — qué parte de la consulta ya está en el título y la ruta de la mejor página del sitio.
 *
 * 1 significa "esta consulta ya tiene página"; 0, "no hay nada parecido". Los valores del medio son
 * los que hay que mirar a mano, y por eso el candidato los lleva a la cola en vez de decidir solo.
 */
export function coverageOf(query: string, page: CoverageTarget | null): number {
  const asked = words(query);
  if (!asked.length || !page) return 0;

  const inPath = words(page.path.replace(/[-_/]+/g, " "));
  const have = [...words(page.title), ...inPath];
  if (!have.length) return 0;

  const matched = asked.filter((a) => have.some((h) => same(a, h)));
  if (!matched.length) return 0;

  const raw = matched.length / asked.length;
  const namedInPath = matched.some((a) => inPath.some((h) => same(a, h)));
  return Number(Math.min(raw, namedInPath ? 1 : TITLE_ONLY_CAP).toFixed(4));
}
