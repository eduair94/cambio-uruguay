// Qué modelos leer en cada corrida de `currency-autos-models` y cómo mezclar lo leído con lo guardado.
//
// Presupuesto por corrida (Gemini es una cuota compartida con el resto del sitio): primero los
// modelos que nunca se leyeron, después los que tuvieron una falla hace más de una semana y por
// último los que pasaron el mes; a igualdad, el que tiene más avisos. La regla de siempre: una
// fuente caída conserva lo anterior, y "no encontré nada" no borra lo que ya había.
import type { CarModelInfoRecord, CarModelVideo, CarModelWiki } from "./types";

export const MODEL_INFO_MIN_LISTINGS = 8;
export const MODEL_INFO_REFRESH_DAYS = 30;
export const MODEL_INFO_RETRY_DAYS = 7;

const DAY = 86_400_000;

export interface CarModelTarget {
  marketSlug: string;
  brand: string;
  model: string;
  listings: number;
}

export function planModelInfoTargets(
  models: readonly CarModelTarget[],
  previous: ReadonlyMap<string, CarModelInfoRecord>,
  now: Date,
  budget: number,
): CarModelTarget[] {
  const ranked = models
    .filter((model) => model.listings >= MODEL_INFO_MIN_LISTINGS)
    .map((model) => {
      const record = previous.get(model.marketSlug);
      if (!record) return { model, rank: 0, age: Infinity };
      const age = now.getTime() - Date.parse(record.readAt);
      if (record.failures.length && age >= MODEL_INFO_RETRY_DAYS * DAY) return { model, rank: 1, age };
      if (age >= MODEL_INFO_REFRESH_DAYS * DAY) return { model, rank: 2, age };
      return null;
    })
    .filter((item): item is { model: CarModelTarget; rank: number; age: number } => !!item)
    .sort((a, b) => a.rank - b.rank || b.model.listings - a.model.listings || b.age - a.age || a.model.marketSlug.localeCompare(b.model.marketSlug));
  return ranked.slice(0, Math.max(0, budget)).map((item) => item.model);
}

export interface CarModelReading {
  /** undefined = la fuente falló; null = contestó que no hay artículo. */
  wiki: CarModelWiki | null | undefined;
  /** undefined = la fuente falló. */
  videos: CarModelVideo[] | undefined;
}

export function mergeModelInfo(
  target: CarModelTarget,
  previous: CarModelInfoRecord | undefined,
  reading: CarModelReading,
  now: Date,
): CarModelInfoRecord {
  const at = now.toISOString();
  const failures: string[] = [];
  let wiki = previous?.wiki;
  let wikiReadAt = previous?.wikiReadAt ?? null;
  if (reading.wiki === undefined) failures.push("wikipedia");
  else if (reading.wiki || !previous?.wiki) {
    // Igual que con los videos: un "no hay artículo" no borra uno bueno que ya estaba (cambia el
    // orden de la búsqueda o la heurística, no la enciclopedia).
    wiki = reading.wiki;
    wikiReadAt = at;
  }
  let videos = previous?.videos ?? [];
  let videosReadAt = previous?.videosReadAt ?? null;
  if (reading.videos === undefined) failures.push("youtube");
  else if (reading.videos.length || !videos.length) {
    // Una búsqueda que esta vez no trajo nada no es prueba de que los videos de antes ya no sirvan.
    videos = reading.videos;
    videosReadAt = at;
  }
  const record: CarModelInfoRecord = {
    marketSlug: target.marketSlug,
    brand: target.brand,
    model: target.model,
    readAt: at,
    wikiReadAt,
    videos,
    videosReadAt,
    failures,
  };
  if (wiki !== undefined) record.wiki = wiki;
  return record;
}
