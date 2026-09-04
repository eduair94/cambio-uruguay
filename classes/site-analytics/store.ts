// One living document, upserted. History is not kept here on purpose: GA4 IS the archive, and any
// window can be re-fetched from it — unlike the prediction ledger, nothing in this collection is
// unrecomputable.
import { SiteAnalyticsSnapshotModel } from "../models/SiteAnalyticsSnapshot";
import { SiteRevenueSnapshotModel } from "../models/SiteRevenueSnapshot";
import { revenueIsEmpty, SITE_REVENUE_KEY } from "./revenue";
import type { RevenueSnapshot } from "./revenue";
import { SITE_ANALYTICS_KEY } from "./types";
import type { SiteAnalyticsSnapshot } from "./types";

export async function saveSiteAnalytics(snapshot: SiteAnalyticsSnapshot): Promise<void> {
  await SiteAnalyticsSnapshotModel.updateOne(
    { key: SITE_ANALYTICS_KEY },
    { $set: { ...snapshot, key: SITE_ANALYTICS_KEY } },
    { upsert: true }
  );
}

export async function loadSiteAnalytics(): Promise<SiteAnalyticsSnapshot | null> {
  return SiteAnalyticsSnapshotModel.findOne({ key: SITE_ANALYTICS_KEY }).lean<SiteAnalyticsSnapshot>().exec();
}

// ---------------------------------------------------------------------------------------------
// El ingreso, en su propia colección
//
// Separada del snapshot público a propósito: ver el encabezado de revenue.ts. Guardar un vacío
// encima de un snapshot con plata sería perder la única foto que hay, así que se refuse igual que
// en los otros jobs — salvo la primera vez, cuando el vacío ES el estado real (el enlace
// AdSense↔GA4 tarda hasta 24 h en devolver datos).
// ---------------------------------------------------------------------------------------------

export async function loadSiteRevenue(): Promise<RevenueSnapshot | null> {
  return SiteRevenueSnapshotModel.findOne({ key: SITE_REVENUE_KEY }).lean<RevenueSnapshot>().exec();
}

/**
 * True cuando escribir esto perdería datos.
 *
 * Dos motivos, y el segundo faltaba. El primero: llega una lectura que todavía no es una medición y
 * lo guardado sí lo era. El segundo: llega una lectura que pasa los pisos pero se derrumbó contra la
 * que ya está sirviendo — es el caso que el job de videos y el de Bankos ya pagaron, un reporte a
 * medias que se ve vivo y reemplaza uno sano. Las dos ventanas son de 28 días, así que perder la
 * mitad de las impresiones no es estacionalidad.
 *
 * Ya no arranca preguntando por `next`: el corto de `!revenueIsEmpty(next) → false` era lo que dejaba
 * entrar cualquier cosa que no fuera exactamente cero.
 *
 * Y la negativa CADUCA, que es lo que le falta al mismo guardarraíl del job de videos. Ahí la regla
 * del derrumbe es secundaria —`snapshotIsThin` mira antes cuántos canales contestaron, o sea tiene
 * una señal propia de si la caída es de la fuente o del mundo—; acá no hay ninguna. Sin caducidad,
 * una baja real y duradera (AdSense limita la publicidad de un sitio, o el tráfico se cae de verdad)
 * congela el documento para siempre: se rechaza contra un `previous` que ya no avanza, y el rechazo
 * se vuelve a ganar cada día contra la misma cifra vieja. A los {@link REVENUE_REFUSAL_MAX_DAYS} días
 * el derrumbe deja de ser sospecha y pasa a ser el dato.
 */
export const REVENUE_REFUSAL_MAX_DAYS = 7;

export async function revenueWouldRegress(next: RevenueSnapshot): Promise<boolean> {
  const previous = await loadSiteRevenue();
  // Sin nada bueno guardado no hay nada que perder — y la primera vez el vacío ES el estado real.
  if (!previous || revenueIsEmpty(previous)) return false;
  if (revenueIsEmpty(next)) return true;
  if (next.totals.adImpressions * 2 >= previous.totals.adImpressions) return false;
  return !refusalExpired(previous.asOf, next.asOf);
}

/** True cuando lo guardado quedó tan viejo que seguir defendiéndolo publica una mentira distinta. */
function refusalExpired(previousAsOf: string, nextAsOf: string): boolean {
  const before = Date.parse(previousAsOf);
  const now = Date.parse(nextAsOf);
  // Una fecha ilegible no puede autorizar un sobrescrito; ante la duda se conserva lo guardado.
  if (!Number.isFinite(before) || !Number.isFinite(now)) return false;
  return now - before > REVENUE_REFUSAL_MAX_DAYS * 24 * 60 * 60 * 1000;
}

export async function saveSiteRevenue(snapshot: RevenueSnapshot): Promise<void> {
  await SiteRevenueSnapshotModel.updateOne(
    { key: SITE_REVENUE_KEY },
    { $set: { ...snapshot, key: SITE_REVENUE_KEY } },
    { upsert: true }
  );
}
