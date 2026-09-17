// Mercado Libre's public price guide (/precios-autos/<marca>/<modelo>/<año>/): which versions exist
// each year and ML's own price per version. Measured 2026-09-17: the guide's price IS the median of
// the same ML adverts (Hilux 2018 DX = US$ 32.990 on both sides), so it is a catalogue and a second
// opinion where our sample is thin — never an independent valuation. The page writes US$ as "$ 30,897".
import { AUTOS_USER_AGENT } from "../detail";
import { slugify } from "../normalize";
import type { PublicCarGuideYear } from "../publicTypes";
import type { CarListing, CarReference } from "../types";

export interface CarGuideVersion {
  name: string;
  slug: string;
  priceUsd: number;
}

export interface CarGuideEntry {
  key: string;
  brandSlug: string;
  modelSlug: string;
  year: number;
  status: "ok" | "missing" | "failed";
  averageUsd: number | null;
  versions: CarGuideVersion[];
  updatedLabel: string | null;
  fetchedAt: string;
}

export interface CarGuideTarget {
  brandSlug: string;
  modelSlug: string;
  year: number;
  listings: number;
}

type TargetPlace = Pick<CarGuideTarget, "brandSlug" | "modelSlug" | "year">;

const GUIDE_BASE = "https://www.mercadolibre.com.uy/precios-autos";
const DAY = 86_400_000;
const REFRESH_DAYS = { ok: 7, failed: 1, missing: 30 } as const;
const FAILURE_STREAK = 3;

export const guideKey = (brandSlug: string, modelSlug: string, year: number): string => `${brandSlug}|${modelSlug}|${year}`;

export const guideYearUrl = (target: TargetPlace): string => `${GUIDE_BASE}/${target.brandSlug}/${target.modelSlug}/${target.year}/`;

const dollars = (text: string): number | null => {
  const digits = text.replace(/[^\d]/g, "");
  const value = Number(digits);
  return digits && value > 0 ? value : null;
};

export function parseGuideYearPage(html: string, target: TargetPlace): { averageUsd: number | null; updatedLabel: string | null; versions: CarGuideVersion[] } | null {
  const average = /seo-landing-average-price-component__price-amount">\s*\$\s*([\d.,]+)/.exec(html);
  const updated = /seo-landing-average-price-component__date">\s*Actualizado el\s*([^<]+)</.exec(html);
  const versions: CarGuideVersion[] = [];
  const row = /<a class="seo-landing-versions-price__link" href="\/precios-autos\/([\w-]+)\/([\w-]+)\/(\d{4})\/([\w-]+)\/">([^<]+)<\/a>[\s\S]*?andes-table__column--value"[^>]*>\s*\$\s*([\d.,]+)/g;
  let match: RegExpExecArray | null;
  while ((match = row.exec(html))) {
    if (match[1] !== target.brandSlug || match[2] !== target.modelSlug || Number(match[3]) !== target.year) continue;
    const price = dollars(match[6]!);
    if (price) versions.push({ name: match[5]!.trim(), slug: match[4]!, priceUsd: price });
  }
  const averageUsd = average ? dollars(average[1]!) : null;
  if (averageUsd === null && !versions.length) return null;
  return { averageUsd, updatedLabel: updated ? updated[1]!.trim() : null, versions };
}

/** Never-read model-years first (most adverts first), then due refreshes, oldest first. */
export function planGuideTargets(
  targets: readonly CarGuideTarget[],
  previous: ReadonlyMap<string, Pick<CarGuideEntry, "status" | "fetchedAt">>,
  now: Date,
): CarGuideTarget[] {
  const unseen: CarGuideTarget[] = [];
  const due: Array<{ target: CarGuideTarget; fetchedAt: number }> = [];
  for (const target of targets) {
    const seen = previous.get(guideKey(target.brandSlug, target.modelSlug, target.year));
    if (!seen) {
      unseen.push(target);
      continue;
    }
    const fetchedAt = Date.parse(seen.fetchedAt);
    // An unparsable date is treated as ancient: better one extra read than a page never refreshed.
    const age = Number.isFinite(fetchedAt) ? now.getTime() - fetchedAt : Infinity;
    if (age >= REFRESH_DAYS[seen.status] * DAY) due.push({ target, fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : 0 });
  }
  const keyOf = (target: CarGuideTarget): string => guideKey(target.brandSlug, target.modelSlug, target.year);
  unseen.sort((a, b) => b.listings - a.listings || keyOf(a).localeCompare(keyOf(b)));
  due.sort((a, b) => a.fetchedAt - b.fetchedAt || keyOf(a.target).localeCompare(keyOf(b.target)));
  return [...unseen, ...due.map(item => item.target)];
}

export interface GuidePage {
  status: number;
  body: string;
  /** Final URL after redirects, when known. */
  url?: string;
}

async function defaultFetchPage(url: string): Promise<GuidePage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { headers: { "user-agent": AUTOS_USER_AGENT, accept: "text/html" }, signal: controller.signal });
    return { status: response.status, body: await response.text(), url: response.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlGuide(
  targets: readonly CarGuideTarget[],
  options: {
    maxDurationMs: number;
    gapMs: number;
    fetchPage?: (url: string) => Promise<GuidePage | null>;
    sleep?: (ms: number) => Promise<void>;
    now?: () => Date;
  },
): Promise<{ entries: CarGuideEntry[]; requests: number; note: string | null }> {
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const fetchPage = options.fetchPage ?? defaultFetchPage;
  const started = now().getTime();
  const entries: CarGuideEntry[] = [];
  let requests = 0;
  let streak = 0;
  let note: string | null = null;
  for (const target of targets) {
    if (now().getTime() - started >= options.maxDurationMs) {
      note = "presupuesto agotado";
      break;
    }
    if (requests > 0 && options.gapMs > 0) await sleep(options.gapMs);
    const url = guideYearUrl(target);
    const page = await fetchPage(url);
    requests++;
    const base = {
      key: guideKey(target.brandSlug, target.modelSlug, target.year), brandSlug: target.brandSlug, modelSlug: target.modelSlug,
      year: target.year, averageUsd: null, versions: [], updatedLabel: null, fetchedAt: now().toISOString(),
    };
    let entry: CarGuideEntry;
    if (!page || (page.status !== 200 && page.status !== 404 && page.status !== 410)) {
      entry = { ...base, status: "failed" };
    } else if (page.status !== 200 || (page.url && !page.url.split("?")[0]!.endsWith(new URL(url).pathname))) {
      // Gone, or redirected elsewhere: ML has no page for this model-year.
      entry = { ...base, status: "missing" };
    } else {
      const parsed = parseGuideYearPage(page.body, target);
      entry = parsed ? { ...base, status: "ok", ...parsed } : { ...base, status: "missing" };
    }
    entries.push(entry);
    streak = entry.status === "failed" ? streak + 1 : 0;
    if (streak >= FAILURE_STREAK) {
      note = "la guía no responde";
      break;
    }
  }
  return { entries, requests, note };
}

export function referenceFor(
  listing: Pick<CarListing, "brandSlug" | "modelSlug" | "year" | "trimLabel">,
  guide: ReadonlyMap<string, CarGuideEntry>,
): CarReference | null {
  const entry = guide.get(guideKey(listing.brandSlug, listing.modelSlug, listing.year));
  if (!entry || entry.status !== "ok") return null;
  const trim = listing.trimLabel ? slugify(listing.trimLabel) : "";
  const version = trim ? entry.versions.find(item => slugify(item.name).endsWith(`-${trim}`)) : undefined;
  if (version) return { priceUsd: version.priceUsd, basis: "version", updatedAt: entry.fetchedAt };
  if (entry.averageUsd !== null) return { priceUsd: entry.averageUsd, basis: "year", updatedAt: entry.fetchedAt };
  return null;
}

/** "Toyota Hilux 2018 Srv" → "Srv": the page repeats brand, model and year in every row. */
function bareVersion(name: string, year: number): string {
  const index = name.indexOf(String(year));
  const rest = index >= 0 ? name.slice(index + 4).trim() : "";
  return rest || name;
}

export function guideYearsFor(
  brandSlug: string,
  modelSlug: string,
  guide: ReadonlyMap<string, CarGuideEntry>,
): { guide: PublicCarGuideYear[]; guideUpdatedAt: string | null } {
  const entries = [...guide.values()]
    .filter(entry => entry.status === "ok" && entry.brandSlug === brandSlug && entry.modelSlug === modelSlug)
    .sort((a, b) => b.year - a.year)
    .slice(0, 40);
  return {
    guide: entries.map(entry => ({
      year: entry.year,
      averageUsd: entry.averageUsd,
      versions: entry.versions.map(version => ({ name: bareVersion(version.name, entry.year), priceUsd: version.priceUsd })),
    })),
    guideUpdatedAt: entries.length ? entries.map(entry => entry.fetchedAt).sort().reverse()[0]! : null,
  };
}
