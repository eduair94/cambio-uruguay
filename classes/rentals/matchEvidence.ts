import { parseStreet } from "./normalize";
import type { RawRental } from "./types";

/** Original per-advert fields only. A property's canonical attributes cannot prove a match. */
export type RentalMatchCandidate = Pick<
  RawRental,
  | "source"
  | "listingId"
  | "title"
  | "image"
  | "department"
  | "neighborhood"
  | "address"
  | "street"
  | "streetNumber"
  | "propertyType"
  | "bedrooms"
  | "bathrooms"
  | "area"
  | "parkingSpaces"
> & {
  priceUyu: number;
  /** Original source description can contradict a match, never establish one. */
  description?: string;
  locality?: string;
  addressHidden?: true;
  latitude?: number | null;
  longitude?: number | null;
};

// Keep ñ distinct: Peñarol and Penarol may be spelling variants, but inference is not identity.
export function matchText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/n\u0303/g, "ñ")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface RentalUnitEvidence {
  units: string[];
  floors: string[];
  buildings: string[];
  /** An unlabelled suffix may be an agency code. It can veto a merge, never establish it. */
  suffixes: string[];
  aspects: string[];
  /** "Second of four apartments" identifies a position, not the registered unit number. */
  positions: string[];
}

const unique = (values: string[]) => [...new Set(values)];
const identifier = (value: string) => value.replace(/^0+(?=\d)/, "").replace(/\s+/g, "");
const ORDINALS: Record<string, string> = {
  primer: "1",
  primero: "1",
  segundo: "2",
  tercer: "3",
  tercero: "3",
  cuarto: "4",
  quinto: "5",
  sexto: "6",
  septimo: "7",
  octavo: "8",
  noveno: "9",
  decimo: "10",
};

export function rentalUnitEvidence(
  listing: Pick<RentalMatchCandidate, "address" | "title">,
): RentalUnitEvidence {
  const result: RentalUnitEvidence = { units: [], floors: [], buildings: [], suffixes: [], aspects: [], positions: [] };
  for (const raw of [listing.address, listing.title]) {
    const text = matchText(raw);
    const unitPattern =
      /\b(?:apto|apt|apartamento|unidad|apartament[o]?\s+n(?:ro|umero))(?![a-z])\.?\s*(?:(?:n(?:ro|umero)?\.?|no\.)\s*[°ºo]?\s*)?[:#-]?\s*(\d{1,4}\s*[a-z]?|[a-z])\b/g;
    for (const match of text.matchAll(unitPattern)) {
      const tail = text.slice((match.index ?? 0) + match[0].length);
      // "Apartamento 2 dormitorios" is a specification, not unit number 2. A shared typo
      // does not establish identity either: the Cordón pair published "5 domitorios".
      // Common missing/transposed letters are vetoes only, never positive unit evidence.
      if (
        /^\s*(?:dor|dors|dorm|dorms|d(?:ormitorio|omitorio|ormtorio|ormitoiro)s?|habitaciones?|ba[ñn]os?|amb|ambs|ambientes?|m2|m²|metros)\b/.test(
          tail,
        )
      )
        continue;
      const fromIdentifier = text.slice((match.index ?? 0) + match[0].length - match[1]!.length);
      // Inspect the complete quantity, not only the regex capture: "100 m²" can capture
      // "100 m" and leave only "²" in the tail. Asking prices also never identify units.
      if (
        /^\d+(?:[.,]\d+)*\s*(?:m(?:2|²)|mts?(?:2|²)?|metros(?:\s+cuadrados)?|pesos?|dolares?|usd|uyu|u\s*\$\s*s|\$u?)(?=$|[\s.,;:!?/)\]-])/.test(
          fromIdentifier,
        )
      )
        continue;
      // "Apartamento 1 -2 dor" / "1 o 2 dormitorios" describe alternatives. The matcher may
      // consume only the first number (or "1 o"), but neither is an identified single unit.
      if (/^\d{1,4}\s*(?:[-–—/]|o|y|a)\s*\d{1,4}(?!\d)/.test(fromIdentifier)) continue;
      if (/^\d+(?:[.,]\d+)?\s*%/.test(fromIdentifier)) continue;
      const value = match[1]!.trim();
      const label = match[0].slice(0, match[0].length - match[1]!.length);
      const explicitlyNumbered = /\bunidad\b|\bn(?:ro|umero)?\.?\s*[°ºo]?|\bno\.|#/.test(label);
      // "Apto 2D" / "Apartamento 1 d" often abbreviate bedrooms. Similar rents/specifications
      // cannot resolve that ambiguity. Require "unidad", N°/número or # to use such a unit ID.
      if (/^[1-6]\s*d$/.test(value) && !explicitlyNumbered) continue;
      // "Apartamento a pasos de la rambla" is prose. A bare letter only identifies a unit when
      // it ends the label or is followed by an explicit separator/floor/building designation.
      if (/^[a-z]$/.test(value) && !/^\s*(?:$|[,;:.-]|(?:piso|torre|bloque|block)\b)/.test(tail)) continue;
      // A lone preposition after "apartamento" is prose, not an identifier.
      if (/^[aeoy]$/.test(value) && /^\s*(?:estrenar|reciclar|reformar|la venta|alquiler)\b/.test(tail))
        continue;
      result.units.push(identifier(value));
    }
    for (const match of text.matchAll(
      /\bpiso\s*(?:n(?:ro|umero)?\.?\s*[°º]?\s*)?(\d{1,2})(?!\d)\b|\b(\d{1,2})(?:[°º]|er|ro|do|to|mo|vo|no)?\s+piso\b/g,
    )) {
      result.floors.push(String(Number(match[1] ?? match[2])));
    }
    for (const [word, number] of Object.entries(ORDINALS)) {
      if (new RegExp(`\\b(?:${word} piso|piso ${word})\\b`).test(text)) result.floors.push(number);
      // Real San Luis adverts distinguish "el segundo de 4 apartamentos" and "el cuarto de 4
      // apartamentos" only in the description. Keep that original distinction as veto evidence.
      const position = text.match(new RegExp(`\\b${word} de (?:los? )?(\\d{1,2}|dos|tres|cuatro|cinco|seis) (?:apartamentos|unidades)\\b`));
      if (position) result.positions.push(`${number}/${QUANTITIES[position[1]!] ?? position[1]}`);
    }
    if (/\bplanta baja\b|\bpb\b/.test(text)) result.floors.push("0");
    for (const match of text.matchAll(/\b(?:torre|bloque|block)\s*[-:#]?\s*(\d{1,3}|[a-z])\b/g)) {
      result.buildings.push(identifier(match[1]!));
    }
    if (/\bcontrafrente\b|\bcontra frente\b/.test(text)) result.aspects.push("back");
    if (/\bal frente\b|\bfrente con\b/.test(text)) result.aspects.push("front");
  }
  const suffix = matchText(listing.title).match(/\s[-–]\s(\d{3,4})\s*$/)?.[1];
  if (suffix) result.suffixes.push(identifier(suffix));
  return Object.fromEntries(
    Object.entries(result).map(([key, values]) => [key, unique(values)]),
  ) as unknown as RentalUnitEvidence;
}

export function conflictingUnitEvidence(a: RentalUnitEvidence, b: RentalUnitEvidence): boolean {
  return (
    new Set([...a.units, ...a.suffixes, ...b.units, ...b.suffixes]).size > 1 ||
    (Object.keys(a) as Array<keyof RentalUnitEvidence>).some(
      (key) => new Set([...a[key], ...b[key]]).size > 1,
    )
  );
}

/** A pin is not a unit ID. Distant original pins do, however, contradict a shared address. */
export function rentalCoordinateDistance(a: RentalMatchCandidate, b: RentalMatchCandidate): number | null {
  const valid = (listing: RentalMatchCandidate) =>
    typeof listing.latitude === "number" && Number.isFinite(listing.latitude) &&
    typeof listing.longitude === "number" && Number.isFinite(listing.longitude) &&
    // Only Uruguayan published coordinates are useful evidence for this directory.
    listing.latitude >= -35.5 && listing.latitude <= -30 &&
    listing.longitude >= -58.5 && listing.longitude <= -53;
  if (!valid(a) || !valid(b)) return null;
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = rad(b.latitude! - a.latitude!);
  const dLon = rad(b.longitude! - a.longitude!);
  const haversine = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude!)) * Math.cos(rad(b.latitude!)) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
}

/** Published exact door number. Range starts and street corners are not exact addresses. */
export function exactRentalAddress(listing: RentalMatchCandidate): string | null {
  if (listing.addressHidden === true) return null;
  const address = matchText(listing.address);
  const department = matchText(listing.department);
  if (!department || !address || !listing.street || !listing.streetNumber) return null;
  if (
    /\b(?:aprox(?:imado|imadamente)?|proximo|proxima|cerca|entre|esq(?:uina)?|altura|cuadra|frente a)\b|\bs\s*\/\s*n\b/.test(
      address,
    )
  )
    return null;
  if (/\b\d{1,5}\s*[-–/]\s*\d{1,5}\b|\bal\s+\d{1,5}\b/.test(address)) return null;
  const parsed = parseStreet(listing.address);
  if (!parsed.street || !/^\d{1,5}(?: bis)?$/.test(parsed.number) || Number.parseInt(parsed.number, 10) === 0)
    return null;
  if (matchText(parsed.street) !== matchText(listing.street) || parsed.number !== listing.streetNumber)
    return null;
  const street = matchText(parsed.street);
  // The legacy street normalizer removes ñ. Do not equate a published ñ to a plain n.
  const enye = address.includes("ñ") ? "ñ" : "";
  return `${department}|${street}|${parsed.number}|${enye}`;
}

const QUANTITIES: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
};
function quantities(text: string, pattern: RegExp): number[] {
  return [...text.matchAll(pattern)].map((match) => QUANTITIES[match[1]!] ?? Number(match[1]));
}

/** Internal title/structured disagreement disqualifies evidence; it does not repair the data. */
export function rentalMatchHasConflicts(...listings: RentalMatchCandidate[]): boolean {
  const allBedrooms = new Set<number>();
  const allBathrooms = new Set<number>();
  const unitEvidence: RentalUnitEvidence[] = [];
  for (const listing of listings) {
    // The description is original per-advert evidence; legacy rows never borrow it from another
    // offer. Broad/multiple-unit copy can veto a match but is never positive identity evidence.
    const description = typeof listing.description === "string" ? listing.description : "";
    const text = matchText([listing.title, description].join("\n"));
    unitEvidence.push(rentalUnitEvidence(listing));
    if (description) unitEvidence.push(rentalUnitEvidence({ title: description, address: "" }));
    const bedrooms = quantities(
      text,
      /\b(\d{1,2}|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|dorms?|bedrooms?)\b/g,
    );
    if (/\bmono\s*ambiente\b/.test(text)) bedrooms.push(0);
    const bathrooms = quantities(text, /\b(\d{1,2}|un|uno|dos|tres|cuatro|cinco|seis)\s*ba[ñn]os?\b/g);
    for (const value of bedrooms) allBedrooms.add(value);
    for (const value of bathrooms) allBathrooms.add(value);
    if (listing.bedrooms != null) allBedrooms.add(listing.bedrooms);
    if (listing.bathrooms != null) allBathrooms.add(listing.bathrooms);
    if (new Set(bedrooms).size > 1 || new Set(bathrooms).size > 1) return true;
    if (listing.bedrooms != null && bedrooms.some((value) => value !== listing.bedrooms)) return true;
    if (listing.bathrooms != null && bathrooms.some((value) => value !== listing.bathrooms)) return true;
    if (
      /\b(?:temporada|temporario|temporal|turistico|invernal)\b|\balquiler (?:de |por )?invierno\b/.test(text)
    )
      return true;
    const header = matchText(listing.title).replace(/^(?:alquiler|alquilo|se alquila)\s+(?:de\s+)?/, "");
    const type = /^(?:apartamento|apto|monoambiente|penthouse|duplex|loft)\b/.test(header)
      ? "apartamento"
      : /^(?:casa|chalet)\b/.test(header)
        ? "casa"
        : /^local\b/.test(header)
          ? "local"
          : /^(?:oficina|consultorio)\b/.test(header)
            ? "oficina"
            : null;
    if (type !== null && type !== listing.propertyType) return true;
  }
  return allBedrooms.size > 1 || allBathrooms.size > 1 ||
    unitEvidence.some((a, index) => unitEvidence.slice(index).some((b) => conflictingUnitEvidence(a, b)));
}
