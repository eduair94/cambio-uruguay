// La fusión diaria del directorio de armadores: une lo leído hoy con lo guardado, vence lo que
// dejó de verse, junta a Google con el relevamiento editorial y colapsa avisos repetidos.
//
// La ausencia no es una afirmación: una fuente que no corrió (Facebook sin sesión, el puente de ML
// caído, Google fuera de su semana) conserva sus filas como estaban, con su `lastSeen` viejo, y
// el vencimiento las saca sólo cuando pasaron 14 días (avisos) o 30 (Google) sin verlas.
import { AD_TTL_DAYS, GOOGLE_TTL_DAYS, type ArmadorEntry, type ArmadorSource } from "./types";

export interface FreshRead {
  editorial: ArmadorEntry[];
  /** null = la fuente no corrió en esta pasada. */
  google: ArmadorEntry[] | null;
  facebook: ArmadorEntry[] | null;
  mercadolibre: ArmadorEntry[] | null;
}

/** Día de Uruguay (UTC−3) en AAAA-MM-DD. */
export function uyDay(now: Date): string {
  return new Date(now.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const TTL: Record<Exclude<ArmadorSource, "editorial">, number> = {
  google: GOOGLE_TTL_DAYS,
  facebook: AD_TTL_DAYS,
  mercadolibre: AD_TTL_DAYS,
};

const fold = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Palabras que cualquier armador tiene en el nombre: no identifican a nadie. */
const GENERIC = new Set([
  "armador", "armadores", "armado", "armados", "armadora", "desarmado", "desarmados", "desarmador", "de", "del", "muebles",
  "mueble", "montevideo", "mvd", "a", "al", "domicilio", "y", "e", "el", "la", "los", "las", "servicio", "servicios", "en",
  "uruguay", "carpinteria", "montaje", "profesional", "profesionales", "integral",
]);
const distinctive = (name: string): string[] => fold(name).split(" ").filter(word => word && !GENERIC.has(word));

/** El nombre del negocio de Google lleva todas las palabras propias del prestador editorial. */
function sameBusiness(editorial: ArmadorEntry, google: ArmadorEntry): boolean {
  if (editorial.placeId && editorial.placeId === google.placeId) return true;
  const own = distinctive(editorial.name);
  if (!own.length) return false;
  const theirs = new Set(fold(google.name).split(" "));
  return own.every(word => theirs.has(word));
}

function absorbGoogle(editorial: ArmadorEntry, matches: ArmadorEntry[]): ArmadorEntry {
  const best = [...matches].sort((a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0))[0]!;
  const located = matches.find(match => match.base.basis === "coordinates" && match.base.department === "Montevideo") ?? matches.find(match => match.base.zone);
  return {
    ...editorial,
    placeId: editorial.placeId ?? best.placeId,
    rating: best.rating ?? editorial.rating,
    // La dirección relevada manda; la coordenada de Google sólo llena una base vacía.
    base: editorial.base.zone || !located ? editorial.base : located.base,
    sources: [...editorial.sources, ...matches.flatMap(match => match.sources)],
  };
}

const cardAmount = (entry: ArmadorEntry): string => {
  const card = entry.prices.find(price => price.origin === "ad-card");
  return card ? `${card.currency}${card.amount}` : "-";
};

export function mergeEntries(previous: readonly ArmadorEntry[], fresh: FreshRead, now: Date): ArmadorEntry[] {
  const day = uyDay(now);
  const before = new Map(previous.map(entry => [entry.id, entry]));
  const seen = (entry: ArmadorEntry): ArmadorEntry => ({ ...entry, firstSeen: before.get(entry.id)?.firstSeen ?? entry.firstSeen ?? day, lastSeen: day });

  const bySource = (source: Exclude<ArmadorSource, "editorial">): ArmadorEntry[] => {
    const read = fresh[source];
    const carried = previous.filter(entry => entry.source === source);
    if (!read) return carried.filter(entry => daysBetween(entry.lastSeen, day) <= TTL[source]);
    const ids = new Set(read.map(entry => entry.id));
    return [
      ...read.map(seen),
      ...carried.filter(entry => !ids.has(entry.id) && daysBetween(entry.lastSeen, day) <= TTL[source]),
    ];
  };

  let google = bySource("google");
  const editorial = fresh.editorial.map(entry => {
    const matches = google.filter(place => sameBusiness(entry, place));
    google = google.filter(place => !matches.includes(place));
    return seen(matches.length ? absorbGoogle(entry, matches) : entry);
  });

  // El mismo aviso republicado: mismo título (sin mayúsculas ni tildes) y mismo precio de tarjeta.
  const collapse = (entries: ArmadorEntry[]): ArmadorEntry[] => {
    const kept = new Map<string, ArmadorEntry>();
    for (const entry of [...entries].sort((a, b) => b.prices.length - a.prices.length || b.lastSeen.localeCompare(a.lastSeen) || a.id.localeCompare(b.id, "en", { numeric: true }))) {
      const key = `${fold(entry.name)}|${cardAmount(entry)}`;
      if (!kept.has(key)) kept.set(key, entry);
    }
    return [...kept.values()];
  };

  return [...editorial, ...google, ...collapse(bySource("facebook")), ...collapse(bySource("mercadolibre"))]
    .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
}

const nonEditorial = (entries: readonly ArmadorEntry[]): number => entries.filter(entry => entry.source !== "editorial").length;

/** Motivo para NO escribir: la corrida trae menos de la mitad de lo que había (si había ≥ 20). */
export function snapshotIsThin(next: readonly ArmadorEntry[], previous: readonly ArmadorEntry[]): string | null {
  const had = nonEditorial(previous);
  const has = nonEditorial(next);
  if (had < 20 || has * 2 >= had) return null;
  return `la corrida trae ${has} filas no editoriales contra ${had} guardadas`;
}
