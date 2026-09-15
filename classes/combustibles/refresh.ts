// classes/combustibles/refresh.ts
import { parseAncapHistory } from "./parse";
import { validateFuelRows } from "./validate";
import { loadFuelMeta, loadFuelRows, saveFuelMeta, saveFuelRows } from "./store";

export const ANCAP_HISTORY_URL = "https://www.ancap.com.uy/10564/5/historico-precios-combustibles.html";
const UA = "cambio-uruguay.com combustibles bot (+https://cambio-uruguay.com)";

export async function fetchAncapHistoryHtml(): Promise<string> {
  const res = await fetch(ANCAP_HISTORY_URL, {
    headers: { "user-agent": UA, accept: "text/html,*/*" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ANCAP_HISTORY_URL}`);
  return res.text();
}

export interface RefreshSummary {
  rows: number;
  latestFrom: string;
  inserted: number;
}

/** Lee, valida contra lo guardado y recién ahí escribe. Cualquier fallo conserva lo anterior. */
export async function refreshFuelPrices(): Promise<RefreshSummary> {
  const html = await fetchAncapHistoryHtml();
  const parsed = parseAncapHistory(html);
  const meta = await loadFuelMeta();
  const checked = validateFuelRows(parsed, meta?.latestFrom ?? null);
  // `checked.ok === false` (not `!checked.ok`): without `strictNullChecks` (this repo's
  // tsconfig.json has neither `strict` nor `strictNullChecks`), TS 4.9 fails to narrow a
  // discriminated union on a negated boolean check but does narrow on the literal comparison.
  if (checked.ok === false) throw new Error(`tabla rechazada: ${checked.reason}`);
  const known = new Set((await loadFuelRows()).map((r) => r.from));
  const inserted = checked.rows.filter((r) => !known.has(r.from)).length;
  await saveFuelRows(checked.rows, ANCAP_HISTORY_URL);
  const latestFrom = checked.rows[checked.rows.length - 1].from;
  await saveFuelMeta({ asOf: new Date().toISOString(), rows: checked.rows.length, latestFrom, sourceUrl: ANCAP_HISTORY_URL });
  return { rows: checked.rows.length, latestFrom, inserted };
}
