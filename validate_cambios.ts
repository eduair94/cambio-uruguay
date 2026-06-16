import { Cambio } from "./classes/cambio";
import { MongooseServer } from "./classes/database";
import { origins } from "./classes/origins";
import { CambioObj } from "./interfaces/Cambio";
import "dotenv/config";

// Some UY gov / casa de cambio sites have invalid TLS chains
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const PER_SCRAPER_TIMEOUT = 30000;

interface ValidationResult {
  origin: string;
  ok: boolean;
  durationMs: number;
  rows: number;
  codes: string[];
  usdBuy?: number;
  usdSell?: number;
  warnings: string[];
  error?: string;
  sample?: CambioObj[];
}

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout >${ms}ms`)), ms)),
  ]);

// Coherence checks for a single scraper's output
const checkCoherence = (origin: string, data: CambioObj[]): { warnings: string[]; usd?: CambioObj } => {
  const warnings: string[] = [];
  if (!Array.isArray(data)) {
    warnings.push("result is not an array");
    return { warnings };
  }
  for (const row of data) {
    if (row.buy == null || row.sell == null) warnings.push(`${row.code}: missing buy/sell`);
    if (Number.isNaN(row.buy) || Number.isNaN(row.sell)) warnings.push(`${row.code}: NaN value`);
    if (row.buy <= 0 && row.sell <= 0) warnings.push(`${row.code}: both buy/sell <= 0`);
    if (row.buy > 0 && row.sell > 0 && row.buy > row.sell) {
      warnings.push(`${row.code}: buy(${row.buy}) > sell(${row.sell}) (inverted spread)`);
    }
    if (!row.code) warnings.push(`row missing currency code (name=${row.name})`);
  }
  const usd = data.find((d) => d.code === "USD" && (!d.type || d.type === ""));
  if (usd) {
    // USD/UYU plausibility band (2026). Outside => suspect stale/parse error.
    if (usd.sell < 25 || usd.sell > 70) warnings.push(`USD sell ${usd.sell} outside plausible 25-70 band`);
    const spread = usd.sell - usd.buy;
    if (spread <= 0) warnings.push(`USD spread non-positive (${spread.toFixed(2)})`);
    if (spread > 8) warnings.push(`USD spread very wide (${spread.toFixed(2)})`);
  } else {
    warnings.push("no plain USD quote found");
  }
  return { warnings, usd };
};

const validateOne = async (origin: string): Promise<ValidationResult> => {
  const start = Date.now();
  try {
    const cambio: Cambio = new (origins as any)[origin](origin);
    const data: CambioObj[] = await withTimeout(cambio.get_data(), PER_SCRAPER_TIMEOUT);
    const durationMs = Date.now() - start;
    const { warnings, usd } = checkCoherence(origin, data || []);
    const rows = Array.isArray(data) ? data.length : 0;
    if (rows === 0) warnings.unshift("EMPTY result (0 rows)");
    return {
      origin,
      ok: rows > 0 && warnings.filter((w) => w.includes("inverted") || w.includes("EMPTY") || w.includes("outside plausible")).length === 0,
      durationMs,
      rows,
      codes: Array.isArray(data) ? [...new Set(data.map((d) => d.code))] : [],
      usdBuy: usd?.buy,
      usdSell: usd?.sell,
      warnings,
      sample: Array.isArray(data) ? data.slice(0, 2) : [],
    };
  } catch (e: any) {
    return {
      origin,
      ok: false,
      durationMs: Date.now() - start,
      rows: 0,
      codes: [],
      warnings: [],
      error: e?.message || String(e),
    };
  }
};

const main = async () => {
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
    console.log("DB connected (derived scrapers can resolve).\n");
  } catch (e: any) {
    console.warn(`DB NOT connected (${e?.message}); derived scrapers will fail.\n`);
  }
  const keys = Object.keys(origins);
  console.log(`Validating ${keys.length} scrapers (timeout ${PER_SCRAPER_TIMEOUT}ms each)...\n`);

  // Run in small concurrent batches to stay polite but quick
  const BATCH = 6;
  const results: ValidationResult[] = [];
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH);
    const r = await Promise.all(batch.map(validateOne));
    results.push(...r);
    for (const res of r) {
      const tag = res.error ? "❌ ERROR" : res.ok ? "✅ OK   " : "⚠️  WARN";
      const usd = res.usdSell ? `USD ${res.usdBuy}/${res.usdSell}` : "no-USD";
      console.log(
        `${tag} ${res.origin.padEnd(22)} rows=${String(res.rows).padStart(2)} ${usd.padEnd(16)} ${res.durationMs}ms`
      );
      if (res.error) console.log(`         error: ${res.error}`);
      if (res.warnings.length) console.log(`         warn: ${res.warnings.join(" | ")}`);
    }
  }

  const errors = results.filter((r) => r.error);
  const warns = results.filter((r) => !r.error && !r.ok);
  const okIsh = results.filter((r) => r.ok);

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Total: ${results.length}`);
  console.log(`OK (clean): ${okIsh.length}`);
  console.log(`WARN (data but suspicious): ${warns.length}`);
  console.log(`ERROR (failed/empty): ${errors.length}`);
  if (errors.length) console.log(`\nERRORS: ${errors.map((e) => e.origin).join(", ")}`);
  if (warns.length) console.log(`\nWARNINGS: ${warns.map((e) => e.origin).join(", ")}`);

  // USD cross-scraper coherence: list min/max to spot outliers
  const usdSells = results.filter((r) => r.usdSell).map((r) => ({ o: r.origin, v: r.usdSell! }));
  usdSells.sort((a, b) => a.v - b.v);
  if (usdSells.length) {
    console.log(`\nUSD sell range: ${usdSells[0].v} (${usdSells[0].o}) .. ${usdSells[usdSells.length - 1].v} (${usdSells[usdSells.length - 1].o})`);
    const median = usdSells[Math.floor(usdSells.length / 2)].v;
    console.log(`USD sell median: ${median}`);
    const outliers = usdSells.filter((u) => Math.abs(u.v - median) > 3);
    if (outliers.length) console.log(`USD outliers (>3 from median): ${outliers.map((o) => `${o.o}=${o.v}`).join(", ")}`);
  }

  process.exit(0);
};

main();
