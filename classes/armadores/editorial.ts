// El relevamiento editorial: empresas y tiendas que PUBLICAN su tarifa de armado por mueble, con
// la fuente y la fecha de cada precio. Es la única fuente con precios por mueble comparables; las
// demás aportan quién está y dónde.
//
// Los datos viven en `editorialData.json` (copia revisada de docs/research/armadores/editorial.json,
// con sus notas en docs/research/armadores/notes.md). No vencen solos: la página muestra la fecha
// de consulta de cada fuente y avisa cuando el relevamiento tiene más de 90 días.
import data from "./editorialData.json";
import { blankEntry, withZones } from "./entry";
import type { ArmadorContact, ArmadorEntry, ArmadorItem, ArmadorPrice, ArmadorService } from "./types";
import { zoneOfAnyName, zoneOfBarrio } from "./zones";

export interface EditorialProvider {
  id: string;
  name: string;
  kind: "empresa" | "independiente" | "tienda" | "plataforma";
  summary: string | null;
  website: string | null;
  googleName: string | null;
  googlePlaceId?: string | null;
  base: { address: string | null; barrio: string | null; department: string | null };
  coverage: { allMontevideo: boolean; barrios: string[]; outside: string[]; sourceUrl?: string | null };
  services: string[];
  storeOnly: boolean;
  prices: Array<{
    item: string;
    label: string;
    amount: number;
    amountMax: number | null;
    currency: string;
    kind: string;
    conditions: string | null;
    sourceUrl: string;
    publishedAt: string | null;
  }>;
  contacts: Array<{ type: string; value: string; sourceUrl: string }>;
  sources: Array<{ url: string; consultedAt: string; note?: string | null }>;
}

export interface EditorialData {
  reviewedAt: string;
  providers: EditorialProvider[];
}

const ITEMS: ReadonlySet<string> = new Set([
  "ropero", "cama", "cucheta", "comoda", "mesa-de-luz", "escritorio", "rack", "biblioteca", "mesa", "silla", "cocina",
  "bano", "zapatera", "cuna", "exterior", "colgado", "desarmado", "visita", "hora", "otro",
]);
const SERVICES: ReadonlySet<string> = new Set(["armado", "desarmado", "traslado", "colgado", "instalacion", "reparacion"]);
const CONTACT_TYPES: ReadonlySet<string> = new Set(["whatsapp", "phone", "email", "instagram", "facebook"]);

/** "2026-01" o "2026-01-15" valen; cualquier otra cosa no es una fecha que publicar. */
const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(value);

export function editorialEntry(provider: EditorialProvider, reviewedAt: string): ArmadorEntry {
  const consulted = new Map(provider.sources.map(source => [source.url, source.consultedAt]));
  const url = provider.website ?? provider.sources[0]?.url ?? "";
  const entry = blankEntry({ id: `ed:${provider.id}`, source: "editorial", kind: provider.kind, name: provider.name, url }, reviewedAt);
  entry.summary = provider.summary;
  entry.website = provider.website;
  const barrio = provider.base.barrio;
  const zone = barrio ? zoneOfAnyName(barrio) : null;
  entry.base = barrio || provider.base.department
    ? { barrio: zone ? barrio : null, zone, department: provider.base.department, basis: zone ? "editorial" : null }
    : entry.base;
  entry.coverage = withZones({
    allMontevideo: provider.coverage.allMontevideo,
    barrios: provider.coverage.barrios.filter(name => zoneOfBarrio(name)),
    outside: [...provider.coverage.outside, ...provider.coverage.barrios.filter(name => !zoneOfBarrio(name))],
  });
  entry.services = provider.services.filter((s): s is ArmadorService => SERVICES.has(s));
  if (!entry.services.includes("armado")) entry.services.unshift("armado");
  entry.storeOnly = provider.storeOnly;
  entry.placeId = provider.googlePlaceId ?? null;
  entry.prices = provider.prices
    .filter(price => Number.isFinite(price.amount) && price.amount > 0 && (price.currency === "UYU" || price.currency === "USD"))
    .map((price): ArmadorPrice => ({
      item: ITEMS.has(price.item) ? (price.item as ArmadorItem) : "otro",
      label: price.label,
      amount: price.amount,
      amountMax: price.amountMax ?? null,
      currency: price.currency as "UYU" | "USD",
      kind: price.kind === "from" || price.kind === "range" ? price.kind : "exact",
      conditions: price.conditions ?? null,
      sourceUrl: price.sourceUrl,
      observedAt: isDay(price.publishedAt) ? price.publishedAt : (consulted.get(price.sourceUrl) ?? reviewedAt),
      origin: "table",
    }));
  entry.contacts = provider.contacts.filter((c): c is ArmadorContact => CONTACT_TYPES.has(c.type) && !!c.value && !!c.sourceUrl);
  entry.sources = provider.sources.map(source => ({ url: source.url, consultedAt: source.consultedAt, label: source.note || "Fuente" }));
  return entry;
}

export const EDITORIAL: EditorialData = data as EditorialData;

export function editorialEntries(input: EditorialData = EDITORIAL): ArmadorEntry[] {
  return input.providers.map(provider => editorialEntry(provider, input.reviewedAt));
}
