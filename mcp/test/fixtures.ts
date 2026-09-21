// Shared synthetic fixtures shaped like the real site responses.

export function rental(over: Record<string, unknown> = {}) {
  const offer = {
    source: "infocasas",
    listingId: "infocasas:1",
    url: "https://www.infocasas.com.uy/x/1",
    title: "Apto 2 dorm Pocitos",
    price: 30000,
    currency: "UYU",
    priceUyu: 30000,
    commonExpenses: 5000,
    commonExpensesCurrency: "UYU",
    sellerName: "Inmo Sur",
    sellerType: "inmobiliaria",
    lastSeen: "2026-09-20",
  };
  return {
    key: "montevideo-pocitos-abc",
    title: "Apto 2 dorm Pocitos",
    propertyType: "apartamento",
    department: "Montevideo",
    neighborhood: "Pocitos",
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
    petsAllowed: true,
    guarantees: ["anda"],
    price: 30000,
    priceUyu: 30000,
    currency: "UYU",
    sources: ["infocasas"],
    offers: [offer],
    matchingOffer: offer,
    firstSeen: "2026-09-01",
    lastSeen: "2026-09-20",
    availability: { count: 0, status: "unconfirmed" },
    ...over,
  };
}
