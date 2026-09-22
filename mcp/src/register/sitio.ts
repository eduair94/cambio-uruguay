// Site toolset (sitio): 3 tools over everything the site publishes — guides, tools, glossary,
// directories and data pages — for questions that are not a listing search.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { safe } from "../output.js";
import type { SiteApi } from "../site.js";
import { readPage, searchSite, siteSections } from "../sitio/site.js";

export const SITE_TOOLS = ["search_site", "read_page", "site_sections"] as const;

const READ_ONLY = { readOnlyHint: true, openWorldHint: true } as const;

export function registerSite(server: McpServer, site: SiteApi): void {
  server.registerTool(
    "search_site",
    {
      title: "Buscar en cambio-uruguay.com",
      description:
        "Busca en TODO el sitio: guías (impuestos, aduana y compras en el exterior, tarjetas, bancos, préstamos, sueldo y BPS, alquilar, consumo), herramientas y calculadoras, glosario, directorios y páginas de datos. " +
          "Devuelve las páginas a las que conviene ir (título, sección, URL) y los pasajes de texto que responden, con la fecha en que se leyó cada página. " +
          "Usala para cualquier pregunta que no sea buscar avisos, y para saber a qué página mandar a la persona.",
      inputSchema: {
        query: z.string().min(2).max(200).describe('Pregunta o palabras clave en español: "franquicia courier", "cuánto cobra el BROU por transferir", "aguinaldo".'),
        limit: z.number().int().min(1).max(10).optional().describe("Páginas con texto a devolver (default 6)."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => searchSite(site, input))
  );

  server.registerTool(
    "read_page",
    {
      title: "Leer una página del sitio",
      description:
        "El texto de una página de cambio-uruguay.com con sus secciones, en tramos de 8.000 caracteres (usá offset para seguir). Para citar con precisión lo que search_site encontró. Las cifras son del día en que se leyó la página.",
      inputSchema: {
        page: z.string().min(1).max(300).describe('URL o ruta: "https://cambio-uruguay.com/alquilar-en-uruguay" o "/alquilar-en-uruguay".'),
        offset: z.number().int().min(0).optional().describe("Desde qué carácter seguir (lo indica la respuesta anterior)."),
      },
      annotations: READ_ONLY,
    },
    safe((input) => readPage(site, input))
  );

  server.registerTool(
    "site_sections",
    {
      title: "Secciones del sitio",
      description: "El menú de cambio-uruguay.com: secciones y páginas principales con su URL. Para orientar a la persona sobre qué hay en el sitio y dónde.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    safe(() => siteSections(site))
  );
}
