// Lee la ficha propia de los avisos de Casasweb del directorio de alquileres para traer el punto de
// su mapa, que la tarjeta de búsqueda no publica (classes/rentals/casaswebDetail.ts). Con
// presupuesto: primero las viviendas de Montevideo, sólo propiedades sin coordenada, cada aviso una
// vez por mes.
//
// Escribe la colección privada `rentalcasaswebdetails` y completa en `rentallistings` sólo la
// coordenada VACÍA de la propiedad. La cosecha la reaplica (classes/rentals/detailPins.ts).
//
// Las fichas se piden con la UA del bot y el espaciado por host de net.ts; a los :25, lejos de la
// cosecha horaria (:47), que lee las búsquedas del mismo sitio. Cinco fallas seguidas cortan la
// corrida: un portal que empieza a negarse no se insiste.
//
// --dry-run lee y muestra, sin escribir.
import "dotenv/config";
import { appConnection, appDbConfigured } from "./classes/appdb";
import {
  CASASWEB_DETAIL_COLLECTION,
  casaswebDetailTargets,
  parseCasaswebPin,
  saveCasaswebDetails,
  type CasaswebRentalDetail,
} from "./classes/rentals/casaswebDetail";
import { writeDetailPin } from "./classes/rentals/detailPins";
import { fetchText, sleep } from "./classes/rentals/net";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  await appConnection().asPromise();
  const targets = await casaswebDetailTargets(new Date(), number("RENTALS_CASASWEB_DETAIL_MAX", 80));
  const summary = { targets: targets.length, read: 0, pinned: 0, noMap: 0, unreadable: 0, failed: 0, located: 0, note: "" };
  if (!targets.length) {
    console.log("[rentals-casasweb-detail] sin fichas pendientes");
    return;
  }
  const gapMs = number("RENTALS_CASASWEB_DETAIL_GAP_MS", 1_500);
  const deadline = Date.now() + number("RENTALS_CASASWEB_DETAIL_MINUTES", 10) * 60_000;
  const rows: CasaswebRentalDetail[] = [];
  let consecutiveFailures = 0;
  for (const target of targets) {
    if (Date.now() >= deadline) { summary.note = "presupuesto de tiempo agotado"; break; }
    if (consecutiveFailures >= 5) { summary.note = "cinco fallas seguidas: Casasweb no está contestando"; break; }
    let failure = "";
    const html = await fetchText(target.url, { retries: 1, timeoutMs: 20_000, onFailure: reason => { failure = reason; } });
    const pin = html ? parseCasaswebPin(html, target.listingId) : undefined;
    if (!html || pin === undefined) {
      // Not saved: a failed read, or a page that is not this advert's, is simply a target again.
      consecutiveFailures++;
      if (html) summary.unreadable++; else summary.failed++;
      if (failure) summary.note = failure;
    } else {
      consecutiveFailures = 0;
      summary.read++;
      rows.push({ listingId: target.listingId, readAt: new Date().toISOString(), latitude: pin?.latitude ?? null, longitude: pin?.longitude ?? null, ok: true });
      if (!pin) summary.noMap++;
      else {
        summary.pinned++;
        if (!dryRun && (await writeDetailPin(target, pin))) summary.located++;
      }
    }
    await sleep(gapMs);
  }
  if (!dryRun) await saveCasaswebDetails(rows);
  const stored = dryRun ? 0 : await appConnection().collection(CASASWEB_DETAIL_COLLECTION).countDocuments({ latitude: { $type: "number" } });
  console.log(`[rentals-casasweb-detail] ${JSON.stringify({ ...summary, dryRun, withPinStored: stored })}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("[rentals-casasweb-detail] fallo", error instanceof Error ? error.message : error);
    process.exit(1);
  });
