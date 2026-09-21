#!/usr/bin/env node
// Entry point. Selects the transport from MCP_TRANSPORT:
//   stdio (default) — for local clients (Claude Desktop, Cursor, Cline) via npx.
//   http            — public Streamable-HTTP endpoint (stateless, read-only).

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { httpCambioApi } from "./api.js";
import { buildServer } from "./server.js";
import { DEFAULT_SITE_BASE_URL, httpSiteApi } from "./site.js";
import { parseToolsets, toolsetsFromUrl } from "./toolsets.js";
import { allowedOrigins, corsHeaders } from "./cors.js";

const API_BASE_URL = process.env.API_BASE_URL || "https://api.cambio-uruguay.com";
const TRANSPORT = (process.env.MCP_TRANSPORT || "stdio").toLowerCase();
const PORT = Number(process.env.MCP_HTTP_PORT || 8788);
const ORIGINS = allowedOrigins();

const SITE_BASE_URL = process.env.SITE_BASE_URL || DEFAULT_SITE_BASE_URL;

const api = httpCambioApi(API_BASE_URL);
// One site client per process: its small TTL cache is shared by every request.
const site = httpSiteApi(SITE_BASE_URL);

async function runStdio(): Promise<void> {
  const toolsets = parseToolsets(process.env.MCP_TOOLSETS);
  const server = buildServer(api, { site, toolsets });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the protocol channel; logs go to stderr.
  console.error(`cambio-uruguay MCP server on stdio (API: ${API_BASE_URL}, site: ${SITE_BASE_URL}, toolsets: ${toolsets.join(",")})`);
}

async function runHttp(): Promise<void> {
  // Stateless: a fresh server + transport per request, per the SDK's
  // stateless Streamable-HTTP recipe. Read-only, so no session affinity needed.
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || "/";
    const cors = corsHeaders(req.headers.origin, ORIGINS);
    if (cors) for (const [name, value] of Object.entries(cors)) res.setHeader(name, value);
    if (url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", api: API_BASE_URL, site: SITE_BASE_URL, toolsets: parseToolsets("") }));
      return;
    }
    // /mcp = every toolset; /mcp/alquileres, /mcp/autos, /mcp/productos, /mcp/cambio = one.
    const toolsets = toolsetsFromUrl(url);
    if (!toolsets) {
      res.writeHead(404).end("Not found");
      return;
    }
    // Browser preflight for the site chat; the SDK transport would answer 405.
    if (req.method === "OPTIONS") {
      res.writeHead(cors ? 204 : 403).end();
      return;
    }

    try {
      const server = buildServer(api, { site, toolsets });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, await readBody(req));
    } catch (err) {
      // Never log the request body: household incomes and addresses travel there.
      console.error("MCP request error:", err instanceof Error ? err.message : err);
      if (!res.headersSent) res.writeHead(500).end("Internal error");
    }
  });

  httpServer.listen(PORT, () => {
    console.error(`cambio-uruguay MCP server on http://localhost:${PORT}/mcp (API: ${API_BASE_URL}, site: ${SITE_BASE_URL})`);
  });
}

/** Buffer and JSON-parse the request body (POST requests carry the RPC). */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

const run = TRANSPORT === "http" ? runHttp : runStdio;
run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
