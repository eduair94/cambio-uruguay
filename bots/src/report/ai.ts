// AI market summary for the daily report, reusing mcp's dailySummary tool
// (which calls the public API POST /ai/insights and cleans the output).
// Tolerant: returns "" on failure so the report still ships without prose.
import type { CambioApi } from "cambio-uruguay-mcp/api";
import { dailySummary } from "cambio-uruguay-mcp/tools";

export async function summarize(api: CambioApi, lang: string): Promise<string> {
  try {
    const r = await dailySummary(api, { lang });
    return r.summary || "";
  } catch (err) {
    console.error("ai summary failed:", err);
    return "";
  }
}
