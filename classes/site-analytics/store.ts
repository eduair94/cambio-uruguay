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

/** True cuando escribir esto perdería datos: llega vacío y lo guardado no lo estaba. */
export async function revenueWouldRegress(next: RevenueSnapshot): Promise<boolean> {
  if (!revenueIsEmpty(next)) return false;
  const previous = await loadSiteRevenue();
  return !!previous && !revenueIsEmpty(previous);
}

export async function saveSiteRevenue(snapshot: RevenueSnapshot): Promise<void> {
  await SiteRevenueSnapshotModel.updateOne(
    { key: SITE_REVENUE_KEY },
    { $set: { ...snapshot, key: SITE_REVENUE_KEY } },
    { upsert: true }
  );
}
