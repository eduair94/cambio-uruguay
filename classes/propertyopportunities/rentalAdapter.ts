import type { RentalProperty } from "../rentals/types";
import type { OpportunityListing } from "./types";

/** Portal zeroes may be defaults. Only the advert's explicit statement supports no expenses. */
function explicitNoExpenses(title: string, description: string): boolean {
  const own = `${title}\n${description}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\bsin\s+(?:gastos comunes|gc)\b|\b(?:gastos comunes|gc)\s*(?:(?:son|de|:|=)\s*){0,3}(?:\$|uyu|uy\$)?\s*0(?:[.,]0+)?(?![\d.,])\b/.test(own);
}

/** Never reconstruct a legacy advert's physical facts from the canonical property. */
export function rentalOpportunityListings(
  properties: readonly Pick<RentalProperty, "key" | "offers">[],
): OpportunityListing[] {
  const result: OpportunityListing[] = [];
  for (const property of properties) {
    for (const offer of property.offers) {
      const own = offer.identity;
      if (!own || own.version !== 1 || !["apartamento", "casa"].includes(own.propertyType)) continue;
      const details = offer.details;
      const description = own.description ?? details?.description ?? "";
      const area = details?.builtArea != null && details.builtArea > 0
        ? { value: details.builtArea, basis: "built" as const }
        : details?.totalArea != null && details.totalArea > 0
          ? { value: details.totalArea, basis: "total" as const }
          : own.area != null && own.area > 0 ? { value: own.area, basis: "reported" as const } : null;
      const expenses = offer.commonExpenses != null && (offer.commonExpenses !== 0 || explicitNoExpenses(offer.title, description)) &&
        (offer.commonExpenses === 0 || offer.commonExpensesCurrency === "UYU" || offer.commonExpensesCurrency === "USD")
        ? { amount: offer.commonExpenses, currency: offer.commonExpensesCurrency || "UYU" as const } : null;
      result.push({
        id: `rent:${offer.source}:${offer.listingId.replace(new RegExp(`^${offer.source}:`), "")}`,
        operation: "rent", propertyKey: property.key, source: offer.source, listingId: offer.listingId,
        title: offer.title, url: offer.url, image: offer.image, sellerName: offer.sellerName,
        department: own.department, neighborhood: own.neighborhood,
        locality: own.locality?.trim() || (own.department.trim().toLowerCase() === "montevideo" ? "Montevideo" : ""),
        propertyType: own.propertyType as "apartamento" | "casa", bedrooms: own.bedrooms, bathrooms: own.bathrooms,
        area, price: { amount: offer.price, currency: offer.currency }, expenses,
        lastSeen: offer.lastSeen, publishedAt: offer.publishedAt,
        description,
        parkingSpaces: offer.parkingSpaces, furnished: offer.furnished,
        landArea: details?.landArea ?? null,
        amenities: details?.amenities ?? [],
        ...(own.propertyType === "apartamento" && details?.builtArea && details?.totalArea &&
          details.builtArea > details.totalArea * 1.05 && details.builtArea - details.totalArea > 2
          ? { riskFlags: ["attribute_conflict" as const] } : {}),
        ...(!own.addressHidden && own.address ? { address: own.address } : {}),
      });
    }
  }
  return result;
}
