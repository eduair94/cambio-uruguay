// Lee la ficha propia de los avisos de Facebook Marketplace que el directorio de alquileres ya
// tiene guardados, con presupuesto y por orden de utilidad (classes/rentals/facebookDetailStore.ts).
// Calcado de sync_autos_detail.ts.
//
// Por qué: el puente (:9657) entrega tarjetas sin barrio, sin coordenada y sin descripción. La
// ficha trae la DESCRIPCIÓN, y ahí el vendedor escribe el barrio ("Zona Piedras Blancas") o la
// esquina ("Ladines y José Llupes"). Medido el 2026-09-22 sobre 100 fichas sin barrio: 89 con
// descripción, 31 nombran un barrio, 17 una esquina o dirección; con esquina geocodificada y
// validada se ubican 36 (Montevideo 30 de 63). El pin de la ficha NO se usa como ubicación: es
// una grilla de ~1 km a 3–6 km del inmueble; sólo su ciudad llena un departamento ausente.
//
// Escribe la colección privada `rentalfacebookdetails` y completa en `rentallistings` sólo los
// campos vacíos de propiedades con un único aviso de Facebook. La cosecha (sync_rentals.ts) vuelve
// a leer esas fichas al re-cosechar el aviso, así que lo aprendido no se pierde.
import dotenv from "dotenv";
dotenv.config();
import { appConnection, appDbConfigured } from "./classes/appdb";
import { FB_ITEM_URL, FacebookSessionError, connectFacebookBrowser, facebookSessionOk, readFacebookPageTexts, sleep } from "./classes/facebook/browser";
import type { RentalFacebookDetailDocument } from "./classes/models/RentalFacebookDetail";
import { areaLocator } from "./classes/propertyzones/geo";
import { INE_DISPLAY_NAMES } from "./classes/propertyzones/names";
import { loadOfficialPropertyZoneGeometry } from "./classes/propertyzones/sources/geometry";
import { addressCandidates, fbRentalDetailFromTexts, locateFacebookRental } from "./classes/rentals/facebookDetail";
import { applyFacebookDetails, facebookDetailTargets, neighborhoodFromZoneLabel, pointContradictsBarrio, saveFacebookDetails } from "./classes/rentals/facebookDetailStore";
import { geocodeCandidates } from "./classes/rentals/facebookGeocode";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  await appConnection().asPromise();
  const now = new Date();
  const summary = { targets: 0, read: 0, found: 0, withDescription: 0, namedBarrio: 0, geocodeTried: 0, geocoded: 0, contradicted: 0, written: 0, sessionLost: false, note: "" };

  if (!(await facebookSessionOk())) {
    console.log("[rentals-detail] sesión de Facebook no disponible; nada que leer");
    return;
  }
  const targets = await facebookDetailTargets(now, number("RENTALS_FB_DETAIL_MAX", 60));
  summary.targets = targets.length;
  if (!targets.length) {
    console.log("[rentals-detail] sin fichas pendientes");
    return;
  }
  const gapMs = number("RENTALS_FB_DETAIL_GAP_MS", 6_000);
  const deadline = Date.now() + number("RENTALS_FB_DETAIL_MINUTES", 12) * 60_000;
  const geocodeBudget = { remaining: number("RENTALS_FB_GEOCODE_MAX", 40) };
  const zones = loadOfficialPropertyZoneGeometry().zones;
  const locate = areaLocator(zones.map(zone => ({ id: zone.officialCode, geometry: zone.geometry })));

  const rows: RentalFacebookDetailDocument[] = [];
  const browser = await connectFacebookBrowser();
  try {
    for (const target of targets) {
      if (Date.now() >= deadline) { summary.note = "presupuesto de tiempo agotado"; break; }
      const readAt = new Date().toISOString();
      const texts = await readFacebookPageTexts(browser, FB_ITEM_URL(target.id));
      const detail = fbRentalDetailFromTexts(target.id, texts, readAt);
      summary.read++;
      if (detail.found) summary.found++;
      if (detail.description) summary.withDescription++;
      const located = locateFacebookRental({ title: target.title, description: detail.description, department: target.department, cardNeighborhood: target.neighborhood, pinCity: detail.pinCity });
      if (located.neighborhood && !target.neighborhood) summary.namedBarrio++;
      const candidates = detail.found ? addressCandidates(`${target.title}\n${detail.description}`) : [];
      const geo = candidates.length ? await geocodeCandidates(candidates, located.department, geocodeBudget) : { point: null, query: null, tried: 0 };
      summary.geocodeTried += geo.tried;
      let point = geo.point;
      let note: string | null = null;
      let neighborhood = located.neighborhood;
      if (point) {
        const zone = locate(point.longitude, point.latitude);
        const label = zone ? INE_DISPLAY_NAMES[zone] ?? null : null;
        if (pointContradictsBarrio(neighborhood, label)) {
          note = `punto en ${label} contradice el barrio nombrado (${neighborhood}); se descarta`;
          summary.contradicted++;
          point = null;
        } else {
          summary.geocoded++;
          // A corner but no barrio in the text: the area the corner is in names it.
          if (!neighborhood && label) {
            neighborhood = neighborhoodFromZoneLabel(label);
            note = `barrio por coordenada (INE ${label})`;
            summary.namedBarrio++;
          }
        }
      }
      rows.push({
        listingId: target.listingId, id: target.id, readAt, found: detail.found, title: detail.title, description: detail.description,
        pinCity: detail.pinCity, pinPostal: detail.pinPostal, pinLat: detail.pinLat, pinLng: detail.pinLng, isLive: detail.isLive,
        neighborhood, department: located.department,
        latitude: point?.latitude ?? null, longitude: point?.longitude ?? null,
        candidates, geocodeQuery: geo.query, geocodeAddress: point?.address ?? null, geocodeTried: geo.tried, note,
      });
      await sleep(gapMs);
    }
  } catch (error) {
    if (error instanceof FacebookSessionError) {
      summary.sessionLost = true;
      summary.note = error.message;
    } else {
      // Only the error class: messages can name URLs.
      summary.note = `falla del navegador: ${String((error as Error)?.name || "Error")}`;
    }
  } finally {
    browser.disconnect();
  }

  if (dryRun) {
    console.log(JSON.stringify({ ...summary, dryRun: true, sample: rows.slice(0, 10).map(row => ({ id: row.id, neighborhood: row.neighborhood, department: row.department, latitude: row.latitude, candidates: row.candidates, note: row.note })) }, null, 2));
    return;
  }
  await saveFacebookDetails(rows);
  const applied = await applyFacebookDetails(rows);
  summary.written = applied.written;
  console.log(`[rentals-detail] ${JSON.stringify(summary)}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("[rentals-detail] fallo", error instanceof Error ? error.message : error);
    process.exit(1);
  });
