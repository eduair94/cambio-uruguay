// Uruguay Emprendedor (uruguayemprendedor.uy): el directorio público de emprendimientos del
// ecosistema de apoyo uruguayo. Medido el 23/11/2026: `/emprendimientos/?pag=N`, 56 páginas de 9
// fichas; por departamento `/emprendimientos/<depto>/?pag=N` (Montevideo, 33 páginas). La ficha
// (`/emprendimiento/<slug>/`) trae los enlaces de contacto, entre ellos el de Instagram, y la
// descripción ("INFORMACIÓN:", "PRODUCTOS Y SERVICIOS:"). Sin robots.txt (404). El servidor dice
// `charset=utf-8` y manda Latin-1: se decodifica por los bytes, no por la cabecera.
//
// Es una fuente uruguaya por sí misma: una cuenta que viene de acá tiene evidencia de Uruguay.
// No se publica nada de la ficha: el teléfono, el correo y el nombre del responsable se quedan acá.
import axios from "axios";
import https from "https";
import tls from "tls";
import { BCU_CERT_CHAIN } from "../../bcurates/certs";
import { handleFromInstagramUrl, normalizeHandle } from "../handles";
import { DEPARTAMENTOS } from "../taxonomy";
import { ABITAB_DV_INTERMEDIATE } from "./certs";

export const UE_BASE = "https://www.uruguayemprendedor.uy";
const UA = "Mozilla/5.0 (compatible; cambio-uruguay/1.0; +https://cambio-uruguay.com/emprendimientos-de-instagram-uruguay)";

export interface UeCard {
  slug: string;
  name: string;
  departamento: string;
}

export interface UeDetail {
  slug: string;
  name: string;
  handle: string | null;
  text: string;
}

/** Bytes → texto: UTF-8 si es UTF-8 válido, si no Latin-1 (lo que de verdad manda este servidor). */
export function decodeHtml(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("latin1").decode(bytes);
  }
}

const strip = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();

/** Las fichas de una página del listado, con el departamento de la URL que se recorrió. */
export function parseUeList(html: string, departamento: string): UeCard[] {
  const cards: UeCard[] = [];
  const seen = new Set<string>();
  for (const match of String(html || "").matchAll(/href="https:\/\/www\.uruguayemprendedor\.uy\/emprendimiento\/([a-z0-9-]{2,120})\/"[^>]*>\s*<h4[^>]*>\s*<b>([\s\S]*?)<\/b>/gi)) {
    const slug = match[1]!;
    if (seen.has(slug)) continue;
    seen.add(slug);
    cards.push({ slug, name: strip(match[2]!).slice(0, 120), departamento });
  }
  return cards;
}

/** El número de la última página que el paginador enlaza (1 si no hay paginador). */
export function ueLastPage(html: string): number {
  let last = 1;
  for (const match of String(html || "").matchAll(/[?&]pag=(\d{1,3})\b/g)) last = Math.max(last, Number(match[1]));
  return Math.min(last, 200);
}

/** La ficha: el Instagram del emprendimiento (no el de Uruguay Emprendedor) y su descripción. */
export function parseUeDetail(html: string, slug: string): UeDetail {
  const page = String(html || "");
  let handle: string | null = null;
  for (const match of page.matchAll(/href="([^"]*instagram\.com\/[^"]*)"/gi)) {
    const found = handleFromInstagramUrl(match[1]!);
    if (found && found !== "uruguayemprendedor") {
      handle = found;
      break;
    }
  }
  // Algunas fichas ponen el handle en el campo del sitio web: `href="http://@kamut.masamadre"`.
  if (!handle) {
    const stuffed = /href="https?:\/\/@([A-Za-z0-9._]{2,30})"/i.exec(page);
    if (stuffed) handle = normalizeHandle(stuffed[1]);
  }
  const name = strip(/itemprop="title">([^<]*)<\/span>\s*<\/a>\s*<\/li>\s*<\/ul>/i.exec(page)?.[1] ?? "").slice(0, 120);
  const body = strip(page);
  const start = body.search(/INFORMACI[OÓ]N:/i);
  // Hasta el pie de la ficha ("Para agregar a favoritos…"): lo que sigue es el sitio, no el emprendimiento.
  const tail = start >= 0 ? body.slice(start) : "";
  const end = tail.search(/Para agregar a favoritos|Imprimir\s+Compartir|¿Te interesa nuestro material/i);
  const text = (end > 0 ? tail.slice(0, end) : tail.slice(0, 900)).replace(/\s+/g, " ").trim().slice(0, 900);
  return { slug, name, handle, text };
}

export interface UeFetcher {
  (url: string): Promise<string | null>;
}

let agent: https.Agent | null = null;
/** El almacén de Node MÁS los dos intermedios que el servidor no manda (ver ./certs.ts). */
export function ueAgent(): https.Agent {
  if (!agent) agent = new https.Agent({ ca: [...tls.rootCertificates, BCU_CERT_CHAIN, ABITAB_DV_INTERMEDIATE], keepAlive: true });
  return agent;
}

export const ueFetch: UeFetcher = async url => {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      httpsAgent: ueAgent(),
      responseType: "arraybuffer",
      timeout: 30_000,
      headers: { "User-Agent": UA, Accept: "text/html" },
      validateStatus: status => status === 200,
    });
    return decodeHtml(new Uint8Array(response.data));
  } catch {
    return null;
  }
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Recorre el listado por departamento (así cada ficha trae su departamento sin adivinarlo).
 * Devuelve las fichas encontradas; `failed` cuenta las páginas que no contestaron.
 */
export async function readUeListings(fetcher: UeFetcher = ueFetch, gapMs = 2_000, budgetMs = 6 * 60_000): Promise<{ cards: UeCard[]; pages: number; failed: number }> {
  const deadline = Date.now() + budgetMs;
  const cards = new Map<string, UeCard>();
  let pages = 0;
  let failed = 0;
  // "cobertura-nacional" va al final: una ficha que ya apareció en su departamento se queda con él.
  for (const path of [...DEPARTAMENTOS.map(d => d.slug), "cobertura-nacional"]) {
    let last = 1;
    for (let page = 1; page <= last; page++) {
      if (Date.now() > deadline) return { cards: [...cards.values()], pages, failed };
      if (pages) await sleep(gapMs);
      const html = await fetcher(`${UE_BASE}/emprendimientos/${path}/${page > 1 ? `?pag=${page}` : ""}`);
      pages++;
      if (!html) {
        failed++;
        break;
      }
      if (page === 1) last = ueLastPage(html);
      const found = parseUeList(html, path === "cobertura-nacional" ? "" : path);
      if (!found.length) break;
      for (const card of found) if (!cards.has(card.slug)) cards.set(card.slug, card);
    }
  }
  return { cards: [...cards.values()], pages, failed };
}
