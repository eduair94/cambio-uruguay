// What an agent sees in tools/list, checked as a whole: the same things public MCP
// readiness monitors grade (Glimind scored 78/100 on 2026-10-28 for exactly these three).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import type { CambioApi } from "../src/api";
import { buildServer } from "../src/server";
import { fakeSite } from "./fakeSite";

const api: CambioApi = {
  getRates: async () => [],
  getLocalData: async () => ({}),
  getEvolution: async () => ({}),
  getNews: async () => [],
  getInsight: async ({ type }) => ({ insight: "", type, cached: false, truncated: false }),
};

async function listTools() {
  const server = buildServer(api, { site: fakeSite({}).site });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "readiness", version: "1.0.0" });
  await client.connect(clientSide);
  return (await client.listTools()).tools;
}

type Schema = { description?: string; properties?: Record<string, Schema>; items?: Schema };

function undescribed(schema: Schema, path = ""): string[] {
  const missing: string[] = [];
  for (const [key, child] of Object.entries(schema.properties ?? {})) {
    if (!child.description?.trim()) missing.push(path + key);
    missing.push(...undescribed(child, `${path}${key}.`));
    if (child.items) missing.push(...undescribed(child.items, `${path}${key}[].`));
  }
  return missing;
}

// ~4 characters per token; Glimind's count runs ~2.4 % above that, so 4,600 characters is
// ~1,180 of its tokens, under the 1,200 it flags. Every client pays for the whole list on
// every session.
const MAX_CHARS = 4_600;

describe("tools/list readiness", () => {
  it("describes every parameter, nested ones included", async () => {
    const missing = (await listTools()).flatMap((t) => undescribed(t.inputSchema as Schema).map((p) => `${t.name}.${p}`));
    expect(missing).toEqual([]);
  });

  it("declares every tool a safe read, with all four hints spelled out", async () => {
    for (const tool of await listTools())
      expect(tool.annotations, tool.name).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true });
  });

  it("keeps every definition inside its size budget", async () => {
    const over = (await listTools())
      .map((t) => ({ name: t.name, chars: JSON.stringify(t).length }))
      .filter((t) => t.chars > MAX_CHARS);
    expect(over).toEqual([]);
  });

  it("never emits $ref (not every client resolves it)", async () => {
    for (const tool of await listTools()) expect(JSON.stringify(tool.inputSchema), tool.name).not.toContain("$ref");
  });
});
