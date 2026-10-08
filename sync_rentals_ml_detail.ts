// Lee la ficha propia de los avisos de Mercado Libre del directorio de alquileres para traer sus
// gastos comunes, que la tarjeta de búsqueda no publica (classes/rentals/mlDetail.ts). Con
// presupuesto: primero las viviendas de Montevideo, cada aviso una vez por mes.
//
// Escribe la colección privada `rentalmldetails` y completa en `rentallistings` sólo el
// `commonExpenses` VACÍO del mismo aviso. La cosecha lo reaplica al volver a ver el aviso.
//
// Las fichas se piden directo a mercadolibre.com.uy desde el VPS, con la UA del bot y 2 s entre
// pedidos —como currency-autos-detail (:11), que lee de la misma IP—; por eso esta corre a los :35.
// Cinco fallas seguidas cortan la corrida: un portal que empieza a negarse no se insiste.
//
// --dry-run lee y muestra, sin escribir.
import "dotenv/config";
import { appConnection, appDbConfigured } from "./classes/appdb";
import {
  ML_DETAIL_COLLECTION,
  mlDetailExpenses,
  mlDetailTargets,
  parseMlRentalExpenses,
  saveMlDetails,
  writeMlDetailExpenses,
  type MlRentalDetail,
} from "./classes/rentals/mlDetail";
import { fetchText, sleep } from "./classes/rentals/net";
import { RENTAL_META_KEY } from "./classes/rentals/types";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  await appConnection().asPromise();
  const now = new Date();
  const meta = await appConnection().collection("rentalmetas").findOne({ key: RENTAL_META_KEY }, { projection: { usdUyu: 1 } });
  const usdUyu = Number(meta?.usdUyu) || 0;
  const targets = await mlDetailTargets(now, number("RENTALS_ML_DETAIL_MAX", 120));
  const summary = { targets: targets.length, read: 0, stated: 0, zeroOrAbsent: 0, unreadable: 0, failed: 0, implausible: 0, written: 0, note: "" };
  if (!targets.length) {
    console.log("[rentals-ml-detail] sin fichas pendientes");
    return;
  }
  const gapMs = number("RENTALS_ML_DETAIL_GAP_MS", 2_000);
  const deadline = Date.now() + number("RENTALS_ML_DETAIL_MINUTES", 10) * 60_000;
  const rows: MlRentalDetail[] = [];
  let consecutiveFailures = 0;
  for (const target of targets) {
    if (Date.now() >= deadline) { summary.note = "presupuesto de tiempo agotado"; break; }
    if (consecutiveFailures >= 5) { summary.note = "cinco fallas seguidas: Mercado Libre no está contestando"; break; }
    let failure = "";
    const html = await fetchText(target.url, { retries: 1, timeoutMs: 20_000, onFailure: reason => { failure = reason; } });
    const readAt = new Date().toISOString();
    const stated = html ? parseMlRentalExpenses(html) : undefined;
    if (!html || stated === undefined) {
      // Not saved: a failed read must not blank what an earlier one stated. Without a fresh
      // successful row the advert is simply a target again next run.
      consecutiveFailures++;
      if (html) summary.unreadable++; else summary.failed++;
      if (failure) summary.note = failure;
    } else {
      consecutiveFailures = 0;
      summary.read++;
      rows.push({ listingId: target.listingId, readAt, amount: stated?.amount ?? null, currency: stated?.currency ?? null, ok: true });
      if (!stated) summary.zeroOrAbsent++;
      else {
        summary.stated++;
        const offer = await appConnection()
          .collection("rentallistings")
          .findOne({ key: target.key }, { projection: { offers: 1 } });
        const own = (offer?.offers ?? []).find((row: { listingId?: string }) => row.listingId === target.listingId);
        const expenses = own ? mlDetailExpenses(stated, { price: Number(own.price), currency: own.currency }, usdUyu) : null;
        if (!expenses) summary.implausible++;
        else if (!dryRun && (await writeMlDetailExpenses(target, expenses))) summary.written++;
      }
    }
    await sleep(gapMs);
  }
  if (!dryRun) await saveMlDetails(rows);
  const stored = dryRun ? 0 : await appConnection().collection(ML_DETAIL_COLLECTION).countDocuments({ amount: { $gt: 0 } });
  console.log(`[rentals-ml-detail] ${JSON.stringify({ ...summary, dryRun, withExpensesStored: stored })}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("[rentals-ml-detail] fallo", error instanceof Error ? error.message : error);
    process.exit(1);
  });
