// MCP server wiring: registers the pure tool handlers as MCP tools over an
// injected `CambioApi`. No transport concerns here (see index.ts).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CambioApi } from "./api.js";
import { bestHouse, convert, getEvolution, getRates, listHouses } from "./tools.js";

const VERSION = "0.1.0";

const fmt = (n: number, d = 2) => Number(n).toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Wrap any value as an MCP tool result with text + structured payload. */
function ok(text: string, structuredContent: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text }], structuredContent };
}

export function buildServer(api: CambioApi): McpServer {
  const server = new McpServer({ name: "cambio-uruguay", version: VERSION });

  server.registerTool(
    "get_rates",
    {
      title: "Get exchange rates",
      description:
        "Current buy/sell rates for a currency across Uruguayan exchange houses (casas de cambio): market average, best buy/sell house, lowest spread, and the full per-house list. Excludes BCU and interbank quotes. Currency is an ISO code like USD, EUR, ARS, BRL.",
      inputSchema: { currency: z.string().describe("ISO currency code, e.g. USD, EUR, ARS, BRL") },
    },
    async ({ currency }) => {
      const r = await getRates(api, { currency });
      const text =
        `${r.currency} on ${r.date.slice(0, 10)} — ${r.houseCount} casas\n` +
        `Market avg: compra ${fmt(r.marketAvgBuy)} / venta ${fmt(r.marketAvgSell)}\n` +
        `Best to sell ${r.currency} (highest buy): ${r.bestBuy.name} @ ${fmt(r.bestBuy.rate)}\n` +
        `Best to buy ${r.currency} (lowest sell): ${r.bestSell.name} @ ${fmt(r.bestSell.rate)}\n` +
        `Lowest spread: ${r.lowestSpread.name} (${fmt(r.lowestSpread.spread)})`;
      return ok(text, r as unknown as Record<string, unknown>);
    }
  );

  server.registerTool(
    "best_house",
    {
      title: "Best exchange house",
      description:
        "The single best casa de cambio right now to buy or sell a currency. side='buy' means you buy the currency (best = lowest sell price); side='sell' means you sell it (best = highest buy price).",
      inputSchema: {
        currency: z.string().describe("ISO currency code, e.g. USD"),
        side: z.enum(["buy", "sell"]).describe("'buy' = you buy the currency; 'sell' = you sell it"),
      },
    },
    async ({ currency, side }) => {
      const r = await bestHouse(api, { currency, side });
      const verb = side === "buy" ? "buy" : "sell";
      return ok(`Best place to ${verb} ${r.currency}: ${r.name} @ ${fmt(r.rate)}`, r as unknown as Record<string, unknown>);
    }
  );

  server.registerTool(
    "convert",
    {
      title: "Convert an amount",
      description:
        "Convert an amount between currencies using the best available Uruguayan market rates. Foreign↔foreign routes through UYU (Uruguayan peso). Codes: USD, EUR, ARS, BRL, UYU, etc.",
      inputSchema: {
        amount: z.number().positive().describe("Amount to convert"),
        from: z.string().describe("Source ISO code, e.g. USD"),
        to: z.string().describe("Target ISO code, e.g. UYU"),
      },
    },
    async ({ amount, from, to }) => {
      const r = await convert(api, { amount, from, to });
      return ok(`${fmt(amount, 2)} ${r.from} = ${fmt(r.result, 2)} ${r.to}  (${r.path})`, r as unknown as Record<string, unknown>);
    }
  );

  server.registerTool(
    "list_houses",
    {
      title: "List exchange houses",
      description: "All Uruguayan exchange houses (casas de cambio) tracked, with display name, website, and departments served.",
      inputSchema: {},
    },
    async () => {
      const houses = await listHouses(api);
      const text = houses.map((h) => `• ${h.name}${h.website ? ` — ${h.website}` : ""}`).join("\n");
      return ok(text, { houses });
    }
  );

  server.registerTool(
    "get_evolution",
    {
      title: "Get rate history",
      description:
        "Historical rate series and statistics (min/max/avg/current/change) for a given exchange house (origin) and currency over the last N months. Use list_houses for valid origin ids.",
      inputSchema: {
        origin: z.string().describe("Exchange house id, e.g. brou, itau, prex"),
        currency: z.string().describe("ISO currency code, e.g. USD"),
        period: z.number().int().positive().max(60).optional().describe("Months of history (default 6)"),
      },
    },
    async ({ origin, currency, period }) => {
      const data = await getEvolution(api, { origin, currency, period });
      return ok(`Evolution for ${origin}/${currency.toUpperCase()} over ${period ?? 6} month(s).`, data as Record<string, unknown>);
    }
  );

  // A ready-made prompt that chains rates + best house into a daily dollar readout.
  server.registerPrompt(
    "analizar-dolar-hoy",
    {
      title: "Analizar el dólar hoy",
      description: "Pull current USD rates and the best houses, then summarize the Uruguayan dollar market for today.",
      argsSchema: {},
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Usá las tools get_rates con currency=USD y best_house para armar un resumen claro del mercado del dólar en Uruguay hoy: promedio de compra/venta, mejor casa para comprar y para vender, y el spread más bajo. Respondé en español rioplatense, breve.",
          },
        },
      ],
    })
  );

  return server;
}
