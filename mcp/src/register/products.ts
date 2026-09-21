// Product toolset (productos): 5 tools over the product and price directories.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { safe } from "../output.js";
import { supermarketPrices } from "../products/groceries.js";
import { planHomeSetup } from "../products/home.js";
import { listDirectories, PRODUCT_VERTICALS, searchProducts } from "../products/search.js";
import { checkOnlineStore } from "../products/stores.js";
import type { SiteApi } from "../site.js";

export const PRODUCT_TOOLS = ["list_directories", "search_products", "plan_home_setup", "check_online_store", "supermarket_prices"] as const;

const READ_ONLY = { readOnlyHint: true, openWorldHint: true } as const;

export function registerProducts(server: McpServer, site: SiteApi): void {
  server.registerTool(
    "list_directories",
    {
      title: "Directorios de cambio-uruguay.com",
      description: "Qué directorios mantiene el sitio (alquileres, ventas, autos, celulares, sillas, tiendas, súper, casas de cambio, couriers, tarjetas, equipar la casa, movilidad eléctrica), cuántos ítems tiene cada uno, su fecha y su link.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    safe(() => listDirectories(site))
  );

  server.registerTool(
    "search_products",
    {
      title: "Buscar productos y precios en Uruguay",
      description:
        "Búsqueda unificada en los directorios de productos, relevados a diario en tiendas uruguayas, Mercado Libre y Facebook Marketplace: celulares (modelo + almacenamiento, precio nuevo más bajo), sillas de escritorio y gamer (con calificación), hogar (38 categorías para equipar una casa: heladera, lavarropas, colchón, cocina, aire acondicionado, TV…, con banda de precio nuevo y usado) y movilidad eléctrica (monopatines, bicicletas eléctricas). " +
        "Devuelve el precio más bajo con vendedor y link, la banda típica (p25–mediana–p75), cuánto ahorra comprar usado y la ficha del sitio. Ordena del más barato al más caro.",
      inputSchema: {
        vertical: z.enum([...PRODUCT_VERTICALS, "todas"]).optional().describe("Directorio (default: todas)."),
        text: z.string().max(80).optional().describe('Palabras a buscar: "heladera no frost", "iphone 13", "silla ergonómica".'),
        brand: z.string().max(40).optional(),
        maxPriceUyu: z.number().positive().optional().describe("Precio máximo en pesos."),
        condition: z.enum(["new", "used", "any"]).optional().describe("used = sólo con banda de usados, al precio usado."),
        limit: z.number().int().min(1).max(30).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => searchProducts(site, input))
  );

  server.registerTool(
    "plan_home_setup",
    {
      title: "Cuánto sale equipar una casa",
      description:
        "Presupuesto para equipar una vivienda vacía (ideal después de alquilar sin amueblar): canasta mínima, decente o completa, línea por línea con precio y si conviene usado o nuevo, restando lo que la persona ya tiene. Si faltan precios de algún ítem el total es parcial y lo dice.",
      inputSchema: {
        level: z.enum(["minima", "decente", "completa"]).optional().describe("minima (lo imprescindible, default), decente, completa."),
        have: z.array(z.string().max(40)).max(40).optional().describe('Lo que ya tiene: "heladera", "colchón", "microondas"…'),
        condition: z.enum(["cheapest", "new"]).optional().describe("cheapest (default: usado cuando conviene) o new (todo nuevo)."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => planHomeSetup(site, input))
  );

  server.registerTool(
    "check_online_store",
    {
      title: "Revisar una tienda online",
      description:
        "Señales fechadas de una tienda online que vende en Uruguay (o de compra en el exterior): antigüedad del dominio, calificación en Google, Trustpilot, menciones en Reddit uruguayo, HTTPS, contacto y RUT visibles, política de devoluciones y medios de pago. Nunca da un veredicto de confianza: presentá las señales y dejá que la persona decida.",
      inputSchema: { name: z.string().min(2).max(120).describe("Nombre, dominio o URL de la tienda.") },
      annotations: READ_ONLY,
    },
    safe((input) => checkOnlineStore(site, input))
  );

  server.registerTool(
    "supermarket_prices",
    {
      title: "Precios de supermercado",
      description:
        "Precios oficiales del SIPC (MEF) por artículo (barato/mediana/caro y cuántos locales) y los supermercados más baratos de un departamento por canasta emparejada de 33 artículos (nunca por total bruto). Útil para estimar el costo de vida al mudarse.",
      inputSchema: {
        text: z.string().max(80).optional().describe('Artículo: "aceite girasol", "leche", "arroz".'),
        department: z.string().max(40).optional(),
        limit: z.number().int().min(1).max(25).optional(),
      },
      annotations: READ_ONLY,
    },
    safe((input) => supermarketPrices(site, input))
  );
}
