import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import type { CambioApi } from "../src/api";
import { CAR_TOOLS } from "../src/register/cars";
import { EXCHANGE_TOOLS } from "../src/register/exchange";
import { PRODUCT_TOOLS } from "../src/register/products";
import { RENTAL_TOOLS } from "../src/register/rentals";
import { SITE_TOOLS } from "../src/register/sitio";
import { buildServer } from "../src/server";
import { SiteError } from "../src/site";
import type { Toolset } from "../src/toolsets";
import { fakeSite } from "./fakeSite";
import { rental } from "./fixtures";

const api: CambioApi = {
  getRates: async () => [],
  getLocalData: async () => ({}),
  getEvolution: async () => ({}),
  getNews: async () => [],
  getInsight: async ({ type }) => ({ insight: "", type, cached: false, truncated: false }),
};

async function connect(toolsets?: Toolset[], routes: Record<string, unknown> = {}) {
  const { site } = fakeSite(routes);
  const server = buildServer(api, { site, toolsets });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientSide);
  return client;
}

const names = async (client: Client) => (await client.listTools()).tools.map((t) => t.name).sort();

describe("buildServer", () => {
  it("exposes every toolset by default (29 tools)", async () => {
    const client = await connect();
    const all = [...EXCHANGE_TOOLS, ...RENTAL_TOOLS, ...CAR_TOOLS, ...PRODUCT_TOOLS, ...SITE_TOOLS].sort();
    expect(await names(client)).toEqual(all);
    expect(all).toHaveLength(29);
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name).sort();
    expect(prompts).toEqual(["analizar-dolar-hoy", "buscar-alquiler", "buscar-auto-usado", "comparar-barrios", "equipar-casa", "evaluar-auto", "evaluar-aviso-alquiler"]);
    expect(client.getInstructions()).toContain("rank_rentals_for_household");
  });

  it("limits tools, prompts and instructions to the requested toolsets", async () => {
    const rentals = await connect(["alquileres"]);
    expect(await names(rentals)).toEqual([...RENTAL_TOOLS].sort());
    expect(rentals.getInstructions()).not.toContain("search_used_cars");
    expect(await names(await connect(["autos"]))).toEqual([...CAR_TOOLS].sort());
    expect(await names(await connect(["productos"]))).toEqual([...PRODUCT_TOOLS].sort());
    expect(await names(await connect(["cambio"]))).toEqual([...EXCHANGE_TOOLS].sort());
    const sitio = await connect(["sitio"]);
    expect(await names(sitio)).toEqual([...SITE_TOOLS].sort());
    expect(sitio.getInstructions()).toContain("search_site");
    expect(sitio.getInstructions()).not.toContain("rank_rentals_for_household");
  });

  it("marks site tools read-only", async () => {
    const client = await connect(["alquileres"]);
    const tool = (await client.listTools()).tools.find((t) => t.name === "search_rentals")!;
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.description).toContain("gastos comunes");
  });

  it("calls a tool end to end", async () => {
    const client = await connect(["alquileres"], {
      "/api/rentals": { meta: { generatedAt: "2026-09-21T00:00:00Z" }, items: [rental()], total: 1, page: 1, perPage: 6 },
    });
    const res = await client.callTool({ name: "search_rentals", arguments: { department: "Montevideo", types: ["apartamento"] } });
    expect(res.isError).toBeFalsy();
    expect((res.content as Array<{ text: string }>)[0]!.text).toContain("1 viviendas coinciden");
    expect((res.structuredContent as { total: number }).total).toBe(1);
  });

  it("returns site failures as tool errors, not protocol errors", async () => {
    const client = await connect(["autos"], { "/api/car-report": new SiteError(429, "Se alcanzó el límite de consultas del sitio; reintentá en un minuto.") });
    const res = await client.callTool({ name: "car_market_report", arguments: {} });
    expect(res.isError).toBe(true);
    expect((res.content as Array<{ text: string }>)[0]!.text).toContain("reintentá en un minuto");
  });

  it("rejects invalid arguments through the schema", async () => {
    const client = await connect(["alquileres"]);
    const res = await client.callTool({ name: "search_rentals", arguments: { bedrooms: 99 } });
    expect(res.isError).toBe(true);
  });
});
