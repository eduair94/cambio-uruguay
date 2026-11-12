// Directorio de armadores de muebles (pm2 `currency-armadores`, diario) para
// /armadores-de-muebles-montevideo. Junta cuatro fuentes en UN documento de la base del APP
// (`armadorsnapshots{key:"mvd"}`), que /api/armadores sirve a la página:
//
//   * relevamiento editorial (classes/armadores/editorialData.json): tablas de precios por mueble;
//   * Google Places por el proxy del VPS (:2221), una vez por semana: negocios con ficha;
//   * Facebook Marketplace (Chrome del perfil por CDP; el puente :9657 si no se alcanza):
//     avisos con precio, y la descripción de cada ficha nueva (lista de precios, barrios);
//   * MercadoLibre Servicios por el puente (:9656): avisos, con barrio por el filtro de ciudad.
//
// Una fuente que falla conserva sus filas anteriores (classes/armadores/build.ts) y lo anota en
// `notes`. Nunca pisa un buen snapshot con una corrida flaca: sale con 1 sin escribir.
// `--dry-run` lee todo, no escribe en la base y funciona sin APP_MONGO_URI (`--json=<archivo>` guarda el
// snapshot en un archivo). `--google` fuerza Google.
import "dotenv/config";

import { appConnection, appDbConfigured } from "./classes/appdb";
import { mergeEntries, snapshotIsThin, uyDay } from "./classes/armadores/build";
import { EDITORIAL, editorialEntries } from "./classes/armadores/editorial";
import { FACEBOOK_QUERIES, facebookDescription, facebookEntry, facebookSearches, type FacebookCardLike } from "./classes/armadores/sources/facebook";
import { googleEntry, readGooglePlaces } from "./classes/armadores/sources/google";
import { mlEntry, readMlServices } from "./classes/armadores/sources/mercadolibre";
import { FACEBOOK_DETAIL_REREAD_DAYS, loadArmadores, loadFacebookDetails, saveArmadores, saveFacebookDetails } from "./classes/armadores/store";
import { ARMADORES_KEY, GOOGLE_EVERY_DAYS, type ArmadorEntry, type ArmadorSnapshot } from "./classes/armadores/types";
import { FB_ITEM_URL, FacebookSessionError, connectFacebookBrowser, facebookSessionOk, readFacebookPageTexts, sleep } from "./classes/facebook/browser";
import { acquireFacebookProfile } from "./classes/facebook/lock";
import { readMarketplaceSearches } from "./classes/facebook/search";
import type { ArmadorFacebookDetailDocument } from "./classes/models/ArmadorFacebookDetail";
import { areaLocator } from "./classes/propertyzones/geo";
import { INE_DISPLAY_NAMES } from "./classes/propertyzones/names";
import { loadOfficialPropertyZoneGeometry } from "./classes/propertyzones/sources/geometry";
import { ML_API_BASE } from "./classes/retail/sources/mercadolibre";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};
const GOOGLE_BASE = process.env.ARMADORES_GMAPS_URL || process.env.STORES_GMAPS_URL || "http://127.0.0.1:2221";
const FB_BRIDGE = (process.env.RETAIL_FB_API || "http://104.234.204.107:9657/facebook/marketplace").replace(/\/+$/, "");
const daysSince = (day: string | null | undefined, today: string): number => (day ? Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000) : Infinity);

async function readGoogle(day: string, notes: string[]): Promise<ArmadorEntry[] | null> {
  const zones = loadOfficialPropertyZoneGeometry().zones;
  const locateCode = areaLocator(zones.map(zone => ({ id: zone.officialCode, geometry: zone.geometry })));
  const locate = (lng: number, lat: number): string | null => {
    const code = locateCode(lng, lat);
    return code ? (INE_DISPLAY_NAMES[code] ?? null) : null;
  };
  const read = await readGooglePlaces({ base: GOOGLE_BASE });
  console.log(`[armadores] google: ${read.places.length} fichas en ${read.calls} consultas (${read.failed} fallidas)`);
  if (!read.places.length || read.failed * 2 > read.calls) {
    notes.push(`google: ${read.failed} de ${read.calls} consultas fallaron; se conservan las fichas anteriores`);
    return null;
  }
  return read.places.map(place => googleEntry(place, locate, day)).filter((entry): entry is ArmadorEntry => !!entry);
}

async function bridgeCards(): Promise<FacebookCardLike[]> {
  const cards = new Map<string, FacebookCardLike>();
  for (const query of FACEBOOK_QUERIES) {
    try {
      const url = `${FB_BRIDGE}/search?${new URLSearchParams({ q: query, location: "montevideo", limit: "60" })}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      const body = response.ok ? ((await response.json()) as { results?: FacebookCardLike[] }) : null;
      for (const card of body?.results ?? []) if (card?.id && !cards.has(card.id)) cards.set(card.id, card);
    } catch {
      // Una búsqueda caída no tira las otras.
    }
  }
  return [...cards.values()];
}

async function readFacebookCards(notes: string[]): Promise<FacebookCardLike[] | null> {
  const read = await readMarketplaceSearches({
    owner: "currency-armadores",
    searches: facebookSearches(),
    maxScrolls: 12,
    stagnantRounds: 3,
    maxDurationMs: number("ARMADORES_FB_MINUTES", 12) * 60_000,
    gapMs: 10_000,
    lockWaitMs: 15 * 60_000,
    stopOnStalls: false,
  });
  if (read.busy || read.sessionLost) {
    notes.push(`facebook: ${read.note ?? "sesión no válida"}; se conservan los avisos anteriores`);
    return null;
  }
  if (read.unreachable) {
    const cards = await bridgeCards();
    console.log(`[armadores] facebook: navegador inaccesible, puente → ${cards.length} tarjetas`);
    if (!cards.length) {
      notes.push("facebook: ni el navegador ni el puente respondieron; se conservan los avisos anteriores");
      return null;
    }
    return cards;
  }
  console.log(`[armadores] facebook: ${read.cards.length} tarjetas en ${read.lists} búsquedas`);
  return read.cards;
}

/** Lee la ficha de los avisos nuevos (o leídos hace más de 60 días): descripción → precios y barrios. */
async function readFacebookDetails(cards: FacebookCardLike[], day: string, dryRun: boolean): Promise<Map<string, string | null>> {
  const candidates = cards.filter(card => facebookEntry(card, null, day));
  const cached = dryRun && !appDbConfigured() ? new Map<string, ArmadorFacebookDetailDocument>() : await loadFacebookDetails(candidates.map(card => card.id));
  const descriptions = new Map<string, string | null>([...cached].map(([id, row]) => [id, row.description]));
  const stale = (id: string): boolean => {
    const row = cached.get(id);
    return !row || (Date.now() - new Date(row.readAt).getTime()) / 86_400_000 > FACEBOOK_DETAIL_REREAD_DAYS;
  };
  const targets = candidates.filter(card => stale(card.id)).slice(0, number("ARMADORES_FB_DETAIL_MAX", 30));
  if (!targets.length || !(await facebookSessionOk())) return descriptions;
  const release = await acquireFacebookProfile("currency-armadores-fichas", 10 * 60_000);
  if (!release) return descriptions;
  const rows: ArmadorFacebookDetailDocument[] = [];
  try {
    const browser = await connectFacebookBrowser();
    try {
      for (const card of targets) {
        const texts = await readFacebookPageTexts(browser, FB_ITEM_URL(card.id));
        const description = facebookDescription(card.id, texts);
        rows.push({ id: card.id, readAt: new Date(), found: description !== null, description });
        descriptions.set(card.id, description);
        await sleep(number("ARMADORES_FB_DETAIL_GAP_MS", 6_000));
      }
    } catch (error) {
      if (!(error instanceof FacebookSessionError)) console.warn(`[armadores] fichas: ${String((error as Error)?.name || "Error")}`);
    } finally {
      browser.disconnect();
    }
  } catch (error) {
    console.warn(`[armadores] fichas: navegador inaccesible (${String((error as Error)?.name || "Error")})`);
  } finally {
    release();
  }
  console.log(`[armadores] fichas de Facebook leídas: ${rows.length} (${rows.filter(row => row.description).length} con descripción)`);
  if (!dryRun) await saveFacebookDetails(rows);
  return descriptions;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured() && !dryRun) {
    console.error("[armadores] APP_MONGO_URI no está definida: el directorio vive en la base del app. No se corre.");
    process.exit(1);
  }
  if (appDbConfigured()) await appConnection().asPromise();
  const now = new Date();
  const day = uyDay(now);
  const previous = appDbConfigured() ? await loadArmadores() : null;
  const notes: string[] = [];

  const googleDue = process.argv.includes("--google") || daysSince(previous?.googleAt, day) >= GOOGLE_EVERY_DAYS;
  const google = googleDue ? await readGoogle(day, notes) : null;

  const cards = await readFacebookCards(notes);
  let facebook: ArmadorEntry[] | null = null;
  if (cards) {
    const descriptions = await readFacebookDetails(cards, day, dryRun);
    facebook = cards.map(card => facebookEntry(card, descriptions.get(card.id) ?? null, day)).filter((entry): entry is ArmadorEntry => !!entry);
  }

  const ml = await readMlServices({ base: ML_API_BASE });
  console.log(`[armadores] mercadolibre: ${ml.items.length} avisos en ${ml.calls} pedidos (${ml.failed} fallidos)`);
  const mercadolibre = !ml.items.length && ml.failed ? null : ml.items.map(item => mlEntry(item, day)).filter((entry): entry is ArmadorEntry => !!entry);
  if (!mercadolibre) notes.push("mercadolibre: el puente no respondió; se conservan los avisos anteriores");

  const entries = mergeEntries(previous?.entries ?? [], { editorial: editorialEntries(), google, facebook, mercadolibre }, now);
  const counts: Record<string, number> = { total: entries.length, withPrice: entries.filter(entry => entry.prices.length).length };
  for (const entry of entries) counts[entry.source] = (counts[entry.source] ?? 0) + 1;
  const snapshot: ArmadorSnapshot = {
    key: ARMADORES_KEY,
    capturedAt: now,
    googleAt: google ? day : (previous?.googleAt ?? null),
    editorialReviewedAt: EDITORIAL.reviewedAt,
    entries,
    counts,
    notes,
  };
  console.log(`[armadores] ${JSON.stringify(counts)}${notes.length ? ` · ${notes.join(" · ")}` : ""}`);

  if (dryRun) {
    // `--json=<archivo>`: el snapshot entero, para mirar la página en dev sin tocar la base.
    const jsonOut = process.argv.find(arg => arg.startsWith("--json="))?.slice("--json=".length);
    if (jsonOut) (await import("fs")).writeFileSync(jsonOut, JSON.stringify(snapshot, null, 2));
    for (const entry of entries) {
      const price = entry.prices[0] ? `${entry.prices[0].currency} ${entry.prices[0].amount}` : entry.symbolicPrice ? "a consultar" : "—";
      console.log(`  ${entry.source.padEnd(12)} ${entry.base.zone ?? "·"} ${entry.base.barrio ?? ""} | ${entry.name.slice(0, 70)} | ${price}${entry.coverage.allMontevideo ? " | todo MVD" : ""}${entry.coverage.barrios.length ? ` | ${entry.coverage.barrios.join(", ")}` : ""}`);
    }
    process.exit(0);
  }
  const refusal = snapshotIsThin(entries, previous?.entries ?? []);
  if (refusal) {
    console.error(`[armadores] ${refusal}; no se pisa el snapshot anterior.`);
    process.exit(1);
  }
  await saveArmadores(snapshot);
  console.log(`[armadores] guardado ${now.toISOString()}`);
  process.exit(0);
}

main().catch(error => {
  console.error("[armadores] falló:", error instanceof Error ? error.message : error);
  process.exit(1);
});
