// El perfil público de una cuenta de Instagram, sin sesión, tal como lo recibe un Chrome.
//
// Medido el 23/11/2026 desde el VPS (13 de 14 cuentas, 2–3 s cada una con 4 s de pausa):
//   * el JSON embebido (`<script type="application/json">`) trae el nodo del usuario: `username`,
//     `full_name`, `biography`, `bio_links` (envueltos en `l.instagram.com/?u=`), `follower_count`,
//     `following_count`, `is_private`, `profile_pic_url` (150 px, firmada);
//   * el HTML dibujado trae la grilla: los 12 posts más recientes como `<a href="/<dueño>/p/<código>/">`
//     con un `<img alt="Photo by X on November 21, 2026. Puede ser una imagen de…" src="…640x640…">`.
//     El dueño de una colaboración es OTRA cuenta (`/peatonaltours/p/…` en el perfil de mondo.popup):
//     es la bola de nieve del descubrimiento;
//   * una cuenta que no existe contesta `<title>Instagram</title>` sin nodo; un `GET` HTTP común no
//     trae nada (la página se dibuja con JavaScript). Las fotos vencen a los ~4 días (`oe=`).
import { launchChrome, sleep, type Page } from "../rentals/sources/social/chrome";
import { normalizeHandle, unwrapInstagramLink } from "./handles";
import type { ProfilePost, ProfileRead } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = Record<string, any>;

function* walk(node: unknown): Generator<Node> {
  if (node && typeof node === "object") {
    yield node as Node;
    for (const value of Array.isArray(node) ? node : Object.values(node)) yield* walk(value);
  }
}

function* embeddedJson(html: string): Generator<unknown> {
  for (const match of String(html || "").matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      yield JSON.parse(match[1]!);
    } catch {
      /* no es JSON, o viene cortado */
    }
  }
}

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#064;/g, "@")
    .replace(/&#x2022;/g, "•");

const titleOf = (html: string): string => decodeEntities(/<title>([^<]*)<\/title>/i.exec(String(html || ""))?.[1] ?? "").trim();

const MISSING = /no está disponible|isn't available|not available|página no disponible|no se encontró la página/i;
const CDN = /^https:\/\/[\w.-]+\.(?:cdninstagram\.com|fbcdn\.net)\//i;

const MONTHS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad = (n: number): string => String(n).padStart(2, "0");

/** «Photo by X on November 21, 2026. Puede ser…» → { date: "2026-11-21", rest: "Puede ser…" }. */
export function altDate(alt: string): { date: string | null; rest: string | null } {
  const text = String(alt || "");
  const en = /\bon (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})\.?/i.exec(text);
  const es = /\bel (\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre) de (\d{4})\.?/i.exec(text);
  let date: string | null = null;
  let end = -1;
  if (en) {
    const month = MONTHS_EN.indexOf(en[1]!.toLowerCase()) + 1;
    date = `${en[3]}-${pad(month)}-${pad(Number(en[2]))}`;
    end = en.index + en[0].length;
  } else if (es) {
    const name = es[2]!.toLowerCase() === "setiembre" ? "septiembre" : es[2]!.toLowerCase();
    const month = MONTHS_ES.indexOf(name) + 1;
    date = `${es[3]}-${pad(month)}-${pad(Number(es[1]))}`;
    end = es.index + es[0].length;
  }
  const rest = (end >= 0 ? text.slice(end) : "").trim().slice(0, 240);
  return { date, rest: rest || null };
}

/** La grilla del perfil: los posts como el HTML los dibuja, una vez cada código. */
export function gridPosts(html: string): ProfilePost[] {
  const posts: ProfilePost[] = [];
  const seen = new Set<string>();
  for (const anchor of String(html || "").matchAll(/<a\b[^>]*\bhref="\/([A-Za-z0-9._]{1,30})\/(p|reel)\/([A-Za-z0-9_-]{6,40})\/"[^>]*>([\s\S]*?)<\/a>/g)) {
    const owner = normalizeHandle(anchor[1]);
    const code = anchor[3]!;
    if (!owner || seen.has(code)) continue;
    const img = /<img\b[^>]*>/i.exec(anchor[4]!)?.[0] ?? "";
    const alt = decodeEntities(/\balt="([^"]*)"/i.exec(img)?.[1] ?? "");
    const src = decodeEntities(/\bsrc="([^"]*)"/i.exec(img)?.[1] ?? "");
    const { date, rest } = altDate(alt);
    seen.add(code);
    posts.push({ code, owner, reel: anchor[2] === "reel" || /^Video by /i.test(alt), date, image: CDN.test(src) ? src : null, alt: rest });
  }
  return posts.slice(0, 12);
}

/** El nodo del usuario `handle` en el JSON embebido. */
function userNode(html: string, handle: string): Node | null {
  for (const data of embeddedJson(html)) {
    for (const node of walk(data)) {
      if (typeof node.biography === "string" && typeof node.username === "string" && node.username.toLowerCase() === handle) return node;
    }
  }
  return null;
}

const count = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null);

function bioLinks(node: Node): string[] {
  const out: string[] = [];
  for (const link of Array.isArray(node.bio_links) ? node.bio_links : []) {
    const raw = typeof link?.url === "string" && link.url ? link.url : typeof link?.lynx_url === "string" ? link.lynx_url : "";
    const target = unwrapInstagramLink(raw).trim();
    if (target && !out.includes(target)) out.push(target.slice(0, 300));
  }
  if (typeof node.external_url === "string" && node.external_url && !out.includes(node.external_url)) out.push(unwrapInstagramLink(node.external_url));
  return out.slice(0, 6);
}

const empty = (handle: string, status: ProfileRead["status"], readAt: string): ProfileRead => ({
  status, handle, fullName: "", biography: "", links: [], followers: null, following: null, profilePic: null, posts: [], readAt,
});

/** Una página de perfil → lo que dice. `url` es la URL final de la navegación (detecta el login). */
export function parseProfile(html: string, handle: string, url: string, readAt: string): ProfileRead {
  const want = normalizeHandle(handle) ?? handle.toLowerCase();
  if (/\/accounts\/login|\/challenge\//.test(String(url || ""))) return empty(want, "unreadable", readAt);
  const title = titleOf(html);
  const node = userNode(html, want);
  if (!node) {
    // Sin nodo: si la página lo dice, la cuenta no existe; si no, no sabemos (un muro, un error).
    const body = String(html || "").replace(/<script[\s\S]*?<\/script>/gi, " ");
    return empty(want, MISSING.test(title) || MISSING.test(body) ? "missing" : "unreadable", readAt);
  }
  if (node.is_private === true) return { ...empty(want, "private", readAt), fullName: String(node.full_name || "").slice(0, 120) };
  const pic = typeof node.profile_pic_url === "string" && CDN.test(node.profile_pic_url) ? node.profile_pic_url : null;
  return {
    status: "ok",
    handle: want,
    fullName: String(node.full_name || "").trim().slice(0, 120),
    biography: String(node.biography || "").trim().slice(0, 600),
    links: bioLinks(node),
    followers: count(node.follower_count ?? node.edge_followed_by?.count),
    following: count(node.following_count ?? node.edge_follow?.count),
    profilePic: pic,
    posts: gridPosts(html),
    readAt,
  };
}

export interface ReadPlan {
  handles: string[];
  gapMs: number;
  budgetMs: number;
  proxy: string | null;
  /** Corta si las primeras N lecturas no traen ningún perfil: Instagram está cerrado para nosotros. */
  stopAfterBlankStart: number;
}

export interface ReadResults {
  reads: Map<string, ProfileRead>;
  launched: boolean;
  /** true cuando la corrida cortó porque Instagram no contestó perfiles. */
  closed: boolean;
  note: string | null;
}

export type ProfileReader = (plan: ReadPlan) => Promise<ReadResults>;

const NAV_TIMEOUT_MS = Number(process.env.EMPRENDIMIENTOS_NAV_MS || 45_000);

/** Lee los perfiles en UN Chrome, con presupuesto, y lo cierra en `finally`. */
export const readProfiles: ProfileReader = async plan => {
  const results: ReadResults = { reads: new Map(), launched: false, closed: false, note: null };
  if (!plan.handles.length) return results;
  const deadline = Date.now() + plan.budgetMs;
  const started = await launchChrome(plan.proxy, "Emprendimientos");
  if (!started) {
    results.note = "Chrome no arrancó";
    return results;
  }
  results.launched = true;
  const { browser, page } = started as { browser: { close(): Promise<void> }; page: Page };
  let attempted = 0;
  let readable = 0;
  try {
    for (const handle of plan.handles) {
      if (Date.now() > deadline) {
        results.note = `presupuesto agotado: ${plan.handles.length - attempted} cuentas sin leer`;
        break;
      }
      if (attempted >= plan.stopAfterBlankStart && readable === 0) {
        results.closed = true;
        results.note = `Instagram no devolvió ningún perfil en las primeras ${attempted} lecturas`;
        break;
      }
      if (attempted) await sleep(plan.gapMs);
      attempted++;
      const readAt = new Date().toISOString();
      try {
        await page.goto(`https://www.instagram.com/${encodeURIComponent(handle)}/`, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS }).catch(() => undefined);
        const read = parseProfile(String(await page.content()), handle, String(page.url()), readAt);
        if (read.status !== "unreadable") readable++;
        results.reads.set(handle, read);
      } catch {
        results.reads.set(handle, empty(handle, "unreadable", readAt));
      }
    }
  } catch (error) {
    results.note = `navegador: ${String((error as Error)?.name || "Error")}`;
  } finally {
    await browser.close().catch(() => undefined);
  }
  return results;
};
