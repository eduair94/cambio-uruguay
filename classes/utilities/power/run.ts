import { ECSE_DEPARTMENT_URL, ECSE_URBAN_URL, parseEcseRows, type EcseSample } from "./ecse";
import { foldSample, montevideoDay } from "./ledger";
import type { PowerStore } from "./store";

export const POWER_RETENTION_DAYS = 400;
export const BOT_USER_AGENT = "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/barrios-alquileres-uruguay)";

/** ECSE answers `Accept: application/json` with the JSON array encoded AGAIN as a JSON string. */
export function decodeEcseBody(text: string): unknown {
  const value = JSON.parse(text.replace(/^FEFF/, ""));
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function fetchEcseJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { "user-agent": BOT_USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`ECSE HTTP ${response.status}`);
  return decodeEcseBody(await response.text());
}

/**
 * One poll: both ECSE scopes, validated, folded into the ledger. The state is written BEFORE the
 * increments on purpose: a crash in between loses one interval instead of counting it twice.
 */
export async function runPowerSample({ fetchJson = fetchEcseJson, store, now = new Date() }: {
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
