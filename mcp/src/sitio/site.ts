// Site toolset (sitio): everything cambio-uruguay.com publishes, not only its directories.
// search_site answers "what does the site say / which page is it", read_page returns a page's
// text, site_sections the menu. Backed by /api/site/* (the nightly RAG index + the search box's
// own navigation index).

import { compact, isoDay, truncate } from "../format.js";
import type { ToolOutput } from "../output.js";
import { UserInputError } from "../output.js";
import { TTL, type SiteApi } from "../site.js";

interface NavHit {
  title: string;
  description?: string;
  type?: string;
  section?: string;
  path: string;
  url: string;
}

interface ContentHit {
  path: string;
  url: string;
  title: string;
  tier?: "full" | "stub";
  crawledAt?: string | null;
  passages?: Array<{ heading?: string; text?: string }>;
}

interface SearchResponse {
  query?: string;
  pages?: NavHit[];
  content?: ContentHit[];
  contentAvailable?: boolean;
}

interface PageResponse {
  path: string;
  url: string;
  title: string;
  crawledAt?: string | null;
  text: string;
  offset: number;
  totalChars: number;
  nextOffset: number | null;
}

interface SectionsResponse {
  sections?: Array<{ id: string; title: string; pages?: Array<{ title: string; path: string; url: string }> }>;
}

const RETRY_HINT =
  "Probá de nuevo con las palabras que usaría una guía del sitio (\"franquicia\" en vez de \"lo que puedo traer\", \"aguinaldo\" en vez de \"medio sueldo\") o con site_sections para ver qué secciones hay.";

export async function searchSite(site: SiteApi, input: { query: string; limit?: number }): Promise<ToolOutput> {
  const query = input.query.trim();
  if (query.length < 2) throw new UserInputError("Escribí al menos dos letras para buscar en el sitio.");
  const res = await site.get<SearchResponse>("/api/site/search", { q: query, limit: input.limit ?? 6 }, { ttlMs: TTL.search });
  const pages = res.pages ?? [];
  const content = res.content ?? [];

  const lines: string[] = [];
  if (pages.length) {
    lines.push(`Páginas del sitio para «${query}»:`);
    pages.slice(0, 6).forEach((page, i) => {
      const where = page.section ? ` (${page.section})` : "";
      const about = page.description ? ` — ${truncate(page.description, 160)}` : "";
      lines.push(`${i + 1}. ${page.title}${where}: ${page.url}${about}`);
    });
  }
  if (content.length) {
    if (lines.length) lines.push("");
    lines.push("Lo que dice el sitio:");
    content.forEach((hit, i) => {
      const read = isoDay(hit.crawledAt ?? undefined);
      lines.push(`${i + 1}. ${hit.title} — ${hit.url}${read ? ` (texto leído el ${read})` : ""}`);
      for (const passage of hit.passages ?? []) {
        const text = truncate(passage.text?.replace(/\s*\n\s*/g, " "), 600);
        if (text) lines.push(`   ${passage.heading ? `[${passage.heading}] ` : ""}${text}`);
      }
    });
  }
  if (!lines.length) {
    lines.push(`No encontré nada para «${query}» en cambio-uruguay.com. ${RETRY_HINT}`);
  } else {
    lines.push("");
    lines.push(
      "Para leer una página entera usá read_page con su URL. Las cifras de los textos son del día en que se leyeron: para cotizaciones de hoy usá las tools de cambio."
    );
  }
  if (res.contentAvailable === false)
    lines.push("(El índice de textos del sitio no respondió; sólo hay resultados de navegación.)");

  return {
    text: lines.join("\n"),
    data: compact({
      query,
      pages: pages.map((p) => compact({ title: p.title, url: p.url, section: p.section, type: p.type })),
      content: content.map((c) =>
        compact({
          title: c.title,
          url: c.url,
          crawledAt: isoDay(c.crawledAt ?? undefined),
          passages: (c.passages ?? []).map((p) => compact({ heading: p.heading || undefined, text: p.text })),
        })
      ),
      contentAvailable: res.contentAvailable === false ? false : undefined,
    }),
  };
}

export async function readPage(site: SiteApi, input: { page: string; offset?: number }): Promise<ToolOutput> {
  const page = input.page.trim();
  if (!page) throw new UserInputError("Pasá la URL o la ruta de una página de cambio-uruguay.com.");
  if (/^https?:\/\//i.test(page) && !/^https?:\/\/(www\.)?cambio-uruguay\.com(\/|$)/i.test(page))
    throw new UserInputError("read_page sólo lee páginas de cambio-uruguay.com.");
  const res = await site.get<PageResponse>("/api/site/page", { path: page, offset: input.offset ?? 0 }, { ttlMs: TTL.catalog });
  const read = isoDay(res.crawledAt ?? undefined);
  const lines = [
    `# ${res.title}`,
    `${res.url}${read ? ` — texto leído el ${read}; las cifras son de ese día` : ""}`,
    res.offset > 0 ? `(desde el carácter ${res.offset} de ${res.totalChars})` : "",
    "",
    res.text,
  ].filter((line, i) => i !== 2 || line);
  if (res.nextOffset !== null) lines.push("", `[La página sigue: read_page con offset=${res.nextOffset}]`);
  return {
    text: lines.join("\n"),
    data: compact({
      title: res.title,
      url: res.url,
      crawledAt: read,
      offset: res.offset,
      totalChars: res.totalChars,
      nextOffset: res.nextOffset ?? undefined,
    }),
  };
}

export async function siteSections(site: SiteApi): Promise<ToolOutput> {
  const res = await site.get<SectionsResponse>("/api/site/sections", undefined, { ttlMs: TTL.catalog });
  const sections = res.sections ?? [];
  const lines = ["Secciones de cambio-uruguay.com (menú principal):"];
  for (const section of sections) {
    lines.push("", `## ${section.title}`);
    for (const page of section.pages ?? []) lines.push(`- ${page.title}: ${page.url}`);
  }
  lines.push("", "Hay además guías, glosario, herramientas y fichas por casa o producto: buscalas con search_site.");
  return {
    text: lines.join("\n"),
    data: { sections: sections.map((s) => ({ title: s.title, pages: (s.pages ?? []).map((p) => ({ title: p.title, url: p.url })) })) },
  };
}
