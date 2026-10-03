// El artículo de Wikipedia de un modelo, para "qué es este auto" en la ficha.
//
// Primero el resumen REST de es.wikipedia para "Marca Modelo" (sigue redirecciones: la Saveiro
// redirige a "Volkswagen Gol", donde se la describe, y eso se acepta y se dice); si no hay, la
// búsqueda de MediaWiki; si tampoco, lo mismo en en.wikipedia. Sólo se acepta un artículo que
// habla de un VEHÍCULO y nombra el modelo (o, por redirección propia de Wikipedia, la marca): sin
// esa guarda "Fiat Uno" encuentra el número uno y "Volkswagen" a secas, el fabricante.
//
// Una falla de red LANZA (el refresco conserva lo que ya había); "no hay artículo" devuelve null.
import axios, { type AxiosInstance } from "axios";
import { namesCar, normalizeText } from "./text";
import type { CarModelWiki } from "./types";

export const WIKI_USER_AGENT =
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/autos-usados-uruguay; used-car model descriptions; contact via site)";

const VEHICLE: Record<CarModelWiki["lang"], RegExp> = {
  es: /autom[oó]vil|veh[ií]culo|camioneta|pick-?up|furg[oó]n|todoterreno|\bsuv\b|utilitario|sed[aá]n|hatchback|monovolumen|crossover|deportivo|\bcoche\b|\bauto\b|cup[eé]/i,
  en: /automobile|\bcar\b|vehicle|pickup|\btruck\b|\bsuv\b|\bvan\b|crossover|sedan|hatchback|minivan|coup[eé]|roadster/i,
};
const NOT_A_MODEL = /fabricante|empresa|compa[nñ][ií]a|marca de|manufacturer|company|automaker|brand of|lista de|list of/i;

export interface WikiSummary {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

/** Es el artículo de un vehículo y no el de la marca, una lista o una desambiguación. */
export function wikiLooksLikeVehicle(summary: WikiSummary, lang: CarModelWiki["lang"]): boolean {
  if (summary.type && summary.type !== "standard") return false;
  const description = summary.description ?? "";
  const lead = `${description} ${(summary.extract ?? "").slice(0, 400)}`;
  if (NOT_A_MODEL.test(description)) return false;
  return VEHICLE[lang].test(lead);
}

/**
 * El título del artículo corresponde al auto. Por búsqueda tiene que nombrar el modelo; por
 * redirección de un título exacto alcanza con la marca (Saveiro → "Volkswagen Gol"), pero nunca la
 * marca sola, que es el artículo del fabricante.
 */
export function wikiTitleFits(title: string, brand: string, model: string, viaRedirect: boolean): boolean {
  if (namesCar(title, brand, model)) return true;
  if (!viaRedirect) return false;
  const normalized = normalizeText(title);
  const brandNorm = normalizeText(brand);
  return normalized !== brandNorm && ` ${normalized} `.includes(` ${brandNorm} `);
}

/** El resumen recortado en el final de una oración, sin pasar de `max` caracteres. */
export function trimExtract(extract: string, max = 700): string {
  const clean = extract.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = cut.lastIndexOf(". ");
  return end > max * 0.4 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

function toWiki(summary: WikiSummary, lang: CarModelWiki["lang"]): CarModelWiki | null {
  const url = summary.content_urls?.desktop?.page;
  if (!summary.title || !url || !summary.extract) return null;
  return {
    lang,
    title: summary.title,
    url,
    extract: trimExtract(summary.extract),
    description: summary.description?.trim() || null,
    thumbnail: summary.thumbnail?.source ?? null,
  };
}

function client(): AxiosInstance {
  return axios.create({
    timeout: 10_000,
    headers: { "User-Agent": WIKI_USER_AGENT, "Api-User-Agent": WIKI_USER_AGENT, Accept: "application/json" },
    validateStatus: (status) => status < 500,
  });
}

async function summaryOf(http: AxiosInstance, lang: CarModelWiki["lang"], title: string): Promise<WikiSummary | null> {
  const res = await http.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, {
    params: { redirect: true },
  });
  if (res.status === 404) return null;
  if (res.status >= 400) throw new Error(`wikipedia ${lang} summary ${res.status}`);
  return res.data as WikiSummary;
}

async function searchTitles(http: AxiosInstance, lang: CarModelWiki["lang"], query: string): Promise<string[]> {
  const res = await http.get(`https://${lang}.wikipedia.org/w/api.php`, {
    params: { action: "query", list: "search", srsearch: query, srlimit: 5, srnamespace: 0, format: "json" },
  });
  if (res.status >= 400) throw new Error(`wikipedia ${lang} search ${res.status}`);
  const hits = (res.data as { query?: { search?: Array<{ title?: string }> } })?.query?.search ?? [];
  return hits.map((hit) => String(hit.title ?? "")).filter(Boolean);
}

export async function findModelWiki(brand: string, model: string, http: AxiosInstance = client()): Promise<CarModelWiki | null> {
  const exact = `${brand} ${model}`;
  for (const lang of ["es", "en"] as const) {
    const direct = await summaryOf(http, lang, exact);
    if (direct?.title && wikiLooksLikeVehicle(direct, lang) && wikiTitleFits(direct.title, brand, model, true)) {
      const found = toWiki(direct, lang);
      if (found) return found;
    }
    const keyword = lang === "es" ? "automóvil" : "car";
    for (const title of await searchTitles(http, lang, `${exact} ${keyword}`)) {
      if (!wikiTitleFits(title, brand, model, false)) continue;
      const summary = await summaryOf(http, lang, title);
      if (summary && wikiLooksLikeVehicle(summary, lang)) {
        const found = toWiki(summary, lang);
        if (found) return found;
      }
    }
  }
  return null;
}
