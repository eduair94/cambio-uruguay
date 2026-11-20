// Sin ninguna variable: cada fuente queda inactiva, sin un solo pedido de red y con UNA línea de log.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  const post = vi.fn(async () => {
    throw new Error("axios.post no debería llamarse");
  });
  const get = vi.fn(async () => {
    throw new Error("axios.get no debería llamarse");
  });
  return { default: { post, get }, post, get };
});

import axios from "axios";
import { refreshUsageInsights } from "../../classes/insights/refresh";
import { offlineStore, readOnlyStore } from "../../classes/insights/store";

// Una sola cadena: una lista de nombres de variables entre comillas parece una clave a gitleaks.
const VARS = (
  "CLOUDFLARE_TOKEN CLOUDFLARE_ANALYTICS_TOKEN CLARITY_EXPORT_TOKEN BING_WEBMASTER_API_KEY CRUX_API_KEY GA4_PROPERTY_ID " +
  "GA4_CLIENT_EMAIL GA4_PRIVATE_KEY GA4_KEY_FILE GSC_CLIENT_EMAIL GSC_PRIVATE_KEY GSC_KEY_FILE"
).split(" ");
const saved: Record<string, string | undefined> = {};
const fetchSpy = vi.fn();

beforeAll(() => {
  for (const v of VARS) {
    saved[v] = process.env[v];
    delete process.env[v];
  }
  vi.stubGlobal("fetch", fetchSpy);
});
afterAll(() => {
  for (const v of VARS) if (saved[v] !== undefined) process.env[v] = saved[v];
  vi.unstubAllGlobals();
});

describe("sin credenciales", () => {
  it("todas inactivas, cero pedidos, una línea por fuente", async () => {
    const lines: string[] = [];
    const res = await refreshUsageInsights({
      now: new Date("2026-11-21T12:21:00Z"),
      dryRun: true,
      hasDb: false,
      store: readOnlyStore(offlineStore, { allowQuotaCounter: false }),
      log: (l) => lines.push(l),
    });
    const st = res.snapshot.sources;
    for (const id of ["clarity", "bing", "crux", "cloudflareZone", "cloudflareRum", "ga4Behavior"] as const)
      expect(st[id].status, id).toBe("inactive");
    expect(vi.mocked(axios.post)).not.toHaveBeenCalled();
    expect(vi.mocked(axios.get)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    for (const id of ["clarity", "bing", "crux", "cloudflareZone", "cloudflareRum"]) {
      expect(lines.filter((l) => l.startsWith(`[usage-insights] ${id}:`)).length, id).toBe(1);
    }
    expect(lines).toContain("[usage-insights] clarity: inactivo — falta CLARITY_EXPORT_TOKEN");
    expect(lines).toContain("[usage-insights] bing: inactivo — falta BING_WEBMASTER_API_KEY");
    expect(lines).toContain("[usage-insights] crux: inactivo — falta CRUX_API_KEY");
    expect(res.exitCode).toBe(0);
    for (const s of res.snapshot.signals) expect(["unavailable", "ok"]).toContain(s.status);
  });
});
