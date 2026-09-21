// supermarket_prices: official SIPC prices (Ministry of Economy) per article and the
// cheapest supermarkets by a matched basket. Whole-basket totals are never ranked:
// a store looks cheaper just by missing items, so the ratio is per matched article.

import { compact, fmt, fold, matchesWords, money, pct, PUBLIC_SITE } from "../format.js";
import type { ToolOutput } from "../output.js";
import { TTL, type SiteApi } from "../site.js";

interface Article {
  articleId: number;
  name: string;
  group?: string;
  variant?: string;
  unitRaw?: string;
  n?: number;
  p10?: number;
  p50?: number;
  p90?: number;
  min?: number;
}

interface StoreRank {
  storeName: string;
  chain?: string;
  department?: string;
  address?: string;
  ratio: number;
  coverage?: number;
  cost?: number;
}

interface PreciosResponse {
  day?: string;
  articles?: Article[];
  basket?: {
    nationalCost?: { total?: number; items?: number };
    cheapestStores?: StoreRank[];
    rankedStores?: StoreRank[];
    scopes?: Array<{ scope: string; stores?: number; qualified?: boolean; note?: string }>;
  };
}

export async function supermarketPrices(site: SiteApi, input: { text?: string; department?: string; limit?: number }): Promise<ToolOutput> {
  const res = await site.get<PreciosResponse>("/api/precios", undefined, { ttlMs: TTL.catalog });
  const limit = Math.max(1, Math.min(25, input.limit ?? 10));
  const articles = input.text
    ? (res.articles ?? []).filter((a) => matchesWords(`${a.name} ${a.group ?? ""} ${a.variant ?? ""}`, input.text)).slice(0, limit)
    : [];
  const dept = input.department ? fold(input.department) : "";
  const ranked = (res.basket?.rankedStores ?? res.basket?.cheapestStores ?? [])
    .filter((s) => !dept || fold(s.department ?? "") === dept)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 8);
  const scope = res.basket?.scopes?.find((s) => fold(s.scope) === `dept:${dept}`);
  const lines: string[] = [];
  if (input.text) {
    lines.push(articles.length ? `Precios oficiales (SIPC) al ${res.day ?? "s/d"}:` : `No hay artículos del SIPC que coincidan con "${input.text}".`);
    lines.push(
      ...articles.map(
        (a) => `• ${a.name}${a.unitRaw ? ` (${a.unitRaw})` : ""}: mediana ${money(a.p50)}, barato ${money(a.p10)}, caro ${money(a.p90)} — ${fmt(a.n ?? 0)} locales`
      )
    );
  }
  if (ranked.length) {
    lines.push(`Supermercados más baratos${input.department ? ` en ${input.department}` : " del país"} (canasta emparejada de ${res.basket?.nationalCost?.items ?? 33} artículos):`);
    lines.push(
      ...ranked.map(
        (s) =>
          `• ${s.storeName}${s.address ? `, ${s.address}` : ""}${s.department && !dept ? ` (${s.department})` : ""}: ${pct(1 - s.ratio)} más barato que la mediana del país` +
          (s.coverage ? ` (sobre el ${pct(s.coverage)} de la canasta)` : "")
      )
    );
  } else if (input.department) lines.push(scope?.note ?? `Sin suficientes locales calificados en ${input.department}.`);
  if (res.basket?.nationalCost?.total) lines.push(`Canasta básica de referencia: ${money(res.basket.nationalCost.total)} a precio mediano nacional.`);
  lines.push(`Fuente: Sistema de Información de Precios al Consumidor (MEF). Página: ${PUBLIC_SITE}/precios-de-supermercado-uruguay`);
  return {
    text: lines.join("\n"),
    data: {
      day: res.day ?? null,
      articles,
      cheapestStores: ranked.map((s) => compact({ ...s, cheaperThanMedianPct: Math.round((1 - s.ratio) * 1000) / 10 })),
      basketTotalUyu: res.basket?.nationalCost?.total ?? null,
    },
  };
}
