// Inmuebles El País — collection ENABLED on 2026-09-05 by the portal's own operator.
//
// This adapter was born disabled. The 2026-09-05 review read the published terms of
// InfoRealEstate.ai (the platform behind the portal, operated by AppsUY): §3 prohibits automated
// extraction, §5 licenses the service for personal, non-commercial use, and `robots.txt` disallows
// `/api/` and `/dashboard/`. Public HTML never authorised reuse, so `harvestElpais` returned
// `external_only` and made zero requests. NONE OF THAT CHANGED BY ITSELF: it was lifted the same
// day because the operator of the portal instructed this repository's maintainer to import the
// catalogue. That authorisation is what this file runs on, it is recorded with its date in
// `docs/research/rental-elpais-authorized-2026-09-05.md`, and `RENTALS_ELPAIS_ENABLED=0` puts the
// adapter back to `external_only` without a deploy the day it is withdrawn.
//
// HOW IT READS. Not by scraping the category pages: those are served behind a Cloudflare
// challenge that answers 403 to our honest UA, and their HTML only ever carried the first 24 rows.
// The portal's own front end turns a category URL into a saved conversational search and then
// pages through it, so we call the same two endpoints it does, with our identifying UA:
//
//   POST /api/chat/init                     -> {chatId}, one per department (province filter)
//   GET  /api/chat/<chatId>/results?page&limit  -> the full rows, 500 at a time
//
// Both answer 200 to `CambioUruguayBot/1.0`. `results` allows 15.000 requests per 15 min; `init`
// allows TEN PER MINUTE, which is the one real constraint here and why the departments are paced
// by `INIT_GAP_MS` instead of by the shared host gap.
//
// WHAT IS STILL NOT TAKEN, authorisation or not: the AI enrichment (`visualDescription`,
// `keywordsOfProperty`, `contentTags`, the `*Score` fields), the converted `expensesMonthlyUSD`,
// the portal's import dates as a publication date — and, above all, the CONTACT DATA. Every row
// carries `contact.phone` and `sourceAgency.emails`; `RawRental` has nowhere to put them and they
// are never copied. Only the agency's public NAME crosses into our index.
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { guaranteesFromElpaisCodes, guaranteesFromText, mergeGuarantees } from "../guarantees";
import { fetchJson, sleep } from "../net";
import { canonicalDepartment, flatten, inferPropertyType, isPlausibleRent, looksLikeRentalAdvert, parseCurrency, parseStreet } from "../normalize";
import type { RawRental, RentalPropertyType } from "../types";
import type { RentalSourceResult } from "./types";

const ORIGIN = "https://inmuebles.elpais.com.uy";
const TYPES: Record<string, RentalPropertyType> = {
  apartment: "apartamento", house: "casa", room: "habitacion", office: "oficina",
  commercial: "local", commercial_space: "local", land: "terreno",
};

export function elpaisCategoryUrls(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  return [...new Set($("loc").map((_, node) => $(node).text().trim()).get().filter((raw) => {
    try {
      const url = new URL(raw);
      return url.origin === ORIGIN && /^\/alquiler\/[a-z-]+\/[a-z0-9-]+\/?$/.test(url.pathname)
        && !url.search && !url.hash && !url.username && !url.password;
    } catch { return false; }
  }))];
}

/** Extract a balanced JSON array without evaluating any publisher JavaScript. */
function arrayAfter(text: string, marker: string): unknown[] | null {
  const found = text.indexOf(marker);
  if (found < 0) return null;
  const start = found + marker.length - 1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "[") depth++;
    else if (char === "]" && --depth === 0) {
      try { const result = JSON.parse(text.slice(start, index + 1)); return Array.isArray(result) ? result : null; }
      catch { return null; }
    }
  }
  return null;
}

/** Next Flight chunks are JSON strings, occasionally split in the middle of a property. */
export function extractElpaisRows(html: string): unknown[] | null {
  const $ = cheerio.load(html);
  const chunks: string[] = [];
  $("script").each((_, node) => {
    const script = $(node).text().trim();
    const match = script.match(/^self\.__next_f\.push\((\[.*\])\);?$/s);
    if (!match) return;
    try {
      const chunk = JSON.parse(match[1]!);
      if (chunk[0] === 1 && typeof chunk[1] === "string") chunks.push(chunk[1]);
    } catch { /* A malformed chunk is not executable input. */ }
  });
  return arrayAfter(chunks.join(""), '"listings":[');
}

const positive = (value: unknown): number | null => value != null && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;

/** A rental category can contain fortnight or named-month holiday prices. */
function hasOnlyShortTermPrice(title: string, description: string): boolean {
  const text = flatten(`${title} ${description.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ")}`);
  if (/\banual(?:es)?\b/.test(text)) return false;
  if (/\b(?:primera|segunda|1ra|2da) quincena\b|\b(?:por|precio(?: de| por)?|alquiler(?: por)?) quincena\b/.test(text)) return true;
  // "Desde febrero" can be an annual start date. "En febrero 2023" names a bounded stay.
  return /\bdisponible en alquiler en (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre) (?:de )?20\d{2}\b/.test(text);
}

export function elpaisToRawRental(value: unknown): RawRental | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, any>;
  if (row.transactionType !== "rental" || row.status !== "active" || row.pausedByAdmin || row.trashedAt) return null;
  if (!/^[a-f0-9]{24}$/i.test(String(row._id || ""))) return null;
  const title = String(row.title || "").trim();
  const description = typeof row.description === "string" ? row.description : "";
  const price = positive(row.price?.amount);
  const currency = parseCurrency(row.price?.currency);
  if (!title || !price || !currency || !looksLikeRentalAdvert(title, description) || hasOnlyShortTermPrice(title, description)) return null;
  const department = canonicalDepartment(String(row.province || ""));
  if (!department) return null;
  const address = String(row.address || "").replace(/\s*-?\s*Ref\s*:.*$/i, "").trim();
  const street = parseStreet(address);
  const expenses = row.expenses?.amount;
  // This portal imports third-party records: a numeric 0 may be an import default. Only the
  // original advert explicitly saying "sin gastos comunes" turns that value into a free expense.
  const noExpenses = /\bsin gastos comunes\b/i.test(`${title} ${description}`);
  const commonExpenses = positive(expenses) ?? (noExpenses ? 0 : null);
  const coordinates = row.geo?.coordinates;
  const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;
  const lon = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
  const located = lat >= -35.9 && lat <= -30 && lon >= -58.6 && lon <= -53;
  const images = Array.isArray(row.images) ? row.images.filter((item: any) => item && typeof item === "object") : [];
  const image = images.find((item: any) => item.isPrimary) || images[0];
  const agency = typeof row.sourceAgency === "string" ? row.sourceAgency : row.sourceAgency?.raw;
  const seller = [row.contact?.company, agency].find(item => typeof item === "string" && item.trim())?.trim() || "";
  // Do not use the portal's AI-enriched features/visualDescription or its converted costs.
  // Only original money fields and advert text provide evidence for the facets we persist.
  return {
    source: "elpais", listingId: `elpais:${row._id}`, url: `${ORIGIN}/property/${row._id}`,
    title, price, currency, commonExpenses,
    commonExpensesCurrency: commonExpenses === null ? null : parseCurrency(row.expenses?.currency),
    sellerName: seller || "Inmuebles El País", sellerType: row.ownerDirect === true ? "particular" : seller ? "inmobiliaria" : "desconocido",
    image: typeof (image?.publicUrl || image?.url) === "string" ? image.publicUrl || image.url : null,
    // createdAt is the portal's import date, not necessarily the advert's publication date.
    publishedAt: null, propertyType: TYPES[String(row.propertyType)] || inferPropertyType(title),
    department, neighborhood: String(row.neighborhood || "").trim(), address,
    street: street.street, streetNumber: street.number,
    latitude: located ? lat : null, longitude: located ? lon : null,
    bedrooms: row.bedrooms != null && Number.isInteger(Number(row.bedrooms)) && Number(row.bedrooms) >= 0 ? Number(row.bedrooms) : null,
    bathrooms: positive(row.bathrooms), area: positive(row.areaM2),
    // `featureIds` LOOKS like the structured garage/furnished flag the other portals lack, and it
    // is not: over the 481 Montevideo rows of 2026-09-05, only 68 of the 81 `GARAGE` rows and 19 of
    // the 30 `FURNISHED` rows say so anywhere in their own title or description (84 % and 63 %).
    // It also carries no COUNT, and `parkingSpaces` is a number. Both stay unknown.
    parkingSpaces: null, furnished: null,
    // `petsAllowed` IS a structured field — it publishes `false`, which no inferred tag ever does.
    // Rare (6 rows of 481). `false` still becomes `null`: see the type's note, the site never says
    // "does not accept pets" on one portal's say-so.
    petsAllowed: row.petsAllowed === true ? true : null,
    // The union of what the portal declares as data and what the advert text says. Not one or the
    // other: 30 of the 75 unenriched rows carry `rentalGuarantees` while their description names
    // nothing, and plenty of descriptions list a type the structured field omits.
    guarantees: mergeGuarantees([
      guaranteesFromElpaisCodes(row.rentalGuarantees, row.guaranteesAccepted),
      guaranteesFromText(description),
    ]),
  };
}

/**
 * One saved search per department, which is exactly how the portal's own category pages call it:
 * `zones.province` filters, and `anchorLocation` is geocoded to place the map.
 *
 * The anchor is the DEPARTMENT NAME, never its capital, and that is not cosmetic — it changes the
 * result set. Asking for `COLONIA` anchored on "Colonia" returned 24 rows; the same province
 * anchored on "Colonia del Sacramento" returned 6, because the geocoder resolved the second one to
 * a city and the search narrowed to it. These are the strings the site itself sends.
 */
export interface ElpaisSearch {
  province: string;
  anchor: string;
  lat: number;
  lon: number;
}

/**
 * Ordered by how much of the catalogue each department holds, measured 2026-09-05 — NOT
 * alphabetically, and that ordering is load-bearing.
 *
 * Cloudflare lets about three searches be opened per run (see `openSearch`), so the order decides
 * what a cold cache captures FIRST. Alphabetical spent those three on Artigas (1 advert), Canelones
 * and Cerro Largo (zero). By volume, the first run captures Montevideo, Maldonado and Canelones —
 * **92 % of the catalogue** — and the long tail of one-advert departments fills in later runs.
 */
const SEARCHES: readonly ElpaisSearch[] = Object.freeze([
  { province: "MONTEVIDEO", anchor: "Montevideo", lat: -34.9011, lon: -56.1645 }, // 4.788
  { province: "MALDONADO", anchor: "Maldonado", lat: -34.9088, lon: -54.9585 }, // 1.081
  { province: "CANELONES", anchor: "Canelones", lat: -34.5226, lon: -56.2775 }, // 422
  { province: "COLONIA", anchor: "Colonia", lat: -34.4626, lon: -57.84 }, // 24
  { province: "PAYSANDU", anchor: "Paysandú", lat: -32.3214, lon: -58.0756 }, // 17
  { province: "FLORIDA", anchor: "Florida", lat: -34.0994, lon: -56.2144 }, // 12
  { province: "RIVERA", anchor: "Rivera", lat: -30.9053, lon: -55.5508 }, // 4
  { province: "ROCHA", anchor: "Rocha", lat: -34.4826, lon: -54.3336 }, // 3
  { province: "TACUAREMBO", anchor: "Tacuarembó", lat: -31.7333, lon: -55.9833 }, // 2
  { province: "ARTIGAS", anchor: "Artigas", lat: -30.4006, lon: -56.4744 }, // 1
  { province: "DURAZNO", anchor: "Durazno", lat: -33.3833, lon: -56.5167 }, // 1
  { province: "RIO NEGRO", anchor: "Río Negro", lat: -33.1389, lon: -58.3039 }, // 1
  { province: "SALTO", anchor: "Salto", lat: -31.3833, lon: -57.9667 }, // 1
  { province: "SAN JOSE", anchor: "San José", lat: -34.3375, lon: -56.7136 }, // 1
  { province: "SORIANO", anchor: "Soriano", lat: -33.2524, lon: -58.0269 }, // 1
  { province: "CERRO LARGO", anchor: "Cerro Largo", lat: -32.3667, lon: -54.1833 }, // 0
  { province: "FLORES", anchor: "Flores", lat: -33.5167, lon: -56.9 }, // 0
  { province: "LAVALLEJA", anchor: "Lavalleja", lat: -34.3756, lon: -55.2372 }, // 0
  { province: "TREINTA Y TRES", anchor: "Treinta y Tres", lat: -33.2333, lon: -54.3833 }, // 0
]);

/** The hourly pass only re-reads where the catalogue actually moves; 92 % of it is these three. */
const FAST_PROVINCES: ReadonlySet<string> = new Set(["MONTEVIDEO", "CANELONES", "MALDONADO"]);

const ENABLED = process.env.RENTALS_ELPAIS_ENABLED !== "0";
const PAGE_SIZE = Number(process.env.RENTALS_EP_PAGE_SIZE || 500);
/** 40 × 500 is ~13× the largest department. A budget, not an expected value. */
const MAX_PAGES = Number(process.env.RENTALS_EP_MAX_PAGES || 40);
const FAST_PAGES = Number(process.env.RENTALS_EP_FAST_PAGES || 1);
/** `/api/chat/init` publishes `ratelimit-policy: 10;w=60`. Seven seconds keeps us under it. */
const INIT_GAP_MS = Number(process.env.RENTALS_EP_INIT_GAP_MS || 7_000);
const CHAT_ID = /^[a-f0-9-]{16,64}$/i;
/** `0` keeps the run to plain HTTP: fewer searches open, and nothing else changes. */
const BROWSER_ENABLED = process.env.RENTALS_EP_BROWSER !== "0";

/**
 * The saved searches survive between runs, so we keep their ids and stop paying for new ones.
 *
 * This is not a micro-optimisation. Opening a search is an **AI** call on the portal's side — it
 * answers "Encontré 24 propiedades en Colonia" — and doing it 19 times daily plus 3 times an hour
 * would spend 91 of somebody else's LLM calls a day to re-derive an id that does not change. A
 * chat opened 30 minutes earlier returns the department's CURRENT rows: measured 2026-09-05, the
 * old and new Canelones searches returned the same 422 ids, so the id is a handle on a live query
 * and not a frozen snapshot.
 *
 * The cache is an optimisation and never a dependency: an unreadable, missing or corrupt file just
 * means this run opens the searches itself. A chat the portal has forgotten answers
 * `404 {"success": false, "error": "Chat not found"}` — measured, and it matters: a forgotten id
 * that returned an empty 200 would be indistinguishable from a department with no rentals, and
 * Montevideo would silently report zero.
 */
const chatsFile = (): string => process.env.RENTALS_EP_CHATS_FILE || join(tmpdir(), "cambio-uruguay-elpais-chats.json");

function loadChats(): Map<string, string> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(chatsFile(), "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Map();
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && CHAT_ID.test(entry[1]));
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveChats(chats: ReadonlyMap<string, string>): void {
  try {
    writeFileSync(chatsFile(), JSON.stringify(Object.fromEntries(chats)), "utf8");
  } catch {
    /* Losing the cache costs one extra request per department, not a row. */
  }
}

interface ChatInitResponse {
  success?: boolean;
  data?: { chatId?: unknown };
}

interface ChatResultsResponse {
  success?: boolean;
  data?: {
    results?: unknown;
    pagination?: { page?: unknown; total?: unknown; totalPages?: unknown };
  };
}

/**
 * The exact multipart body the portal's category pages submit. `_clearedFilters` is sent because
 * the endpoint treats an absent filter and an explicitly cleared one differently, and
 * `includeProjects: false` drops the new-construction developments: those are FOR SALE, and this
 * is a rental index.
 */
export function searchFields(search: ElpaisSearch): Record<string, string> {
  const coordinates = { lat: search.lat, lng: search.lon };
  return {
    userLocation: JSON.stringify({ location: search.anchor, coordinates }),
    anchorLocation: JSON.stringify({ name: search.anchor, coordinates, anchorSource: "picked" }),
    transactionType: "rental",
    userLanguage: "es",
    displayMessage: `Alquileres en ${search.anchor}`,
    manualFilters: JSON.stringify({
      intent: "rent",
      zones: { province: search.province },
      filters: { propertyTypes: [], amenities: [], transactionType: "rental" },
      _clearedFilters: ["price", "bedrooms", "bathrooms", "areaM2", "landAreaM2", "amenities", "sellerType", "publishedWithin"],
      displayCurrency: "UYU",
    }),
    includeProjects: "false",
    includeListings: "true",
  };
}

/** The same fields the browser posts, as a `FormData` for the plain HTTP path. */
function searchForm(search: ElpaisSearch): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(searchFields(search))) form.set(name, value);
  return form;
}

const positiveInt = (value: unknown): number => (Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : 0);

/**
 * ONE attempt, and no retry. This is the measured shape of the endpoint, not caution.
 *
 * Opening a search is the only thing on this portal that Cloudflare challenges us for. Traced on
 * 2026-09-05: three `POST /api/chat/init` succeed (`ratelimit-remaining` 9, 8, 7 — nowhere near
 * the limit) and the fourth comes back **403 `Just a moment...`**, the interstitial, with no
 * rate-limit headers at all. Every later attempt in that run gets the same. Meanwhile
 * `GET .../results` keeps answering 200 the whole time.
 *
 * So retrying is not free and does not work: it is a client challenge, not a window to wait out,
 * and we do not solve challenges. What makes the source work anyway is that the ids are CACHED —
 * a run only opens the searches it is missing, three of them stick per run, and after the first
 * day it opens none. Coverage climbs run by run and `complete` stays false until it is whole.
 *
 * The clean fix is not ours to make: the portal's operator, who authorised this, can allow
 * `CambioUruguayBot/1.0` through Cloudflare, and then a single run bootstraps all 19. The cache
 * file can also be seeded by hand with ids opened from a browser.
 */
async function openSearch(search: ElpaisSearch): Promise<string> {
  const init = await fetchJson<ChatInitResponse>(`${ORIGIN}/api/chat/init`, {
    method: "POST", body: searchForm(search), headers: { accept: "application/json" },
    timeoutMs: 90_000, retries: 0,
  });
  const chatId = typeof init?.data?.chatId === "string" ? init.data.chatId : "";
  return init?.success && CHAT_ID.test(chatId) ? chatId : "";
}

/**
 * Opens every search in `missing`, cheapest path first.
 *
 * Plain HTTP gets three tries because when it works it costs nothing — no Chrome, no memory, no
 * startup. When Cloudflare starts refusing, the rest go through a real browser, which answers the
 * challenge by being one. See `elpais_browser.ts`: nothing here forges anything.
 */
async function openSearches(missing: readonly ElpaisSearch[]): Promise<{ opened: Map<string, string>; viaBrowser: number }> {
  const opened = new Map<string, string>();
  const challenged: ElpaisSearch[] = [];
  let consecutiveFailures = 0;
  let attempts = 0;

  for (const search of missing) {
    if (consecutiveFailures >= 3) {
      challenged.push(search);
      continue;
    }
    if (attempts++ > 0) await sleep(INIT_GAP_MS);
    const chatId = await openSearch(search);
    if (chatId) {
      opened.set(search.province, chatId);
      consecutiveFailures = 0;
    } else {
      challenged.push(search);
      consecutiveFailures++;
    }
  }

  if (!challenged.length || !BROWSER_ENABLED) return { opened, viaBrowser: 0 };

  const { openSearchesWithBrowser } = await import("./elpais_browser");
  const viaBrowser = await openSearchesWithBrowser(challenged, INIT_GAP_MS);
  for (const [province, chatId] of viaBrowser) {
    if (CHAT_ID.test(chatId)) opened.set(province, chatId);
  }
  return { opened, viaBrowser: viaBrowser.size };
}

interface ResultsPage {
  rows: unknown[];
  totalPages: number;
}

async function readPage(chatId: string, page: number, sort: string): Promise<ResultsPage | null> {
  const body = await fetchJson<ChatResultsResponse>(
    `${ORIGIN}/api/chat/${chatId}/results?page=${page}&limit=${PAGE_SIZE}${sort}`,
    { headers: { accept: "application/json" }, timeoutMs: 90_000 }
  );
  if (!body?.success || !Array.isArray(body.data?.results)) return null;
  return { rows: body.data!.results as unknown[], totalPages: positiveInt(body.data?.pagination?.totalPages) };
}

export async function harvestElpais(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  // The kill switch restores the pre-authorisation state exactly: no requests, no rows, and an
  // "external consultation" card on the page instead of a portal that looks broken.
  if (!ENABLED) {
    return {
      key: "elpais", ok: false, complete: false, access: "external_only", listings: [],
      note: "Consulta externa; importación deshabilitada por configuración.",
    };
  }

  const searches = mode === "fast" ? SEARCHES.filter((search) => FAST_PROVINCES.has(search.province)) : SEARCHES;
  const chats = loadChats();
  const byId = new Map<string, RawRental>();
  const covered: string[] = [];
  const budget = mode === "fast" ? FAST_PAGES : MAX_PAGES;
  // The hourly pass asks for the newest first; the daily one takes the default order and reads
  // every page anyway, where sorting would only change which page a row lands on.
  const sort = mode === "fast" ? "&sort=newest" : "";
  let pages = 0;
  let failed = 0;
  let viaBrowser = 0;
  let incomplete = mode !== "full" || searches.length !== SEARCHES.length;

  // 1. Which searches do we already have? A cached id is proved by its FIRST PAGE, which the sweep
  //    needs anyway — so verifying costs nothing extra. A forgotten chat answers 404, never an
  //    empty 200, which is what makes this safe: a stale id cannot pass as an empty department.
  const firstPages = new Map<string, ResultsPage>();
  const missing: ElpaisSearch[] = [];
  for (const search of searches) {
    const chatId = chats.get(search.province) ?? "";
    const first = chatId ? await readPage(chatId, 1, sort) : null;
    if (first) firstPages.set(search.province, first);
    else {
      chats.delete(search.province);
      missing.push(search);
    }
  }

  // 2. Open what is missing — plain HTTP while it works, a real browser when Cloudflare steps in.
  if (missing.length) {
    const result = await openSearches(missing);
    viaBrowser = result.viaBrowser;
    for (const [province, chatId] of result.opened) chats.set(province, chatId);
    for (const search of missing) {
      const chatId = chats.get(search.province) ?? "";
      const first = chatId ? await readPage(chatId, 1, sort) : null;
      if (first) firstPages.set(search.province, first);
      else {
        // A search we could not open is a hole in the sweep, not an empty department.
        chats.delete(search.province);
        failed++;
        incomplete = true;
      }
    }
  }
  saveChats(chats);

  // 3. Read every department we have a working search for.
  for (const search of searches) {
    const first = firstPages.get(search.province);
    if (!first) continue;
    const chatId = chats.get(search.province)!;
    covered.push(search.province);

    for (let page = 1; page <= budget; page++) {
      const body = page === 1 ? first : await readPage(chatId, page, sort);
      if (!body) {
        failed++;
        incomplete = true;
        break;
      }
      pages++;
      for (const row of body.rows) {
        const listing = elpaisToRawRental(row);
        if (!listing) continue;
        if (!isPlausibleRent(listing.price * (listing.currency === "USD" ? usdUyu : 1), listing.propertyType)) continue;
        byId.set(listing.listingId, listing);
      }
      if (!body.rows.length || page >= body.totalPages) {
        // Ran out of pages before the budget did: this department is fully read.
        if (mode !== "fast" && body.totalPages > budget) incomplete = true;
        break;
      }
      if (page === budget) incomplete = true;
    }
  }

  const partial = incomplete
    ? mode === "fast"
      ? " — repaso horario, cobertura parcial"
      : " — cobertura parcial; se conservan avisos no vistos"
    : "";
  return {
    key: "elpais", ok: byId.size > 0, complete: !incomplete, listings: [...byId.values()],
    note: `${pages} páginas, ${byId.size} avisos únicos; departamentos consultados: ${covered.length} de ${searches.length}`
      + partial + (failed ? `; ${failed} búsquedas sin abrir` : "")
      + (viaBrowser ? `; ${viaBrowser} abiertas con navegador` : ""),
  };
}
