// cambiopando.com.uy is Cloudflare-fronted and 403s the scraper on fingerprint,
// not on IP — every rotating proxy got 403 too. It had been the sync's one
// permanent failure. These pin the FlareSolverr path and the parse of the real
// exchange-board markup it returns.
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CambioPando from "../classes/cambios/cambio_pando";
import * as flaresolverr from "../classes/flaresolverr";
import { ProxyFileService } from "../classes/ProxyFileService";

// Trimmed from a real solved response (2026-08-13). The currency cell carries the
// flag emoji plus the ISO code, and prices carry a "$ " prefix.
//
// The whitespace between those spans is load-bearing and must be preserved: the
// code is matched with `\bUSD\b`, so markup rendered as "USDDólar" — which is what
// you get from hand-tidied fixture HTML — silently matches nothing and the whole
// board parses to zero rows.
const BOARD_HTML = `
<table class="exchange-board__table">
  <thead><tr><th>Moneda</th><th>Compra</th><th>Venta</th></tr></thead>
  <tbody>
    <tr class="exchange-board__row">
      <td class="exchange-board__currency"> <span>🇺🇸</span> <div> <span>USD</span> <span>Dólar Americano</span> </div> </td>
      <td class="exchange-board__price"> $ 39.30 </td>
      <td class="exchange-board__price"> $ 41.30 </td>
    </tr>
    <tr class="exchange-board__row">
      <td class="exchange-board__currency"> <span>🇦🇷</span> <div> <span>ARS</span> <span>Peso Argentino</span> </div> </td>
      <td class="exchange-board__price"> $ 0.015 </td>
      <td class="exchange-board__price"> $ 0.050 </td>
    </tr>
    <tr class="exchange-board__row">
      <td class="exchange-board__currency"> <span>🇧🇷</span> <div> <span>BRL</span> <span>Real</span> </div> </td>
      <td class="exchange-board__price"> $ 6.80 </td>
      <td class="exchange-board__price"> $ 8.80 </td>
    </tr>
  </tbody>
</table>`;

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Cambio Pando", () => {
  it("parses the exchange board FlareSolverr returns", async () => {
    vi.spyOn(flaresolverr, "flaresolverrGet").mockResolvedValue(BOARD_HTML);

    const rows = await new CambioPando("cambio_pando").get_data();

    expect(rows.map((r) => [r.code, r.buy, r.sell])).toEqual([
      ["USD", 39.3, 41.3],
      ["ARS", 0.015, 0.05],
      ["BRL", 6.8, 8.8],
    ]);
    expect(rows[0].name).toContain("Dólar Americano");
  });

  it("does not waste a proxy request when FlareSolverr already solved it", async () => {
    vi.spyOn(flaresolverr, "flaresolverrGet").mockResolvedValue(BOARD_HTML);
    const get = vi.spyOn(axios, "get");

    await new CambioPando("cambio_pando").get_data();

    expect(get).not.toHaveBeenCalled();
  });

  it("falls back to the proxied request when no solver is configured", async () => {
    // With FLARESOLVERR_URLS unset the client returns null, and the scraper must
    // still behave exactly as it did before.
    vi.spyOn(flaresolverr, "flaresolverrGet").mockResolvedValue(null);
    vi.spyOn(ProxyFileService.prototype, "getRandomProxy").mockResolvedValue("");
    const create = vi.spyOn(axios, "create");

    await new CambioPando("cambio_pando").get_data().catch(() => undefined);

    expect(create).toHaveBeenCalled();
  });

  it("picks its fallback proxy at random, since each sync run is a new process", async () => {
    // getNextProxy() advances an index on a singleton; a fresh process per run
    // means it always handed out proxies[0..3] of a 2500-entry pool, so a few
    // flagged addresses at the head could pin this origin at 403 indefinitely.
    vi.spyOn(flaresolverr, "flaresolverrGet").mockResolvedValue(null);
    const random = vi.spyOn(ProxyFileService.prototype, "getRandomProxy").mockResolvedValue("");
    const next = vi.spyOn(ProxyFileService.prototype, "getNextProxy");

    await new CambioPando("cambio_pando").get_data().catch(() => undefined);

    expect(random).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
