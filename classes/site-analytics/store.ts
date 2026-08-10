// One living document, upserted. History is not kept here on purpose: GA4 IS the archive, and any
// window can be re-fetched from it — unlike the prediction ledger, nothing in this collection is
// unrecomputable.
import { SiteAnalyticsSnapshotModel } from "../models/SiteAnalyticsSnapshot";
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
