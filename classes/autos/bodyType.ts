// La carrocería, las puertas y el color de cada aviso.
//
// No hay que salir a buscar nada: la ficha propia del aviso ya los trae (`detail.ts` los lee del
// `ld+json` de Mercado Libre desde el primer día) y hasta hoy no cruzaban la frontera pública.
// Medido contra producción el 2026-09-20: de 20.601 avisos vigentes, 19.460 tienen ficha leída y
// 16.746 declaran carrocería (81,3 %), 17.651 puertas y 17.612 color.
//
// Lo que NO se hace, y por qué:
//   * pedirle la carrocería a la búsqueda de Mercado Libre. La tarjeta no la trae (sólo km, caja y
//     combustible), así que habría que partir el barrido por `VEHICLE_BODY_TYPE` además de por
//     marca y modelo: medido, ~83 % de los avisos están en modelos con más de una carrocería, o sea
//     casi el doble de páginas para un dato que la ficha ya nos dio. Y un 2-8 % de los avisos no
//     tiene el atributo, así que el barrido por carrocería tampoco reemplaza al de modelo.
//   * usar la faceta `VEHICLE_BODY_TYPE` de la página de cada modelo, que sí viene gratis: es la
//     distribución del modelo, no el dato del aviso, y además Mercado Libre OMITE la faceta cuando
//     el modelo tiene una sola carrocería — un Kicks no devuelve ninguna, que es indistinguible de
//     "no sé". Nuestras propias fichas dicen lo mismo y mejor.
//
// El orden de evidencia, de la más firme a la más floja: la ficha propia del aviso (estructurada),
// la carrocería que muestran las fichas de los demás avisos del mismo modelo, y recién al final la
// palabra que el vendedor escribió en el título. Si ninguna alcanza no se publica nada, y un aviso
// sin carrocería no cumple un filtro de carrocería (igual que pasa con los kilómetros).
import { fold } from "./normalize";
import type { CarListing } from "./types";

export const CAR_BODY_TYPES = ["sedan", "hatchback", "suv", "pickup", "rural", "furgon", "monovolumen", "coupe", "cabriolet"] as const;
export type CarBodyType = (typeof CAR_BODY_TYPES)[number];

export interface CarBody {
  type: CarBodyType;
  /** "advert" = lo dice este aviso; "model" = es la carrocería de su modelo en nuestras fichas. */
  basis: "advert" | "model";
}

/** Al menos ocho fichas del modelo, y al menos nueve de cada diez diciendo lo mismo. */
export const BODY_MIN_ADVERTS = 8;
export const BODY_MIN_SHARE = 0.9;

// Las 16 carrocerías que declara Mercado Libre Uruguay (medido 2026-09-20), agrupadas en las nueve
// que un comprador distingue. Crossover y Off-Road van con SUV porque acá son la misma compra;
// Rural queda aparte de SUV porque una familiar no lo es. Furgón y monovolumen NO se mezclan: una
// Fiorino de reparto y una Spin de siete plazas no son el mismo auto.
const FAMILIES: Record<string, CarBodyType> = {
  sedan: "sedan",
  hatchback: "hatchback",
  suv: "suv",
  crossover: "suv",
  "off-road": "suv",
  "off road": "suv",
  offroad: "suv",
  "pick-up": "pickup",
  "pick up": "pickup",
  pickup: "pickup",
  "light truck": "pickup",
  rural: "rural",
  furgon: "furgon",
  van: "furgon",
  minivan: "monovolumen",
  minibus: "monovolumen",
  monovolumen: "monovolumen",
  coupe: "coupe",
  roadster: "coupe",
  cabriolet: "cabriolet",
};

/** El valor crudo de la ficha (`"Sedán"`, `"Pick-Up"`) a la familia que ofrece el filtro. */
export function carBodyFamily(raw: string | null | undefined): CarBodyType | null {
  const key = fold(String(raw ?? "")).replace(/\s+/g, " ").trim();
  return key ? (FAMILIES[key] ?? null) : null;
}

// Lo que el vendedor ESCRIBIÓ, para los avisos sin ficha propia (Facebook y las webs de automotora
// nunca la tienen). Sólo palabras que nombran la carrocería: "Ranger" es una pick-up y "Kicks" un
// SUV, pero eso lo sabe el diccionario por modelo, no esta lista — deducirlo del nombre del modelo
// acá sería adivinar dos veces el mismo dato.
//
// Y va DESPUÉS del diccionario, no antes, porque la palabra suelta es la evidencia más floja de las
// tres: en "Chevrolet Tracker Ltz Rural 5 Puertas" el vendedor usa "rural" con el sentido uruguayo
// de "cinco puertas" y el auto es un SUV, cosa que las 153 fichas de Tracker dicen sin ambigüedad.
// Sólo manda donde el diccionario se abstiene, que es justo donde el modelo tiene de verdad más de
// una carrocería ("Corsa Wagon", "Gol Sedán") y es el título lo único que las distingue.
const TITLE_WORDS: Array<[RegExp, CarBodyType]> = [
  [/\bsedan\b/, "sedan"],
  [/\bhatch(back)?\b/, "hatchback"],
  [/\b(pick ?-? ?up|cabina (simple|doble|y media))\b/, "pickup"],
  [/\b(familiar|station ?wagon|wagon|\bsw\b|break|rural)\b/, "rural"],
  [/\b(furgon|furgoneta|van)\b/, "furgon"],
  [/\b(minivan|monovolumen|minibus)\b/, "monovolumen"],
  [/\b(coupe|roadster)\b/, "coupe"],
  [/\b(cabriolet|convertible|descapotable)\b/, "cabriolet"],
  [/\b(suv|todoterreno|todo terreno)\b/, "suv"],
];

/** La carrocería que nombra el propio texto del aviso, o nada. */
export function statedBodyType(text: string): CarBodyType | null {
  const folded = fold(text);
  for (const [pattern, family] of TITLE_WORDS) if (pattern.test(folded)) return family;
  return null;
}

// Los colores que declaran las fichas, agrupados por familia. El orden importa: "gris plata" tiene
// que caer en plata y no en gris, así que lo más específico va primero.
const COLOURS: Array<[RegExp, string]> = [
  [/\b(plata|plateado|gris plata|silver)\b/, "plata"],
  [/\bbord(o|eaux?|ó)\b/, "bordo"],
  [/\bceleste\b/, "celeste"],
  [/\bblanco\b/, "blanco"],
  [/\bnegro\b/, "negro"],
  [/\bgris\b/, "gris"],
  [/\brojo\b/, "rojo"],
  [/\bazul\b/, "azul"],
  [/\bverde\b/, "verde"],
  [/\b(beige|crema|arena|champagne)\b/, "beige"],
  [/\b(marron|marrón|chocolate)\b/, "marron"],
  [/\b(dorado|oro)\b/, "dorado"],
  [/\bnaranja\b/, "naranja"],
  [/\bamarillo\b/, "amarillo"],
  [/\b(violeta|lila|purpura)\b/, "violeta"],
];
export const CAR_COLORS = [...new Set(COLOURS.map(([, name]) => name))];

/** El color de la ficha a una familia; un color que no está en la lista no se publica. */
export function carColorFamily(raw: string | null | undefined): string | null {
  const text = fold(String(raw ?? ""));
  if (!text) return null;
  for (const [pattern, name] of COLOURS) if (pattern.test(text)) return name;
  return null;
}

/**
 * Le pone carrocería, puertas y color a cada aviso del catálogo.
 *
 * El diccionario por modelo se arma SÓLO con fichas propias: si lo alimentara también lo leído del
 * título, ocho avisos de Facebook que dicen "sedán" le enseñarían al modelo una carrocería que
 * nadie corroboró, y esa adivinanza volvería multiplicada sobre los demás.
 */
export function attachBodyType<T extends CarListing>(
  listings: readonly T[],
): Array<T & { body: CarBody | null; doors: number | null; color: string | null }> {
  const votes = new Map<string, Map<CarBodyType, number>>();
  for (const listing of listings) {
    const family = carBodyFamily(listing.detail?.bodyType);
    if (!family) continue;
    const byFamily = votes.get(listing.marketSlug) ?? new Map<CarBodyType, number>();
    byFamily.set(family, (byFamily.get(family) ?? 0) + 1);
    votes.set(listing.marketSlug, byFamily);
  }
  const dominant = new Map<string, CarBodyType>();
  for (const [slug, byFamily] of votes) {
    const total = [...byFamily.values()].reduce((sum, count) => sum + count, 0);
    if (total < BODY_MIN_ADVERTS) continue;
    const [top] = [...byFamily].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (top && top[1] / total >= BODY_MIN_SHARE) dominant.set(slug, top[0]);
  }
  return listings.map(listing => {
    const fromDetail = carBodyFamily(listing.detail?.bodyType);
    const fromModel = fromDetail ? null : (dominant.get(listing.marketSlug) ?? null);
    const fromText = fromDetail || fromModel ? null : statedBodyType(`${listing.title} ${listing.specText ?? ""}`);
    const type = fromDetail ?? fromModel ?? fromText;
    const doors = listing.detail?.doors;
    return {
      ...listing,
      body: type ? { type, basis: fromModel ? ("model" as const) : ("advert" as const) } : null,
      doors: Number.isInteger(doors) && doors! > 0 && doors! < 10 ? doors! : null,
      color: carColorFamily(listing.detail?.color),
    };
  });
}
