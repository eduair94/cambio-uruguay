import * as cheerio from "cheerio";
import { flatten, parseMoney } from "./normalize";
import type { RentalOfferDetails } from "./types";

/** No HTML, scripts, links or contact data cross from source descriptions into our catalogue. */
export function rentalDescription(value: unknown, limit = 8_000): string {
  if (typeof value !== "string" || !value.trim()) return "";
  // Bound parsing work as well as storage; descriptions are data, not executable markup.
  const $ = cheerio.load(value.slice(0, 40_000), {}, false);
  $("script,style,iframe,object,svg,form,template,noscript").remove();
  $("a[href^='mailto:'],a[href^='tel:']").remove();
  $("br").replaceWith("\n");
  $("p,div,li,h1,h2,h3,h4,section").append("\n");
  return $.root().text()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\b[A-Z0-9._%+-]+\s*@\s*[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
    .replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, "")
    .replace(/\b(?:wa\.me|t\.me|instagram\.com|facebook\.com)\/[^\s<>]+/gi, "")
    // Uruguay landlines/mobiles have eight or nine digits; country codes and separators vary.
    // Requiring a contiguous telephone-shaped sequence keeps “2 dormitorios, 1 baño, 60 m²”.
    .replace(/(?<!\d)\+?\d(?:[\s().\-\u2010-\u2015]*\d){7,14}(?!\d)/g, "")
    .replace(/\B@[\p{L}\p{N}_.]{3,}/gu, "")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, Math.max(0, limit))
    .trim();
}

/** Property media only. Reject executable URLs, credentials and local-network targets. */
export function rentalImages(values: readonly unknown[]): string[] {
  const images = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string" || value.length > 2_048) continue;
    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) continue;
      const host = url.hostname.toLowerCase();
      if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".localhost") ||
        /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith("[")) continue;
      // Signed image links are valid media; do not rewrite their query parameters.
      url.hash = "";
      images.add(url.href);
      if (images.size === 12) break;
    } catch { /* An invalid image URL is simply unavailable. */ }
  }
  return [...images];
}

const area = (value: unknown): number | null => {
  if (value == null || typeof value === "boolean" || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 && number <= 1_000_000 ? number : null;
};

/** Some imported feeds name a hectare count `landAreaM2` without converting its units. */
function checkedLandArea(value: unknown, originalText: string, allowRounded = false): number | null {
  const squareMetres = area(value);
  if (squareMetres === null) return null;
  const text = flatten(originalText);
  for (const match of text.matchAll(/\b(\d[\d.,]*)\s*(?:hectareas?|hectares?|has?)\b/g)) {
    const hectares = parseMoney(match[1]);
    // The same numerical amount in hectares cannot also be that amount in m². Withhold the
    // conflicted field rather than inventing a corrected value. Already converted values stay.
    if (hectares !== null && (
      Math.abs(squareMetres - hectares) < 0.000001 ||
      (allowRounded && Number.isInteger(squareMetres) &&
        (squareMetres === Math.trunc(hectares) || squareMetres === Math.round(hectares)))
    )) return null;
  }
  return squareMetres;
}

/** A terrain's general/total surface can also be an imported, rounded hectare quantity. */
export function checkedRentalArea(value: unknown, originalText: unknown, propertyType?: string): number | null {
  return propertyType === "terreno"
    ? checkedLandArea(value, rentalDescription(originalText), true)
    : area(value);
}

/** Fields are deliberately explicit so unknown publisher metadata cannot leak via object spread. */
export function rentalOfferDetails(input: {
  description?: unknown;
  images?: readonly unknown[];
  builtArea?: unknown;
  totalArea?: unknown;
  landArea?: unknown;
  terraceArea?: unknown;
  amenities?: readonly unknown[];
  guaranteeText?: unknown;
}, originalText?: unknown, propertyType?: string): RentalOfferDetails {
  const description = rentalDescription(input.description, 2_400);
  const landEvidence = `${description}\n${rentalDescription(originalText ?? input.description)}`;
  return {
    description,
    images: rentalImages(input.images || []),
    builtArea: area(input.builtArea),
    totalArea: checkedRentalArea(input.totalArea, landEvidence, propertyType),
    landArea: checkedLandArea(input.landArea, landEvidence),
    terraceArea: area(input.terraceArea),
    amenities: [...new Set((input.amenities || [])
      .filter((value): value is string => typeof value === "string")
      .map(value => rentalDescription(value, 80).replace(/\s+/g, " "))
      .filter(value => value.length >= 2))].slice(0, 32),
    guaranteeText: rentalDescription(input.guaranteeText, 600),
  };
}
