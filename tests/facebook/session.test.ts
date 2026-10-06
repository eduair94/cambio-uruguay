import { afterEach, describe, expect, it, vi } from "vitest";
import { facebookSessionOk, facebookSessionUsable } from "../../classes/facebook/browser";
import { facebookSessionOk as autosGate } from "../../classes/autos/sources/facebookBrowser";

// The profile browser's /health on 2026-10-05, while every Marketplace read worked.
const monitorCouldNotValidate = {
  ok: false, browserConnected: true, sessionPresent: true, sessionStatus: "error",
  lastMonitorError: "FB_PROFILE_BROWSER_MONITOR_INVALID_RESPONSE", loginGates: 0, lastError: "FB_PROFILE_BROWSER_ID_MISMATCH",
};

afterEach(() => vi.unstubAllGlobals());

describe("facebookSessionUsable", () => {
  it("lets readers try when the monitor only failed to validate", () => {
    expect(facebookSessionUsable(monitorCouldNotValidate)).toBe(true);
    expect(facebookSessionUsable({ ...monitorCouldNotValidate, sessionStatus: "valid" })).toBe(true);
    expect(facebookSessionUsable({ ...monitorCouldNotValidate, sessionStatus: "unknown" })).toBe(true);
  });

  it("stops them when the session is known to be gone", () => {
    expect(facebookSessionUsable({ ...monitorCouldNotValidate, sessionStatus: "invalid" })).toBe(false);
    expect(facebookSessionUsable({ ...monitorCouldNotValidate, sessionPresent: false })).toBe(false);
    expect(facebookSessionUsable({ ...monitorCouldNotValidate, browserConnected: false })).toBe(false);
    expect(facebookSessionUsable({ sessionStatus: "unreachable" })).toBe(false);
    expect(facebookSessionUsable(null)).toBe(false);
  });

  it("reads the body of the 503 the endpoint answers whenever it is not valid", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(monitorCouldNotValidate), { status: 503 })));
    expect(await facebookSessionOk("http://health.test")).toBe(true);
    // Autos and rentals share the one gate.
    expect(await autosGate("http://health.test")).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 })));
    expect(await facebookSessionOk("http://health.test")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    expect(await facebookSessionOk("http://health.test")).toBe(false);
  });
});
