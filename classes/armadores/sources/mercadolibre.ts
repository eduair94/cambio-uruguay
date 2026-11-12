// Avisos de armadores en MercadoLibre Servicios (`MLU1540`), por el puente propio (`:9656`).
//
// Medido el 11/11/2026: "armador" en Servicios da ~30 avisos; la tarjeta trae título, enlace e
// imagen, casi nunca precio y NUNCA ubicación. El barrio sale del propio buscador de ML: filtrar
// por departamento (`state`) devuelve el filtro `city` con los barrios de Montevideo y cuántos
// avisos hay en cada uno, y pedir cada barrio dice cuáles son. La ficha del aviso no se lee:
// redirige a la verificación de cuenta de ML (`/gz/account-verification`).
//
// El puente es compartido (autos, sillas, celulares…): pedidos en serie, con pausa entre ellos.
import { blankEntry, withZones } from "../entry";
import { coverageFromText, isAssemblyTitle, servicesFromText } from "../text";
import type { ArmadorEntry } from "../types";
import { zoneOfAnyName, zoneOfBarrio } from "../zones";

export const ML_SERVICES_CATEGORY = "MLU1540";
export const ML_QUERIES = ["armador de muebles", "armado de muebles", "armador", "desarmado"];
/** Ids de departamento de ML (filtro `state`). */
export const ML_STATES: Readonly<Record<string, string>> = Object.freeze({
  Montevideo: "TUxVUE1PTlo2MDIy",
  Canelones: "TUxVUENBTnMxNzliYw",
});

export interface MlServiceItem {
  id: string;
  title: string;
  permalink: string;
  image: string | null;
  price: { amount: number; currency: "UYU" | "USD" } | null;
  state: string;
  city: string | null;
}

type Fetcher = (url: string) => Promise<unknown | null>;

const defaultFetcher: Fetcher = async url => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

interface SearchBody {
  results?: Array<Record<string, any>>;
  available_filters?: Array<{ id?: string; values?: Array<{ id?: string; name?: string; results?: number }> }>;
}

function itemsOf(body: SearchBody | null, state: string, city: string | null): MlServiceItem[] {
  const out: MlServiceItem[] = [];
  for (const r of body?.results ?? []) {
    const id = String(r.id || "").trim();
    const title = String(r.title || "").trim();
    const permalink = String(r.permalink || "").trim();
    // Servicios mezcla carpas, galpones y eventos: sólo lo que anuncia armado de muebles.
    if (!id || !title || !permalink || !isAssemblyTitle(title)) continue;
    const amount = Number(r.price?.amount);
    const currency = String(r.price?.currency || "").toUpperCase();
    out.push({
      id, title, permalink,
      image: typeof r.image === "string" && r.image.startsWith("https://") ? r.image : null,
      price: Number.isFinite(amount) && amount > 0 && (currency === "UYU" || currency === "USD") ? { amount, currency } : null,
      state, city,
    });
  }
  return out;
}

export async function readMlServices(options: {
  base: string;
  queries?: readonly string[];
  states?: Readonly<Record<string, string>>;
  fetcher?: Fetcher;
  gapMs?: number;
}): Promise<{ items: MlServiceItem[]; calls: number; failed: number }> {
  const base = options.base.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? defaultFetcher;
  const items = new Map<string, MlServiceItem>();
  let calls = 0;
  let failed = 0;
  const get = async (params: Record<string, string>): Promise<SearchBody | null> => {
    if (calls && options.gapMs !== 0) await new Promise(resolve => setTimeout(resolve, options.gapMs ?? 1_500));
    calls++;
    const query = new URLSearchParams({ country: "UY", limit: "50", category: ML_SERVICES_CATEGORY, ...params });
    const body = (await fetcher(`${base}/search?${query}`)) as SearchBody | null;
    if (!body || !Array.isArray(body.results)) failed++;
    return body;
  };
  for (const q of options.queries ?? ML_QUERIES) {
    for (const [state, stateId] of Object.entries(options.states ?? ML_STATES)) {
      const all = await get({ q, state: stateId });
      for (const item of itemsOf(all, state, null)) if (!items.has(item.id)) items.set(item.id, item);
      const cities = all?.available_filters?.find(filter => filter.id === "city")?.values ?? [];
      for (const city of cities) {
        if (!city.id || !city.name || !(Number(city.results) > 0)) continue;
        // En Canelones sólo interesan las localidades metropolitanas.
        if (state !== "Montevideo" && zoneOfBarrio(city.name) !== "metropolitana") continue;
        const named = await get({ q, state: stateId, city: city.id });
        for (const item of itemsOf(named, state, city.name)) {
          const known = items.get(item.id);
          if (!known || !known.city) items.set(item.id, { ...(known ?? item), city: city.name });
        }
      }
    }
  }
  return { items: [...items.values()], calls, failed };
}

export function mlEntry(item: MlServiceItem, day: string): ArmadorEntry | null {
  if (!isAssemblyTitle(item.title)) return null;
  const entry = blankEntry({ id: `ml:${item.id}`, source: "mercadolibre", kind: "aviso", name: item.title, url: item.permalink }, day);
  entry.image = item.image;
  entry.coverage = withZones(coverageFromText(item.title));
  // ML llama "Montevideo" a la ciudad cuando el aviso no eligió barrio: eso no es un barrio.
  const zone = item.city && item.city !== item.state ? zoneOfAnyName(item.city) : null;
  if (item.state === "Canelones" && zone !== "metropolitana" && !entry.coverage.zones.length && !entry.coverage.allMontevideo) return null;
  entry.base = zone
    ? { barrio: item.city, zone, department: item.state, basis: "ml-city" }
    : { barrio: null, zone: null, department: item.state, basis: null };
  entry.services = [...new Set<ArmadorEntry["services"][number]>(["armado", ...servicesFromText(item.title)])];
  if (item.price) {
    entry.prices = [{
      item: null, label: "Precio del aviso", amount: item.price.amount, amountMax: null, currency: item.price.currency,
      kind: "ad", conditions: null, sourceUrl: item.permalink, observedAt: day, origin: "ad-card",
    }];
  }
  entry.sources = [{ url: item.permalink, consultedAt: day, label: "MercadoLibre Servicios" }];
  return entry;
}
