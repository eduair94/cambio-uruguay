// `/computadoras-usadas-uruguay` y `/precios-componentes-pc-uruguay`: las computadoras y piezas
// usadas de Facebook Marketplace y Mercado Libre, cada una con lo que cuesta armarla hoy pieza por
// pieza (ver docs/app/COMPUTADORAS.md).
//
// Diaria (`currency-computadoras`): todas las búsquedas de Marketplace, los usados de ML, las piezas
// nuevas de ML y de nueve tiendas uruguayas, fichas de Facebook con presupuesto, y publicación.
// Horaria (`--fast`, `currency-computadoras-hourly`): un tramo rotativo de búsquedas de Marketplace
// por más nuevas, fichas, y republicación sobre lo guardado. La horaria nunca retira por ausencia:
// un aviso sale cuando no se lo vio en `COMPUTER_FRESH_DAYS` días.
//
// `--dry-run` no escribe; `--json=<archivo>` además deja `{ meta, items, parts }` para mirar la
// página en dev (`COMPUTADORAS_PREVIEW_FILE`). Sin `APP_MONGO_URI`, `--dry-run` corre en memoria.
import "./sentry_job";
import "dotenv/config";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/chairs/catalog";
import { buildComputerCatalog, readListings, usageOf, usedPartObservations } from "./classes/computadoras/catalog";
import { isBareCase, buildPartTable, partIdentityOf } from "./classes/computadoras/parts";
import { buildPresets } from "./classes/computadoras/presets";
import { facebookDetailFromTexts, facebookDetailTargets, facebookRaw, facebookSearches } from "./classes/computadoras/sources/facebook";
import { ML_NEW_SCANS, ML_USED_SCANS, modelScans, runMlScans } from "./classes/computadoras/sources/mercadolibre";
import { harvestPartStores } from "./classes/computadoras/sources/stores";
import { readComputerSpecs } from "./classes/computadoras/specs";
import { countPublished, loadFacebookDetails, loadMeta, loadParts, loadRawListings, pruneRawListings, publish, saveFacebookDetails, saveMeta, saveRawListings } from "./classes/computadoras/store";
import { median, round } from "./classes/computadoras/text";
import { COMPUTER_FRESH_DAYS, COMPUTER_META_ID, isMachineKind, type ComputerCatalogRow, type ComputerMeta, type FacebookComputerDetail, type PartObservation, type PartRow, type Preset, type RawComputerListing, type SourceRun } from "./classes/computadoras/types";
import { FB_ITEM_URL, FacebookSessionError, connectFacebookBrowser, facebookSessionOk, readFacebookPageTexts, sleep } from "./classes/facebook/browser";
import { acquireFacebookProfile } from "./classes/facebook/lock";
import { readMarketplaceSearches } from "./classes/facebook/search";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};
const dayOf = (date: Date): string => date.toISOString().slice(0, 10);
const daysBefore = (date: Date, days: number): string => dayOf(new Date(date.getTime() - days * 86_400_000));
const REFS_ID = "uy-computadoras-refs";
const REFUSAL_ID = "uy-computadoras-refusal";

/**
 * La diaria tarda más de una hora (Marketplace, fichas, ML, nueve tiendas) y la horaria arranca
 * igual a los :03: sin candado las dos publicarían a la vez. La horaria se saltea si la diaria está
 * corriendo; la diaria espera hasta 20 minutos a que termine una horaria. Un candado de un proceso
 * muerto se toma.
 */
async function takeRunLock(fast: boolean): Promise<(() => void) | null> {
  const dir = join(tmpdir(), "cambio-computadoras.lock");
  const deadline = Date.now() + (fast ? 0 : 20 * 60_000);
  for (;;) {
    try {
      mkdirSync(dir);
      writeFileSync(join(dir, "pid"), String(process.pid));
      return () => rmSync(dir, { recursive: true, force: true });
    } catch {
      const pid = Number((() => { try { return readFileSync(join(dir, "pid"), "utf8"); } catch { return "0"; } })());
      let alive = false;
      try { alive = pid > 0 && process.kill(pid, 0); } catch { alive = false; }
      if (!alive) { rmSync(dir, { recursive: true, force: true }); continue; }
      if (Date.now() >= deadline) return null;
      await sleep(30_000);
    }
  }
}

interface Refs {
  notebooks: Record<string, { label: string; medianUsd: number; n: number }>;
}

async function readFacebook(fast: boolean, day: string, sources: SourceRun[]): Promise<RawComputerListing[] | null> {
  if (process.env.COMPUTADORAS_FB_ENABLED === "0") return null;
  const read = await readMarketplaceSearches({
    owner: fast ? "currency-computadoras-hourly" : "currency-computadoras",
    searches: facebookSearches({ fast, rotation: new Date().getUTCHours() }),
    maxScrolls: fast ? 4 : 12,
    stagnantRounds: 3,
    maxDurationMs: number(fast ? "COMPUTADORAS_FB_FAST_MINUTES" : "COMPUTADORAS_FB_MINUTES", fast ? 7 : 28) * 60_000,
    gapMs: 6_000,
    lockWaitMs: (fast ? 8 : 20) * 60_000,
    stallFloor: 20,
    stopOnStalls: false,
  });
  if (read.busy || read.sessionLost || read.unreachable || !read.lists) {
    sources.push({ id: "facebook", label: "Facebook Marketplace", ok: false, note: read.note ?? "sin lecturas", lastOkAt: null });
    console.log(`[computadoras] facebook: ${read.note ?? "sin lecturas"}; se conservan los avisos anteriores`);
    return null;
  }
  const rows = read.cards.map((card) => facebookRaw(card, day)).filter((row): row is RawComputerListing => !!row);
  const note = `${rows.length} tarjetas en ${read.lists} listas (${read.exhausted} hasta el final, ${read.stalled} frenadas)`;
  sources.push({ id: "facebook", label: "Facebook Marketplace", ok: true, note, lastOkAt: new Date().toISOString() });
  console.log(`[computadoras] facebook: ${note}`);
  return rows;
}

async function readFacebookDetails(targets: readonly RawComputerListing[], fast: boolean): Promise<FacebookComputerDetail[]> {
  if (!targets.length || process.env.COMPUTADORAS_FB_ENABLED === "0" || !(await facebookSessionOk())) return [];
  const release = await acquireFacebookProfile(fast ? "currency-computadoras-hourly-fichas" : "currency-computadoras-fichas", 8 * 60_000);
  if (!release) return [];
  const rows: FacebookComputerDetail[] = [];
  const deadline = Date.now() + number("COMPUTADORAS_FB_DETAIL_MINUTES", fast ? 7 : 14) * 60_000;
  try {
    const browser = await connectFacebookBrowser();
    try {
      for (const target of targets) {
        if (Date.now() >= deadline) break;
        const texts = await readFacebookPageTexts(browser, FB_ITEM_URL(target.sourceId));
        rows.push(facebookDetailFromTexts(target.sourceId, texts, new Date().toISOString()));
        await sleep(number("COMPUTADORAS_FB_DETAIL_GAP_MS", 6_000));
      }
    } catch (error) {
      if (!(error instanceof FacebookSessionError)) console.warn(`[computadoras] fichas: ${String((error as Error)?.name || "Error")}`);
    } finally {
      browser.disconnect();
    }
  } catch (error) {
    console.warn(`[computadoras] fichas: navegador inaccesible (${String((error as Error)?.name || "Error")})`);
  } finally {
    release();
  }
  console.log(`[computadoras] fichas de Facebook: ${rows.length} leídas, ${rows.filter((row) => row.description).length} con descripción`);
  return rows;
}

/** Las piezas nuevas de un aviso de ML o de tienda como observaciones de precio. */
function newObservationsFrom(rows: ReadonlyArray<{ title: string; priceUsd: number; sellerId: string; url: string; image: string | null; category?: string | null }>): PartObservation[] {
  const out: PartObservation[] = [];
  for (const row of rows) {
    if (row.category === "MLU1696" || (!row.category && isBareCase(row.title))) {
      if (isBareCase(row.title)) out.push({ slug: "case:basico", role: "case", label: "Gabinete básico", facts: {}, condition: "new", priceUsd: row.priceUsd, sellerId: row.sellerId, title: row.title, url: row.url, image: row.image });
      continue;
    }
    const specs = readComputerSpecs({ title: row.title, mlCategory: row.category ?? null });
    if (!specs.kind || isMachineKind(specs.kind) || specs.kind === "combo" || specs.faults.length) continue;
    for (const identity of partIdentityOf(specs, row.title)) out.push({ ...identity, condition: "new", priceUsd: row.priceUsd, sellerId: row.sellerId, title: row.title, url: row.url, image: row.image });
  }
  return out;
}

/** La notebook nueva con el mismo procesador: mediana de ML con ≥ 3 ofertas de ≥ 2 vendedores. */
function notebookRefsFrom(rows: readonly RawComputerListing[], usdUyu: number): Refs["notebooks"] {
  const groups = new Map<string, { label: string; prices: number[]; sellers: Set<string> }>();
  for (const row of rows) {
    if (row.category !== "MLU1652" || !/^nuevo$/i.test(row.condition ?? "")) continue;
    const specs = readComputerSpecs({ title: row.title, mlCategory: row.category });
    if (specs.kind !== "notebook" || !specs.cpu?.slug) continue;
    const key = `notebook:${specs.cpu.slug}`;
    const group = groups.get(key) ?? { label: `Notebook nueva con ${specs.cpu.label}`, prices: [], sellers: new Set<string>() };
    group.prices.push(row.currency === "USD" ? row.price : row.price / usdUyu);
    group.sellers.add(row.sellerId ?? row.slug);
    groups.set(key, group);
  }
  const out: Refs["notebooks"] = {};
  for (const [key, group] of groups) {
    if (group.prices.length >= 3 && group.sellers.size >= 2) out[key] = { label: group.label, medianUsd: round(median(group.prices)), n: group.prices.length };
  }
  return out;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const fast = process.argv.includes("--fast");
  const jsonOut = process.argv.find((arg) => arg.startsWith("--json="))?.slice("--json=".length);
  const replayFile = process.argv.find((arg) => arg.startsWith("--replay="))?.slice("--replay=".length);
  if (replayFile) {
    replay(replayFile, jsonOut);
    process.exit(0);
  }
  const db = appDbConfigured();
  if (!db && !dryRun) {
    console.error("[computadoras] APP_MONGO_URI no está definida: el directorio vive en la base del app. No se corre.");
    process.exit(1);
  }
  const release = dryRun ? () => undefined : await takeRunLock(fast);
  if (!release) {
    console.log(`[computadoras] ${fast ? "la diaria está corriendo: la horaria se saltea" : "una horaria no soltó el candado en 20 minutos"}`);
    process.exit(fast ? 0 : 1);
  }
  process.on("exit", () => release());
  if (db) await appConnection().asPromise();
  const now = new Date();
  const day = dayOf(now);
  const usdUyu = await fetchUsdUyuRate();
  if (!(usdUyu > 0)) {
    console.error("[computadoras] sin cotización del dólar: no se puede convertir ningún precio. No se corre.");
    process.exit(1);
  }
  const previousMeta = db ? await loadMeta<ComputerMeta>(COMPUTER_META_ID) : null;
  const sources: SourceRun[] = [];

  // 1. Lo que hay hoy.
  const facebook = await readFacebook(fast, day, sources);
  let mlRows: RawComputerListing[] = [];
  if (!fast) {
    const used = await runMlScans(ML_USED_SCANS, day, { deadlineAt: Date.now() + 20 * 60_000 });
    mlRows = used.rows;
    const note = used.dead ? "el puente no contestó" : `${used.rows.length} avisos en ${used.pages} páginas (${used.failed} fallidas)`;
    sources.push({ id: "mercadolibre", label: "Mercado Libre", ok: !used.dead, note, lastOkAt: used.dead ? null : new Date().toISOString() });
    console.log(`[computadoras] mercadolibre usados: ${note}`);
  }
  const seenToday = [...(facebook ?? []), ...mlRows];
  if (db && !dryRun) await saveRawListings(seenToday);

  // 2. La ventana: 30 días para los precios usados, `COMPUTER_FRESH_DAYS` para lo que se publica.
  const window = db ? await loadRawListings(daysBefore(now, 30)) : seenToday;
  const byslug = new Map(window.map((row) => [row.slug, row]));
  if (dryRun) for (const row of seenToday) byslug.set(row.slug, { ...(byslug.get(row.slug) ?? row), ...row, firstSeen: byslug.get(row.slug)?.firstSeen ?? row.firstSeen });
  const raws = [...byslug.values()];
  const freshCut = daysBefore(now, COMPUTER_FRESH_DAYS);
  const fresh = raws.filter((row) => row.lastSeen >= freshCut);

  // 3. Fichas de Facebook.
  const fbIds = raws.filter((row) => row.source === "facebook").map((row) => row.sourceId);
  const details = db ? await loadFacebookDetails(fbIds) : new Map<string, FacebookComputerDetail>();
  const targets = facebookDetailTargets(fresh, details, now, number(fast ? "COMPUTADORAS_FB_DETAIL_FAST_MAX" : "COMPUTADORAS_FB_DETAIL_MAX", fast ? 20 : 45));
  const readDetails = await readFacebookDetails(targets, fast);
  for (const detail of readDetails) details.set(detail.id, detail);
  if (db && !dryRun) await saveFacebookDetails(readDetails);

  const readWindow = readListings(raws, details);
  const readFresh = readWindow.filter(({ raw }) => raw.lastSeen >= freshCut);
  const usage = usageOf(readFresh);

  // 4. Piezas nuevas (sólo la diaria): ML por categoría, los modelos del directorio y las tiendas.
  const previousParts = db ? await loadParts() : [];
  const previousRefs = db ? await loadMeta<Refs>(REFS_ID) : null;
  let newObservations: PartObservation[] = [];
  let newOk = false;
  let notebookRefs: Refs["notebooks"] = previousRefs?.notebooks ?? {};
  if (!fast) {
    const priced = new Set(previousParts.filter((row) => row.new).map((row) => row.slug));
    const wanted = [...usage.entries()]
      .filter(([slug]) => /^(cpu|gpu):/.test(slug) && !priced.has(slug))
      .sort((a, b) => b[1] - a[1])
      .slice(0, number("COMPUTADORAS_MODEL_QUERIES", 30));
    const labelOf = new Map<string, string>();
    for (const { specs } of readFresh) {
      if (specs.cpu?.slug) labelOf.set(specs.cpu.slug, specs.cpu.label.replace(/^(Intel|AMD|Apple)\s/, ""));
      if (specs.gpu?.slug) labelOf.set(specs.gpu.slug, specs.gpu.model ?? specs.gpu.label);
      if (specs.gpu?.baseSlug) labelOf.set(specs.gpu.baseSlug, specs.gpu.model ?? specs.gpu.label);
    }
    const notebookCpus = [...new Set(readFresh.filter(({ specs }) => specs.kind === "notebook" && specs.cpu?.slug).map(({ specs }) => specs.cpu!.slug!))]
      .filter((slug) => !notebookRefs[`notebook:${slug}`])
      .slice(0, number("COMPUTADORAS_NOTEBOOK_QUERIES", 15));
    const scans = [
      ...ML_NEW_SCANS,
      ...modelScans([
        ...wanted.map(([slug]) => ({ role: slug.startsWith("cpu:") ? ("cpu" as const) : ("gpu" as const), query: labelOf.get(slug) ?? slug.split(":")[1]!.replace(/-/g, " ") })),
        ...notebookCpus.map((slug) => ({ role: "notebook" as const, query: `notebook ${labelOf.get(slug) ?? slug.split(":")[1]!.replace(/-/g, " ")}` })),
      ]),
    ];
    const ml = await runMlScans(scans, day, { deadlineAt: Date.now() + 25 * 60_000 });
    const mlNew = ml.rows.filter((row) => /^nuevo$/i.test(row.condition ?? ""));
    newObservations = newObservationsFrom(mlNew.map((row) => ({ title: row.title, priceUsd: row.currency === "USD" ? row.price : row.price / usdUyu, sellerId: row.sellerId ?? row.slug, url: row.url, image: row.image, category: row.category })));
    notebookRefs = { ...notebookRefs, ...notebookRefsFrom(mlNew, usdUyu) };
    console.log(`[computadoras] mercadolibre nuevos: ${mlNew.length} ofertas en ${ml.pages} páginas → ${newObservations.length} piezas identificadas`);
    sources.push({ id: "mercadolibre-nuevos", label: "Mercado Libre (piezas nuevas)", ok: !ml.dead, note: `${newObservations.length} piezas identificadas de ${mlNew.length} ofertas`, lastOkAt: ml.dead ? null : new Date().toISOString() });

    if (process.env.COMPUTADORAS_STORES_ENABLED !== "0") {
      const stores = await harvestPartStores();
      const storeObservations = newObservationsFrom(
        stores.listings.map((listing) => ({ title: listing.title, priceUsd: listing.currency === "USD" ? listing.price : listing.price / usdUyu, sellerId: `store:${listing.sellerKey}`, url: listing.url, image: listing.image, category: null }))
      );
      newObservations.push(...storeObservations);
      for (const run of stores.runs) console.log(`[computadoras] tienda ${run.key}: ${run.ok ? "ok" : "falló"} ${run.listings} productos · ${run.note}`);
      const okStores = stores.runs.filter((run) => run.ok).length;
      sources.push({ id: "tiendas", label: "Tiendas de informática", ok: okStores > 0, note: `${okStores} de ${stores.runs.length} tiendas leídas, ${storeObservations.length} piezas identificadas`, lastOkAt: okStores ? new Date().toISOString() : null });
    }
    newOk = !ml.dead || newObservations.length > 0;
  }

  const dumpFile = process.argv.find((arg) => arg.startsWith("--dump="))?.slice("--dump=".length);
  if (dumpFile) {
    const dump: Dump = { at: now.toISOString(), usdUyu, raws, details: [...details.values()], newObservations, newOk, notebookRefs, previousParts, sources, previousMeta };
    mkdirSync(dirname(dumpFile), { recursive: true });
    writeFileSync(dumpFile, JSON.stringify(dump));
    console.log(`[computadoras] lo leído quedó en ${dumpFile} (--replay=${dumpFile} lo rearma sin fuentes)`);
  }
  const { rows, parts, meta, presets } = assemble({ now, fast, usdUyu, raws, details, newObservations, newOk, notebookRefs, previousParts, sources, previousMeta });
  console.log(`[computadoras] ${JSON.stringify(meta.counts)} · piezas con precio ${meta.partsPriced} · dólar ${meta.usdUyu}`);
  for (const preset of presets) console.log(`[computadoras] ${preset.label}: ${preset.totalUsd ? `US$ ${preset.totalUsd}` : `falta ${preset.missing.join(", ")}`}`);

  if (jsonOut) {
    mkdirSync(dirname(jsonOut), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify({ meta, items: rows, parts }, null, 1));
    console.log(`[computadoras] vista previa en ${jsonOut}`);
  }
  if (dryRun) process.exit(0);

  // 6. Guarda de corrida flaca: no se pisa un catálogo bueno con uno que perdió más de la mitad.
  const published = await countPublished();
  if (published >= 50 && rows.length < published * 0.4) {
    const reason = `la corrida publicaría ${rows.length} avisos contra ${published} publicados (menos del 40 %)`;
    console.error(`[computadoras] ${reason}; no se pisa el catálogo.`);
    await saveMeta(REFUSAL_ID, { reason, at: now.toISOString() }, now.toISOString());
    process.exit(1);
  }
  await publish(rows, parts, meta);
  if (!fast) {
    await saveMeta(REFS_ID, { notebooks: notebookRefs } satisfies Refs, now.toISOString());
    const pruned = await pruneRawListings(daysBefore(now, 60));
    if (pruned) console.log(`[computadoras] ${pruned} avisos de hace más de 60 días borrados de lo crudo`);
  }
  console.log(`[computadoras] publicado ${now.toISOString()}`);
  process.exit(0);
}

/** Lo leído de todas las fuentes en una corrida: `--dump` lo guarda y `--replay` lo rearma. */
interface Dump {
  at: string;
  usdUyu: number;
  raws: RawComputerListing[];
  details: FacebookComputerDetail[];
  newObservations: PartObservation[];
  newOk: boolean;
  notebookRefs: Refs["notebooks"];
  previousParts: PartRow[];
  sources: SourceRun[];
  previousMeta: ComputerMeta | null;
}

interface AssembleInput extends Omit<Dump, "at" | "details"> {
  now: Date;
  fast: boolean;
  details: ReadonlyMap<string, FacebookComputerDetail>;
}

/** La tabla, el catálogo, las PCs tipo y la corrida, de lo leído. Sin red ni base. */
function assemble(input: AssembleInput): { rows: ComputerCatalogRow[]; parts: PartRow[]; meta: ComputerMeta; presets: Preset[] } {
  const { now, usdUyu, sources, previousMeta } = input;
  const freshCut = daysBefore(now, COMPUTER_FRESH_DAYS);
  const readWindow = readListings(input.raws, input.details);
  const readFresh = readWindow.filter(({ raw }) => raw.lastSeen >= freshCut);
  const usage = usageOf(readFresh);
  const usedObservations = usedPartObservations(readWindow, usdUyu);
  const parts = buildPartTable({ newObservations: input.newObservations, usedObservations, previous: input.previousParts, newOk: input.newOk, day: dayOf(now), usage });
  const table = new Map(parts.map((row) => [row.slug, row]));
  const rows = buildComputerCatalog({ read: readFresh, table, notebookRefs: new Map(Object.entries(input.notebookRefs)), usdUyu });
  const presets = buildPresets(table);

  // Una fuente que no corrió hoy conserva su fecha de la última vez que anduvo.
  const lastOk = new Map((previousMeta?.sources ?? []).map((source) => [source.id, source.lastOkAt]));
  for (const source of sources) if (!source.lastOkAt) source.lastOkAt = lastOk.get(source.id) ?? null;
  for (const old of previousMeta?.sources ?? []) if (!sources.some((source) => source.id === old.id)) sources.push({ ...old, note: `sin leer en esta corrida (${input.fast ? "horaria" : "diaria"})` });

  const meta: ComputerMeta = {
    generatedAt: now.toISOString(),
    freshDays: COMPUTER_FRESH_DAYS,
    usdUyu: round(usdUyu * 100) / 100,
    counts: {
      total: rows.length,
      computers: rows.filter((row) => row.kindGroup === "computer").length,
      parts: rows.filter((row) => row.kindGroup === "part").length,
      facebook: rows.filter((row) => row.source === "facebook").length,
      mercadolibre: rows.filter((row) => row.source === "mercadolibre").length,
      withValuation: rows.filter((row) => row.valuation).length,
      withNewTotal: rows.filter((row) => row.valuation?.newTotalUsd).length,
      withUsedTotal: rows.filter((row) => row.valuation?.usedTotalUsd).length,
      detailRead: rows.filter((row) => row.detailRead).length,
    },
    sources,
    partsPriced: parts.filter((row) => row.new || row.used).length,
    presets,
  };
  return { rows, parts, meta, presets };
}

/** `--replay=<archivo>`: rearma la vista previa desde un `--dump`, sin leer ninguna fuente ni la base. */
function replay(file: string, jsonOut: string | undefined): void {
  const dump = JSON.parse(readFileSync(file, "utf8")) as Dump;
  const { rows, parts, meta, presets } = assemble({ ...dump, now: new Date(dump.at), fast: false, details: new Map(dump.details.map((detail) => [detail.id, detail])) });
  console.log(`[computadoras] (replay) ${JSON.stringify(meta.counts)} · piezas con precio ${meta.partsPriced}`);
  for (const preset of presets) console.log(`[computadoras] ${preset.label}: ${preset.totalUsd ? `US$ ${preset.totalUsd}` : `falta ${preset.missing.join(", ")}`}`);
  if (jsonOut) {
    mkdirSync(dirname(jsonOut), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify({ meta, items: rows, parts }, null, 1));
    console.log(`[computadoras] vista previa en ${jsonOut}`);
  }
}

main().catch((error) => {
  console.error("[computadoras] falló:", error instanceof Error ? error.message : error);
  process.exit(1);
});
