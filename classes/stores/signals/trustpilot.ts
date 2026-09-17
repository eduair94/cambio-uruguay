// Signal for /tiendas-online-uruguay: a store's Trustpilot score, read from our own self-hosted
// Trustpilot scraper service (the "trustpilot" monorepo, same one app/server/tasks/casas/
// refreshReviews.ts already reads for exchange houses — see app/utils/casasReviews.ts's
// parseTrustpilotFeedbacks for the sibling implementation). Read once a week by the sync job
// (Task 6), and only for the domain the registry already trusts (classes/stores/registry.ts's
// `trustpilotDomain`, defaulting to `domain`) — there is no name-search step here, unlike Google,
// because Trustpilot's own `/feedbacks?domain=` endpoint is keyed by domain already.
import { httpText } from "../net";

export interface TrustpilotSignal {
  score: number;
  reviews: number;
  reviewsLast12m: number;
  claimed: boolean;
  alerts: number;
  url: string;
  checkedAt: string;
}

// The service really can be slow (it is itself scraping Trustpilot live); 60s matches the brief
// and casasReviews.ts's own `timeout: 90_000` for the same endpoint is in the same ballpark.
const TRUSTPILOT_TIMEOUT_MS = Number(process.env.STORES_TRUSTPILOT_TIMEOUT_MS || 60_000);

/**
 * Everything that matters is nested under `businessUnit`, not at the top level (measured shape,
 * see the task-3 brief: `GET :3029/trustpilot/feedbacks?domain=tiendamia.com`). `numberOfReviews:
 * 0` is treated the same as "no businessUnit at all": Trustpilot happily returns a claimed-but-
 * empty business unit for a domain nobody has reviewed, and a 0-review score is not a signal worth
 * publishing. `trustScore` outside 0-5 means the service handed back something that isn't really a
 * star rating (or garbled JSON) rather than a real, if extreme, score.
 */
export function parseTrustpilot(json: unknown, checkedAt: string): TrustpilotSignal | null {
  const root = (json ?? {}) as Record<string, unknown>;
  const bu = root.businessUnit;
  if (!bu || typeof bu !== "object") return null;
  const unit = bu as Record<string, unknown>;

  const reviews = unit.numberOfReviews;
  if (typeof reviews !== "number" || !(reviews > 0)) return null;

  const score = unit.trustScore;
  if (typeof score !== "number" || !(score >= 0 && score <= 5)) return null;

  const pageUrl = root.pageUrl;
  if (typeof pageUrl !== "string" || !pageUrl) return null;

  const reviewsLast12m = typeof unit.numberOfReviewsLast12Months === "number" ? unit.numberOfReviewsLast12Months : 0;
  const claimed = unit.isClaimed === true;
  const alerts = Array.isArray(unit.consumerAlerts) ? unit.consumerAlerts.length : 0;

  return { score, reviews, reviewsLast12m, claimed, alerts, url: pageUrl, checkedAt };
}

/**
 * `undefined` only when the service itself could not be reached or answered with a server error
 * (network failure or 5xx — the job should keep the previous value and retry next week); `null`
 * when it answered but this domain has no usable Trustpilot page (404, or a 200 whose JSON has no
 * business unit); otherwise the parsed signal.
 */
export async function fetchTrustpilot(domain: string): Promise<TrustpilotSignal | null | undefined> {
  const base = (process.env.STORES_TRUSTPILOT_URL || "http://127.0.0.1:3029").replace(/\/$/, "");
  const url = `${base}/trustpilot/feedbacks?domain=${encodeURIComponent(domain)}`;
  const res = await httpText(url, { timeoutMs: TRUSTPILOT_TIMEOUT_MS });
  if (!res) return undefined;
  if (res.status >= 500) return undefined;
  if (res.status === 404) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    // A non-JSON body on a non-404, non-5xx status is not a business unit either.
    return null;
  }
  return parseTrustpilot(parsed, new Date().toISOString());
}
