// Ayudas compartidas por los tests de `currency-usage-insights`. No es un test.
import fs from "fs";
import path from "path";

import type { Ga4Report } from "../../classes/site-analytics/ga4";
import { emptyBlock } from "../../classes/insights/blocks";
import { SOURCE_IDS } from "../../classes/insights/types";
import type { InsightSources, SourceBlock, SourceId } from "../../classes/insights/types";

export const fixture = (name: string): any => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));

export function report(dims: string[], metrics: string[], rows: (string | number)[][], extra: Partial<Ga4Report> = {}): Ga4Report {
  return {
    dimensionHeaders: dims.map((name) => ({ name })),
    metricHeaders: metrics.map((name) => ({ name })),
    rows: rows.map((row) => ({
      dimensionValues: row.slice(0, dims.length).map((value) => ({ value: String(value) })),
      metricValues: row.slice(dims.length).map((value) => ({ value: String(value) })),
    })),
    rowCount: rows.length,
    ...extra,
  };
}

export const NOW = new Date("2026-11-21T12:21:00Z");
export const NOW_ISO = NOW.toISOString();

/** Un bloque fresco con datos. */
export function block<D>(id: SourceId, data: D | null, over: Partial<SourceBlock<D>> = {}): SourceBlock<D> {
  return {
    ...emptyBlock<D>(id, NOW_ISO),
    status: data ? "ok" : "inactive",
    ok: !!data,
    fetchedAt: data ? NOW_ISO : null,
    lastOkAt: data ? NOW_ISO : null,
    data,
    ...over,
  };
}

/** Todas las fuentes sin datos, con las que se pasen pisadas. */
export function sources(over: Partial<InsightSources> = {}): InsightSources {
  const out: any = {};
  for (const id of SOURCE_IDS) out[id] = block(id, null, { enableHint: `falta ${id}` });
  return { ...out, ...over };
}

/** Un token de mentira armado en tiempo de ejecución (gitleaks escanea cada commit). */
export const fakeSecrets = () => ({
  bearer: "tok" + "_" + "x".repeat(24) + "9",
  googleKey: "AI" + "za" + "x".repeat(35),
  bingKey: "bk" + "q".repeat(20) + "7",
  jwt: ["eyJ" + "hdr", "eyJ" + "pay", "sig"].join("."),
  googleAccess: "ya" + "29." + "x".repeat(20),
});
