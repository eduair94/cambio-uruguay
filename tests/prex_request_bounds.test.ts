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
import { SocksProxyAgent } from "socks-proxy-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CambioPrex, {
  PREX_LOGIN_BUDGET_MS,
  PREX_MAX_CHAINED_REQUESTS,
  PREX_REQUEST_TIMEOUT_MS,
  PREX_WORST_CASE_MS,
} from "../classes/cambios/prex";
import { ProxyFileService } from "../classes/ProxyFileService";
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

// axios's own `timeout` is armed with `req.setTimeout()`, which Node only starts
// once a socket is assigned to the request. When the proxy agent hangs on its
// CONNECT no socket is ever assigned, so the timer never arms and the call sits
// there until the kernel gives up (~127s) — exactly what the 2026-08-13 deploy
// showed: `PREX_REQUEST_TIMEOUT_MS = 8000` was live and the error still came back
// as `connect ETIMEDOUT`, never `timeout of 8000ms exceeded`. An AbortSignal
// destroys the ClientRequest regardless of socket state, so both are required.
const bothBounds = (config: any) => {
  expect(config?.timeout).toBeGreaterThan(0);
  expect(config?.signal).toBeInstanceOf(AbortSignal);
};

describe("Prex request bounds", () => {
  it("bounds the cambiomoneda request so a dead proxy cannot stall the sync", async () => {
    process.env.PREX_USER_ID = "585737";
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);

    await new CambioPrex("prex").get_usd_from_web("session-id");

    expect(get).toHaveBeenCalled();
    bothBounds(get.mock.calls[0][1]);
  });

  it("bounds the hacelabien request", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);

    await new CambioPrex("prex").prex_ar("");

    bothBounds(get.mock.calls[0][1]);
  });

  it("bounds the mobile-API login", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: { token: "t" } } as any);

    await new CambioPrex("prex").login();

    bothBounds(post.mock.calls[0][2]);
  });

  it("gives each request its own signal so one abort cannot cancel the next", async () => {
    process.env.PREX_USER_ID = "585737";
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);
    const prex = new CambioPrex("prex");

    await prex.prex_ar("");
    await prex.get_usd_from_web("session-id");

    expect(get.mock.calls[0][1]?.signal).not.toBe(get.mock.calls[1][1]?.signal);
  });
});

// prexcard.com answers 403 to the VPS's own IP, so Prex cannot be scraped without
// a proxy at all. The static `proxy.txt` it used to rely on is unmonitored and
// rotted silently — it pointed at a host that had been dead for who knows how long
// and nothing noticed until the sync fell over. The proxyscrape pool behind
// ProxyFileService refreshes itself every 10 minutes and is what the other proxied
// scrapers already use; measured 14/14 of its proxies reaching prexcard.com.
describe("Prex proxy source", () => {
  it("routes through the self-refreshing pool rather than the static file", async () => {
    vi.spyOn(ProxyFileService.prototype, "getRandomProxy").mockResolvedValue("socks5://1.2.3.4:1081");
    // A live static file must not win: it is exactly what silently went stale.
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("104.140.209.93:8800" as any);
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);

    const prex = new CambioPrex("prex");
    await (prex as any).resolveProxy();
    await prex.prex_ar("");

    expect(get.mock.calls[0][1]?.httpsAgent).toBeInstanceOf(SocksProxyAgent);
  });

  it("picks a fresh proxy per run, since each sync is a new process", async () => {
    // getNextProxy() advances an index held on a singleton, and every sync run is
    // a brand-new process — it would hand out proxies[0] forever, so one dead
    // entry would wedge Prex permanently.
    const random = vi.spyOn(ProxyFileService.prototype, "getRandomProxy").mockResolvedValue("socks5://1.2.3.4:1081");
    const next = vi.spyOn(ProxyFileService.prototype, "getNextProxy");

    await (new CambioPrex("prex") as any).resolveProxy();

    expect(random).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("falls back to the static file when the pool yields nothing", async () => {
    vi.spyOn(ProxyFileService.prototype, "getRandomProxy").mockResolvedValue("");
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("104.140.209.93:8800" as any);
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);

    const prex = new CambioPrex("prex");
    await (prex as any).resolveProxy();
    await prex.prex_ar("");

    const agent = get.mock.calls[0][1]?.httpsAgent;
    expect(agent).toBeDefined();
    expect(agent).not.toBeInstanceOf(SocksProxyAgent);
  });

  it("still bounds requests when no proxy is available at all", async () => {
    vi.spyOn(ProxyFileService.prototype, "getRandomProxy").mockResolvedValue("");
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: "<html></html>" } as any);

    const prex = new CambioPrex("prex");
    await (prex as any).resolveProxy();
    await prex.prex_ar("");

    bothBounds(get.mock.calls[0][1]);
  });
});

describe("Prex worst-case budget", () => {
  it("leaves room for the DólarAhora fallback inside the origin timeout", () => {
    // `withDolarAhoraFallback` only runs once `scrape_data()` has settled, so if
    // the chain can burn the whole per-origin slice, the fallback that exists
    // precisely for a dead Prex never gets to publish. Observed on 2026-08-13:
    // 4 chained calls × 12s = 48s > the 45s cap, so the origin was killed
    // mid-chain and Prex published nothing at all.
    const fallbackHeadroom = 10_000;

    expect(PREX_WORST_CASE_MS + fallbackHeadroom).toBeLessThanOrEqual(DEFAULT_ORIGIN_TIMEOUT_MS);
  });

  it("counts the login flow, which is many requests plus a mailbox poll", () => {
    // Sizing the worst case as a flat request count was wrong: prexWebLogin is
    // ~7 requests around a poll loop, not one. It only looked bounded while the
    // proxy was dead and its first request failed instantly.
    expect(PREX_WORST_CASE_MS).toBe(PREX_MAX_CHAINED_REQUESTS * PREX_REQUEST_TIMEOUT_MS + PREX_LOGIN_BUDGET_MS);
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

  it("gives up on the OTP within its budget instead of polling for two minutes", async () => {
    // The mailbox poll was 24 tries × 5s = 120s, far past the 45s the origin gets.
    // While the proxy was dead this never showed: the login's first request failed
    // instantly so the poll was unreachable. A working proxy makes it reachable,
    // and an unbounded poll would hang the origin and starve the fallback.
    process.env.PREX_LOGIN_USER = "user";
    process.env.PREX_LOGIN_PASSWORD = "pass";
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(axios, "get").mockResolvedValue({
      data: { found: false },
      headers: { "set-cookie": ["PHPSESSID=abc; path=/"] },
    } as any);
    // error "0" is the branch that sends the OTP and starts the poll.
    vi.spyOn(axios, "post").mockResolvedValue({ data: { error: "0" }, headers: {} } as any);

    const started = Date.now();
    const sid = await new CambioPrex("prex").prexWebLogin();
    const elapsed = Date.now() - started;

    expect(sid).toBeNull();
    expect(elapsed).toBeLessThan(PREX_LOGIN_BUDGET_MS + 5_000);
    // Real elapsed time, so it needs more room than vitest's 5s default.
  }, 30_000);

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
