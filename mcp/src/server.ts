// MCP server wiring: registers each toolset over its data seam. No transport concerns
// here (see index.ts). `cambio` reads the rates API; the rest read the public site API.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CambioApi } from "./api.js";
import { serverInstructions } from "./instructions.js";
import { registerCars } from "./register/cars.js";
import { registerExchange } from "./register/exchange.js";
import { registerProducts } from "./register/products.js";
import { registerCarPrompts, registerProductPrompts, registerRentalPrompts } from "./register/prompts.js";
import { registerRentals } from "./register/rentals.js";
import { registerSite } from "./register/sitio.js";
import { httpSiteApi, VERSION, type SiteApi } from "./site.js";
import { TOOLSETS, type Toolset } from "./toolsets.js";

export interface BuildOptions {
  /** Upstream for rentals, cars, products and the site search; defaults to the public site. */
  site?: SiteApi;
  /** Which toolsets to expose; defaults to all of them. */
  toolsets?: readonly Toolset[];
}

export function buildServer(api: CambioApi, options: BuildOptions = {}): McpServer {
  const toolsets = options.toolsets?.length ? options.toolsets : TOOLSETS;
  const server = new McpServer({ name: "cambio-uruguay", version: VERSION }, { instructions: serverInstructions(toolsets) });
  const needsSite = toolsets.some((t) => t !== "cambio");
  const site = needsSite ? options.site ?? httpSiteApi() : undefined;

  if (toolsets.includes("cambio")) registerExchange(server, api);
  if (site && toolsets.includes("alquileres")) {
    registerRentals(server, site);
    registerRentalPrompts(server);
  }
  if (site && toolsets.includes("autos")) {
    registerCars(server, site);
    registerCarPrompts(server);
  }
  if (site && toolsets.includes("productos")) {
    registerProducts(server, site);
    registerProductPrompts(server);
  }
  if (site && toolsets.includes("sitio")) registerSite(server, site);
  return server;
}
