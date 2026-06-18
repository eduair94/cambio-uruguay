import { describe, expect, it } from "vitest";
import type { CambioApi, HouseInfo, InsightResult, NewsItem, RateRow } from "cambio-uruguay-mcp/api";
import { handleCommand, type SubscriberStore } from "../src/commands/router.js";

const local: Record<string, HouseInfo> = { brou: { name: "BROU" }, itau: { name: "Itau" } };
function rows(): RateRow[] {
  return [
    { code: "USD", date: "2026-06-17", type: "", origin: "brou", buy: 39, sell: 41, name: "Dólar" },
    { code: "USD", date: "2026-06-17", type: "", origin: "itau", buy: 40, sell: 40.5, name: "Dólar" },
  ];
}
const api: CambioApi = {
  getRates: async () => rows(),
  getLocalData: async () => local,
  getEvolution: async () => ({ evolution: [] }),
  getNews: async (): Promise<NewsItem[]> => [{ title: "Titular", link: "https://x", source: "S", pubDate: "", snippet: "" }],
  getInsight: async (): Promise<InsightResult> => ({ insight: "Resumen IA", type: "market_summary", cached: false, truncated: false }),
};

function memStore(): SubscriberStore & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    subscribe: async (p, c, l) => void calls.push(`sub:${p}:${c}:${l}`),
    unsubscribe: async (p, c) => void calls.push(`unsub:${p}:${c}`),
    setLanguage: async (p, c, l) => void calls.push(`lang:${p}:${c}:${l}`),
  };
}

const cfg = { defaultLang: "es" } as never;
const base = { lang: "es" as const, platform: "telegram" as const, chatId: "42" };

describe("handleCommand", () => {
  it("/dolar returns a USD snapshot with house names", async () => {
    const r = await handleCommand(api, cfg, { ...base, cmd: "dolar", args: [] }, memStore());
    expect(r.text).toContain("USD");
    expect(r.text).toContain("Itau");
  });

  it("/mejor USD compra names a house", async () => {
    const r = await handleCommand(api, cfg, { ...base, cmd: "mejor", args: ["USD", "compra"] }, memStore());
    expect(r.text.toLowerCase()).toContain("itau"); // best buy (lowest sell) = itau
  });

  it("/convertir 100 USD UYU returns a number", async () => {
    const r = await handleCommand(api, cfg, { ...base, cmd: "convertir", args: ["100", "USD", "UYU"] }, memStore());
    expect(r.text).toMatch(/4\.?0?[0-9]{2}/);
  });

  it("/noticias lists headlines", async () => {
    const r = await handleCommand(api, cfg, { ...base, cmd: "noticias", args: [] }, memStore());
    expect(r.text).toContain("Titular");
  });

  it("/resumen returns the AI summary", async () => {
    const r = await handleCommand(api, cfg, { ...base, cmd: "resumen", args: [] }, memStore());
    expect(r.text).toContain("Resumen IA");
  });

  it("/suscribir records a subscription", async () => {
    const store = memStore();
    await handleCommand(api, cfg, { ...base, cmd: "suscribir", args: [] }, store);
    expect(store.calls).toContain("sub:telegram:42:es");
  });

  it("/idioma en updates language", async () => {
    const store = memStore();
    const r = await handleCommand(api, cfg, { ...base, cmd: "idioma", args: ["en"] }, store);
    expect(store.calls).toContain("lang:telegram:42:en");
    expect(r.text.length).toBeGreaterThan(0);
  });

  it("unknown command returns help", async () => {
    const r = await handleCommand(api, cfg, { ...base, cmd: "wat", args: [] }, memStore());
    expect(r.text).toMatch(/\/dolar/);
  });

  it("invalid currency yields a friendly message, not a throw", async () => {
    const badApi: CambioApi = { ...api, getRates: async () => [] };
    const r = await handleCommand(badApi, cfg, { ...base, cmd: "cotizacion", args: ["ZZZ"] }, memStore());
    expect(r.text.length).toBeGreaterThan(0);
  });
});
