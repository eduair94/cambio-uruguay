// get_rental: one property with every advert that publishes it, its market
// comparison and the public-data profile of its neighbourhood.

import { compact, fmt, isoDay, money, pct, truncate } from "../format.js";
import type { ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";
import { compactRental, offerExpensesUyu, rentalLine } from "./compact.js";
import { GUARANTEE_LABEL, QUALITY_LABEL, SOURCE_LABEL, type RawRental } from "./types.js";

interface FichaResponse {
  property: RawRental;
  usdUyu?: number;
  market?: {
    status?: string;
    sampleSize?: number;
    medianRentUyu?: number;
    p25RentUyu?: number;
    p75RentUyu?: number;
    differencePercent?: number;
    scope?: Record<string, unknown>;
  };
  similar?: RawRental[];
}

interface ZoneProfile {
  name?: string;
  utilities?: {
    water?: { notices?: number; hours?: number } | null;
    claims?: { perThousand?: Record<string, number> } | null;
    levels?: Record<string, string>;
  };
  meta?: { water?: { periodFrom?: string; periodTo?: string }; claims?: { periodFrom?: string; periodTo?: string } };
  crime?: { total?: number; periodFrom?: string; periodTo?: string } | null;
}

const LEVEL_LABEL: Record<string, string> = { low: "bajo", medium: "medio", high: "alto" };

export async function getRental(site: SiteApi, input: { key: string }): Promise<ToolOutput> {
  const key = input.key.trim().replace(/^https?:[/][/][^/]+[/]alquileres[/]/, "").split(/[?#]/)[0]!;
  const ficha = await site.get<FichaResponse>(`/api/rentals/ficha/${encodeURIComponent(key)}`, undefined, {
    ttlMs: TTL.search,
  });
  const usdUyu = Number(ficha.usdUyu) || 0;
  const p = ficha.property;
  const main = compactRental(p, usdUyu);
  const zoneId = p.officialZone?.zone;
  const zone = zoneId
    ? await site
        .get<ZoneProfile>("/api/rentals/zone-profile", { zone: zoneId, department: p.department }, { ttlMs: TTL.catalog })
        .catch(() => null)
    : null;

  const offers = (p.offers ?? []).map((o) =>
    compact({
      source: SOURCE_LABEL[o.source ?? ""] ?? o.source,
      price: money(o.price, o.currency),
      priceUyu: o.priceUyu,
      expensesUyu: offerExpensesUyu(o, usdUyu),
      advertiser: o.sellerName,
      advertiserType: o.sellerType,
      agencyProfile: o.agency?.profileUrl,
      url: o.url,
      publishedAt: isoDay(o.publishedAt),
      lastSeen: isoDay(o.lastSeen),
    })
  );
  const details = p.matchingOffer?.details ?? p.offers?.find((o) => o.details)?.details;
  const market = ficha.market?.status === "available" ? ficha.market : undefined;
  const levels = zone?.utilities?.levels ?? {};
  const zoneData = zone
    ? compact({
        name: zone.name,
        levels: Object.fromEntries(
          Object.entries(levels).map(([k, v]) => [QUALITY_LABEL[k] ?? k, LEVEL_LABEL[v] ?? v])
        ),
        waterCuts: zone.utilities?.water ?? undefined,
        claimsPerThousand: zone.utilities?.claims?.perThousand,
        crime: zone.crime ?? undefined,
      })
    : undefined;
  const similar = (ficha.similar ?? []).slice(0, 5).map((s) => compactRental(s, usdUyu));

  const lines = [rentalLine(main)];
  if (offers.length > 1)
    lines.push(
      `Publicada en ${offers.length} avisos: ` +
        offers.map((o) => `${o.source} ${o.price}${o.advertiser ? ` (${o.advertiser})` : ""}`).join(" · ")
    );
  if (details?.description) lines.push(`Descripción: ${truncate(details.description, 1200)}`);
  if (details?.amenities?.length) lines.push(`Comodidades: ${details.amenities.join(", ")}.`);
  if (details?.guaranteeText) lines.push(`Garantía según el aviso: ${truncate(details.guaranteeText, 300)}`);
  else if (p.guarantees?.length) lines.push(`Garantías: ${p.guarantees.map((g) => GUARANTEE_LABEL[g] ?? g).join(", ")}.`);
  if (market?.medianRentUyu)
    lines.push(
      `Mercado (${fmt(market.sampleSize ?? 0)} avisos parecidos del mismo barrio, tipo y dormitorios): mediana ${money(market.medianRentUyu)}, ` +
        `rango típico ${money(market.p25RentUyu)}–${money(market.p75RentUyu)}. ` +
        (typeof market.differencePercent === "number"
          ? `Este aviso está ${market.differencePercent < 0 ? `${pct(-market.differencePercent / 100)} por debajo` : `${pct(market.differencePercent / 100)} por encima`} de la mediana.`
          : "")
    );
  else lines.push("Comparación de mercado: no hay suficientes avisos parecidos para comparar.");
  if (zoneData) {
    const lv = Object.entries(zoneData.levels ?? {}).map(([k, v]) => `${k}: ${v}`).join(", ");
    lines.push(
      `Barrio ${zoneData.name ?? ""}: ${lv || "sin capas de servicios"}` +
        (zone?.crime?.total ? `; ${fmt(zone.crime.total)} delitos denunciados entre ${zone.crime.periodFrom} y ${zone.crime.periodTo}` : "") +
        "."
    );
  }
  if (similar.length) lines.push("Parecidas:", ...similar.map((s, n) => `${n + 1}. ${rentalLine(s)}`));

  return {
    text: lines.join("\n"),
    data: {
      property: main,
      offers,
      description: details?.description ? truncate(details.description, 1200) : null,
      amenities: details?.amenities ?? [],
      guaranteeText: details?.guaranteeText || null,
      areas: details ? compact({ builtM2: details.builtArea, totalM2: details.totalArea }) : null,
      market: market ?? null,
      neighborhood: zoneData ?? null,
      similar,
      siteUrl: main.siteUrl,
    },
  };
}
