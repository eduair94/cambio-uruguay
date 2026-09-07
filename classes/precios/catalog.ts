// Los dos GET del SIPC, normalizados.
//
// Dos detalles que cuestan sangre si se leen mal:
//   * el origen usa `x` = LATITUD e `y` = LONGITUD. Invertirlo pone al país en
//     el Atlántico y el radio de "cerca de mí" devuelve vacío.
//   * el `id` del catálogo de locales (1..749) NO es el `id` de las filas de
//     precio (medido: 217451), que es la clave de la declaración. La unión va
//     por coordenada exacta con respaldo nombre+dirección; ver `sweep.ts`.
import { fetchJson, SIPC_BASE } from "./net";
import { parseUnit } from "./parse";
import type { PrecioArticle, PrecioStore } from "./types";

/** Los 19 departamentos, con la tilde que el origen no manda. */
const DEPARTMENTS: ReadonlyArray<string> = Object.freeze([
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
]);

/** Sin tildes, en mayúsculas y con espacios colapsados, para comparar. */
const fold = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const DEPARTMENT_BY_FOLD = new Map(DEPARTMENTS.map((name) => [fold(name), name]));

/** `"Montevideo, MONTEVIDEO "` -> `"Montevideo"`; `""` cuando no se reconoce. */
export function departmentOf(locality: unknown): string {
  if (typeof locality !== "string") return "";
  const tail = locality.split(",").pop();
  if (!tail) return "";
  return DEPARTMENT_BY_FOLD.get(fold(tail)) || "";
}

/**
 * Cadena y sucursal. El separador del origen es `- Suc.`, y hay cadenas con
 * guiones propios ("Ta - Ta"), así que se corta en la PRIMERA aparición de
 * `- Suc` y no se toca el resto.
 *
 * Un local sin sucursal es su propia cadena: con el mínimo de 5 locales
 * calificados para rankear (ver `basket.ts`), los negocios de una sola boca se
 * filtran solos y no hace falta mantener una lista de cadenas a mano.
 */
export function chainOf(name: unknown): { chain: string; branch: string } {
  const text = typeof name === "string" ? name.trim() : "";
  const index = text.indexOf("- Suc");
  if (index < 0) return { chain: text, branch: "" };
  const chain = text.slice(0, index).trim().replace(/[-\s]+$/, "").trim();
  const branch = text
    .slice(index)
    .replace(/^-\s*Suc\.?/i, "")
    .trim();
  return { chain, branch };
}

/**
 * Clave de agrupación de la cadena, y existe porque el catálogo real la escribe
 * de dos maneras: medido sobre los 749 locales, `Farmashop` aparece 123 veces y
 * `FARMASHOP` otras 29. Agrupar por el nombre tal cual publica la misma cadena
 * dos veces en el ranking, con dos precios de canasta distintos y ninguno
 * completo.
 *
 * El nombre para mostrar sigue siendo el que publica el origen; esto sólo une.
 */
export function chainKey(chain: unknown): string {
  return typeof chain === "string" ? fold(chain) : "";
}

export function normalizeArticle(raw: any): PrecioArticle {
  const name = String(raw?.name ?? "").trim();
  const split = name.split(" - ");
  const { qty, unit } = parseUnit(raw?.unidad);
  return {
    id: Number(raw?.id),
    name,
    group: (split[0] || name).trim(),
    variant: split.length > 1 ? split.slice(1).join(" - ").trim() : "",
    unitRaw: String(raw?.unidad ?? "").trim(),
    qty,
    unit,
    image: raw?.imagen ? String(raw.imagen) : null,
  };
}

const coord = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isFinite(number) && number !== 0 ? number : null;
};

export function normalizeStore(raw: any): PrecioStore {
  const name = String(raw?.name ?? "").trim();
  const { chain, branch } = chainOf(name);
  return {
    id: Number(raw?.id),
    name,
    chain,
    branch,
    address: String(raw?.direccion ?? "").trim(),
    lat: coord(raw?.x),
    lon: coord(raw?.y),
    locality: String(raw?.localidad ?? "").trim(),
    department: departmentOf(raw?.localidad),
    phone: String(raw?.tel ?? "").trim(),
    web: String(raw?.web ?? "").trim(),
  };
}

export async function fetchCatalog(): Promise<{ articles: PrecioArticle[]; stores: PrecioStore[] }> {
  const [rawArticles, rawStores] = await Promise.all([
    fetchJson<any[]>(`${SIPC_BASE}/obtenerArticulos`),
    fetchJson<any[]>(`${SIPC_BASE}/obtenerEstablecimientos`),
  ]);
  return {
    articles: (rawArticles || []).map(normalizeArticle).filter((article) => Number.isFinite(article.id)),
    stores: (rawStores || []).map(normalizeStore).filter((store) => Number.isFinite(store.id)),
  };
}
