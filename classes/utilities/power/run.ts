import { ECSE_DEPARTMENT_URL, ECSE_URBAN_URL, parseEcseRows, type EcseSample } from "./ecse";
import { foldSample, montevideoDay } from "./ledger";
import type { PowerStore } from "./store";

export const POWER_RETENTION_DAYS = 400;
export const BOT_USER_AGENT = "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/barrios-alquileres-uruguay)";

/** ECSE answers `Accept: application/json` with the JSON array encoded AGAIN as a JSON string. */
export function decodeEcseBody(text: string): unknown {
  const value = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  return typeof value === "string" ? JSON.parse(value) : value;
}

/** A timeout, a network failure or a 5xx: worth one more try. A 4xx or a bad body is not. */
export class EcseTransientError extends Error {}

export function isTransientEcseFailure(error: unknown): boolean {
  if (error instanceof EcseTransientError) return true;
  const name = (error as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError" || error instanceof TypeError;
}

async function fetchEcseOnce(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { "user-agent": BOT_USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    const message = `ECSE HTTP ${response.status}`;
    throw response.status >= 500 ? new EcseTransientError(message) : new Error(message);
  }
  return decodeEcseBody(await response.text());
}

/**
 * ECSE times out now and then (2 of ~144 polls on 2026-11-23, CAMBIO-URUGUAY-BACKEND-1Y), and a
 * missed poll is a 20-minute gap the ledger can only credit 10 minutes of. One retry after a short
 * pause fits well inside the job's 4-minute deadline; a second failure still exits 1.
 */
export async function fetchEcseJson(
  url: string,
  { once = fetchEcseOnce, pauseMs = 5_000 }: { once?: (url: string) => Promise<unknown>; pauseMs?: number } = {}
): Promise<unknown> {
  try {
    return await once(url);
  } catch (error) {
    if (!isTransientEcseFailure(error)) throw error;
    await new Promise(resolve => setTimeout(resolve, pauseMs));
    return once(url);
  }
}

/**
 * One poll: both ECSE scopes, validated, folded into the ledger. The state is written BEFORE the
 * increments on purpose: a crash in between loses one interval instead of counting it twice.
 */
export async function runPowerSample({ fetchJson = (url: string) => fetchEcseJson(url), store, now = new Date() }: {
  fetchJson?: (url: string) => Promise<unknown>;
  store: PowerStore;
  now?: Date;
}): Promise<{ observedAt: string; written: number; skipped: boolean; pruned: number }> {
  const urban = parseEcseRows(await fetchJson(ECSE_URBAN_URL), "urban");
  const departments = parseEcseRows(await fetchJson(ECSE_DEPARTMENT_URL), "department");
  const sample: EcseSample = {
    observedAt: urban.observedAt > departments.observedAt ? urban.observedAt : departments.observedAt,
    zones: [...urban.zones, ...departments.zones],
  };
  if (Date.parse(sample.observedAt) > now.getTime() + 10 * 60_000) throw new Error("ECSE timestamp is in the future");
  const previous = await store.readState();
  if (previous && sample.observedAt <= previous.observedAt)
    return { observedAt: sample.observedAt, written: 0, skipped: true, pruned: 0 };
  const { state, increments } = foldSample(previous, sample);
  await store.writeState(state);
  await store.addIncrements(increments);
  let pruned = 0;
  if (!previous || montevideoDay(previous.observedAt) !== montevideoDay(sample.observedAt)) {
    const cutoff = new Date(Date.parse(sample.observedAt) - POWER_RETENTION_DAYS * 86_400_000).toISOString();
    pruned = await store.prune(montevideoDay(cutoff));
  }
  return { observedAt: sample.observedAt, written: increments.length, skipped: false, pruned };
}
