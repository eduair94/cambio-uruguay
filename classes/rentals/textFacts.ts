// What the advert's own words say about two things a reader filters by: whether it comes with
// furniture and whether it is a year-round or a winter contract. Asked on 2026-10-09 by a reader of
// /alquileres-uruguay ("separar por anuales, temporada, invernales, con y sin mueble"). Pure.
//
// Furniture: until then only InfoCasas' structured "Amueblado" facility set it (2.156 of 63.193
// homes seen in ten days), while 2.551 titles and 2.152 more descriptions said it in words and 492
// said "sin muebles". Read conservatively: "con muebles aéreos y bajo mesada" is a kitchen, and an
// advert that offers both ("con o sin amoblar", "amoblado ó sin amoblar") says neither.
//
// Period: a summer stay is priced per night or fortnight and is never published (eligibility.ts);
// a winter contract (March to December on the coast) quotes a month's rent, so it is published
// and marked, and an advert can offer both a year-round and a winter contract.
import { rentalPeriodEvidence } from "./eligibility";
import { flatten } from "./normalize";
import type { RawRental, RentalTerm } from "./types";

const UNFURNISHED = /\b(?:sin muebles|sin amueblar|sin amoblar|sin mobiliario|no (?:esta |se entrega )?(?:amueblad[oa]|amoblad[oa]))\b/g;
const FURNISHED = /\b(?:amueblad[oa]s?|amoblad[oa]s?|semi ?amueblad[oa]s?|semi ?amoblad[oa]s?|full amueblad[oa]|con (?:todos (?:los|sus) |sus )?muebles(?!\s+(?:aereos?|bajo|de |del |en |empotrad|y bajo|para|tipo|nuevos de cocina)))\b/;
// Either is on offer, or furniture is negotiable: no claim either way.
const EITHER = /\bcon o sin (?:muebles|amueblar|amoblar)\b|\b(?:amueblad|amoblad)[oa]\s*(?:o|u|\/)\s*(?:no|sin)\b|\b(?:sin|con)\s+(?:o|u|\/)\s*(?:sin|con)\s+muebles\b|\b(?:opcional(?:mente)?|a eleccion|a convenir|a pedido)\b.{0,25}\b(?:amuebl|amobl|muebles)|\b(?:amuebl|amobl)\w*.{0,25}\b(?:opcional|a eleccion|a convenir|a pedido)\b/;
// "Cocina con muebles…" describes cabinets.
const KITCHEN_BEFORE = /\b(?:cocina|kitchenette|bano|placard|mesada)\b[^.;\n]{0,40}$/;

function furnitureClaim(raw: string): boolean | null {
  const text = flatten(raw);
  if (!text || EITHER.test(text)) return null;
  const unfurnished = new RegExp(UNFURNISHED.source).test(text);
  const rest = text.replace(UNFURNISHED, " ");
  let furnished = false;
  for (const match of rest.matchAll(new RegExp(FURNISHED.source, "g"))) {
    if (/^con\b/.test(match[0]) && KITCHEN_BEFORE.test(rest.slice(0, match.index ?? 0))) continue;
    furnished = true;
    break;
  }
  if (furnished && unfurnished) return null;
  return furnished ? true : unfurnished ? false : null;
}

/**
 * true = the advert says furnished (semi-furnished included), false = it says unfurnished, null =
 * it says neither, or contradicts itself. The title is the advert's headline: the description only
 * speaks when the title is silent, and a title the description contradicts says nothing.
 */
export function furnishedFromText(title: string, description = ""): boolean | null {
  const heading = furnitureClaim(title);
  const body = furnitureClaim(description);
  if (heading !== null && body !== null && heading !== body) return null;
  return heading ?? body;
}

/** The contract periods the advert offers: year-round, winter, both, or none stated. */
export function rentalTermsFromText(title: string, description = ""): RentalTerm[] {
  const period = rentalPeriodEvidence(title, description);
  const terms: RentalTerm[] = [];
  if (period.annual) terms.push("anual");
  if (period.winter) terms.push("invernal");
  return terms;
}

/**
 * A portal's structured "furnished" (InfoCasas' facility) and the advert's words, together. They
 * disagreeing is no claim at all.
 */
export function combineFurnished(portal: boolean | null | undefined, text: boolean | null): boolean | null {
  if (portal === true) return text === false ? null : true;
  return text;
}

/** The text facts on one freshly read advert. Idempotent. */
export function applyRentalTextFacts<T extends Pick<RawRental, "title" | "description" | "details" | "furnished" | "furnishedPortal" | "terms">>(listing: T): T {
  const description = listing.description || listing.details?.description || "";
  return {
    ...listing,
    furnished: combineFurnished(listing.furnishedPortal, furnishedFromText(listing.title, description)),
    terms: rentalTermsFromText(listing.title, description),
  };
}

/**
 * Many adverts about one home: each portal says what it says. Furnished only if some say so and none
 * says the opposite; the periods are every one any advert offers.
 */
export function aggregateFurnished(values: ReadonlyArray<boolean | null | undefined>): boolean | null {
  const yes = values.includes(true);
  const no = values.includes(false);
  return yes && !no ? true : no && !yes ? false : null;
}

export function aggregateTerms(values: ReadonlyArray<readonly RentalTerm[] | undefined>): RentalTerm[] {
  const all = new Set(values.flatMap((terms) => terms ?? []));
  return (["anual", "invernal"] as const).filter((term) => all.has(term));
}
