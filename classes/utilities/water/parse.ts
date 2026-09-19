/**
 * OSE's public list of scheduled interruptions ("Interrupciones de servicio de agua potable
 * programadas"), a Drupal view. Each <li> is one notice with department, locality, free-text zone
 * and the announced window. See docs/app/PROPERTY_ZONE_SERVICES.md.
 */
export const OSE_LIST_URL = "https://www.ose.com.uy/interrupciones/programados";

export interface WaterNotice {
  /** Drupal slug, stable per notice. */
  id: string;
  department: string;
  locality: string;
  publishedAt: string;
  zoneText: string;
  from: string;
  to: string;
  /** Emergency notices only publish the end: the start is taken as the publication time. */
  startEstimated: boolean;
  reason: string;
}

const DEPARTMENTS = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
  "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó",
  "Treinta y Tres"];
export const foldText = (value: string): string =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}
function text(html: string): string {
  return decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n").replace(/<[^>]+>/g, " "))
    .split("\n").map(line => line.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
}
function field(block: string, name: string): string | null {
  const start = block.indexOf(`views-field-${name}"`);
  if (start < 0) return null;
  const rest = block.slice(start);
  const next = rest.indexOf('<div class="views-field ', 10);
  return next < 0 ? rest : rest.slice(0, next);
}
function iso(value: string | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
function department(value: string): string | null {
  const folded = foldText(value);
  return DEPARTMENTS.find(item => foldText(item) === folded) || null;
}

/** Notices on one list page. A notice missing an essential field is skipped, never half-stored. */
export function parseOseList(html: string): WaterNotice[] {
  const notices: WaterNotice[] = [];
  const blocks = html.split('<li><div class="views-field views-field-title">').slice(1);
  for (const raw of blocks) {
    const block = raw.slice(0, raw.indexOf("</li>") >= 0 ? raw.indexOf("</li>") : raw.length);
    const id = /href="\/interrupciones\/([a-z0-9-]{1,160})"/.exec(block)?.[1];
    const place = field(block, "nothing");
    const where = place ? /Departamento:<\/span>([^<]*?)-\s*<span[^>]*>Localidad:<\/span>([^<]*)/.exec(place) : null;
    const published = iso(/datetime="([^"]+)"/.exec(field(block, "created") || "")?.[1]);
    const zoneField = field(block, "field-zonaafectada");
    const zoneText = zoneField ? text(zoneField.replace(/^[\s\S]*?Zona Afectada:\s*<\/span>/, "")) : "";
    const window = field(block, "nothing-1") || "";
    const until = iso(/Hasta:<\/span>\s*<time datetime="([^"]+)"/.exec(window)?.[1]);
    const since = iso(/Desde:<\/span>\s*<time datetime="([^"]+)"/.exec(window)?.[1]);
    const reasonField = field(block, "field-motivo");
    const reason = reasonField ? text(reasonField.replace(/^[\s\S]*?Motivo:\s*<\/span>/, "")) : "";
    const dept = where ? department(decode(where[1])) : null;
    if (!id || !dept || !published || !until || !zoneText) continue;
    const from = since || published;
    if (Date.parse(until) <= Date.parse(from)) continue;
    notices.push({
      id, department: dept, locality: decode(where![2]).trim().replace(/\s+/g, " ").slice(0, 80), publishedAt: published,
      zoneText: zoneText.slice(0, 2000), from, to: until, startEstimated: !since, reason: reason.slice(0, 500),
    });
  }
  return notices;
}

/** "Mostrando 1 - 10 de 11363 resultados" → 11363, or null when the header is missing. */
export function oseResultCount(html: string): number | null {
  const match = /Mostrando\s+\d+\s*-\s*\d+\s+de\s+(\d+)\s+resultados/.exec(html);
  return match ? Number(match[1]) : null;
}
