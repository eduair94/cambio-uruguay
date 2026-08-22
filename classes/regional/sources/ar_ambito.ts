// Argentina — Ámbito Financiero (mercados.ambito.com).
//
// Eight separate endpoints, one per market, and the only source in the set that
// publishes the DAY'S CHANGE together with the price. That matters because every
// other source hands us a level: without the previous close, "the blue is at
// 1550" cannot answer "did it move today", and reconstructing it would mean
// storing our own close and trusting our own clock.
//
// Ámbito's endpoints answer with Argentine number formatting (`1.530,00`) and
// `dd/mm/yyyy - HH:MM` dates, so everything goes through `parseLocaleNumber`.
// The single-price markets (CCL, MEP, cripto) repeat the same value in `compra`
// and `venta`; that is not a zero spread, it is a market with one price, and the
// row carries it as `avg` rather than inventing two legs.
import { makeQuote, parseLocaleNumber } from "../quote";
import { fetchJson } from "../net";
import type { RegionalKind, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "ar_ambito",
  name: "Ámbito Financiero",
  country: "AR",
  url: "https://www.ambito.com/contenidos/dolar.html",
  access: "api",
  publisher: "media",
  covers: "Oficial, informal, CCL, MEP, cripto, turista, euro y real, cada uno con la variación del día — el único que publica el cambio, no sólo el nivel.",
};

const BASE = "https://mercados.ambito.com";

interface AmbitoRow {
  compra?: string;
  venta?: string;
  valor?: string;
  ultimo?: string;
  fecha?: string;
  variacion?: string;
  valor_cierre_ant?: string;
}

interface AmbitoSpec {
  path: string;
  market: string;
  label: string;
  kind: RegionalKind;
  base: string;
  /** Endpoints that publish one price rather than a two-sided market. */
  single?: boolean;
}

const SPECS: AmbitoSpec[] = [
  { path: "/dolar/oficial/variacion", market: "oficial", label: "Dólar oficial", kind: "official", base: "USD" },
  { path: "/dolar/informal/variacion", market: "blue", label: "Dólar blue", kind: "parallel", base: "USD" },
  { path: "/dolarrava/cl/variacion", market: "contadoconliqui", label: "Contado con liquidación", kind: "financial", base: "USD", single: true },
  { path: "/dolarrava/mep/variacion", market: "bolsa", label: "Dólar MEP (bolsa)", kind: "financial", base: "USD", single: true },
  { path: "/dolarcripto/variacion", market: "cripto", label: "Dólar cripto", kind: "financial", base: "USD", single: true },
  { path: "/dolarturista/variacion", market: "tarjeta", label: "Dólar tarjeta / turista", kind: "card", base: "USD" },
  { path: "/euro/oficial/variacion", market: "oficial", label: "Euro oficial", kind: "official", base: "EUR" },
  { path: "/real/variacion", market: "oficial", label: "Real oficial", kind: "official", base: "BRL" },
];

export async function fetchArAmbito(): Promise<RegionalQuote[]> {
  const rows = await Promise.all(
    SPECS.map(async (spec) => {
      const url = `${BASE}${spec.path}`;
      const data = await fetchJson<AmbitoRow>(url);
      if (!data) return null;

      const buy = parseLocaleNumber(data.compra, "latam");
      const sell = parseLocaleNumber(data.venta, "latam");
      const single = parseLocaleNumber(data.valor ?? data.ultimo, "latam");
      const variation = parseLocaleNumber(data.variacion, "latam");

      return makeQuote({
        country: "AR",
        market: spec.market,
        label: spec.label,
        kind: spec.kind,
        base: spec.base,
        quote: "ARS",
        buy: spec.single ? null : buy,
        sell: spec.single ? null : sell,
        avg: spec.single ? (single ?? buy ?? sell) : null,
        variationPct: variation,
        updatedAt: data.fecha,
        source: meta.id,
        sourceUrl: url,
      });
    })
  );

  return rows.filter((row): row is RegionalQuote => row !== null);
}
