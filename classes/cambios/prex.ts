import axios from "axios";
import { load } from "cheerio";
import dotenv from "dotenv";
import fs from "fs";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { CambioObj } from "../../interfaces/Cambio";
import { Cambio } from "../cambio";
import { ProxyFileService } from "../ProxyFileService";
import { withDolarAhoraFallback } from "./dolarahora";
dotenv.config();
const e = process.env;

/**
 * Per-request ceiling for prexcard.com. Everything here goes through the shared
 * proxy in `proxy.txt`; when that proxy dies an unbounded call blocks ~127s on
 * the kernel's TCP connect retries.
 *
 * The value is set by the worst case, not the happy path: `scrape_data()` chains
 * up to PREX_MAX_CHAINED_REQUESTS of these, and that chain has to finish inside
 * the per-origin slice with room to spare for `withDolarAhoraFallback` — which
 * only runs after the chain settles, and is the very thing meant to cover a dead
 * Prex. A healthy Prex origin completes in ~2.4s end to end, so this is still
 * ~2.5x the whole origin's normal cost. See tests/prex_request_bounds.test.ts.
 */
export const PREX_REQUEST_TIMEOUT_MS = 5_000;

/** The single requests scrape_data() chains: prex_ar, get_usd_from_web, login, get_usd. */
export const PREX_MAX_CHAINED_REQUESTS = 4;

/**
 * Ceiling for the whole `prexWebLogin` flow, which is ~7 requests around a poll
 * loop rather than one call — so it needs its own bound, not a per-request one.
 *
 * It is deliberately smaller than the flow really wants: the OTP round trip takes
 * ~2 minutes and simply does not fit in one origin's slice of a five-minute sync
 * (see the note on the cooldown below). Within this budget the login only wins
 * when a still-valid code is already sitting in the mailbox, which `fetchOtp`
 * handles; otherwise it gives up cleanly and leaves room for the DólarAhora
 * fallback instead of hanging the origin. Minting reliably needs its own job.
 */
export const PREX_LOGIN_BUDGET_MS = 10_000;

/** What scrape_data() can cost with no usable session and the cooldown clear. */
export const PREX_WORST_CASE_MS = PREX_MAX_CHAINED_REQUESTS * PREX_REQUEST_TIMEOUT_MS + PREX_LOGIN_BUDGET_MS;

class CambioPrex extends Cambio {
  name = "Prex";
  bcu = "https://www.bcu.gub.uy/Sistema-de-Pagos/Paginas/prex.aspx";
  website = `https://www.prexcard.com`;
  favicon = "https://www.prexcard.com";
  /** Folded in here because every call below shares the proxy config. */
  private readonly REQUEST_TIMEOUT_MS = PREX_REQUEST_TIMEOUT_MS;

  /**
   * `timeout` alone does not bound these calls. axios arms it with
   * `req.setTimeout()`, which Node only starts once a socket is assigned — and a
   * proxy agent stuck on its CONNECT never gets one, so the timer never arms and
   * the call runs until the kernel gives up on the connect (~127s). That is why
   * a deployed 8s `timeout` still produced `connect ETIMEDOUT` rather than
   * `timeout of 8000ms exceeded`. The AbortSignal destroys the ClientRequest
   * whatever state it is in, so it is the bound that actually holds; `timeout`
   * stays for stalls after the response starts.
   *
   * Each call site invokes this fresh, so no two requests share a signal — a
   * signal is a countdown that starts at construction, and a shared one would
   * abort every later request in the chain the moment the first budget expired.
   */
  /** SOCKS agent for this run, shared by every request in the chain. */
  private socksAgent: SocksProxyAgent | null = null;

  /**
   * Pick this run's proxy. prexcard.com answers 403 to the VPS's own IP, so Prex
   * simply cannot be scraped unproxied — which makes the proxy source part of the
   * scraper's correctness, not a nicety.
   *
   * Resolved once per scrape rather than per request: the login chain mints a
   * PHPSESSID and should not hop IPs midway through.
   *
   * `getRandomProxy` and not `getNextProxy`: the latter advances an index kept on
   * a singleton, and every sync run is a fresh process, so it would hand out
   * proxies[0] on every single run — one dead entry at the head of the pool would
   * wedge Prex indefinitely. Random means a bad draw fixes itself on the next run,
   * five minutes later.
   */
  private async resolveProxy(): Promise<void> {
    try {
      const proxyUrl = await ProxyFileService.getInstance().getRandomProxy();
      this.socksAgent = proxyUrl ? new SocksProxyAgent(proxyUrl) : null;
    } catch (e) {
      console.warn("Prex: could not resolve a pool proxy", (e as Error).message);
      this.socksAgent = null;
    }
  }

  private getProxyConfig() {
    const base = {
      timeout: this.REQUEST_TIMEOUT_MS,
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
    };

    // The proxyscrape pool refreshes itself every 10 minutes and is what the
    // other proxied scrapers here already use, so it wins over the static file.
    // `proxy.txt` is an unmonitored single host: it rotted silently and nothing
    // noticed until the whole sync fell over behind it.
    if (this.socksAgent) {
      return { ...base, httpAgent: this.socksAgent, httpsAgent: this.socksAgent };
    }

    try {
      const proxyPath = "proxy.txt";
      if (fs.existsSync(proxyPath)) {
        const proxyUrl = fs.readFileSync(proxyPath, "utf8").trim();
        if (proxyUrl) {
          const httpAgent = new HttpProxyAgent(`http://${proxyUrl}`);
          const httpsAgent = new HttpsProxyAgent(`http://${proxyUrl}`);
          return {
            ...base,
            httpAgent: httpAgent,
            httpsAgent: httpsAgent,
          };
        }
      }
    } catch (error) {
      console.log("No proxy configuration found or error reading proxy.txt");
    }
    return base;
  }

  // --- Web session (PHPSESSID) auto-refresh -------------------------------
  // The cambiomoneda page needs a logged-in PHPSESSID that expires often.
  // We mint a fresh one over the network (no browser): email+password login
  // that emails a 6-digit OTP, which we read back from an external mailbox
  // endpoint (PREX_OTP_URL). The minted cookie is cached to disk so the next
  // run reuses it without a fresh login/OTP round trip.
  private readonly SESSION_CACHE = "prex_session.txt";
  private readonly OTP_URL_DEFAULT = "https://spotify-mail.checkleaked.cc/code?to=prex@checkleaked.cc&want=code";
  private readonly WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

  /**
   * The login below polls a mailbox for an emailed OTP, which realistically
   * takes ~2 minutes — far more than one origin's slice of a five-minute sync
   * run. Retrying it on every run therefore cannot ever succeed; it just burns
   * the slot and re-triggers the OTP email. One attempt per cooldown window is
   * enough: a healthy mint lasts hours, and a broken one stays broken.
   */
  private readonly LOGIN_COOLDOWN_MS = 30 * 60 * 1000;
  private readonly LOGIN_ATTEMPT_CACHE = "prex_login_attempt.txt";

  /** ms since the last login attempt, or null if there is no usable record. */
  private msSinceLoginAttempt(): number | null {
    try {
      if (!fs.existsSync(this.LOGIN_ATTEMPT_CACHE)) return null;
      const ts = Number(fs.readFileSync(this.LOGIN_ATTEMPT_CACHE, "utf8").trim());
      if (!Number.isFinite(ts) || ts <= 0) return null;
      return Date.now() - ts;
    } catch (e) {
      console.warn("Prex: could not read login attempt cache", (e as Error).message);
      return null;
    }
  }

  private markLoginAttempt() {
    try {
      fs.writeFileSync(this.LOGIN_ATTEMPT_CACHE, String(Date.now()), "utf8");
    } catch (e) {
      console.warn("Prex: could not record login attempt", (e as Error).message);
    }
  }

  private getStoredSession(): string | null {
    try {
      if (fs.existsSync(this.SESSION_CACHE)) {
        const v = fs.readFileSync(this.SESSION_CACHE, "utf8").trim();
        if (v) return v;
      }
    } catch (e) {
      console.warn("Prex: could not read session cache", (e as Error).message);
    }
    const env = process.env.PREX_SESSION_ID;
    return env ? env.trim() : null;
  }

  private storeSession(phpSessionId: string) {
    try {
      fs.writeFileSync(this.SESSION_CACHE, phpSessionId, "utf8");
    } catch (e) {
      console.warn("Prex: could not cache session", (e as Error).message);
    }
  }

  /** Fetch the latest Prex OTP from the external mailbox endpoint. */
  private async otpFetch(url: string): Promise<{ code: string; receivedAt: number } | null> {
    try {
      const res = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 20000,
        validateStatus: () => true,
      });
      const d = res.data;
      if (d && d.found && d.code) {
        const ts = d.receivedAt ? Date.parse(d.receivedAt) : 0;
        return { code: String(d.code).trim(), receivedAt: Number.isNaN(ts) ? 0 : ts };
      }
    } catch (e) {
      console.warn("Prex OTP fetch error:", (e as Error).message);
    }
    return null;
  }

  /**
   * Poll the mailbox for the OTP triggered by /login/_do.
   * Prefers a code newer than `baselineTs` (the just-sent one); falls back to
   * a still-valid active code if Prex reused an existing one.
   */
  private async fetchOtp(url: string, baselineTs: number, deadline: number): Promise<string | null> {
    const FRESH_MS = 15 * 60 * 1000;
    const POLL_MS = 2000;
    // Polls until the login's budget runs out rather than a fixed 24 x 5s = 120s,
    // which is longer than the origin's whole slice of the sync run.
    while (Date.now() + POLL_MS < deadline) {
      const r = await this.otpFetch(url);
      if (r && r.receivedAt > baselineTs) return r.code; // brand-new code arrived
      await new Promise((res) => setTimeout(res, POLL_MS));
    }
    // No newer code arrived — Prex may have reused an active code still valid.
    const last = await this.otpFetch(url);
    if (last && Date.now() - last.receivedAt < FRESH_MS) return last.code;
    return null;
  }

  /**
   * Full network login flow that mints a fresh authenticated PHPSESSID:
   *   GET /login -> POST /usuarios/validarUsuarioLogin -> POST /login/_do
   *   (emails OTP) -> read OTP -> POST /login/int_do_clave -> GET /usuarios.
   * Returns the raw PHPSESSID value, or null on failure.
   */
  async prexWebLogin(): Promise<string | null> {
    const doc = process.env.PREX_LOGIN_USER;
    const pass = process.env.PREX_LOGIN_PASSWORD;
    const otpUrl = process.env.PREX_OTP_URL || this.OTP_URL_DEFAULT;
    if (!doc || !pass) {
      console.log("Prex web login: credentials not configured (PREX_LOGIN_USER, PREX_LOGIN_PASSWORD)");
      return null;
    }

    const sinceLastAttempt = this.msSinceLoginAttempt();
    if (sinceLastAttempt !== null && sinceLastAttempt < this.LOGIN_COOLDOWN_MS) {
      const waitMin = Math.ceil((this.LOGIN_COOLDOWN_MS - sinceLastAttempt) / 60000);
      console.log(`Prex web login: skipped, last attempt ${Math.round(sinceLastAttempt / 60000)}min ago (retry in ~${waitMin}min)`);
      return null;
    }
    this.markLoginAttempt();
    const loginDeadline = Date.now() + PREX_LOGIN_BUDGET_MS;

    const BASE = "https://www.prexcard.com";
    let sid = "";
    const form = (o: Record<string, string>) =>
      Object.entries(o)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    const grabSid = (res: any) => {
      const sc = res?.headers?.["set-cookie"];
      if (Array.isArray(sc)) {
        for (const c of sc) {
          const m = /PHPSESSID=([^;]+)/.exec(c);
          if (m) sid = m[1];
        }
      }
    };
    const cfg = (extra: Record<string, string> = {}) => ({
      headers: {
        "User-Agent": this.WEB_UA,
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${BASE}/login`,
        ...(sid ? { cookie: `PHPSESSID=${sid}` } : {}),
        ...extra,
      },
      validateStatus: () => true,
      ...this.getProxyConfig(),
    });
    const formCfg = () => cfg({ "content-type": "application/x-www-form-urlencoded" });

    try {
      // 1. Prime the session (initial PHPSESSID).
      const r1 = await axios.get(`${BASE}/login`, { ...cfg(), maxRedirects: 0 });
      grabSid(r1);
      if (!sid) {
        console.warn("Prex web login: no PHPSESSID from GET /login");
        return null;
      }

      // 2. Validate the document (mirrors the browser; primes 2FA state).
      const r2 = await axios.post(`${BASE}/usuarios/validarUsuarioLogin`, form({ inputUsuario: doc }), formCfg());
      grabSid(r2);

      // Baseline OTP timestamp BEFORE triggering, to detect the fresh code.
      const before = await this.otpFetch(otpUrl);
      const baselineTs = before ? before.receivedAt : 0;

      // 3. Submit credentials -> emails/activates the OTP.
      const r3 = await axios.post(`${BASE}/login/_do`, form({ usuario: doc, password: pass }), formCfg());
      grabSid(r3);
      const doErr = r3.data && String(r3.data.error);
      if (doErr === "ok") {
        // Account without 2FA — session already authenticated.
        console.log("Prex web login: authenticated without OTP");
        this.storeSession(sid);
        return sid;
      }
      if (doErr !== "0") {
        console.warn("Prex web login: unexpected /login/_do response", JSON.stringify(r3.data));
        return null;
      }

      // 4. Read the OTP from the mailbox endpoint.
      const code = await this.fetchOtp(otpUrl, baselineTs, loginDeadline);
      if (!code || !/^\d{6}$/.test(code)) {
        console.warn("Prex web login: OTP not received within the login budget");
        return null;
      }

      // 5. Submit the OTP.
      const digits: Record<string, string> = {};
      for (let i = 0; i < 6; i++) digits[`codigo${i + 1}`] = code[i];
      const r5 = await axios.post(`${BASE}/login/int_do_clave`, form({ usuario: doc, password: pass, ...digits }), formCfg());
      grabSid(r5);
      if (!(r5.data && r5.data.error === "ok")) {
        console.warn("Prex web login: OTP rejected", JSON.stringify(r5.data));
        return null;
      }

      // 6. Finalize the authenticated session.
      const r6 = await axios.get(`${BASE}/usuarios`, { ...cfg(), maxRedirects: 0 });
      grabSid(r6);

      console.log("Prex web login: authenticated, fresh PHPSESSID minted");
      this.storeSession(sid);
      return sid;
    } catch (e) {
      console.error("Prex web login error:", (e as Error).message);
      return null;
    }
  }

  async login() {
    const url = "https://www.prexcard.com/api/login";
    const headers = {
      authorization: "Bearer TokenAPP011001010",
      "accept-charset": "UTF-8",
      "accept-encoding": "gzip",
      connection: "Keep-Alive",
      "content-type": "application/json",
      "device-app-version": "10.49.45",
      "device-manufacturer": "Xiaomi",
      "device-model": "M2102J20SG",
      "device-platform": "Android",
      "device-serial": "unknown",
      "device-uuid": "dd600187f3582fa7",
      "device-version": "11",
      host: "www.prexcard.com",
      "user-agent": "Dalvik/2.1.0 (Linux; U; Android 11; M2102J20SG Build/RKQ1.200826.002)",
    };
    const json = {
      Documento: process.env.prexEmail,
      Password: process.env.prexPassword,
      TipoDocumento: "CI",
      TipoPersona: "1",
      UuidDevice: "dd600187f3582fa7",
      ModelDevice: "M2102J20SG",
      VersionDevice: "11",
      SerialDevice: "unknown",
      PlatformDevice: "Android",
      ManufacturerDevice: "Xiaomi",
      TokenFCM: "",
      AppVersion: "10.49.45",
    };
    const res = await axios
      .post(url, json, { headers, ...this.getProxyConfig() })
      .then((res) => res.data)
      .catch((e) => {
        console.log("Error", url);
        return null;
      });
    return res?.token;
  }

  /**
   * Get USD exchange rate from the cambiomoneda page using web session.
   * Uses the given PHPSESSID (freshly minted via prexWebLogin), falling back
   * to the cached/env session. Needs PREX_USER_ID for the account URL.
   */
  async get_usd_from_web(sessionId?: string): Promise<{ buy: number; sell: number } | null> {
    try {
      const phpSessionId = sessionId || this.getStoredSession();
      const userId = process.env.PREX_USER_ID;

      if (!phpSessionId || !userId) {
        console.log("Prex web session credentials not configured (PREX_SESSION_ID/cache, PREX_USER_ID)");
        return null;
      }

      const url = `https://www.prexcard.com/cambiomoneda/${userId}`;
      const headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "es-ES,es;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        cookie: `PHPSESSID=${phpSessionId}; promo=1`,
        Referer: `https://www.prexcard.com/usuarios/cuentav2/${userId}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      };

      const res = await axios.get(url, { headers, ...this.getProxyConfig() });
      const html = res.data;

      if (typeof html === "string") {
        const $ = load(html);

        // Check if we're on the login page (session expired)
        const title = $("title").text();
        if (title.includes("Ingresar") || title.includes("Login")) {
          console.log("Prex session expired, please update prexPHPSESSID");
          return null;
        }

        // Extract buy and sell rates from the cambiomoneda page
        // <p id="pizarra-compra" class="px-azul px-pizarra">39,00</p>
        // <p id="pizarra-venta" class="px-azul px-pizarra">39,40</p>
        const buyText = $("#pizarra-compra").text().trim();
        const sellText = $("#pizarra-venta").text().trim();

        if (buyText && sellText) {
          // Parse the values (format: "39,00" - uses comma as decimal separator)
          const buy = parseFloat(buyText.replace(",", "."));
          const sell = parseFloat(sellText.replace(",", "."));

          if (!isNaN(buy) && !isNaN(sell)) {
            console.log(`Prex USD rates from web: buy=${buy}, sell=${sell}`);
            return { buy, sell };
          }
        }

        console.log("Prex: Could not find exchange rates in cambiomoneda page");
        return null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching Prex USD from web:", error);
      return null;
    }
  }
  async prex_ar(token: string) {
    const url = "https://www.prexcard.com/hacelabien";
    const headers = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/N2G48H)",
    };
    const res = await axios.get(url, { headers, ...this.getProxyConfig() }).catch((e) => {
      console.error(e);
      return {
        data: null,
      };
    });
    const d = res.data;
    if (d && typeof d === "string") {
      const $ = load(d);
      const cotArg = parseFloat($("#cotizacionArg").attr("value"));
      const cotUy = parseFloat($("#cotizacionUy").attr("value"));
      return {
        cotArg,
        cotUy,
      };
    } else {
      console.log("Error fetching Prex AR data", d);
      return null;
    }
  }
  async get_usd(token: string) {
    const url = "https://www.prexcard.com/api/cotizacion_usd";
    const header = {
      "Accept-Charset": "UTF-8",
      Authorization: `Bearer ${token}`,
      "Device-Serial": "2070937402d119c1",
      "Device-Manufacturer": "samsung",
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-N976N Build/N2G48H)",
      Host: "www.prexcard.com",
      "Accept-Encoding": "gzip",
    };
    const body = {};
    const res = await axios.post(url, body, { headers: header, ...this.getProxyConfig() }).then((res) => res.data);
    return { buy: res.compra, sell: res.venta };
  }
  async get_data(): Promise<CambioObj[]> {
    return withDolarAhoraFallback("prex", "Prex", () => this.scrape_data());
  }

  private async scrape_data(): Promise<CambioObj[]> {
    await this.resolveProxy();

    const ar = await this.prex_ar("");

    // 1. Try the cached/env PHPSESSID (fast path, no login/OTP).
    let usdRates = await this.get_usd_from_web();

    // 2. Cookie missing/expired -> mint a fresh one over the network and retry.
    if (!usdRates) {
      console.log("Prex: web session expired/missing — minting fresh cookie via login");
      const sid = await this.prexWebLogin();
      if (sid) {
        usdRates = await this.get_usd_from_web(sid);
      }
    }

    // 3. Last-resort fallback to the mobile API.
    if (!usdRates) {
      try {
        const token = await this.login();
        usdRates = await this.get_usd(token);
      } catch (error) {
        console.error("Error fetching Prex USD from API:", error);
        usdRates = null;
      }
    }

    const f: CambioObj[] = [];

    // Only push USD when both rates are valid, finite, positive numbers.
    // Otherwise (expired web session + dead API fallback) we'd write
    // `buy: undefined, sell: undefined` garbage into the DB.
    if (usdRates && Number.isFinite(usdRates.buy) && Number.isFinite(usdRates.sell) && usdRates.buy > 0 && usdRates.sell > 0) {
      f.push({
        code: "USD",
        type: "",
        name: "",
        buy: usdRates.buy,
        sell: usdRates.sell,
      });
    } else {
      console.warn("Prex: skipping USD — no valid rate (web login + API fallback both failed; check PREX_LOGIN_* / PREX_OTP_URL)");
    }

    if (ar) {
      const num = Math.round((ar.cotUy / ar.cotArg) * 100) / 100;
      f.push({
        code: "ARS",
        type: "",
        name: "",
        buy: num,
        sell: num,
      });
    }

    return f;
  }
}

export default CambioPrex;
