// Daily celulares-market harvest for the phone directory.
//
// Reads MercadoLibre plus the Uruguayan storefronts in classes/phones/spec.ts's PHONE_STORE_KEYS
// through the shared classes/retail harvester — the same pipes classes/chairs and classes/equipar
// read, with the phone category injected as a CategorySpec (classes/phones/spec.ts) rather than
// compiled into an adapter — and turns the result into one row per phone MODEL (brand+family+
// storage), with a price band per condition (classes/phones/catalog.ts's own guards: absolute floor/
// ceiling, an ambiguous-split abstention, an iterative median-of-others screen, then the percentile
// band).
//
// Exit discipline mirrors sync_autos.ts, not sync_equipar.ts: `main()` never calls `process.exit`
// itself — every refusal is a thrown Error — so ONE place (the bottom wrapper) closes the APP DB
// connection and calls `process.exit`, on every path, success or failure. `main` is exported (and
// only auto-invoked when this file is the actual CLI entry, via the `require.main === module` guard
// below) so tests/phones/dry_run.test.ts can call it directly with every heavy dependency mocked,
// without a stray `process.exit` inside main() tearing down the test runner if a mock lets execution
// fall through past it.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/chairs/catalog";
import { buildPhoneCatalog } from "./classes/phones/catalog";
import type { PhoneMeta, PhoneModel } from "./classes/phones/catalog";
import { identifyPhone } from "./classes/phones/identify";
import { PHONE_SPEC, PHONE_STORE_KEYS } from "./classes/phones/spec";
import { countStoredPhones, loadPreviousPhones, savePhoneCatalog, withPhoneHistory } from "./classes/phones/store";
import { recordPricewatch } from "./classes/pricewatch/record";
import { harvestRetail } from "./classes/retail/harvest";
import { retailStores } from "./classes/retail/stores";
import { applyUnitGuard } from "./classes/retail/unitGuard";

/** A model this run can actually publish a headline price for — see PhoneModel.ambiguousConditions. */
function hasPublishableNewBand(model: PhoneModel): boolean {
  return !!model.bands.new && !model.ambiguousConditions.includes("new");
}

export async function main(): Promise<void> {
  // The app's own env calls this MONGO_URI; the root bridge insists on APP_MONGO_URI so a job can
  // never write the backend database by accident. Map it explicitly, exactly like sync_equipar.ts.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;

  const dryRun = process.argv.includes("--dry-run");
  const fast = process.argv.includes("--fast");
  const hasAppDb = appDbConfigured();

  if (!dryRun && !hasAppDb) {
    throw new Error("[phones] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
  }

  // A dry run may run with no APP DB configured at all (a local check with no app/.env present):
  // skip everything that would otherwise resolve the connection, and say so — never connect just to
  // read, when the run cannot write anyway.
  const skipDb = dryRun && !hasAppDb;
  if (skipDb) {
    console.log("[phones] --dry-run sin APP_MONGO_URI: no se cargan modelos guardados ni se cuenta el catálogo anterior");
  }

  const startedAt = Date.now();
  const stores = retailStores(PHONE_STORE_KEYS);

  const [harvest, usdUyu, previous, storedCount] = await Promise.all([
    harvestRetail({
      stores,
      specs: [PHONE_SPEC],
      fast,
      maxMlScans: fast ? 8 : 40,
      maxFbQueries: 0,
      maxStoreQueries: fast ? 6 : 12,
    }),
    fetchUsdUyuRate(),
    skipDb ? Promise.resolve(new Map()) : loadPreviousPhones(),
    skipDb ? Promise.resolve(null) : countStoredPhones(),
  ]);

  for (const run of harvest.runs) {
    console.log(`[phones] ${run.ok ? "ok " : "FAIL"} ${run.key.padEnd(16)} ${run.listings} avisos :: ${run.note}`);
  }

  if (!(usdUyu > 0)) {
    throw new Error("[phones] no USD reference rate — refusing to publish prices that cannot be compared");
  }

  // Backstop for a store whose declared unit or currency lies (see classes/retail/unitGuard.ts).
  const guarded = applyUnitGuard(harvest.listings, usdUyu);
  for (const drop of guarded.dropped) {
    console.log(
      `[phones] unidad: ${drop.sellerKey} en ${drop.spec} mediana $${drop.storeMedianUyu} contra $${drop.mlMedianUyu} de ML — descartada`
    );
  }

  const models = buildPhoneCatalog({ listings: guarded.listings, usdUyu });
  const publishable = models.filter(hasPublishableNewBand);
  const ambiguousModels = models.filter((model) => model.ambiguousConditions.length > 0).length;
  const suspectDropped = models.reduce((sum, model) => sum + model.suspectDropped, 0);
  const ambiguousDropped = models.reduce((sum, model) => sum + model.ambiguousDropped, 0);

  // A run that priced almost nothing is an outage, not a market — publishing it would blank a page
  // that was correct yesterday. When storedCount is unknown (a dry run with no APP DB to compare
  // against), only total emptiness refuses; there is nothing stored to measure a relative drop
  // against.
  if (!publishable.length || (storedCount !== null && storedCount > 0 && publishable.length < storedCount * 0.4)) {
    throw new Error(
      `[phones] sólo ${publishable.length} modelos con banda nueva publicable contra ${storedCount ?? "?"} guardados — se conserva el catálogo anterior`
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const stored = withPhoneHistory(models, previous, today);

  const meta: PhoneMeta = {
    generatedAt: new Date().toISOString(),
    usdUyu,
    listings: guarded.listings.length,
    models: models.length,
    runs: harvest.runs,
  };

  if (!dryRun) {
    await savePhoneCatalog(stored, meta);

    // Own try/catch, like sync_equipar.ts: a pricewatch failure must never cost the catalogue that
    // was just saved. productKeyFor keys a phone's offers by its MODEL identity rather than the
    // default ml:<catalogId> — most celulares listings, store or ML, never carry a catalog id at all.
    try {
      const pw = await recordPricewatch(guarded.listings, "celulares", undefined, {
        productKeyFor: (listing) => {
          const identity = identifyPhone(listing.title, listing.attributes);
          return identity ? `phone:${identity.key}` : null;
        },
      });
      console.log(`[phones] pricewatch ${pw.written} ofertas, ${pw.pruned} vencidas borradas`);
    } catch (error) {
      console.error("[phones] no se pudo registrar el historial de precios", error);
    }
  } else {
    console.log("[phones] --dry-run: no se guarda el catálogo ni el historial de precios");
  }

  console.log(
    `[phones] ${models.length} modelos (${publishable.length} con banda nueva publicable, ${ambiguousModels} con alguna condición ambigua), ` +
      `${suspectDropped} ofertas sospechosas descartadas, ${ambiguousDropped} descartadas por ambigüedad, ` +
      `${guarded.listings.length} avisos, ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );
}

if (require.main === module) {
  main()
    .then(async () => {
      if (appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("[phones] fallo", error);
      if (appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(1);
    });
}
