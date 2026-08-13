// Every prexcard.com request is routed through the shared proxy in `proxy.txt`.
// On 2026-08-13 that proxy stopped answering and, because none of these axios
// calls carried a timeout, each one blocked ~127s on the kernel's TCP connect
// retries. `scrape_data()` chains three of them, so the Prex origin alone
// outlasted the 5-minute sync cron and took the whole run down with it.
//
// Two bounds are pinned here: requests fail fast, and the OTP login (a ~2-minute
// mailbox-polling flow) is not retried on every 5-minute run.
import axios from "axios";
import fs from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CambioPrex, { PREX_MAX_CHAINED_REQUESTS, PREX_REQUEST_TIMEOUT_MS } from "../classes/cambios/prex";
import { DEFAULT_ORIGIN_TIMEOUT_MS } from "../classes/sync_health";

const ENV_KEYS = ["PREX_USER_ID", "PREX_LOGIN_USER", "PREX_LOGIN_PASSWORD"] as const;
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) original[k] = process.env[k];
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ENV_KEYS) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});

describe("Prex request bounds", () => {
  it("bounds the cambiomoneda request so a dead proxy cannot stall the sync", async () => {
    process.env.PREX_USER_ID = "585737";
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);

    await new CambioPrex("prex").get_usd_from_web("session-id");

    expect(get).toHaveBeenCalled();
    expect(get.mock.calls[0][1]?.timeout).toBeGreaterThan(0);
  });

  it("bounds the hacelabien request", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);

    await new CambioPrex("prex").prex_ar("");

    expect(get.mock.calls[0][1]?.timeout).toBeGreaterThan(0);
  });

  it("bounds the mobile-API login", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: { token: "t" } } as any);

    await new CambioPrex("prex").login();

    expect(post.mock.calls[0][2]?.timeout).toBeGreaterThan(0);
  });
});

describe("Prex worst-case budget", () => {
  it("leaves room for the DólarAhora fallback inside the origin timeout", () => {
    // `withDolarAhoraFallback` only runs once `scrape_data()` has settled, so if
    // the chained proxy calls can burn the whole per-origin slice, the fallback
    // that exists precisely for a dead Prex never gets to publish. Observed on
    // 2026-08-13: 4 chained calls × 12s = 48s > the 45s cap, so the origin was
    // killed mid-chain and Prex published nothing at all.
    const worstCase = PREX_MAX_CHAINED_REQUESTS * PREX_REQUEST_TIMEOUT_MS;
    const fallbackHeadroom = 10_000;

    expect(worstCase + fallbackHeadroom).toBeLessThanOrEqual(DEFAULT_ORIGIN_TIMEOUT_MS);
  });
});

describe("Prex web-login cooldown", () => {
  it("skips the OTP login while a recent attempt is still cooling down", async () => {
    process.env.PREX_LOGIN_USER = "user";
    process.env.PREX_LOGIN_PASSWORD = "pass";
    // A login attempt seconds ago: the mailbox OTP round trip takes ~2 minutes,
    // far longer than one 5-minute run can spare, so retrying every run only
    // burns the origin's slot and re-triggers the OTP email.
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(String(Date.now()) as any);
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "" } as any);
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: {} } as any);

    const sid = await new CambioPrex("prex").prexWebLogin();

    expect(sid).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it("attempts the login once the cooldown has elapsed", async () => {
    process.env.PREX_LOGIN_USER = "user";
    process.env.PREX_LOGIN_PASSWORD = "pass";
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(String(Date.now() - 60 * 60 * 1000) as any);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "", headers: {} } as any);

    await new CambioPrex("prex").prexWebLogin();

    expect(get).toHaveBeenCalled();
  });
});
