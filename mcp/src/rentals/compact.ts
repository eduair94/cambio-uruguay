// One rental property → the compact shape every rental tool returns, and its
// one-line text rendering. The monthly total only exists when the SAME advert
// publishes its common expenses: mixing one portal's rent with another's
// expenses would produce a figure no advert offers.

import { compact, fmt, isoDay, money, PUBLIC_SITE } from "../format.js";
import { GUARANTEE_LABEL, SOURCE_LABEL, type RawOffer, type RawRental } from "./types.js";

export interface CompactRental {
  key: string;
  title: string;
  type?: string;
  department?: string;
  neighborhood?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaM2?: number;
  rent: { amount?: number; currency?: string; uyu?: number };
  expensesUyu?: number;
  monthlyUyu?: number;
  guarantees?: string[];
  pets?: boolean;
  parking?: boolean;
  furnished?: boolean;
  sources?: string[];
  advertiser?: { name?: string; type?: string };
  listingUrl?: string;
  siteUrl: string;
  firstSeen?: string;
  lastSeen?: string;
  reported?: string;
  distanceKm?: number;
}

/** Common expenses of one advert in pesos, or undefined when it does not publish them. */
export function offerExpensesUyu(offer: RawOffer | undefined, usdUyu: number): number | undefined {
  const amount = offer?.commonExpenses;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return undefined;
  if (offer?.commonExpensesCurrency === "USD") return usdUyu > 0 ? Math.round(amount * usdUyu) : undefined;
  return Math.round(amount);
}

export function rentalSiteUrl(key: string): string {
  return `${PUBLIC_SITE}/alquileres/${encodeURIComponent(key)}`;
}

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const bool = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined);

export function compactRental(p: RawRental, usdUyu = 0): CompactRental {
  const offer = p.matchingOffer ?? p.offers?.[0];
  const rentUyu = num(offer?.priceUyu) ?? num(p.priceUyu);
  const expensesUyu = offerExpensesUyu(offer, usdUyu);
  const status = p.availability?.status;
  return compact({
    key: p.key,
    title: String(offer?.title || p.title || "").trim(),
    type: p.propertyType,
    department: p.department,
    neighborhood: p.neighborhood || undefined,
    address: p.address || undefined,
    bedrooms: num(p.bedrooms),
    bathrooms: num(p.bathrooms),
    areaM2: num(p.area),
    rent: compact({ amount: num(offer?.price) ?? num(p.price), currency: offer?.currency ?? p.currency, uyu: rentUyu }),
    expensesUyu,
    monthlyUyu: rentUyu !== undefined && expensesUyu !== undefined ? rentUyu + expensesUyu : undefined,
    guarantees: p.guarantees?.length ? p.guarantees : undefined,
    pets: bool(p.petsAllowed ?? offer?.petsAllowed),
    parking: typeof p.parkingSpaces === "number" ? p.parkingSpaces > 0 : undefined,
    furnished: bool(p.furnished),
    sources: p.sources,
    advertiser: offer?.sellerName ? compact({ name: offer.sellerName, type: offer.sellerType }) : undefined,
    listingUrl: offer?.url,
    siteUrl: rentalSiteUrl(p.key),
    firstSeen: isoDay(p.firstSeen),
    lastSeen: isoDay(p.lastSeen),
    reported: status && status !== "unconfirmed" && (p.availability?.count ?? 0) > 0 ? status : undefined,
    distanceKm: num(p.distanceKm) !== undefined ? Math.round(p.distanceKm! * 100) / 100 : undefined,
  }) as CompactRental;
}

const TYPE_LABEL: Record<string, string> = {
  apartamento: "Apto",
  casa: "Casa",
  habitacion: "Habitación",
  local: "Local",
  oficina: "Oficina",
  garaje: "Garaje",
  terreno: "Terreno",
  otro: "Otro",
};

/** "Apto 2 dorm · 60 m² · Pocitos, Montevideo — $ 30.000 + GC $ 5.000 = $ 35.000/mes · mascotas ✓ · ANDA · InfoCasas" */
export function rentalLine(r: CompactRental): string {
  const bits: string[] = [];
  const head = [
    TYPE_LABEL[r.type ?? ""] ?? r.type ?? "Vivienda",
    r.bedrooms !== undefined ? (r.bedrooms === 0 ? "monoambiente" : `${r.bedrooms} dorm`) : "",
    r.bathrooms !== undefined ? `${r.bathrooms} baño${r.bathrooms === 1 ? "" : "s"}` : "",
    r.areaM2 !== undefined ? `${fmt(r.areaM2)} m²` : "",
  ]
    .filter(Boolean)
    .join(" ");
  bits.push(head);
  const place = [r.neighborhood, r.department].filter(Boolean).join(", ");
  if (place) bits.push(place);
  const rent = money(r.rent.amount, r.rent.currency);
  const price =
    r.monthlyUyu !== undefined
      ? `${rent} + GC ${money(r.expensesUyu)} = ${money(r.monthlyUyu)}/mes`
      : `${rent}/mes (gastos comunes no publicados)`;
  const extras = [
    r.distanceKm !== undefined ? `a ${fmt(r.distanceKm, 1)} km` : "",
    r.pets === true ? "acepta mascotas" : "",
    r.parking ? "garaje" : "",
    r.furnished ? "amueblado" : "",
    r.guarantees?.length ? `garantía: ${r.guarantees.map((g) => GUARANTEE_LABEL[g] ?? g).join(", ")}` : "",
    r.advertiser?.type === "particular" ? "publica un particular" : "",
    r.reported ? "⚠ reportado como no disponible" : "",
    (r.sources ?? []).map((s) => SOURCE_LABEL[s] ?? s).join("/"),
  ].filter(Boolean);
  return `${bits.join(" · ")} — ${price}${extras.length ? ` · ${extras.join(" · ")}` : ""}\n  ${r.title ? `"${r.title}" ` : ""}${r.listingUrl ?? ""}\n  ficha: ${r.siteUrl}`;
}
