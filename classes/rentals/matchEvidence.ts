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
> & { priceUyu: number };

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
  const result: RentalUnitEvidence = { units: [], floors: [], buildings: [], suffixes: [], aspects: [] };
  for (const raw of [listing.address, listing.title]) {
    const text = matchText(raw);
    const unitPattern =
      /\b(?:apto|apt|apartamento|unidad|apartament[o]?\s+n(?:ro|umero))(?![a-z])\.?\s*(?:(?:n(?:ro|umero)?\.?|no\.)\s*[°ºo]?\s*)?[:#-]?\s*(\d{1,4}\s*[a-z]?|[a-z])\b/g;
    for (const match of text.matchAll(unitPattern)) {
      const tail = text.slice((match.index ?? 0) + match[0].length);
      // "Apartamento 2 dormitorios" is a specification, not unit number 2.
      if (
        /^\s*(?:dor|dors|dorm|dorms|dormitorios?|habitaciones?|ba[ñn]os?|amb|ambs|ambientes?|m2|m²|metros)\b/.test(
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

/** Published exact door number. Range starts and street corners are not exact addresses. */
export function exactRentalAddress(listing: RentalMatchCandidate): string | null {
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
  for (const listing of listings) {
    const text = matchText(listing.title);
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
    const header = text.replace(/^(?:alquiler|alquilo|se alquila)\s+(?:de\s+)?/, "");
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
  return allBedrooms.size > 1 || allBathrooms.size > 1;
}
